"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NaiveChunker = exports.MAX_CHUNK_SIZE_TOKENS = void 0;
exports.trimCommonLeadingWhitespace = trimCommonLeadingWhitespace;
const strings_1 = require("../../../util/vs/base/common/strings");
const range_1 = require("../../../util/vs/editor/common/core/range");
const tokenizer_1 = require("../../tokenizer/node/tokenizer");
exports.MAX_CHUNK_SIZE_TOKENS = 250;
let NaiveChunker = class NaiveChunker {
    constructor(endpoint, tokenizerProvider) {
        this.tokenizer = tokenizerProvider.acquireTokenizer(endpoint);
    }
    async chunkFile(uri, text, { maxTokenLength = exports.MAX_CHUNK_SIZE_TOKENS, removeEmptyLines = true, }, token) {
        const chunks = [];
        for await (const chunk of this._processLangchain(uri, text, maxTokenLength, true, removeEmptyLines, token)) {
            if (token.isCancellationRequested) {
                return [];
            }
            if (!removeEmptyLines || (!!chunk.text.length && /[\w\d]{2}/.test(chunk.text))) {
                chunks.push(chunk);
            }
        }
        return chunks;
    }
    async *_processLangchain(uri, text, maxTokenLength, shouldDedent, removeEmptyLines, token) {
        // Create a splitter that splits by tokens rather than characters
        // We need to convert maxTokenLength to approximate character count
        // Using a rough estimate of 4 characters per token for safety
        const estimatedCharChunkSize = maxTokenLength * 2.5;
        const estimatedCharOverlap = Math.min(200, estimatedCharChunkSize * 0.2);
        let splitter = new RecursiveCharacterTextSplitter({
            chunkSize: estimatedCharChunkSize,
            chunkOverlap: estimatedCharOverlap,
        });
        const docs = await splitter.createDocuments([text]);
        if (token.isCancellationRequested) {
            return;
        }
        // Convert documents to FileChunk format
        let currentCharOffset = 0;
        const originalLines = (0, strings_1.splitLines)(text);
        for (const doc of docs) {
            if (token.isCancellationRequested) {
                return;
            }
            const chunkText = doc.pageContent;
            if (!chunkText.trim()) {
                currentCharOffset += chunkText.length + 1; // +1 for newline
                continue;
            }
            // Find the line range for this chunk
            let startLine = 0;
            let endLine = 0;
            let charCount = 0;
            // Find start line
            for (let i = 0; i < originalLines.length; i++) {
                const line = originalLines[i];
                if (charCount + line.length + (i > 0 ? 1 : 0) > currentCharOffset) {
                    startLine = i;
                    break;
                }
                charCount += line.length + (i > 0 ? 1 : 0);
            }
            // Find end line
            charCount = currentCharOffset;
            for (let i = startLine; i < originalLines.length; i++) {
                const line = originalLines[i];
                const lineWithNewline = line + (i < originalLines.length - 1 ? '\n' : '');
                if (charCount + lineWithNewline.length >= currentCharOffset + chunkText.length) {
                    endLine = i;
                    break;
                }
                charCount += lineWithNewline.length;
            }
            // Apply dedent if needed
            let processedText = chunkText;
            if (shouldDedent) {
                const chunkLines = (0, strings_1.splitLines)(chunkText);
                const { trimmedLines, shortestLeadingCommonWhitespace } = trimCommonLeadingWhitespace(chunkLines);
                processedText = trimmedLines.join('\n');
            }
            // Skip empty chunks if removeEmptyLines is true
            if (removeEmptyLines && (!processedText.length || !/[\w\d]{2}/.test(processedText))) {
                currentCharOffset += chunkText.length + 1;
                continue;
            }
            const chunk = {
                file: uri,
                text: processedText,
                rawText: chunkText,
                isFullFile: false, // Langchain chunks are never full files
                range: new range_1.Range(startLine, 0, endLine, originalLines[endLine]?.length ?? 0),
            };
            yield chunk;
            currentCharOffset += chunkText.length + 1; // +1 for newline
        }
    }
    async *_processLinesIntoChunks(uri, text, maxTokenLength, shouldDedent, removeEmptyLines, token) {
        const originalLines = (0, strings_1.splitLines)(text);
        const accumulatingChunk = [];
        let usedTokensInChunk = 0;
        let longestCommonWhitespaceInChunk;
        for (let i = 0; i < originalLines.length; ++i) {
            const line = originalLines[i];
            if (removeEmptyLines && (0, strings_1.isFalsyOrWhitespace)(line)) {
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
    finalizeChunk(file, chunkLines, shouldDedent, leadingWhitespace, isLastChunk) {
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
            range: new range_1.Range(chunkLines[0].lineNumber, 0, lastLine.lineNumber, lastLine.text.length),
        };
    }
};
exports.NaiveChunker = NaiveChunker;
exports.NaiveChunker = NaiveChunker = __decorate([
    __param(1, tokenizer_1.ITokenizerProvider)
], NaiveChunker);
function trimCommonLeadingWhitespace(lines) {
    let longestCommonWhitespace;
    for (const line of lines) {
        const leadingWhitespaceMatches = line.match(/^\s+/);
        const currentLeadingWhitespace = leadingWhitespaceMatches ? leadingWhitespaceMatches[0] : '';
        if (longestCommonWhitespace === undefined) {
            longestCommonWhitespace = currentLeadingWhitespace;
        }
        else {
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
function commonLeadingStr(str1, str2) {
    const prefixLength = (0, strings_1.commonPrefixLength)(str1, str2);
    return str1.substring(0, prefixLength);
}
//# sourceMappingURL=naiveChunker.js.map