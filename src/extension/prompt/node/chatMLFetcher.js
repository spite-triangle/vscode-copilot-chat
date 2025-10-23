"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatMLFetcherImpl = exports.AbstractChatMLFetcher = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const chatMLFetcher_1 = require("../../../platform/chat/common/chatMLFetcher");
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const conversationOptions_1 = require("../../../platform/chat/common/conversationOptions");
const globalStringUtils_1 = require("../../../platform/chat/common/globalStringUtils");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const logService_1 = require("../../../platform/log/common/logService");
const fetcherService_1 = require("../../../platform/networking/common/fetcherService");
const openai_1 = require("../../../platform/networking/common/openai");
const fetch_1 = require("../../../platform/openai/node/fetch");
const requestLogger_1 = require("../../../platform/requestLogger/node/requestLogger");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const telemetryData_1 = require("../../../platform/telemetry/common/telemetryData");
const anomalyDetection_1 = require("../../../util/common/anomalyDetection");
const errorsUtil = __importStar(require("../../../util/common/errors"));
const errors_1 = require("../../../util/vs/base/common/errors");
const event_1 = require("../../../util/vs/base/common/event");
const uuid_1 = require("../../../util/vs/base/common/uuid");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const openAIEndpoint_1 = require("../../byok/node/openAIEndpoint");
const constants_1 = require("../../common/constants");
class AbstractChatMLFetcher {
    constructor(options) {
        this.options = options;
        this._onDidMakeChatMLRequest = new event_1.Emitter();
        this.onDidMakeChatMLRequest = this._onDidMakeChatMLRequest.event;
    }
    preparePostOptions(requestOptions) {
        return {
            temperature: this.options.temperature,
            top_p: this.options.topP,
            // we disallow `stream=false` because we don't support non-streamed response
            ...requestOptions,
            stream: true
        };
    }
    async fetchOne(opts, token) {
        const resp = await this.fetchMany({
            ...opts,
            requestOptions: { ...opts.requestOptions, n: 1 }
        }, token);
        if (resp.type === commonTypes_1.ChatFetchResponseType.Success) {
            return { ...resp, value: resp.value[0] };
        }
        return resp;
    }
}
exports.AbstractChatMLFetcher = AbstractChatMLFetcher;
let ChatMLFetcherImpl = class ChatMLFetcherImpl extends AbstractChatMLFetcher {
    constructor(_fetcherService, _telemetryService, _requestLogger, _logService, _instantiationService, options) {
        super(options);
        this._fetcherService = _fetcherService;
        this._telemetryService = _telemetryService;
        this._requestLogger = _requestLogger;
        this._logService = _logService;
        this._instantiationService = _instantiationService;
    }
    /**
     * Note: the returned array of strings may be less than `n` (e.g., in case there were errors during streaming)
     */
    async fetchMany(opts, token) {
        let { debugName, endpoint: chatEndpoint, finishedCb, location, messages, requestOptions, source, telemetryProperties, userInitiatedRequest } = opts;
        if (!telemetryProperties) {
            telemetryProperties = {};
        }
        if (!telemetryProperties.messageSource) {
            telemetryProperties.messageSource = debugName;
        }
        // TODO @lramos15 telemetry should not drive request ids
        const ourRequestId = telemetryProperties.requestId ?? telemetryProperties.messageId ?? (0, uuid_1.generateUuid)();
        const maxResponseTokens = chatEndpoint.maxOutputTokens;
        if (!requestOptions?.prediction) {
            requestOptions = { max_tokens: maxResponseTokens, ...requestOptions };
        }
        // Avoid sending a prediction with no content as this will yield a 400 Bad Request
        if (!requestOptions.prediction?.content) {
            delete requestOptions['prediction'];
        }
        const postOptions = this.preparePostOptions(requestOptions);
        const requestBody = chatEndpoint.createRequestBody({
            ...opts,
            requestId: ourRequestId,
            postOptions
        });
        const baseTelemetry = telemetryData_1.TelemetryData.createAndMarkAsIssued({
            ...telemetryProperties,
            baseModel: chatEndpoint.model,
            uiKind: commonTypes_1.ChatLocation.toString(location)
        });
        const pendingLoggedChatRequest = this._requestLogger.logChatRequest(debugName, chatEndpoint, {
            messages: opts.messages,
            model: chatEndpoint.model,
            ourRequestId,
            location: opts.location,
            postOptions,
            body: requestBody,
            tools: requestBody.tools,
            ignoreStatefulMarker: opts.ignoreStatefulMarker
        });
        let tokenCount = -1;
        const streamRecorder = new chatMLFetcher_1.FetchStreamRecorder(finishedCb);
        const enableRetryOnError = opts.enableRetryOnError ?? opts.enableRetryOnFilter;
        try {
            let response;
            const payloadValidationResult = isValidChatPayload(opts.messages, postOptions);
            if (!payloadValidationResult.isValid) {
                response = {
                    type: fetch_1.FetchResponseKind.Failed,
                    modelRequestId: undefined,
                    failKind: fetch_1.ChatFailKind.ValidationFailed,
                    reason: payloadValidationResult.reason,
                };
            }
            else {
                response = await this._instantiationService.invokeFunction(accessor => (0, fetch_1.fetchAndStreamChat)(accessor, chatEndpoint, requestBody, baseTelemetry, streamRecorder.callback, requestOptions.secretKey, opts.location, ourRequestId, postOptions.n, userInitiatedRequest, token, telemetryProperties, opts.useFetcher));
                tokenCount = await chatEndpoint.acquireTokenizer().countMessagesTokens(messages);
                const extensionId = source?.extensionId ?? constants_1.EXTENSION_ID;
                this._onDidMakeChatMLRequest.fire({
                    messages,
                    model: chatEndpoint.model,
                    source: { extensionId },
                    tokenCount
                });
            }
            const timeToFirstToken = Date.now() - baseTelemetry.issuedTime;
            pendingLoggedChatRequest?.markTimeToFirstToken(timeToFirstToken);
            switch (response.type) {
                case fetch_1.FetchResponseKind.Success: {
                    const result = await this.processSuccessfulResponse(response, messages, requestBody, ourRequestId, maxResponseTokens, tokenCount, timeToFirstToken, streamRecorder, baseTelemetry, chatEndpoint, userInitiatedRequest);
                    // Handle FilteredRetry case with augmented messages
                    if (result.type === commonTypes_1.ChatFetchResponseType.FilteredRetry) {
                        if (opts.enableRetryOnFilter) {
                            streamRecorder.callback('', 0, { text: '', retryReason: result.category });
                            const filteredContent = result.value[0];
                            if (filteredContent) {
                                const retryMessage = (result.category === openai_1.FilterReason.Copyright) ?
                                    `The previous response (copied below) was filtered due to being too similar to existing public code. Please suggest something similar in function that does not match public code. Here's the previous response: ${filteredContent}\n\n` :
                                    `The previous response (copied below) was filtered due to triggering our content safety filters, which looks for hateful, self-harm, sexual, or violent content. Please suggest something similar in content that does not trigger these filters. Here's the previous response: ${filteredContent}\n\n`;
                                const augmentedMessages = [
                                    ...messages,
                                    {
                                        role: prompt_tsx_1.Raw.ChatRole.User,
                                        content: (0, globalStringUtils_1.toTextParts)(retryMessage)
                                    }
                                ];
                                // Retry with augmented messages
                                const retryResult = await this.fetchMany({
                                    debugName: 'retry-' + debugName,
                                    messages: augmentedMessages,
                                    finishedCb,
                                    location,
                                    endpoint: chatEndpoint,
                                    source,
                                    requestOptions,
                                    userInitiatedRequest: false, // do not mark the retry as user initiated
                                    telemetryProperties: { ...telemetryProperties, retryAfterFilterCategory: result.category ?? 'uncategorized' },
                                    enableRetryOnFilter: false,
                                    enableRetryOnError,
                                }, token);
                                pendingLoggedChatRequest?.resolve(retryResult, streamRecorder.deltas);
                                if (retryResult.type === commonTypes_1.ChatFetchResponseType.Success) {
                                    return retryResult;
                                }
                            }
                        }
                        return {
                            type: commonTypes_1.ChatFetchResponseType.Filtered,
                            category: result.category,
                            reason: 'Response got filtered.',
                            requestId: result.requestId,
                            serverRequestId: result.serverRequestId
                        };
                    }
                    pendingLoggedChatRequest?.resolve(result, streamRecorder.deltas);
                    return result;
                }
                case fetch_1.FetchResponseKind.Canceled:
                    this._sendCancellationTelemetry({
                        source: telemetryProperties.messageSource ?? 'unknown',
                        requestId: ourRequestId,
                        model: chatEndpoint.model,
                        apiType: chatEndpoint.apiType,
                        ...(telemetryProperties.retryAfterErrorCategory ? { retryAfterErrorCategory: telemetryProperties.retryAfterErrorCategory } : {}),
                        ...(telemetryProperties.retryAfterFilterCategory ? { retryAfterFilterCategory: telemetryProperties.retryAfterFilterCategory } : {}),
                    }, {
                        totalTokenMax: chatEndpoint.modelMaxPromptTokens ?? -1,
                        promptTokenCount: tokenCount,
                        tokenCountMax: maxResponseTokens,
                        timeToFirstToken,
                        timeToFirstTokenEmitted: (baseTelemetry && streamRecorder.firstTokenEmittedTime) ? streamRecorder.firstTokenEmittedTime - baseTelemetry.issuedTime : -1,
                        timeToCancelled: baseTelemetry ? Date.now() - baseTelemetry.issuedTime : -1,
                        isVisionRequest: this.filterImageMessages(messages) ? 1 : -1,
                        isBYOK: chatEndpoint instanceof openAIEndpoint_1.OpenAIEndpoint ? 1 : -1
                    });
                    pendingLoggedChatRequest?.resolveWithCancelation();
                    return this.processCanceledResponse(response, ourRequestId);
                case fetch_1.FetchResponseKind.Failed: {
                    const processed = this.processFailedResponse(response, ourRequestId);
                    this._sendResponseErrorTelemetry(processed, telemetryProperties, ourRequestId, chatEndpoint, requestBody, tokenCount, maxResponseTokens, timeToFirstToken, this.filterImageMessages(messages));
                    pendingLoggedChatRequest?.resolve(processed);
                    return processed;
                }
            }
        }
        catch (err) {
            const timeToError = Date.now() - baseTelemetry.issuedTime;
            const processed = this.processError(err, ourRequestId);
            if (['darwin', 'linux'].includes(process.platform) && processed.type === commonTypes_1.ChatFetchResponseType.NetworkError && processed.reason.indexOf('net::ERR_NETWORK_CHANGED') !== -1) {
                if (enableRetryOnError) {
                    this._logService.info('Retrying chat request with node-fetch after net::ERR_NETWORK_CHANGED error.');
                    streamRecorder.callback('', 0, { text: '', retryReason: 'network_error' });
                    // Retry with other fetchers
                    const retryResult = await this.fetchMany({
                        debugName: 'retry-error-' + debugName,
                        messages,
                        finishedCb,
                        location,
                        endpoint: chatEndpoint,
                        source,
                        requestOptions,
                        userInitiatedRequest: false, // do not mark the retry as user initiated
                        telemetryProperties: { ...telemetryProperties, retryAfterErrorCategory: 'electron-network-changed' },
                        enableRetryOnFilter: opts.enableRetryOnFilter,
                        enableRetryOnError: false,
                        useFetcher: 'node-fetch',
                    }, token);
                    pendingLoggedChatRequest?.resolve(retryResult, streamRecorder.deltas);
                    return retryResult;
                }
            }
            if (processed.type === commonTypes_1.ChatFetchResponseType.Canceled) {
                this._sendCancellationTelemetry({
                    source: telemetryProperties.messageSource ?? 'unknown',
                    requestId: ourRequestId,
                    model: chatEndpoint.model,
                    apiType: chatEndpoint.apiType
                }, {
                    totalTokenMax: chatEndpoint.modelMaxPromptTokens ?? -1,
                    promptTokenCount: tokenCount,
                    tokenCountMax: maxResponseTokens,
                    timeToFirstToken: undefined,
                    timeToCancelled: timeToError,
                    isVisionRequest: this.filterImageMessages(messages) ? 1 : -1,
                    isBYOK: chatEndpoint instanceof openAIEndpoint_1.OpenAIEndpoint ? 1 : -1
                });
            }
            else {
                this._sendResponseErrorTelemetry(processed, telemetryProperties, ourRequestId, chatEndpoint, requestBody, tokenCount, maxResponseTokens, timeToError, this.filterImageMessages(messages));
            }
            pendingLoggedChatRequest?.resolve(processed);
            return processed;
        }
    }
    _sendCancellationTelemetry({ source, requestId, model, apiType }, { totalTokenMax, promptTokenCount, tokenCountMax, timeToFirstToken, timeToFirstTokenEmitted, timeToCancelled, isVisionRequest, isBYOK }) {
        /* __GDPR__
            "response.cancelled" : {
                "owner": "digitarald",
                "comment": "Report canceled service responses for quality.",
                "model": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Model selection for the response" },
                "apiType": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "API type for the response- chat completions or responses" },
                "source": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Source for why the request was made" },
                "requestId": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Id of the request" },
                "totalTokenMax": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Maximum total token window", "isMeasurement": true },
                "promptTokenCount": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Number of prompt tokens", "isMeasurement": true },
                "tokenCountMax": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Maximum generated tokens", "isMeasurement": true },
                "timeToFirstToken": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Time to first token", "isMeasurement": true },
                "timeToFirstTokenEmitted": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Time to first token emitted (visible text)", "isMeasurement": true },
                "timeToCancelled": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Time to first token", "isMeasurement": true },
                "isVisionRequest": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Whether the request was for a vision model", "isMeasurement": true },
                "isBYOK": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the request was for a BYOK model", "isMeasurement": true },
                "retryAfterErrorCategory": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "If the response failed and this is a retry attempt, this contains the error category." },
                "retryAfterFilterCategory": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "If the response was filtered and this is a retry attempt, this contains the original filtered content category." }
            }
        */
        this._telemetryService.sendTelemetryEvent('response.cancelled', { github: true, microsoft: true }, {
            apiType,
            source,
            requestId,
            model,
        }, {
            totalTokenMax,
            promptTokenCount,
            tokenCountMax,
            timeToFirstToken,
            timeToFirstTokenEmitted,
            timeToCancelled,
            isVisionRequest,
            isBYOK
        });
    }
    _sendResponseErrorTelemetry(processed, telemetryProperties, ourRequestId, chatEndpointInfo, requestBody, tokenCount, maxResponseTokens, timeToFirstToken, isVisionRequest) {
        /* __GDPR__
            "response.error" : {
                "owner": "digitarald",
                "comment": "Report quality issue for when a service response failed.",
                "type": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Type of issue" },
                "reason": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Reason of issue" },
                "model": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Model selection for the response" },
                "apiType": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "API type for the response- chat completions or responses" },
                "source": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Source for why the request was made" },
                "requestId": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Id of the request" },
                "reasoningEffort": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Reasoning effort level" },
                "reasoningSummary": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Reasoning summary level" },
                "totalTokenMax": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Maximum total token window", "isMeasurement": true },
                "promptTokenCount": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Number of prompt tokens", "isMeasurement": true },
                "tokenCountMax": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Maximum generated tokens", "isMeasurement": true },
                "timeToFirstToken": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Time to first token", "isMeasurement": true },
                "timeToFirstTokenEmitted": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Time to first token emitted (visible text)", "isMeasurement": true },
                "isVisionRequest": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Whether the request was for a vision model", "isMeasurement": true },
                "isBYOK": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the request was for a BYOK model", "isMeasurement": true },
                "retryAfterErrorCategory": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "If the response failed and this is a retry attempt, this contains the error category." },
                "retryAfterFilterCategory": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "If the response was filtered and this is a retry attempt, this contains the original filtered content category." }
            }
        */
        this._telemetryService.sendTelemetryEvent('response.error', { github: true, microsoft: true }, {
            type: processed.type,
            reason: processed.reason,
            source: telemetryProperties?.messageSource ?? 'unknown',
            requestId: ourRequestId,
            model: chatEndpointInfo.model,
            apiType: chatEndpointInfo.apiType,
            reasoningEffort: requestBody.reasoning?.effort,
            reasoningSummary: requestBody.reasoning?.summary,
            ...(telemetryProperties?.retryAfterErrorCategory ? { retryAfterErrorCategory: telemetryProperties.retryAfterErrorCategory } : {}),
            ...(telemetryProperties?.retryAfterFilterCategory ? { retryAfterFilterCategory: telemetryProperties.retryAfterFilterCategory } : {})
        }, {
            totalTokenMax: chatEndpointInfo.modelMaxPromptTokens ?? -1,
            promptTokenCount: tokenCount,
            tokenCountMax: maxResponseTokens,
            timeToFirstToken,
            isVisionRequest: isVisionRequest ? 1 : -1,
            isBYOK: chatEndpointInfo instanceof openAIEndpoint_1.OpenAIEndpoint ? 1 : -1
        });
    }
    async processSuccessfulResponse(response, messages, requestBody, requestId, maxResponseTokens, promptTokenCount, timeToFirstToken, streamRecorder, baseTelemetry, chatEndpointInfo, userInitiatedRequest) {
        const completions = [];
        for await (const chatCompletion of response.chatCompletions) {
            /* __GDPR__
                "response.success" : {
                    "owner": "digitarald",
                    "comment": "Report quality details for a successful service response.",
                    "reason": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Reason for why a response finished" },
                    "filterReason": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Reason for why a response was filtered" },
                    "source": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Source of the initial request" },
                    "initiatorType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the request was initiated by a user or an agent" },
                    "model": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Model selection for the response" },
                    "apiType": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "API type for the response- chat completions or responses" },
                    "requestId": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Id of the current turn request" },
                    "reasoningEffort": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Reasoning effort level" },
                    "reasoningSummary": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Reasoning summary level" },
                    "totalTokenMax": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Maximum total token window", "isMeasurement": true },
                    "clientPromptTokenCount": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Number of prompt tokens, locally counted", "isMeasurement": true },
                    "promptTokenCount": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Number of prompt tokens, server side counted", "isMeasurement": true },
                    "promptCacheTokenCount": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Number of prompt tokens hitting cache as reported by server", "isMeasurement": true },
                    "tokenCountMax": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Maximum generated tokens", "isMeasurement": true },
                    "tokenCount": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Number of generated tokens", "isMeasurement": true },
                    "reasoningTokens": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Number of reasoning tokens", "isMeasurement": true },
                    "acceptedPredictionTokens": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Number of tokens in the prediction that appeared in the completion", "isMeasurement": true },
                    "rejectedPredictionTokens": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Number of tokens in the prediction that appeared in the completion", "isMeasurement": true },
                    "completionTokens": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Number of tokens in the output", "isMeasurement": true },
                    "timeToFirstToken": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Time to first token", "isMeasurement": true },
                    "timeToFirstTokenEmitted": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Time to first token emitted (visible text)", "isMeasurement": true },
                    "timeToComplete": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Time to complete the request", "isMeasurement": true },
                    "isVisionRequest": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Whether the request was for a vision model", "isMeasurement": true },
                    "isBYOK": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the request was for a BYOK model", "isMeasurement": true },
                    "retryAfterErrorCategory": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "If the response failed and this is a retry attempt, this contains the error category." },
                    "retryAfterFilterCategory": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "If the response was filtered and this is a retry attempt, this contains the original filtered content category." }
                }
            */
            this._telemetryService.sendTelemetryEvent('response.success', { github: true, microsoft: true }, {
                reason: chatCompletion.finishReason,
                filterReason: chatCompletion.filterReason,
                source: baseTelemetry?.properties.messageSource ?? 'unknown',
                initiatorType: userInitiatedRequest ? 'user' : 'agent',
                model: chatEndpointInfo?.model,
                apiType: chatEndpointInfo?.apiType,
                requestId,
                reasoningEffort: requestBody.reasoning?.effort,
                reasoningSummary: requestBody.reasoning?.summary,
                ...(baseTelemetry?.properties.retryAfterErrorCategory ? { retryAfterErrorCategory: baseTelemetry.properties.retryAfterErrorCategory } : {}),
                ...(baseTelemetry?.properties.retryAfterFilterCategory ? { retryAfterFilterCategory: baseTelemetry.properties.retryAfterFilterCategory } : {}),
            }, {
                totalTokenMax: chatEndpointInfo?.modelMaxPromptTokens ?? -1,
                tokenCountMax: maxResponseTokens,
                promptTokenCount: chatCompletion.usage?.prompt_tokens,
                promptCacheTokenCount: chatCompletion.usage?.prompt_tokens_details?.cached_tokens,
                clientPromptTokenCount: promptTokenCount,
                tokenCount: chatCompletion.usage?.total_tokens,
                reasoningTokens: chatCompletion.usage?.completion_tokens_details?.reasoning_tokens,
                acceptedPredictionTokens: chatCompletion.usage?.completion_tokens_details?.accepted_prediction_tokens,
                rejectedPredictionTokens: chatCompletion.usage?.completion_tokens_details?.rejected_prediction_tokens,
                completionTokens: chatCompletion.usage?.completion_tokens,
                timeToFirstToken,
                timeToFirstTokenEmitted: (baseTelemetry && streamRecorder.firstTokenEmittedTime) ? streamRecorder.firstTokenEmittedTime - baseTelemetry.issuedTime : -1,
                timeToComplete: baseTelemetry ? Date.now() - baseTelemetry.issuedTime : -1,
                isVisionRequest: this.filterImageMessages(messages) ? 1 : -1,
                isBYOK: chatEndpointInfo instanceof openAIEndpoint_1.OpenAIEndpoint ? 1 : -1
            });
            if (!this.isRepetitive(chatCompletion, baseTelemetry?.properties)) {
                completions.push(chatCompletion);
            }
        }
        const successFinishReasons = new Set([openai_1.FinishedCompletionReason.Stop, openai_1.FinishedCompletionReason.ClientTrimmed, openai_1.FinishedCompletionReason.FunctionCall, openai_1.FinishedCompletionReason.ToolCalls]);
        const successfulCompletions = completions.filter(c => successFinishReasons.has(c.finishReason));
        if (successfulCompletions.length >= 1) {
            return {
                type: commonTypes_1.ChatFetchResponseType.Success,
                usage: successfulCompletions.length === 1 ? successfulCompletions[0].usage : undefined,
                value: successfulCompletions.map(c => (0, globalStringUtils_1.getTextPart)(c.message.content)),
                requestId,
                serverRequestId: successfulCompletions[0].requestId.headerRequestId,
            };
        }
        const result = completions.at(0);
        switch (result?.finishReason) {
            case openai_1.FinishedCompletionReason.ContentFilter:
                return {
                    type: commonTypes_1.ChatFetchResponseType.FilteredRetry,
                    category: result.filterReason ?? openai_1.FilterReason.Copyright,
                    reason: 'Response got filtered.',
                    value: completions.map(c => (0, globalStringUtils_1.getTextPart)(c.message.content)),
                    requestId: requestId,
                    serverRequestId: result.requestId.headerRequestId,
                };
            case openai_1.FinishedCompletionReason.Length:
                return {
                    type: commonTypes_1.ChatFetchResponseType.Length,
                    reason: 'Response too long.',
                    requestId: requestId,
                    serverRequestId: result.requestId.headerRequestId,
                    truncatedValue: (0, globalStringUtils_1.getTextPart)(result.message.content)
                };
            case openai_1.FinishedCompletionReason.ServerError:
                return {
                    type: commonTypes_1.ChatFetchResponseType.Failed,
                    reason: 'Server error. Stream terminated',
                    requestId: requestId,
                    serverRequestId: result.requestId.headerRequestId,
                    streamError: result.error
                };
        }
        return {
            type: commonTypes_1.ChatFetchResponseType.Unknown,
            reason: 'Response contained no choices.',
            requestId: requestId,
            serverRequestId: result?.requestId.headerRequestId,
        };
    }
    filterImageMessages(messages) {
        return messages?.some(m => Array.isArray(m.content) ? m.content.some(c => 'imageUrl' in c) : false);
    }
    isRepetitive(chatCompletion, telemetryProperties) {
        const lineRepetitionStats = (0, anomalyDetection_1.calculateLineRepetitionStats)((0, globalStringUtils_1.getTextPart)(chatCompletion.message.content));
        const hasRepetition = (0, anomalyDetection_1.isRepetitive)(chatCompletion.tokens);
        if (hasRepetition) {
            const telemetryData = telemetryData_1.TelemetryData.createAndMarkAsIssued();
            telemetryData.extendWithRequestId(chatCompletion.requestId);
            const extended = telemetryData.extendedBy(telemetryProperties);
            this._telemetryService.sendEnhancedGHTelemetryEvent('conversation.repetition.detected', extended.properties, extended.measurements);
        }
        if (lineRepetitionStats.numberOfRepetitions >= 10) {
            /* __GDPR__
                "conversation.repetition.detected" : {
                    "owner": "lramos15",
                    "comment": "Calculates the number of repetitions in a response. Useful for loop detection",
                    "finishReason": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Reason for why a response finished. Helps identify cancellation vs length limits" },
                    "requestId": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Id for this message request." },
                    "lengthOfLine": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true, "comment": "Length of the repeating line, in characters." },
                    "numberOfRepetitions": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true, "comment": "Number of times the line repeats." },
                    "totalLines": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true, "comment": "Number of total lines in the response." }
                }
            */
            this._telemetryService.sendMSFTTelemetryEvent('conversation.repetition.detected', {
                requestId: chatCompletion.requestId.headerRequestId,
                finishReason: chatCompletion.finishReason,
            }, {
                numberOfRepetitions: lineRepetitionStats.numberOfRepetitions,
                lengthOfLine: lineRepetitionStats.mostRepeatedLine.length,
                totalLines: lineRepetitionStats.totalLines
            });
        }
        return hasRepetition;
    }
    processCanceledResponse(response, requestId) {
        return {
            type: commonTypes_1.ChatFetchResponseType.Canceled,
            reason: response.reason,
            requestId: requestId,
            serverRequestId: undefined,
        };
    }
    processFailedResponse(response, requestId) {
        const serverRequestId = response.modelRequestId?.headerRequestId;
        const reason = response.reason;
        if (response.failKind === fetch_1.ChatFailKind.RateLimited) {
            return { type: commonTypes_1.ChatFetchResponseType.RateLimited, reason, requestId, serverRequestId, retryAfter: response.data?.retryAfter, rateLimitKey: (response.data?.rateLimitKey || ''), capiError: response.data?.capiError };
        }
        if (response.failKind === fetch_1.ChatFailKind.QuotaExceeded) {
            return { type: commonTypes_1.ChatFetchResponseType.QuotaExceeded, reason, requestId, serverRequestId, retryAfter: response.data?.retryAfter, capiError: response.data?.capiError };
        }
        if (response.failKind === fetch_1.ChatFailKind.OffTopic) {
            return { type: commonTypes_1.ChatFetchResponseType.OffTopic, reason, requestId, serverRequestId };
        }
        if (response.failKind === fetch_1.ChatFailKind.TokenExpiredOrInvalid || response.failKind === fetch_1.ChatFailKind.ClientNotSupported || reason.includes('Bad request: ')) {
            return { type: commonTypes_1.ChatFetchResponseType.BadRequest, reason, requestId, serverRequestId };
        }
        if (response.failKind === fetch_1.ChatFailKind.ServerError) {
            return { type: commonTypes_1.ChatFetchResponseType.Failed, reason, requestId, serverRequestId };
        }
        if (response.failKind === fetch_1.ChatFailKind.ContentFilter) {
            return { type: commonTypes_1.ChatFetchResponseType.PromptFiltered, reason, category: openai_1.FilterReason.Prompt, requestId, serverRequestId };
        }
        if (response.failKind === fetch_1.ChatFailKind.AgentUnauthorized) {
            return { type: commonTypes_1.ChatFetchResponseType.AgentUnauthorized, reason, authorizationUrl: response.data.authorize_url, requestId, serverRequestId };
        }
        if (response.failKind === fetch_1.ChatFailKind.AgentFailedDependency) {
            return { type: commonTypes_1.ChatFetchResponseType.AgentFailedDependency, reason, requestId, serverRequestId };
        }
        if (response.failKind === fetch_1.ChatFailKind.ExtensionBlocked) {
            const retryAfter = typeof response.data?.retryAfter === 'number' ? response.data.retryAfter : 300;
            return { type: commonTypes_1.ChatFetchResponseType.ExtensionBlocked, reason, requestId, retryAfter, learnMoreLink: response.data?.learnMoreLink ?? '', serverRequestId };
        }
        if (response.failKind === fetch_1.ChatFailKind.NotFound) {
            return { type: commonTypes_1.ChatFetchResponseType.NotFound, reason, requestId, serverRequestId };
        }
        if (response.failKind === fetch_1.ChatFailKind.InvalidPreviousResponseId) {
            return { type: commonTypes_1.ChatFetchResponseType.InvalidStatefulMarker, reason, requestId, serverRequestId };
        }
        return { type: commonTypes_1.ChatFetchResponseType.Failed, reason, requestId, serverRequestId };
    }
    processError(err, requestId) {
        const fetcher = this._fetcherService;
        // If we cancelled a network request, we don't want to log an error
        if (fetcher.isAbortError(err)) {
            return {
                type: commonTypes_1.ChatFetchResponseType.Canceled,
                reason: 'network request aborted',
                requestId: requestId,
                serverRequestId: undefined,
            };
        }
        if ((0, errors_1.isCancellationError)(err)) {
            return {
                type: commonTypes_1.ChatFetchResponseType.Canceled,
                reason: 'Got a cancellation error',
                requestId: requestId,
                serverRequestId: undefined,
            };
        }
        if (err && ((err instanceof Error && err.message === 'Premature close') ||
            (typeof err === 'object' && err.code === 'ERR_STREAM_PREMATURE_CLOSE') /* to be extra sure */)) {
            return {
                type: commonTypes_1.ChatFetchResponseType.Canceled,
                reason: 'Stream closed prematurely',
                requestId: requestId,
                serverRequestId: undefined,
            };
        }
        this._logService.error(errorsUtil.fromUnknown(err), `Error on conversation request`);
        this._telemetryService.sendGHTelemetryException(err, 'Error on conversation request');
        // this.logger.exception(err, `Error on conversation request`);
        if (fetcher.isInternetDisconnectedError(err)) {
            return {
                type: commonTypes_1.ChatFetchResponseType.NetworkError,
                reason: `It appears you're not connected to the internet, please check your network connection and try again.`,
                requestId: requestId,
                serverRequestId: undefined,
            };
        }
        else if (fetcher.isFetcherError(err)) {
            return {
                type: commonTypes_1.ChatFetchResponseType.NetworkError,
                reason: fetcher.getUserMessageForFetcherError(err),
                requestId: requestId,
                serverRequestId: undefined,
            };
        }
        else {
            return {
                type: commonTypes_1.ChatFetchResponseType.Failed,
                reason: 'Error on conversation request. Check the log for more details.',
                requestId: requestId,
                serverRequestId: undefined,
            };
        }
    }
};
exports.ChatMLFetcherImpl = ChatMLFetcherImpl;
exports.ChatMLFetcherImpl = ChatMLFetcherImpl = __decorate([
    __param(0, fetcherService_1.IFetcherService),
    __param(1, telemetry_1.ITelemetryService),
    __param(2, requestLogger_1.IRequestLogger),
    __param(3, logService_1.ILogService),
    __param(4, instantiation_1.IInstantiationService),
    __param(5, conversationOptions_1.IConversationOptions)
], ChatMLFetcherImpl);
/**
 * Validates a chat request payload to ensure it is valid
 * @param params The params being sent in the chat request
 * @returns Whether the chat payload is valid
 */
