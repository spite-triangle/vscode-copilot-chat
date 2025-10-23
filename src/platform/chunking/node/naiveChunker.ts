/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RecursiveChunker, TokenChunker } from '@chonkiejs/core';
import { ITokenizer } from '../../../util/common/tokenizer';
import { CancellationToken } from '../../../util/vs/base/common/cancellation';
import { commonPrefixLength, isFalsyOrWhitespace, splitLines } from '../../../util/vs/base/common/strings';
import { URI } from '../../../util/vs/base/common/uri';
import { Range } from '../../../util/vs/editor/common/core/range';
import { ITokenizerProvider, TokenizationEndpoint } from '../../tokenizer/node/tokenizer';
import { FileChunk } from '../common/chunk';
import { GlobalChunkingDefaults } from '../common/chunkingService';

// Import individual chunkers from explicit subpath exports to avoid issues with package root resolution.
// The chonkie package.json defines subpath exports like ./chunker/token, ./chunker/sentence, etc.
// Using these prevents activation errors about missing "exports" main.
// eslint-disable-next-line @typescript-eslint/no-var-requires
// const { TokenChunker } = require('chonkie/chunker/token');
// // eslint-disable-next-line @typescript-eslint/no-var-requires
// const { SentenceChunker } = require('chonkie/chunker/sentence');
// // eslint-disable-next-line @typescript-eslint/no-var-requires
// const { RecursiveChunker } = require('chonkie/chunker/recursive');
// CodeChunker is optional (web-tree-sitter heavy); load lazily only when method invoked.
// type CodeChunkerType = { create(): Promise<any> };
// let CodeChunkerLazy: CodeChunkerType | undefined;
// function getCodeChunker(): CodeChunkerType {
// 	if (!CodeChunkerLazy) {
// 		// eslint-disable-next-line @typescript-eslint/no-var-requires
// 		CodeChunkerLazy = require('chonkie/chunker/code').CodeChunker as CodeChunkerType;
// 	}
// 	return CodeChunkerLazy!;
// }

// chonkie package exposes CommonJS exports; esbuild warned about ESM named import.
// Use require() to avoid "import-is-undefined" warning.
// eslint-disable-next-line @typescript-eslint/no-var-requires
// const { TokenChunker } = require('chonkie');

/**
 * Resolve the default max chunk size (token length). Reads from environment variable
 * COPILOT_CHAT_MAX_CHUNK_TOKENS if present; falls back to 250.
 * This indirection allows dynamic tuning without code changes.
 */
export function get_max_chunk_size_token(): number {
	return GlobalChunkingDefaults.maxTokenLength;
}



interface IChunkedLine {
	readonly text: string;
	readonly lineNumber: number;
}

export class NaiveChunker {
	/**
	 * A globally configurable override for the default max token length used when chunking.
	 * If set (non-undefined), chunking callers that omit maxTokenLength will use this value
	 * instead of reading from workspace configuration via get_max_chunk_size_token().
	 * External code may assign to this to dynamically tune chunk sizes without restarting.
	 */
	public static globalDefaultMaxTokenLength: number = 250;
	public static globalDefaultStrategy: string = 'token';
	private readonly tokenizer: ITokenizer;

	constructor(
		endpoint: TokenizationEndpoint,
		@ITokenizerProvider tokenizerProvider: ITokenizerProvider
	) {
		this.tokenizer = tokenizerProvider.acquireTokenizer(endpoint);
	}

	async chunkFile(uri: URI, text: string, {
		maxTokenLength = NaiveChunker.globalDefaultMaxTokenLength ?? get_max_chunk_size_token(),
		removeEmptyLines = true,
	}: {
		maxTokenLength?: number;
		removeEmptyLines?: boolean;
	}, token: CancellationToken): Promise<FileChunk[]> {
		// Attempt chonkie-based token chunking first. Fallback to legacy line/token algorithm on failure.
		/**
		 * Chunking strategy selection:
		 * 'token' => TokenChunker (default)
		 * 'sentence' => SentenceChunker grouped by token length
		 * 'recursive' => RecursiveChunker grouped by token length
		 * 'code' => CodeChunker (structure-aware) grouped by token length
		 */

		const strategy = GlobalChunkingDefaults.strategy;

		try {
			if (token.isCancellationRequested) {
				return [];
			}
			switch (strategy) {
				case 'recursive':
					return await this._processRecursiveChunks(uri, text, maxTokenLength, removeEmptyLines, token);
				case 'token':
				default:
					return await this._processChonkieTokenChunks(uri, text, maxTokenLength, removeEmptyLines, token);
			}
		} catch (e) {
			// Fallback to legacy implementation
			const chunks: FileChunk[] = [];
			for await (const chunk of this._processLinesIntoChunks(
				uri, text, maxTokenLength, true, removeEmptyLines, token
			)) {
				if (token.isCancellationRequested) { return []; }
				if (!removeEmptyLines || (!!chunk.text.length && /[\w\d]{2}/.test(chunk.text))) { chunks.push(chunk); }
			}
			return chunks;
		}
	}

