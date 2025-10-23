/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RequestMetadata, RequestType } from '@vscode/copilot-api';
import { workspace } from 'vscode';
import { ITokenizer, TokenizerType } from '../../../util/common/tokenizer';
import { GlobalChunkingDefaults } from '../../chunking/common/chunkingService';
import { LEGACY_EMBEDDING_MODEL_ID } from '../../embeddings/common/embeddingsComputer';
import { IEmbeddingsEndpoint } from '../../networking/common/networking';
import { ITokenizerProvider } from '../../tokenizer/node/tokenizer';
import { IEmbeddingModelInformation } from '../common/endpointProvider';

export class EmbeddingEndpoint implements IEmbeddingsEndpoint {
	public readonly maxBatchSize: number;
	public readonly modelMaxPromptTokens: number;
	public readonly tokenizer: TokenizerType;

	public readonly name = this._modelInfo.name;
	public readonly version = this._modelInfo.version;
	public readonly family = this._modelInfo.capabilities.family;

	constructor(
		private _modelInfo: IEmbeddingModelInformation,
		@ITokenizerProvider private readonly _tokenizerProvider: ITokenizerProvider
	) {
		let config = workspace.getConfiguration('github.copilot.embeddingModel');

		this.tokenizer = config.get('tokenzier', this._modelInfo.capabilities.tokenizer);
		this.maxBatchSize = config.get('max_chunk_bacth', this._modelInfo.capabilities.limits?.max_inputs ?? 256);
		this.modelMaxPromptTokens = config.get('max_chunk_tokens', 250);
		GlobalChunkingDefaults.maxTokenLength = config.get('max_chunk_tokens', 250);
		GlobalChunkingDefaults.strategy = config.get('chunk_strategy', 'token');
	}

	public acquireTokenizer(): ITokenizer {
		return this._tokenizerProvider.acquireTokenizer(this);
	}

	public get urlOrRequestMetadata(): string | RequestMetadata {
		return { type: RequestType.CAPIEmbeddings, modelId: LEGACY_EMBEDDING_MODEL_ID.TEXT3SMALL };
	}
}