function isValidChatPayload(messages, postOptions) {
    if (messages.length === 0) {
        return { isValid: false, reason: asUnexpected('No messages provided') };
    }
    if (postOptions?.max_tokens && postOptions?.max_tokens < 1) {
        return { isValid: false, reason: asUnexpected('Invalid response token parameter') };
    }
    const functionNamePattern = /^[a-zA-Z0-9_-]+$/;
    if (postOptions?.functions?.some(f => !f.name.match(functionNamePattern)) ||
        postOptions?.function_call?.name && !postOptions.function_call.name.match(functionNamePattern)) {
        return { isValid: false, reason: asUnexpected('Function names must match ^[a-zA-Z0-9_-]+$') };
    }
    if (postOptions?.tools && postOptions.tools.length > configurationService_1.HARD_TOOL_LIMIT) {
        return { isValid: false, reason: `Tool limit exceeded (${postOptions.tools.length}/${configurationService_1.HARD_TOOL_LIMIT}). Click "Configure Tools" in the chat input to disable ${postOptions.tools.length - configurationService_1.HARD_TOOL_LIMIT} tools and retry.` };
    }
    return { isValid: true, reason: '' };
}
function asUnexpected(reason) {
    return `Prompt failed validation with the reason: ${reason}. Please file an issue.`;
}
//# sourceMappingURL=chatMLFetcher.js.map