	private async _processChonkieTokenChunks(
		uri: URI,
		text: string,
		maxTokenLength: number,
		removeEmptyLines: boolean,
		token: CancellationToken,
	): Promise<FileChunk[]> {
		const chunker = await TokenChunker.create({ chunkSize: maxTokenLength });
		if (token.isCancellationRequested) {
			return [];
		}
		const rawChunks = await chunker.chunk(text);
		if (token.isCancellationRequested) {
			return [];
		}
		// Precompute line starts
		const lineStartOffsets: number[] = [0];
		for (let i = 0; i < text.length; i++) {
			if (text[i] === '\n') { lineStartOffsets.push(i + 1); }
		}
		const offsetToLineColumn = (offset: number): { line: number; column: number } => {
			let low = 0; let high = lineStartOffsets.length - 1;
			while (low <= high) {
				const mid = (low + high) >> 1;
				const start = lineStartOffsets[mid];
				const next = mid + 1 < lineStartOffsets.length ? lineStartOffsets[mid + 1] : text.length + 1;
				if (offset < start) { high = mid - 1; }
				else if (offset >= next) { low = mid + 1; }
				else { return { line: mid, column: offset - start }; }
			}
			return { line: lineStartOffsets.length - 1, column: offset - lineStartOffsets[lineStartOffsets.length - 1] };
		};

		const result: FileChunk[] = [];
		let searchOffset = 0;
		for (let i = 0; i < rawChunks.length; i++) {
			if (token.isCancellationRequested) { return []; }
			let chunkText = rawChunks[i].text ?? '';
			if (removeEmptyLines) {
				chunkText = splitLines(chunkText).filter(l => !isFalsyOrWhitespace(l)).join('\n');
			}
			if (!chunkText.length || (removeEmptyLines && !(/[\w\d]{2}/.test(chunkText)))) { continue; }
			let startOffset = searchOffset;
			if (text.substring(startOffset, startOffset + chunkText.length) !== chunkText) {
				const found = text.indexOf(chunkText, startOffset);
				if (found !== -1) { startOffset = found; }
			}
			const endOffset = startOffset + chunkText.length;
			const startLC = offsetToLineColumn(startOffset);
			const endLC = offsetToLineColumn(endOffset);
			const lines = splitLines(chunkText);
			const { trimmedLines, shortestLeadingCommonWhitespace } = trimCommonLeadingWhitespace(lines);
			const dedented = shortestLeadingCommonWhitespace.length ? trimmedLines.join('\n') : chunkText;
			result.push({
				file: uri,
				text: dedented,
				rawText: dedented,
				isFullFile: i === rawChunks.length - 1 && startLC.line === 0,
				range: new Range(startLC.line, startLC.column, endLC.line, endLC.column),
			});
			searchOffset = endOffset;
		}
		return result;
	}

	// private async _processSentenceChunks(
	// 	uri: URI,
	// 	text: string,
	// 	maxTokenLength: number,
	// 	removeEmptyLines: boolean,
	// 	token: CancellationToken,
	// ): Promise<FileChunk[]> {
	// 	const chunker = await SentenceChunker.create();
	// 	if (token.isCancellationRequested) { return []; }
	// 	const sentences = await chunker.chunk(text);
	// 	if (token.isCancellationRequested) { return []; }

	// 	// Group sentences into token-limited FileChunks similar to line-based logic
	// 	const lineStartOffsets: number[] = [0];
	// 	for (let i = 0; i < text.length; i++) { if (text[i] === '\n') { lineStartOffsets.push(i + 1); } }
	// 	const offsetToLineColumn = (offset: number): { line: number; column: number } => {
	// 		let low = 0; let high = lineStartOffsets.length - 1;
	// 		while (low <= high) {
	// 			const mid = (low + high) >> 1;
	// 			const start = lineStartOffsets[mid];
	// 			const next = mid + 1 < lineStartOffsets.length ? lineStartOffsets[mid + 1] : text.length + 1;
	// 			if (offset < start) { high = mid - 1; }
	// 			else if (offset >= next) { low = mid + 1; }
	// 			else { return { line: mid, column: offset - start }; }
	// 		}
	// 		return { line: lineStartOffsets.length - 1, column: offset - lineStartOffsets[lineStartOffsets.length - 1] };
	// 	};

