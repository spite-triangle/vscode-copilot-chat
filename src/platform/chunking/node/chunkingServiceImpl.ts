/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { TokenizerType } from '../../../util/common/tokenizer';
import type { CancellationToken } from '../../../util/vs/base/common/cancellation';
import type { Uri } from '../../../vscodeTypes';
import { TokenizationEndpoint } from '../../tokenizer/node/tokenizer';
import type { FileChunk } from '../common/chunk';
import { ChunkingOptions, IChunkingService } from '../common/chunkingService';
import { INaiveChunkingService } from './naiveChunkerService';

/**
 * 连接已有的 NaiveChunkingService 到通用的 IChunkingService 接口。
 * 如果未来需要更复杂的策略（例如多算法选择、缓存、并行 worker），可以在这里扩展。
 */
export class ChunkingServiceImpl implements IChunkingService {
	declare readonly _serviceBrand: undefined;

	constructor(
		@INaiveChunkingService private readonly naive: INaiveChunkingService,
		// 默认 tokenizer 端点：这里可以换成配置或注入策略
		private readonly defaultEndpoint: TokenizationEndpoint = { tokenizer: TokenizerType.CL100K }
	) { }

	async chunkFile(fileUri: Uri, text: string, options: ChunkingOptions, token: CancellationToken): Promise<FileChunk[]> {
		// 直接委托给 naive chunker
		return this.naive.chunkFile(this.defaultEndpoint, fileUri, text, options, token);
	}
}
