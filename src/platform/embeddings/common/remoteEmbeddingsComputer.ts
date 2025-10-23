/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RequestType } from '@vscode/copilot-api';
import { workspace, type CancellationToken } from 'vscode';
import { createRequestHMAC } from '../../../util/common/crypto';
import { CallTracker, TelemetryCorrelationId } from '../../../util/common/telemetryCorrelationId';
import { Limiter } from '../../../util/vs/base/common/async';
import { env } from '../../../util/vs/base/common/process';
import { generateUuid } from '../../../util/vs/base/common/uuid';
import { IAuthenticationService } from '../../authentication/common/authentication';
import { getGithubMetadataHeaders } from '../../chunking/common/chunkingEndpointClientImpl';
import { ICAPIClientService } from '../../endpoint/common/capiClient';
import { IEndpointProvider } from '../../endpoint/common/endpointProvider';
import { IEnvService } from '../../env/common/envService';
import { logExecTime } from '../../log/common/logExecTime';
import { ILogService } from '../../log/common/logService';
import { IFetcherService } from '../../networking/common/fetcherService';
import { IEmbeddingsEndpoint, postRequest } from '../../networking/common/networking';
import { ITelemetryService } from '../../telemetry/common/telemetry';
import { ComputeEmbeddingsOptions, Embedding, EmbeddingType, EmbeddingTypeInfo, EmbeddingVector, Embeddings, IEmbeddingsComputer, getWellKnownEmbeddingTypeInfo } from './embeddingsComputer';

interface CAPIEmbeddingResults {
	readonly type: 'success';
	readonly embeddings: EmbeddingVector[];
}
interface CAPIEmbeddingError {
	readonly type: 'failed';
	readonly reason: string;
}

export class RemoteEmbeddingsComputer implements IEmbeddingsComputer {

	declare readonly _serviceBrand: undefined;

	private readonly batchSize = 100;

	constructor(
		@IAuthenticationService private readonly _authService: IAuthenticationService,
		@ICAPIClientService private readonly _capiClientService: ICAPIClientService,
		@IEnvService private readonly _envService: IEnvService,
		@IFetcherService private readonly _fetcherService: IFetcherService,
		@ILogService private readonly _logService: ILogService,
		@ITelemetryService private readonly _telemetryService: ITelemetryService,
		@IEndpointProvider private readonly _endpointProvider: IEndpointProvider,
	) { }