	// 	const result: FileChunk[] = [];
	// 	let currentTextParts: string[] = [];
	// 	let currentTokenEstimate = 0;
	// 	let chunkStartOffset = 0;
	// 	for (let i = 0; i < sentences.length; i++) {
	// 		if (token.isCancellationRequested) { return []; }
	// 		const s = sentences[i];
	// 		let sentenceText = s.text ?? '';
	// 		if (removeEmptyLines) {
	// 			sentenceText = splitLines(sentenceText).filter(l => !isFalsyOrWhitespace(l)).join('\n');
	// 		}
	// 		if (!sentenceText.length) { continue; }
	// 		// crude token estimate using existing tokenizer to keep consistent
	// 		const sentenceTokens = await this.tokenizer.tokenLength(sentenceText);
	// 		if (currentTokenEstimate + sentenceTokens > maxTokenLength && currentTextParts.length) {
	// 			const assembled = currentTextParts.join(' ');
	// 			const startLC = offsetToLineColumn(chunkStartOffset);
	// 			const endOffset = chunkStartOffset + assembled.length;
	// 			const endLC = offsetToLineColumn(endOffset);
	// 			result.push({
	// 				file: uri,
	// 				text: assembled,
	// 				rawText: assembled,
	// 				isFullFile: false,
	// 				range: new Range(startLC.line, startLC.column, endLC.line, endLC.column),
	// 			});
	// 			chunkStartOffset = endOffset + 1; // assume a space
	// 			currentTextParts = [];
	// 			currentTokenEstimate = 0;
	// 		}
	// 		currentTextParts.push(sentenceText);
	// 		currentTokenEstimate += sentenceTokens;
	// 	}
	// 	if (currentTextParts.length) {
	// 		const assembled = currentTextParts.join(' ');
	// 		const startLC = offsetToLineColumn(chunkStartOffset);
	// 		const endOffset = chunkStartOffset + assembled.length;
	// 		const endLC = offsetToLineColumn(endOffset);
	// 		result.push({
	// 			file: uri,
	// 			text: assembled,
	// 			rawText: assembled,
	// 			isFullFile: chunkStartOffset === 0,
	// 			range: new Range(startLC.line, startLC.column, endLC.line, endLC.column),
	// 		});
	// 	}
	// 	return result;
	// }

	private async _processRecursiveChunks(
		uri: URI,
		text: string,
		maxTokenLength: number,
		removeEmptyLines: boolean,
		token: CancellationToken,
	): Promise<FileChunk[]> {
		const chunker = await RecursiveChunker.create();
		if (token.isCancellationRequested) { return []; }
		const recChunks = await chunker.chunk(text);
		if (token.isCancellationRequested) { return []; }

		// Similar grouping to sentence chunks: accumulate until token limit.
		const lineStartOffsets: number[] = [0];
		for (let i = 0; i < text.length; i++) { if (text[i] === '\n') { lineStartOffsets.push(i + 1); } }
		const offsetToLineColumn = (offset: number): { line: number; column: number } => {
			let low = 0; let high = lineStartOffsets.length - 1;
			while (low <= high) {
				const mid = (low + high) >> 1;
				const start = lineStartOffsets[mid];
				const next = mid + 1 < lineStartOffsets.length ? lineStartOffsets[mid + 1] : text.length + 1;
				if (offset < start) { high = mid - 1; }
				else if (offset >= next) { low = mid + 1; }
				else { return { line: mid, column: offset - start }; }
			}
			return { line: lineStartOffsets.length - 1, column: offset - lineStartOffsets[lineStartOffsets.length - 1] };
		};

		const result: FileChunk[] = [];
		let currentTextParts: string[] = [];
		let currentTokenEstimate = 0;
		let chunkStartOffset = 0;
		for (let i = 0; i < recChunks.length; i++) {
			if (token.isCancellationRequested) { return []; }
			let part = recChunks[i].text ?? '';
			if (removeEmptyLines) { part = splitLines(part).filter(l => !isFalsyOrWhitespace(l)).join('\n'); }
			if (!part.length) { continue; }
			const partTokens = await this.tokenizer.tokenLength(part);
			if (currentTokenEstimate + partTokens > maxTokenLength && currentTextParts.length) {
				const assembled = currentTextParts.join('\n');
				const startLC = offsetToLineColumn(chunkStartOffset);
				const endOffset = chunkStartOffset + assembled.length;
				const endLC = offsetToLineColumn(endOffset);
				result.push({
					file: uri,
					text: assembled,
					rawText: assembled,
					isFullFile: false,
					range: new Range(startLC.line, startLC.column, endLC.line, endLC.column),
				});
				chunkStartOffset = endOffset + 1;
				currentTextParts = [];
				currentTokenEstimate = 0;
			}
			currentTextParts.push(part);
			currentTokenEstimate += partTokens;
		}
		if (currentTextParts.length) {
			const assembled = currentTextParts.join('\n');
			const startLC = offsetToLineColumn(chunkStartOffset);
			const endOffset = chunkStartOffset + assembled.length;
			const endLC = offsetToLineColumn(endOffset);
			result.push({
				file: uri,
				text: assembled,
				rawText: assembled,
				isFullFile: chunkStartOffset === 0,
				range: new Range(startLC.line, startLC.column, endLC.line, endLC.column),
			});
		}
		return result;
	}

