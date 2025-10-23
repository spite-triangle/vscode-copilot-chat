/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createServiceIdentifier } from '../../../util/common/services';
import type { CancellationToken } from '../../../util/vs/base/common/cancellation';
import type { Uri } from '../../../vscodeTypes';
import type { FileChunk } from './chunk';

export interface ChunkingOptions {
	readonly maxTokenLength?: number;
	readonly validateChunkLengths?: boolean;
	readonly includeExtraBodyOutsideRange?: boolean; // only gets applied if limitToRange is set
	/**
	 * Whether to remove empty or whitespace-only lines from produced chunks.
	 * This mirrors the behavior in NaiveChunker and allows callers to control
	 * verbosity before downstream processing (e.g. embedding or semantic indexing).
	 * Defaults to true when not specified.
	 */
	readonly removeEmptyLines?: boolean;
	readonly strategy?: string;
}

/**
 * Global default chunking options. External code may assign to this object in order to
 * influence subsequent chunking calls that omit specific option fields. Only fields
 * explicitly set (non-undefined) here should be treated as overrides by implementations.
 *
 * Example:
 * import { GlobalChunkingDefaults } from '.../chunkingService';
 * GlobalChunkingDefaults.maxTokenLength = 400; // adjust default max token length
 */
export const GlobalChunkingDefaults: {
	maxTokenLength: number;
	strategy: string;
} = {
	maxTokenLength: 250,
	strategy: 'token'
};




export interface IChunkingService {
	readonly _serviceBrand: undefined;
	chunkFile(
		fileUri: Uri,
		text: string,
		options: ChunkingOptions,
		token: CancellationToken
	): Promise<FileChunk[]>;
}

export const IChunkingService = createServiceIdentifier<IChunkingService>('IChunkingService');
