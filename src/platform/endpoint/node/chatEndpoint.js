"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ChatEndpoint_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoteAgentChatEndpoint = exports.ChatEndpoint = void 0;
exports.getMaxPromptTokens = getMaxPromptTokens;
exports.defaultChatResponseProcessor = defaultChatResponseProcessor;
exports.defaultNonStreamChatResponseProcessor = defaultNonStreamChatResponseProcessor;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const copilot_api_1 = require("@vscode/copilot-api");
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const crypto_1 = require("../../../util/common/crypto");
const async_1 = require("../../../util/vs/base/common/async");
const objects_1 = require("../../../util/vs/base/common/objects");
const uuid_1 = require("../../../util/vs/base/common/uuid");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const authentication_1 = require("../../authentication/common/authentication");
const chatMLFetcher_1 = require("../../chat/common/chatMLFetcher");
const globalStringUtils_1 = require("../../chat/common/globalStringUtils");
const configurationService_1 = require("../../configuration/common/configurationService");
const logService_1 = require("../../log/common/logService");
const fetcherService_1 = require("../../networking/common/fetcherService");
const networking_1 = require("../../networking/common/networking");
const chatStream_1 = require("../../networking/node/chatStream");
const stream_1 = require("../../networking/node/stream");
const nullExperimentationService_1 = require("../../telemetry/common/nullExperimentationService");
const telemetry_1 = require("../../telemetry/common/telemetry");
const tokenizer_1 = require("../../tokenizer/node/tokenizer");
const capiClient_1 = require("../common/capiClient");
const domainService_1 = require("../common/domainService");
const endpointProvider_1 = require("../common/endpointProvider");
const responsesApi_1 = require("./responsesApi");
// get ChatMaxNumTokens from config for experimentation
function getMaxPromptTokens(configService, expService, chatModelInfo) {
    // check debug override ChatMaxTokenNum
    const chatMaxTokenNumOverride = configService.getConfig(configurationService_1.ConfigKey.Internal.DebugOverrideChatMaxTokenNum); // can only be set by internal users
    // Base 3 tokens for each OpenAI completion
    let modelLimit = -3;
    // if option is set, takes precedence over any other logic
    if (chatMaxTokenNumOverride > 0) {
        modelLimit += chatMaxTokenNumOverride;
        return modelLimit;
    }
    let experimentalOverrides = {};
    try {
        const expValue = expService.getTreatmentVariable('copilotchat.contextWindows');
        experimentalOverrides = JSON.parse(expValue ?? '{}');
    }
    catch {
        // If the experiment service either is not available or returns a bad value we ignore the overrides
    }
    // If there's an experiment that takes precedence over what comes back from CAPI
    if (experimentalOverrides[chatModelInfo.id]) {
        modelLimit += experimentalOverrides[chatModelInfo.id];
        return modelLimit;
    }
    // Check if CAPI has promot token limits and return those
    if (chatModelInfo.capabilities?.limits?.max_prompt_tokens) {
        modelLimit += chatModelInfo.capabilities.limits.max_prompt_tokens;
        return modelLimit;
    }
    else if (chatModelInfo.capabilities.limits?.max_context_window_tokens) {
        // Otherwise return the context window as the prompt tokens for cases where CAPI doesn't configure the prompt tokens
        modelLimit += chatModelInfo.capabilities.limits.max_context_window_tokens;
        return modelLimit;
    }
    return modelLimit;
}
/**
 * The default processor for the stream format from CAPI
 */