	// private async _processCodeChunks(
	// 	uri: URI,
	// 	text: string,
	// 	maxTokenLength: number,
	// 	removeEmptyLines: boolean,
	// 	token: CancellationToken,
	// ): Promise<FileChunk[]> {
	// 	// Load and create code chunker
	// 	const chunker = await CodeChunker.create();
	// 	if (token.isCancellationRequested) { return []; }
	// 	const codeChunks = await chunker.chunk(text);
	// 	if (token.isCancellationRequested) { return []; }

	// 	// Precompute line starts for mapping
	// 	const lineStartOffsets: number[] = [0];
	// 	for (let i = 0; i < text.length; i++) { if (text[i] === '\n') { lineStartOffsets.push(i + 1); } }
	// 	const offsetToLineColumn = (offset: number): { line: number; column: number } => {
	// 		let low = 0; let high = lineStartOffsets.length - 1;
	// 		while (low <= high) {
	// 			const mid = (low + high) >> 1;
	// 			const start = lineStartOffsets[mid];
	// 			const next = mid + 1 < lineStartOffsets.length ? lineStartOffsets[mid + 1] : text.length + 1;
	// 			if (offset < start) { high = mid - 1; }
	// 			else if (offset >= next) { low = mid + 1; }
	// 			else { return { line: mid, column: offset - start }; }
	// 		}
	// 		return { line: lineStartOffsets.length - 1, column: offset - lineStartOffsets[lineStartOffsets.length - 1] };
	// 	};

	// 	// Group code chunks further if they exceed token length (some code structures can be large)
	// 	const result: FileChunk[] = [];
	// 	let currentParts: string[] = [];
	// 	let currentTokens = 0;
	// 	let chunkStartOffset = 0;
	// 	for (let i = 0; i < codeChunks.length; i++) {
	// 		if (token.isCancellationRequested) { return []; }
	// 		let part = codeChunks[i].text ?? '';
	// 		if (removeEmptyLines) { part = splitLines(part).filter(l => !isFalsyOrWhitespace(l)).join('\n'); }
	// 		if (!part.length) { continue; }
	// 		const partTokens = await this.tokenizer.tokenLength(part);
	// 		if (currentTokens + partTokens > maxTokenLength && currentParts.length) {
	// 			const assembled = currentParts.join('\n');
	// 			const startLC = offsetToLineColumn(chunkStartOffset);
	// 			const endOffset = chunkStartOffset + assembled.length;
	// 			const endLC = offsetToLineColumn(endOffset);
	// 			result.push({
	// 				file: uri,
	// 				text: assembled,
	// 				rawText: assembled,
	// 				isFullFile: false,
	// 				range: new Range(startLC.line, startLC.column, endLC.line, endLC.column),
	// 			});
	// 			chunkStartOffset = endOffset + 1;
	// 			currentParts = [];
	// 			currentTokens = 0;
	// 		}
	// 		currentParts.push(part);
	// 		currentTokens += partTokens;
	// 	}
	// 	if (currentParts.length) {
	// 		const assembled = currentParts.join('\n');
	// 		const startLC = offsetToLineColumn(chunkStartOffset);
	// 		const endOffset = chunkStartOffset + assembled.length;
	// 		const endLC = offsetToLineColumn(endOffset);
	// 		result.push({
	// 			file: uri,
	// 			text: assembled,
	// 			rawText: assembled,
	// 			isFullFile: chunkStartOffset === 0,
	// 			range: new Range(startLC.line, startLC.column, endLC.line, endLC.column),
	// 		});
	// 	}
	// 	return result;
	// }

