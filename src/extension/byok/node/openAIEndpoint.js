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
var OpenAIEndpoint_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIEndpoint = void 0;
const authentication_1 = require("../../../platform/authentication/common/authentication");
const chatMLFetcher_1 = require("../../../platform/chat/common/chatMLFetcher");
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const capiClient_1 = require("../../../platform/endpoint/common/capiClient");
const domainService_1 = require("../../../platform/endpoint/common/domainService");
const chatEndpoint_1 = require("../../../platform/endpoint/node/chatEndpoint");
const logService_1 = require("../../../platform/log/common/logService");
const fetch_1 = require("../../../platform/networking/common/fetch");
const fetcherService_1 = require("../../../platform/networking/common/fetcherService");
const networking_1 = require("../../../platform/networking/common/networking");
const nullExperimentationService_1 = require("../../../platform/telemetry/common/nullExperimentationService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const tokenizer_1 = require("../../../platform/tokenizer/node/tokenizer");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
function hydrateBYOKErrorMessages(response) {
    if (response.type === commonTypes_1.ChatFetchResponseType.Failed && response.streamError) {
        return {
            type: response.type,
            requestId: response.requestId,
            serverRequestId: response.serverRequestId,
            reason: JSON.stringify(response.streamError),
        };
    }
    else if (response.type === commonTypes_1.ChatFetchResponseType.RateLimited) {
        return {
            type: response.type,
            requestId: response.requestId,
            serverRequestId: response.serverRequestId,
            reason: response.capiError ? 'Rate limit exceeded\n\n' + JSON.stringify(response.capiError) : 'Rate limit exceeded',
            rateLimitKey: '',
            retryAfter: undefined,
            capiError: response.capiError
        };
    }
    return response;
}
let OpenAIEndpoint = OpenAIEndpoint_1 = class OpenAIEndpoint extends chatEndpoint_1.ChatEndpoint {
    constructor(modelMetadata, _apiKey, _modelUrl, fetcherService, domainService, capiClientService, telemetryService, authService, chatMLFetcher, tokenizerProvider, instantiationService, configurationService, expService, logService) {
        super(modelMetadata, domainService, capiClientService, fetcherService, telemetryService, authService, chatMLFetcher, tokenizerProvider, instantiationService, configurationService, expService, logService);
        this.modelMetadata = modelMetadata;
        this._apiKey = _apiKey;
        this._modelUrl = _modelUrl;
        this.instantiationService = instantiationService;
    }
    createRequestBody(options) {
        if (this.useResponsesApi) {
            // Handle Responses API: customize the body directly
            options.ignoreStatefulMarker = false;
            const body = super.createRequestBody(options);
            body.store = true;
            body.n = undefined;
            body.stream_options = undefined;
            if (!this.modelMetadata.capabilities.supports.thinking) {
                body.reasoning = undefined;
                body.include = undefined;
            }
            if (body.previous_response_id && !body.previous_response_id.startsWith('resp_')) {
                // Don't use a response ID from CAPI
                body.previous_response_id = undefined;
            }
            return body;
        }
        else {
            // Handle CAPI: provide callback for thinking data processing
            const callback = (out, data) => {
                if (data && data.id) {
                    out.cot_id = data.id;
                    out.cot_summary = Array.isArray(data.text) ? data.text.join('') : data.text;
                }
            };
            const body = (0, networking_1.createCapiRequestBody)(options, this.model, callback);
            return body;
        }
    }
    interceptBody(body) {
        super.interceptBody(body);
        // TODO @lramos15 - We should do this for all models and not just here
        if (body?.tools?.length === 0) {
            delete body.tools;
        }
        if (body?.tools) {
            body.tools = body.tools.map(tool => {
                if ((0, fetch_1.isOpenAiFunctionTool)(tool) && tool.function.parameters === undefined) {
                    tool.function.parameters = { type: "object", properties: {} };
                }
                return tool;
            });
        }
        if (body) {
            if (this.modelMetadata.capabilities.supports.thinking) {
                delete body.temperature;
                body['max_completion_tokens'] = body.max_tokens;
                delete body.max_tokens;
            }
            // Removing max tokens defaults to the maximum which is what we want for BYOK
            delete body.max_tokens;
            if (!this.useResponsesApi) {
                body['stream_options'] = { 'include_usage': true };
            }
        }
    }
    get urlOrRequestMetadata() {
        return this._modelUrl;
    }
    getExtraHeaders() {
        const headers = {
            "Content-Type": "application/json"
        };
        if (this._modelUrl.includes('openai.azure')) {
            headers['api-key'] = this._apiKey;
        }
        else {
            headers['Authorization'] = `Bearer ${this._apiKey}`;
        }
        return headers;
    }
    async acceptChatPolicy() {
        return true;
    }
    cloneWithTokenOverride(modelMaxPromptTokens) {
        const newModelInfo = { ...this.modelMetadata, maxInputTokens: modelMaxPromptTokens };
        return this.instantiationService.createInstance(OpenAIEndpoint_1, newModelInfo, this._apiKey, this._modelUrl);
    }
    async makeChatRequest2(options, token) {
        // Apply ignoreStatefulMarker: false for initial request
        const modifiedOptions = { ...options, ignoreStatefulMarker: false };
        let response = await super.makeChatRequest2(modifiedOptions, token);
        if (response.type === commonTypes_1.ChatFetchResponseType.InvalidStatefulMarker) {
            response = await this._makeChatRequest2({ ...options, ignoreStatefulMarker: true }, token);
        }
        return hydrateBYOKErrorMessages(response);
    }
};
exports.OpenAIEndpoint = OpenAIEndpoint;
exports.OpenAIEndpoint = OpenAIEndpoint = OpenAIEndpoint_1 = __decorate([
    __param(3, fetcherService_1.IFetcherService),
    __param(4, domainService_1.IDomainService),
    __param(5, capiClient_1.ICAPIClientService),
    __param(6, telemetry_1.ITelemetryService),
    __param(7, authentication_1.IAuthenticationService),
    __param(8, chatMLFetcher_1.IChatMLFetcher),
    __param(9, tokenizer_1.ITokenizerProvider),
    __param(10, instantiation_1.IInstantiationService),
    __param(11, configurationService_1.IConfigurationService),
    __param(12, nullExperimentationService_1.IExperimentationService),
    __param(13, logService_1.ILogService)
], OpenAIEndpoint);
//# sourceMappingURL=openAIEndpoint.js.map