	public async computeEmbeddings(
		embeddingType: EmbeddingType,
		inputs: readonly string[],
		options?: ComputeEmbeddingsOptions,
		telemetryInfo?: TelemetryCorrelationId,
		cancellationToken?: CancellationToken,
	): Promise<Embeddings> {
		return logExecTime(this._logService, 'RemoteEmbeddingsComputer::computeEmbeddings', async () => {

			let config = workspace.getConfiguration('github.copilot.embeddingModel');

			// Determine endpoint type: use CAPI for no-auth users, otherwise use GitHub
			// const copilotToken = await this._authService.getCopilotToken();
			if (config.has('enable') && config.get('enable')) {
				const embeddings = await this.computeCAPIEmbeddings(inputs, options, cancellationToken);
				return embeddings ?? { type: embeddingType, values: [] };
			}

			const token = (await this._authService.getAnyGitHubSession({ silent: true }))?.accessToken;
			if (!token) {
				throw Error('getAnyGitHubSession error');
			}

			const embeddingsOut: Embedding[] = [];
			for (let i = 0; i < inputs.length; i += this.batchSize) {
				const batch = inputs.slice(i, i + this.batchSize);
				if (!batch.length) {
					break;
				}

				const body: {
					inputs: readonly string[];
					input_type: 'document' | 'query';
					embedding_model: string;
				} = {
					inputs: batch,
					input_type: options?.inputType ?? 'document',
					embedding_model: embeddingType.id,
				};
				const response = await postRequest(
					this._fetcherService,
					this._telemetryService,
					this._capiClientService,
					{ type: RequestType.DotcomEmbeddings },
					token,
					await createRequestHMAC(env.HMAC_SECRET),
					'copilot-panel',
					generateUuid(),
					body as any,
					getGithubMetadataHeaders(telemetryInfo?.callTracker ?? new CallTracker(), this._envService),
					cancellationToken
				);
				if (!response.ok) {
					/* __GDPR__
						"remoteEmbeddingsComputer.computeEmbeddings.error" : {
							"owner": "mjbvz",
							"comment": "Total time for searchFileChunks to complete",
							"source": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Caller" },
							"correlationId": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Correlation id" },
							"embeddingType": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Embedding type" },
							"totalInputLength": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Total length of the input" },
							"batchInputLength": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Total length of the batch" },
							"statusCode": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Status code of the response" }
						}
					*/
					this._telemetryService.sendMSFTTelemetryEvent('remoteEmbeddingsComputer.computeEmbeddings.error', {
						source: telemetryInfo?.callTracker.toString(),
						correlationId: telemetryInfo?.correlationId,
						embeddingType: embeddingType.id,
					}, {
						totalInputLength: inputs.length,
						batchInputLength: batch.length,
						statusCode: response.status,
					});
					throw new Error(`Error fetching embeddings: ${response.status}`);
				}

				type EmbeddingResponse = {
					embedding_model: string;
					embeddings: Array<{ embedding: number[] }>;
				};
				const jsonResponse: EmbeddingResponse = await response.json();

				const resolvedType = new EmbeddingType(jsonResponse.embedding_model);
				if (!resolvedType.equals(embeddingType)) {
					throw new Error(`Unexpected embedding model. Got: ${resolvedType}. Expected: ${embeddingType}`);
				}

				if (batch.length !== jsonResponse.embeddings.length) {
					throw new Error(`Mismatched embedding result count. Expected: ${batch.length}. Got: ${jsonResponse.embeddings.length}`);
				}

				embeddingsOut.push(...jsonResponse.embeddings.map(embedding => ({
					type: resolvedType,
					value: embedding.embedding,
				})));
			}

			return { type: embeddingType, values: embeddingsOut };
		});
	}

	private async computeCAPIEmbeddings(
		inputs: readonly string[],
		options?: ComputeEmbeddingsOptions,
		cancellationToken?: CancellationToken,
	) {
		const typeInfo = getWellKnownEmbeddingTypeInfo(EmbeddingType.text3small_512);
		if (!typeInfo) {
			throw new Error(`Embeddings type info not found: ${EmbeddingType.text3small_512}`);
		}
		const endpoint = await this._endpointProvider.getEmbeddingsEndpoint('text3small');
		const batchSize = endpoint.maxBatchSize;
		// Open AI seems to allow 1 less than max tokens for the model requests. So if the max tokens is 8192, we can only send 8191 tokens.
		const maxTokens = endpoint.modelMaxPromptTokens - 1;
		return this.fetchResponseWithBatches(typeInfo, endpoint, inputs, cancellationToken, maxTokens, batchSize);
	}