	private async *_processLinesIntoChunks(
		uri: URI,
		text: string,
		maxTokenLength: number,
		shouldDedent: boolean,
		removeEmptyLines: boolean,
		token: CancellationToken,
	): AsyncIterable<FileChunk> {
		const originalLines = splitLines(text);

		const accumulatingChunk: IChunkedLine[] = [];
		let usedTokensInChunk = 0;
		let longestCommonWhitespaceInChunk: string | undefined;

		for (let i = 0; i < originalLines.length; ++i) {
			const line = originalLines[i];
			if (removeEmptyLines && isFalsyOrWhitespace(line)) {
				continue;
			}

			const lineText = line.slice(0, maxTokenLength * 4).trimEnd();
			const lineTokenCount = await this.tokenizer.tokenLength(lineText);
			if (token.isCancellationRequested) {
				return;
			}

			if (longestCommonWhitespaceInChunk === undefined || longestCommonWhitespaceInChunk.length > 0) {
				const leadingWhitespaceMatches = line.match(/^\s+/);
				const currentLeadingWhitespace = leadingWhitespaceMatches ? leadingWhitespaceMatches[0] : '';

				longestCommonWhitespaceInChunk = longestCommonWhitespaceInChunk
					? commonLeadingStr(longestCommonWhitespaceInChunk, currentLeadingWhitespace)
					: currentLeadingWhitespace;
			}

			if (usedTokensInChunk + lineTokenCount > maxTokenLength) {
				// Emit previous chunk and reset state
				const chunk = this.finalizeChunk(uri, accumulatingChunk, shouldDedent, longestCommonWhitespaceInChunk ?? '', false);
				if (chunk) {
					yield chunk;
				}

				accumulatingChunk.length = 0;
				usedTokensInChunk = 0;
				longestCommonWhitespaceInChunk = undefined;
			}

			accumulatingChunk.push({
				text: lineText,
				lineNumber: i,
			});
			usedTokensInChunk += lineTokenCount;
		}

		const finalChunk = this.finalizeChunk(uri, accumulatingChunk, shouldDedent, longestCommonWhitespaceInChunk ?? '', true);
		if (finalChunk) {
			yield finalChunk;
		}
	}

	private finalizeChunk(file: URI, chunkLines: readonly IChunkedLine[], shouldDedent: boolean, leadingWhitespace: string, isLastChunk: boolean): FileChunk | undefined {
		if (!chunkLines.length) {
			return undefined;
		}

		const finalizedChunkText = shouldDedent
			? chunkLines.map(x => x.text.substring(leadingWhitespace.length)).join('\n')
			: chunkLines.map(x => x.text).join('\n');

		const lastLine = chunkLines[chunkLines.length - 1];
		return {
			file: file,
			// For naive chunking, the raw text is the same as the processed text
			text: finalizedChunkText,
			rawText: finalizedChunkText,
			isFullFile: isLastChunk && chunkLines[0].lineNumber === 0,
			range: new Range(
				chunkLines[0].lineNumber,
				0,
				lastLine.lineNumber,
				lastLine.text.length,
			),
		};
	}
}

export function trimCommonLeadingWhitespace(lines: string[]): { trimmedLines: string[]; shortestLeadingCommonWhitespace: string } {
	let longestCommonWhitespace: string | undefined;
	for (const line of lines) {
		const leadingWhitespaceMatches = line.match(/^\s+/);
		const currentLeadingWhitespace = leadingWhitespaceMatches ? leadingWhitespaceMatches[0] : '';

		if (longestCommonWhitespace === undefined) {
			longestCommonWhitespace = currentLeadingWhitespace;
		} else {
			longestCommonWhitespace = commonLeadingStr(longestCommonWhitespace, currentLeadingWhitespace);
		}

		if (!longestCommonWhitespace || longestCommonWhitespace.length === 0) {
			// No common leading whitespace, no need to continue
			return {
				trimmedLines: lines,
				shortestLeadingCommonWhitespace: '',
			};
		}
	}

	const dedentLength = (longestCommonWhitespace ?? '').length;
	return {
		trimmedLines: lines.map(e => e.substring(dedentLength)),
		shortestLeadingCommonWhitespace: longestCommonWhitespace ?? '',
	};
}

function commonLeadingStr(str1: string, str2: string) {
	const prefixLength = commonPrefixLength(str1, str2);
	return str1.substring(0, prefixLength);
}