async function defaultChatResponseProcessor(telemetryService, logService, response, expectedNumChoices, finishCallback, telemetryData, cancellationToken) {
    const processor = await stream_1.SSEProcessor.create(logService, telemetryService, expectedNumChoices, response, cancellationToken);
    const finishedCompletions = processor.processSSE(finishCallback);
    const chatCompletions = async_1.AsyncIterableObject.map(finishedCompletions, (solution) => {
        const loggedReason = solution.reason ?? 'client-trimmed';
        const dataToSendToTelemetry = telemetryData.extendedBy({
            completionChoiceFinishReason: loggedReason,
            headerRequestId: solution.requestId.headerRequestId
        });
        telemetryService.sendGHTelemetryEvent('completion.finishReason', dataToSendToTelemetry.properties, dataToSendToTelemetry.measurements);
        return (0, chatStream_1.prepareChatCompletionForReturn)(telemetryService, logService, solution, telemetryData);
    });
    return chatCompletions;
}
async function defaultNonStreamChatResponseProcessor(response, finishCallback, telemetryData) {
    const textResponse = await response.text();
    const jsonResponse = JSON.parse(textResponse);
    const completions = [];
    for (let i = 0; i < (jsonResponse?.choices?.length || 0); i++) {
        const choice = jsonResponse.choices[i];
        const message = choice.message;
        const messageText = (0, globalStringUtils_1.getTextPart)(message.content);
        const requestId = response.headers.get('X-Request-ID') ?? (0, uuid_1.generateUuid)();
        const completion = {
            blockFinished: false,
            choiceIndex: i,
            filterReason: undefined,
            finishReason: choice.finish_reason,
            message: message,
            usage: jsonResponse.usage,
            tokens: [], // This is used for repetition detection so not super important to be accurate
            requestId: { headerRequestId: requestId, completionId: jsonResponse.id, created: jsonResponse.created, deploymentId: '', serverExperiments: '' },
            telemetryData: telemetryData
        };
        const functionCall = [];
        for (const tool of message.toolCalls ?? []) {
            functionCall.push({
                name: tool.function?.name ?? '',
                arguments: tool.function?.arguments ?? '',
                id: tool.id ?? '',
            });
        }
        await finishCallback(messageText, i, {
            text: messageText,
            copilotToolCalls: functionCall,
        });
        completions.push(completion);
    }
    return async_1.AsyncIterableObject.fromArray(completions);
}
let ChatEndpoint = ChatEndpoint_1 = class ChatEndpoint {
    constructor(_modelMetadata, _domainService, _capiClientService, _fetcherService, _telemetryService, _authService, _chatMLFetcher, _tokenizerProvider, _instantiationService, _configurationService, _expService, _logService) {
        this._modelMetadata = _modelMetadata;
        this._domainService = _domainService;
        this._capiClientService = _capiClientService;
        this._fetcherService = _fetcherService;
        this._telemetryService = _telemetryService;
        this._authService = _authService;
        this._chatMLFetcher = _chatMLFetcher;
        this._tokenizerProvider = _tokenizerProvider;
        this._instantiationService = _instantiationService;
        this._configurationService = _configurationService;
        this._expService = _expService;
        // This metadata should always be present, but if not we will default to 8192 tokens
        this._maxTokens = _modelMetadata.capabilities.limits?.max_prompt_tokens ?? 8192;
        // This metadata should always be present, but if not we will default to 4096 tokens
        this._maxOutputTokens = _modelMetadata.capabilities.limits?.max_output_tokens ?? 4096;
        this.model = _modelMetadata.id;
        this.name = _modelMetadata.name;
        this.version = _modelMetadata.version;
        this.family = _modelMetadata.capabilities.family;
        this.tokenizer = _modelMetadata.capabilities.tokenizer;
        this.showInModelPicker = _modelMetadata.model_picker_enabled;
        this.isPremium = _modelMetadata.billing?.is_premium;
        this.multiplier = _modelMetadata.billing?.multiplier;
        this.restrictedToSkus = _modelMetadata.billing?.restricted_to;
        this.isDefault = _modelMetadata.is_chat_default;
        this.isFallback = _modelMetadata.is_chat_fallback;
        this.supportsToolCalls = !!_modelMetadata.capabilities.supports.tool_calls;
        this.supportsVision = !!_modelMetadata.capabilities.supports.vision;
        this.supportsPrediction = !!_modelMetadata.capabilities.supports.prediction;
        this._supportsStreaming = !!_modelMetadata.capabilities.supports.streaming;
        this._policyDetails = _modelMetadata.policy;
        this.customModel = _modelMetadata.custom_model;
    }
    get modelMaxPromptTokens() {
        return this._maxTokens;
    }
    get maxOutputTokens() {
        return this._maxOutputTokens;
    }
    get urlOrRequestMetadata() {
        // Use override or respect setting.
        // TODO unlikely but would break if it changes in the middle of a request being constructed
        return this._modelMetadata.urlOrRequestMetadata ??
            (this.useResponsesApi ? { type: copilot_api_1.RequestType.ChatResponses } : { type: copilot_api_1.RequestType.ChatCompletions });
    }
    get useResponsesApi() {
        if (this._modelMetadata.supported_endpoints
            && !this._modelMetadata.supported_endpoints.includes(endpointProvider_1.ModelSupportedEndpoint.ChatCompletions)
            && this._modelMetadata.supported_endpoints.includes(endpointProvider_1.ModelSupportedEndpoint.Responses)) {
            return true;
        }
        const enableResponsesApi = this._configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.UseResponsesApi, this._expService);
        return !!(enableResponsesApi && this._modelMetadata.supported_endpoints?.includes(endpointProvider_1.ModelSupportedEndpoint.Responses));
    }
    get degradationReason() {
        return this._modelMetadata.warning_message;
    }
    get policy() {
        if (!this._policyDetails) {
            return 'enabled';
        }
        if (this._policyDetails.state === 'enabled') {
            return 'enabled';
        }
        return { terms: this._policyDetails.terms ?? 'Unknown policy terms' };
    }
    get apiType() {
        return this.useResponsesApi ? 'responses' : 'chatCompletions';
    }
    get supportsThinkingContentInHistory() {
        return this.family === 'oswe';
    }
    interceptBody(body) {
        // Remove tool calls from requests that don't support them
        // We really shouldn't make requests to models that don't support tool calls with tools though
        if (body && !this.supportsToolCalls) {
            delete body['tools'];
        }
        // If the model doesn't support streaming, don't ask for a streamed request
        if (body && !this._supportsStreaming) {
            body.stream = false;
        }
        // If it's o1 we must modify the body significantly as the request is very different
        if (body?.messages && (this.family.startsWith('o1') || this.model === "o1" /* CHAT_MODEL.O1 */ || this.model === "o1-mini" /* CHAT_MODEL.O1MINI */)) {
            const newMessages = body.messages.map((message) => {
                if (message.role === prompt_tsx_1.OpenAI.ChatRole.System) {
                    return {
                        role: prompt_tsx_1.OpenAI.ChatRole.User,
                        content: message.content,
                    };
                }
                else {
                    return message;
                }
            });
            // Add the messages & model back
            body['messages'] = newMessages;
        }
    }
    createRequestBody(options) {
        if (this.useResponsesApi) {
            const body = this._instantiationService.invokeFunction(responsesApi_1.createResponsesRequestBody, options, this.model, this._modelMetadata);
            return this.customizeResponsesBody(body);
        }
        else {
            const body = (0, networking_1.createCapiRequestBody)(options, this.model, this.getCompletionsCallback());
            return this.customizeCapiBody(body);
        }
    }
    getCompletionsCallback() {
        return undefined;
    }
    customizeResponsesBody(body) {
        return body;
    }
    customizeCapiBody(body) {
        return body;
    }
    async processResponseFromChatEndpoint(telemetryService, logService, response, expectedNumChoices, finishCallback, telemetryData, cancellationToken) {
        if (this.useResponsesApi) {
            return (0, responsesApi_1.processResponseFromChatEndpoint)(this._instantiationService, telemetryService, logService, response, expectedNumChoices, finishCallback, telemetryData);
        }
        else if (!this._supportsStreaming) {
            return defaultNonStreamChatResponseProcessor(response, finishCallback, telemetryData);
        }
        else {
            return defaultChatResponseProcessor(telemetryService, logService, response, expectedNumChoices, finishCallback, telemetryData, cancellationToken);
        }
    }
    async acceptChatPolicy() {
        if (this.policy === 'enabled') {
            return true;
        }
        try {
            const response = await (0, networking_1.postRequest)(this._fetcherService, this._telemetryService, this._capiClientService, { type: copilot_api_1.RequestType.ModelPolicy, modelId: this.model }, (await this._authService.getCopilotToken()).token, await (0, crypto_1.createRequestHMAC)(process.env.HMAC_SECRET), 'chat-policy', (0, uuid_1.generateUuid)(), {
                state: 'enabled'
            });
            // Mark it enabled locally. It will be refreshed on the next fetch
            if (response.ok && this._policyDetails) {
                this._policyDetails.state = 'enabled';
            }
            return response.ok;
        }
        catch {
            return false;
        }
    }
    acquireTokenizer() {
        return this._tokenizerProvider.acquireTokenizer(this);
    }
    async makeChatRequest2(options, token) {
        return this._makeChatRequest2({ ...options, ignoreStatefulMarker: options.ignoreStatefulMarker ?? true }, token);
        // Stateful responses API not supported for now
        // const response = await this._makeChatRequest2(options, token);
        // if (response.type === ChatFetchResponseType.InvalidStatefulMarker) {
        // 	return this._makeChatRequest2({ ...options, ignoreStatefulMarker: true }, token);
        // }
        // return response;
    }
    async _makeChatRequest2(options, token) {
        return this._chatMLFetcher.fetchOne({
            requestOptions: {},
            ...options,
            endpoint: this,
        }, token);
    }
    async makeChatRequest(debugName, messages, finishedCb, token, location, source, requestOptions, userInitiatedRequest, telemetryProperties) {
        return this.makeChatRequest2({
            debugName,
            messages,
            finishedCb,
            location,
            source,
            requestOptions,
            userInitiatedRequest,
            telemetryProperties,
        }, token);
    }
    cloneWithTokenOverride(modelMaxPromptTokens) {
        return this._instantiationService.createInstance(ChatEndpoint_1, (0, objects_1.mixin)((0, objects_1.deepClone)(this._modelMetadata), { capabilities: { limits: { max_prompt_tokens: modelMaxPromptTokens } } }));
    }
};
exports.ChatEndpoint = ChatEndpoint;
exports.ChatEndpoint = ChatEndpoint = ChatEndpoint_1 = __decorate([
    __param(1, domainService_1.IDomainService),
    __param(2, capiClient_1.ICAPIClientService),
    __param(3, fetcherService_1.IFetcherService),
    __param(4, telemetry_1.ITelemetryService),
    __param(5, authentication_1.IAuthenticationService),
    __param(6, chatMLFetcher_1.IChatMLFetcher),
    __param(7, tokenizer_1.ITokenizerProvider),
    __param(8, instantiation_1.IInstantiationService),
    __param(9, configurationService_1.IConfigurationService),
    __param(10, nullExperimentationService_1.IExperimentationService),
    __param(11, logService_1.ILogService)
], ChatEndpoint);
let RemoteAgentChatEndpoint = class RemoteAgentChatEndpoint extends ChatEndpoint {
    constructor(modelMetadata, _requestMetadata, domainService, capiClientService, fetcherService, telemetryService, authService, chatMLFetcher, tokenizerProvider, instantiationService, configService, experimentService, logService) {
        super(modelMetadata, domainService, capiClientService, fetcherService, telemetryService, authService, chatMLFetcher, tokenizerProvider, instantiationService, configService, experimentService, logService);
        this._requestMetadata = _requestMetadata;
    }
    processResponseFromChatEndpoint(telemetryService, logService, response, expectedNumChoices, finishCallback, telemetryData, cancellationToken) {
        // We must override this to a num choices > 1 because remote agents can do internal function calls which emit multiple completions even when N > 1
        // It's awful that they do this, but we have to support it
        return defaultChatResponseProcessor(telemetryService, logService, response, 2, finishCallback, telemetryData, cancellationToken);
    }
    get urlOrRequestMetadata() {
        return this._requestMetadata;
    }
};
exports.RemoteAgentChatEndpoint = RemoteAgentChatEndpoint;
exports.RemoteAgentChatEndpoint = RemoteAgentChatEndpoint = __decorate([
    __param(2, domainService_1.IDomainService),
    __param(3, capiClient_1.ICAPIClientService),
    __param(4, fetcherService_1.IFetcherService),
    __param(5, telemetry_1.ITelemetryService),
    __param(6, authentication_1.IAuthenticationService),
    __param(7, chatMLFetcher_1.IChatMLFetcher),
    __param(8, tokenizer_1.ITokenizerProvider),
    __param(9, instantiation_1.IInstantiationService),
    __param(10, configurationService_1.IConfigurationService),
    __param(11, nullExperimentationService_1.IExperimentationService),
    __param(12, logService_1.ILogService)
], RemoteAgentChatEndpoint);
//# sourceMappingURL=chatEndpoint.js.map