	/**
	 * A recursive helper that drives the public `fetchResponse` function. This allows accepting a batch and supports backing off the endpoint.
	 * @param inputs The inputs to get embeddings for
	 * @param cancellationToken A cancellation token to allow cancelling the requests
	 * @param batchSize The batch size to calculate
	 * @returns The embeddings
	 */
	private async fetchResponseWithBatches(
		type: EmbeddingTypeInfo,
		endpoint: IEmbeddingsEndpoint,
		inputs: readonly string[],
		cancellationToken: CancellationToken | undefined,
		maxTokens: number,
		batchSize: number,
		parallelism = 1,
	): Promise<Embeddings | undefined> {
		// First we loop through all inputs and count their token length, if one exceeds max tokens then we fail
		for (const input of inputs) {
			const inputTokenLength = await endpoint.acquireTokenizer().tokenLength(input);
			if (inputTokenLength > maxTokens) {
				return undefined;
			}
		}

		let embeddings: EmbeddingVector[] = [];
		const promises: Promise<CAPIEmbeddingResults | undefined>[] = [];
		const limiter = new Limiter<CAPIEmbeddingResults | undefined>(parallelism);
		try {
			for (let i = 0; i < inputs.length; i += batchSize) {
				const currentBatch = inputs.slice(i, i + batchSize);
				promises.push(limiter.queue(async () => {
					if (cancellationToken?.isCancellationRequested) {
						return;
					}

					const r = await this.rawEmbeddingsFetchWithTelemetry(type, endpoint, generateUuid(), currentBatch, cancellationToken);
					if (r.type === 'failed') {
						throw new Error('Embeddings request failed ' + r.reason);
					}
					return r;
				}));
			}

			embeddings = (await Promise.all(promises)).flatMap(response => response?.embeddings ?? []);
		} catch (e) {
			console.log(e);
			return undefined;
		} finally {
			limiter.dispose();
		}

		if (cancellationToken?.isCancellationRequested) {
			return undefined;
		}

		// If there are no embeddings, return undefined
		if (embeddings.length === 0) {
			return undefined;
		}
		return { type: EmbeddingType.text3small_512, values: embeddings.map((value): Embedding => ({ type: EmbeddingType.text3small_512, value })) };
	}

	private async rawEmbeddingsFetchWithTelemetry(
		type: EmbeddingTypeInfo,
		endpoint: IEmbeddingsEndpoint,
		requestId: string,
		inputs: readonly string[],
		cancellationToken: CancellationToken | undefined
	) {
		const startTime = Date.now();
		const rawRequest = await this.rawEmbeddingsFetch(type, endpoint, requestId, inputs, cancellationToken);
		if (rawRequest.type === 'failed') {
			this._telemetryService.sendMSFTTelemetryErrorEvent('embedding.error', {
				type: rawRequest.type,
				reason: rawRequest.reason
			});
			return rawRequest;
		}

		const tokenizer = endpoint.acquireTokenizer();
		const tokenCounts = await Promise.all(inputs.map(input => tokenizer.tokenLength(input)));
		const inputTokenCount = tokenCounts.reduce((acc, count) => acc + count, 0);
		this._telemetryService.sendMSFTTelemetryEvent('embedding.success', {}, {
			batchSize: inputs.length,
			inputTokenCount,
			timeToComplete: Date.now() - startTime
		});
		return rawRequest;
	}

	/**
	 * The function which actually makes the request to the API and handles failures.
	 * This is separated out from fetchResponse as fetchResponse does some manipulation to the input and handles errors differently
	 */
	public async rawEmbeddingsFetch(
		type: EmbeddingTypeInfo,
		endpoint: IEmbeddingsEndpoint,
		requestId: string,
		inputs: readonly string[],
		cancellationToken: CancellationToken | undefined
	): Promise<CAPIEmbeddingResults | CAPIEmbeddingError> {
		try {
			let token = '';
			try {
				token = (await this._authService.getCopilotToken()).token;
			} catch (e) {

			}

			const body = { input: inputs, model: type.model, dimensions: type.dimensions };
			endpoint.interceptBody?.(body);
			const response = await postRequest(
				this._fetcherService,
				this._telemetryService,
				this._capiClientService,
				endpoint,
				token,
				await createRequestHMAC(env.HMAC_SECRET),
				'copilot-panel',
				requestId,
				body,
				undefined,
				cancellationToken
			);
			const jsonResponse = response.status === 200 ? await response.json() : await response.text();

			type EmbeddingResponse = {
				object: string;
				index: number;
				embedding: number[];
			};
			if (response.status === 200 && jsonResponse.data) {
				return { type: 'success', embeddings: jsonResponse.data.map((d: EmbeddingResponse) => d.embedding) };
			} else {
				return { type: 'failed', reason: jsonResponse.error };
			}
		} catch (e) {
			let errorMessage = (e as Error)?.message ?? 'Unknown error';
			// Timeouts = JSON parse errors because the response is incomplete
			if (errorMessage.match(/Unexpected.*JSON/i)) {
				errorMessage = 'timeout';
			}
			return { type: 'failed', reason: errorMessage };

		}
	}
}
