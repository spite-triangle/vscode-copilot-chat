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
var ModelMetadataFetcher_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelMetadataFetcher = void 0;
const copilot_api_1 = require("@vscode/copilot-api");
const vscode_1 = require("vscode");
const crypto_1 = require("../../../util/common/crypto");
const taskSingler_1 = require("../../../util/common/taskSingler");
const event_1 = require("../../../util/vs/base/common/event");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const uuid_1 = require("../../../util/vs/base/common/uuid");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const authentication_1 = require("../../authentication/common/authentication");
const configurationService_1 = require("../../configuration/common/configurationService");
const envService_1 = require("../../env/common/envService");
const logService_1 = require("../../log/common/logService");
const fetcherService_1 = require("../../networking/common/fetcherService");
const networking_1 = require("../../networking/common/networking");
const requestLogger_1 = require("../../requestLogger/node/requestLogger");
const nullExperimentationService_1 = require("../../telemetry/common/nullExperimentationService");
const telemetry_1 = require("../../telemetry/common/telemetry");
const capiClient_1 = require("../common/capiClient");
const endpointProvider_1 = require("../common/endpointProvider");
const chatEndpoint_1 = require("./chatEndpoint");
/**
 * Responsible for interacting with the CAPI Model API
 * This is solely owned by the EndpointProvider (and TestEndpointProvider) which uses this service to power server side rollout of models
 * All model acquisition should be done through the EndpointProvider
 */
let ModelMetadataFetcher = class ModelMetadataFetcher extends lifecycle_1.Disposable {
    static { ModelMetadataFetcher_1 = this; }
    static { this.ALL_MODEL_KEY = 'allModels'; }
    constructor(collectFetcherTelemetry, _isModelLab, _fetcher, _requestLogger, _capiClientService, _configService, _expService, _envService, _authService, _telemetryService, _logService, _instantiationService) {
        super();
        this.collectFetcherTelemetry = collectFetcherTelemetry;
        this._isModelLab = _isModelLab;
        this._fetcher = _fetcher;
        this._requestLogger = _requestLogger;
        this._capiClientService = _capiClientService;
        this._configService = _configService;
        this._expService = _expService;
        this._envService = _envService;
        this._authService = _authService;
        this._telemetryService = _telemetryService;
        this._logService = _logService;
        this._instantiationService = _instantiationService;
        this._familyMap = new Map();
        this._completionsFamilyMap = new Map();
        this._lastFetchTime = 0;
        this._taskSingler = new taskSingler_1.TaskSingler();
        this._onDidModelRefresh = new event_1.Emitter();
        this.onDidModelsRefresh = this._onDidModelRefresh.event;
        this._register(this._authService.onDidAuthenticationChange(() => {
            // Auth changed so next fetch should be forced to get a new list
            this._familyMap.clear();
            this._completionsFamilyMap.clear();
            this._lastFetchTime = 0;
        }));
    }
    async getAllCompletionModels(forceRefresh) {
        await this._taskSingler.getOrCreate(ModelMetadataFetcher_1.ALL_MODEL_KEY, () => this._fetchModels(forceRefresh));
        const completionModels = [];
        for (const [, models] of this._completionsFamilyMap) {
            for (const model of models) {
                if ((0, endpointProvider_1.isCompletionModelInformation)(model)) {
                    completionModels.push(model);
                }
            }
        }
        return completionModels;
    }
    async getAllChatModels() {
        await this._taskSingler.getOrCreate(ModelMetadataFetcher_1.ALL_MODEL_KEY, this._fetchModels.bind(this));
        const chatModels = [];
        for (const [, models] of this._familyMap) {
            for (const model of models) {
                if ((0, endpointProvider_1.isChatModelInformation)(model)) {
                    chatModels.push(model);
                }
            }
        }
        return chatModels;
    }
    /**
     * Hydrates a model API response from the `/models` endpoint with proper exp overrides and error handling
     * @param resolvedModel The resolved model to hydrate
     * @returns The resolved model with proper exp overrides and token counts
     */
    async _hydrateResolvedModel(resolvedModel) {
        resolvedModel = resolvedModel ? await this._findExpOverride(resolvedModel) : undefined;
        if (!resolvedModel) {
            throw this._lastFetchError;
        }
        // If it's a chat model, update max prompt tokens based on settings + exp
        if ((0, endpointProvider_1.isChatModelInformation)(resolvedModel) && (resolvedModel.capabilities.limits)) {
            resolvedModel.capabilities.limits.max_prompt_tokens = (0, chatEndpoint_1.getMaxPromptTokens)(this._configService, this._expService, resolvedModel);
            // Also ensure prompt tokens + output tokens <= context window. Output tokens is capped to max 15% input tokens
            const outputTokens = Math.floor(Math.min(resolvedModel.capabilities.limits.max_output_tokens ?? 4096, resolvedModel.capabilities.limits.max_prompt_tokens * 0.15));
            const contextWindow = resolvedModel.capabilities.limits.max_context_window_tokens ?? (outputTokens + resolvedModel.capabilities.limits.max_prompt_tokens);
            resolvedModel.capabilities.limits.max_prompt_tokens = Math.min(resolvedModel.capabilities.limits.max_prompt_tokens, contextWindow - outputTokens);
        }
        if (resolvedModel.preview && !resolvedModel.name.endsWith('(Preview)')) {
            // If the model is a preview model, we append (Preview) to the name
            resolvedModel.name = `${resolvedModel.name} (Preview)`;
        }
        return resolvedModel;
    }
    async getChatModelFromFamily(family) {
        await this._taskSingler.getOrCreate(ModelMetadataFetcher_1.ALL_MODEL_KEY, this._fetchModels.bind(this));
        let resolvedModel;
        if (family === 'gpt-4.1') {
            resolvedModel = this._familyMap.get('gpt-4.1')?.[0] ?? this._familyMap.get('gpt-4o')?.[0];
        }
        else if (family === 'gpt-4o-mini') {
            resolvedModel = this._familyMap.get('gpt-4o-mini')?.[0];
        }
        else if (family === 'copilot-base') {
            resolvedModel = this._copilotBaseModel;
        }
        else {
            resolvedModel = this._familyMap.get(family)?.[0];
        }
        if (!resolvedModel || !(0, endpointProvider_1.isChatModelInformation)(resolvedModel)) {
            throw new Error(`Unable to resolve chat model with family selection: ${family}`);
        }
        return resolvedModel;
    }
    async getChatModelFromApiModel(apiModel) {
        await this._taskSingler.getOrCreate(ModelMetadataFetcher_1.ALL_MODEL_KEY, this._fetchModels.bind(this));
        let resolvedModel;
        for (const models of this._familyMap.values()) {
            resolvedModel = models.find(model => model.id === apiModel.id &&
                model.version === apiModel.version &&
                model.capabilities.family === apiModel.family);
            if (resolvedModel) {
                break;
            }
        }
        if (!resolvedModel) {
            return;
        }
        if (!(0, endpointProvider_1.isChatModelInformation)(resolvedModel)) {
            throw new Error(`Unable to resolve chat model: ${apiModel.id},${apiModel.name},${apiModel.version},${apiModel.family}`);
        }
        return resolvedModel;
    }
    async getEmbeddingsModel(family) {
        await this._taskSingler.getOrCreate(ModelMetadataFetcher_1.ALL_MODEL_KEY, this._fetchModels.bind(this));
        const resolvedModel = this._familyMap.get(family)?.[0];
        if (!resolvedModel || !(0, endpointProvider_1.isEmbeddingModelInformation)(resolvedModel)) {
            throw new Error(`Unable to resolve embeddings model with family selection: ${family}`);
        }
        return resolvedModel;
    }
    _shouldRefreshModels() {
        if (this._familyMap.size === 0) {
            return true;
        }
        const tenMinutes = 10 * 60 * 1000; // 10 minutes in milliseconds
        const now = Date.now();
        if (!this._lastFetchTime) {
            return true; // If there's no last fetch time, we should refresh
        }
        // We only want to fetch models if the current session is active
        if (!this._envService.isActive) {
            return false;
        }
        const timeSinceLastFetch = now - this._lastFetchTime;
        return timeSinceLastFetch > tenMinutes;
    }
    async _fetchModels(force) {
        if (!force && !this._shouldRefreshModels()) {
            return;
        }
        const requestStartTime = Date.now();
        const copilotToken = (await this._authService.getCopilotToken()).token;
        const requestId = (0, uuid_1.generateUuid)();
        const requestMetadata = { type: copilot_api_1.RequestType.Models, isModelLab: this._isModelLab };
        try {
            let models;
            try {
                let config = vscode_1.workspace.getConfiguration('github.copilot').get('forceOffline');
                if (config) {
                    throw Error('offline');
                }
                const response = await (0, networking_1.getRequest)(this._fetcher, this._telemetryService, this._capiClientService, requestMetadata, copilotToken, await (0, crypto_1.createRequestHMAC)(process.env.HMAC_SECRET), 'model-access', requestId);
                this._lastFetchTime = Date.now();
                this._logService.info(`Fetched model metadata in ${Date.now() - requestStartTime}ms ${requestId}`);
                if (!response.ok) {
                    throw Error('failed to request');
                }
                models = (await response.json()).data;
            }
            catch (e) {
                models = JSON.parse(`
				 [
						{
							"auto": true,
							"billing": {
								"is_premium": false,
								"multiplier": 0,
								"restricted_to": [
									"free",
									"pro",
									"pro_plus",
									"business",
									"enterprise"
								]
							},
							"capabilities": {
								"family": "gpt-5-mini",
								"limits": {
									"max_context_window_tokens": 264000,
									"max_output_tokens": 64000,
									"max_prompt_tokens": 127988,
									"vision": {
										"max_prompt_image_size": 3145728,
										"max_prompt_images": 1,
										"supported_media_types": [
											"image/jpeg",
											"image/png",
											"image/webp",
											"image/gif"
										]
									}
								},
								"object": "model_capabilities",
								"supports": {
									"parallel_tool_calls": true,
									"streaming": true,
									"structured_outputs": true,
									"tool_calls": true,
									"vision": true
								},
								"tokenizer": "o200k_base",
								"type": "chat"
							},
							"id": "gpt-5-mini",
							"is_chat_default": true,
							"is_chat_fallback": false,
							"model_picker_category": "lightweight",
							"model_picker_enabled": false,
							"name": "GPT-5 mini",
							"object": "model",
							"policy": {
								"state": "enabled",
								"terms": "Enable access to the latest GPT-5 mini model from OpenAI. [Learn more about how GitHub Copilot serves GPT-5 mini](https://gh.io/copilot-openai)."
							},
							"preview": false,
							"vendor": "Azure OpenAI",
							"version": "gpt-5-mini"
						},
						{
							"billing": {
								"is_premium": true,
								"multiplier": 1,
								"restricted_to": [
									"pro",
									"pro_plus",
									"max",
									"business",
									"enterprise"
								]
							},
							"capabilities": {
								"family": "gpt-5",
								"limits": {
									"max_context_window_tokens": 264000,
									"max_output_tokens": 64000,
									"max_prompt_tokens": 127988,
									"vision": {
										"max_prompt_image_size": 3145728,
										"max_prompt_images": 1,
										"supported_media_types": [
											"image/jpeg",
											"image/png",
											"image/webp",
											"image/gif"
										]
									}
								},
								"object": "model_capabilities",
								"supports": {
									"parallel_tool_calls": true,
									"streaming": true,
									"structured_outputs": true,
									"tool_calls": true,
									"vision": true
								},
								"tokenizer": "o200k_base",
								"type": "chat"
							},
							"id": "gpt-5",
							"is_chat_default": false,
							"is_chat_fallback": false,
							"model_picker_category": "versatile",
							"model_picker_enabled": false,
							"name": "GPT-5",
							"object": "model",
							"policy": {
								"state": "enabled",
								"terms": "Enable access to the latest GPT-5 model from OpenAI. [Learn more about how GitHub Copilot serves GPT-5](https://gh.io/copilot-openai)."
							},
							"preview": false,
							"vendor": "Azure OpenAI",
							"version": "gpt-5"
						},
						{
							"billing": {
								"is_premium": false,
								"multiplier": 0,
								"restricted_to": [
									"free",
									"pro",
									"pro_plus",
									"business",
									"enterprise"
								]
							},
							"capabilities": {
								"family": "text-embedding-3-small",
								"limits": {
									"max_context_window_tokens": 16384,
									"max_output_tokens": 4096,
									"max_prompt_tokens": 13918
								},
								"object": "model_capabilities",
								"supports": {
									"streaming": true,
									"tool_calls": true
								},
								"tokenizer": "cl100k_base",
								"type": "embeddings"
							},
							"id": "gpt-3.5-turbo",
							"is_chat_default": false,
							"is_chat_fallback": false,
							"model_picker_enabled": false,
							"name": "GPT 3.5 Turbo",
							"object": "model",
							"preview": false,
							"vendor": "Azure OpenAI",
							"version": "gpt-3.5-turbo-0613"
						},
						{
							"billing": {
								"is_premium": false,
								"multiplier": 0,
								"restricted_to": [
									"free",
									"pro",
									"pro_plus",
									"business",
									"enterprise"
								]
							},
							"capabilities": {
								"family": "gpt-3.5-turbo",
								"limits": {
									"max_context_window_tokens": 16384,
									"max_output_tokens": 4096,
									"max_prompt_tokens": 13918
								},
								"object": "model_capabilities",
								"supports": {
									"streaming": true,
									"tool_calls": true
								},
								"tokenizer": "cl100k_base",
								"type": "chat"
							},
							"id": "gpt-3.5-turbo-0613",
							"is_chat_default": false,
							"is_chat_fallback": false,
							"model_picker_enabled": false,
							"name": "GPT 3.5 Turbo",
							"object": "model",
							"preview": false,
							"vendor": "Azure OpenAI",
							"version": "gpt-3.5-turbo-0613"
						},
						{
							"billing": {
								"is_premium": false,
								"multiplier": 0,
								"restricted_to": [
									"free",
									"pro",
									"pro_plus",
									"business",
									"enterprise"
								]
							},
							"capabilities": {
								"family": "gpt-4o-mini",
								"limits": {
									"max_context_window_tokens": 128000,
									"max_output_tokens": 4096,
									"max_prompt_tokens": 63988
								},
								"object": "model_capabilities",
								"supports": {
									"parallel_tool_calls": true,
									"streaming": true,
									"tool_calls": true
								},
								"tokenizer": "o200k_base",
								"type": "chat"
							},
							"id": "gpt-4o-mini",
							"is_chat_default": false,
							"is_chat_fallback": false,
							"model_picker_enabled": false,
							"name": "GPT-4o mini",
							"object": "model",
							"preview": false,
							"vendor": "Azure OpenAI",
							"version": "gpt-4o-mini-2024-07-18"
						},
						{
							"billing": {
								"is_premium": false,
								"multiplier": 0,
								"restricted_to": [
									"free",
									"pro",
									"pro_plus",
									"business",
									"enterprise"
								]
							},
							"capabilities": {
								"family": "gpt-4o-mini",
								"limits": {
									"max_context_window_tokens": 128000,
									"max_output_tokens": 4096,
									"max_prompt_tokens": 63988
								},
								"object": "model_capabilities",
								"supports": {
									"parallel_tool_calls": true,
									"streaming": true,
									"tool_calls": true
								},
								"tokenizer": "o200k_base",
								"type": "chat"
							},
							"id": "gpt-4o-mini-2024-07-18",
							"is_chat_default": false,
							"is_chat_fallback": false,
							"model_picker_enabled": false,
							"name": "GPT-4o mini",
							"object": "model",
							"preview": false,
							"vendor": "Azure OpenAI",
							"version": "gpt-4o-mini-2024-07-18"
						},
						{
							"billing": {
								"is_premium": false,
								"multiplier": 0,
								"restricted_to": [
									"free",
									"pro",
									"pro_plus",
									"business",
									"enterprise"
								]
							},
							"capabilities": {
								"family": "gpt-4",
								"limits": {
									"max_context_window_tokens": 32768,
									"max_output_tokens": 4096,
									"max_prompt_tokens": 28663
								},
								"object": "model_capabilities",
								"supports": {
									"streaming": true,
									"tool_calls": true
								},
								"tokenizer": "cl100k_base",
								"type": "chat"
							},
							"id": "gpt-4",
							"is_chat_default": false,
							"is_chat_fallback": false,
							"model_picker_enabled": false,
							"name": "GPT 4",
							"object": "model",
							"preview": false,
							"vendor": "Azure OpenAI",
							"version": "gpt-4-0613"
						},
						{
							"billing": {
								"is_premium": false,
								"multiplier": 0,
								"restricted_to": [
									"free",
									"pro",
									"pro_plus",
									"business",
									"enterprise"
								]
							},
							"capabilities": {
								"family": "gpt-4",
								"limits": {
									"max_context_window_tokens": 32768,
									"max_output_tokens": 4096,
									"max_prompt_tokens": 28663
								},
								"object": "model_capabilities",
								"supports": {
									"streaming": true,
									"tool_calls": true
								},
								"tokenizer": "cl100k_base",
								"type": "chat"
							},
							"id": "gpt-4-0613",
							"is_chat_default": false,
							"is_chat_fallback": false,
							"model_picker_enabled": false,
							"name": "GPT 4",
							"object": "model",
							"preview": false,
							"vendor": "Azure OpenAI",
							"version": "gpt-4-0613"
						},
						{
							"billing": {
								"is_premium": false,
								"multiplier": 0,
								"restricted_to": [
									"free",
									"pro",
									"pro_plus",
									"business",
									"enterprise"
								]
							},
							"capabilities": {
								"family": "gpt-4o",
								"limits": {
									"max_context_window_tokens": 128000,
									"max_output_tokens": 4096,
									"max_prompt_tokens": 63988,
									"vision": {
										"max_prompt_image_size": 3145728,
										"max_prompt_images": 1,
										"supported_media_types": [
											"image/jpeg",
											"image/png",
											"image/webp",
											"image/gif"
										]
									}
								},
								"object": "model_capabilities",
								"supports": {
									"parallel_tool_calls": true,
									"streaming": true,
									"tool_calls": true,
									"vision": true
								},
								"tokenizer": "o200k_base",
								"type": "chat"
							},
							"id": "gpt-4o",
							"is_chat_default": false,
							"is_chat_fallback": true,
							"model_picker_category": "versatile",
							"model_picker_enabled": false,
							"name": "GPT-4o",
							"object": "model",
							"preview": false,
							"vendor": "Azure OpenAI",
							"version": "gpt-4o-2024-11-20"
						},
						{
							"billing": {
								"is_premium": false,
								"multiplier": 0,
								"restricted_to": [
									"free",
									"pro",
									"pro_plus",
									"business",
									"enterprise"
								]
							},
							"capabilities": {
								"family": "gpt-4o",
								"limits": {
									"max_context_window_tokens": 128000,
									"max_output_tokens": 16384,
									"max_prompt_tokens": 63988,
									"vision": {
										"max_prompt_image_size": 3145728,
										"max_prompt_images": 1,
										"supported_media_types": [
											"image/jpeg",
											"image/png",
											"image/webp",
											"image/gif"
										]
									}
								},
								"object": "model_capabilities",
								"supports": {
									"parallel_tool_calls": true,
									"streaming": true,
									"tool_calls": true,
									"vision": true
								},
								"tokenizer": "o200k_base",
								"type": "chat"
							},
							"id": "gpt-4o-2024-11-20",
							"is_chat_default": false,
							"is_chat_fallback": false,
							"model_picker_enabled": false,
							"name": "GPT-4o",
							"object": "model",
							"preview": false,
							"vendor": "Azure OpenAI",
							"version": "gpt-4o-2024-11-20"
						},
						{
							"billing": {
								"is_premium": false,
								"multiplier": 0,
								"restricted_to": [
									"free",
									"pro",
									"pro_plus",
									"business",
									"enterprise"
								]
							},
							"capabilities": {
								"family": "gpt-4o",
								"limits": {
									"max_context_window_tokens": 128000,
									"max_output_tokens": 4096,
									"max_prompt_tokens": 63988,
									"vision": {
										"max_prompt_image_size": 3145728,
										"max_prompt_images": 1,
										"supported_media_types": [
											"image/jpeg",
											"image/png",
											"image/webp",
											"image/gif"
										]
									}
								},
								"object": "model_capabilities",
								"supports": {
									"parallel_tool_calls": true,
									"streaming": true,
									"tool_calls": true,
									"vision": true
								},
								"tokenizer": "o200k_base",
								"type": "chat"
							},
							"id": "gpt-4o-2024-05-13",
							"is_chat_default": false,
							"is_chat_fallback": false,
							"model_picker_enabled": false,
							"name": "GPT-4o",
							"object": "model",
							"preview": false,
							"vendor": "Azure OpenAI",
							"version": "gpt-4o-2024-05-13"
						},
						{
							"billing": {
								"is_premium": false,
								"multiplier": 0,
								"restricted_to": [
									"free",
									"pro",
									"pro_plus",
									"business",
									"enterprise"
								]
							},
							"capabilities": {
								"family": "gpt-4o",
								"limits": {
									"max_context_window_tokens": 128000,
									"max_output_tokens": 4096,
									"max_prompt_tokens": 63988
								},
								"object": "model_capabilities",
								"supports": {
									"parallel_tool_calls": true,
									"streaming": true,
									"tool_calls": true
								},
								"tokenizer": "o200k_base",
								"type": "chat"
							},
							"id": "gpt-4-o-preview",
							"is_chat_default": false,
							"is_chat_fallback": false,
							"model_picker_enabled": false,
							"name": "GPT-4o",
							"object": "model",
							"preview": false,
							"vendor": "Azure OpenAI",
							"version": "gpt-4o-2024-05-13"
						},
						{
							"billing": {
								"is_premium": false,
								"multiplier": 0,
								"restricted_to": [
									"free",
									"pro",
									"pro_plus",
									"business",
									"enterprise"
								]
							},
							"capabilities": {
								"family": "gpt-4o",
								"limits": {
									"max_context_window_tokens": 128000,
									"max_output_tokens": 16384,
									"max_prompt_tokens": 63988
								},
								"object": "model_capabilities",
								"supports": {
									"parallel_tool_calls": true,
									"streaming": true,
									"tool_calls": true
								},
								"tokenizer": "o200k_base",
								"type": "chat"
							},
							"id": "gpt-4o-2024-08-06",
							"is_chat_default": false,
							"is_chat_fallback": false,
							"model_picker_enabled": false,
							"name": "GPT-4o",
							"object": "model",
							"preview": false,
							"vendor": "Azure OpenAI",
							"version": "gpt-4o-2024-08-06"
						},
						{
							"billing": {
								"is_premium": true,
								"multiplier": 0.33,
								"restricted_to": [
									"free",
									"pro",
									"pro_plus",
									"business",
									"enterprise"
								]
							},
							"capabilities": {
								"family": "o3-mini",
								"limits": {
									"max_context_window_tokens": 200000,
									"max_output_tokens": 100000,
									"max_prompt_tokens": 63988
								},
								"object": "model_capabilities",
								"supports": {
									"streaming": true,
									"structured_outputs": true,
									"tool_calls": true
								},
								"tokenizer": "o200k_base",
								"type": "chat"
							},
							"id": "o3-mini-paygo",
							"is_chat_default": false,
							"is_chat_fallback": false,
							"model_picker_enabled": false,
							"name": "o3-mini",
							"object": "model",
							"preview": false,
							"vendor": "Azure OpenAI",
							"version": "o3-mini-paygo"
						},
						{
							"billing": {
								"is_premium": false,
								"multiplier": 0,
								"restricted_to": [
									"pro",
									"pro_plus",
									"max",
									"business",
									"enterprise"
								]
							},
							"capabilities": {
								"family": "grok-code",
								"limits": {
									"max_context_window_tokens": 128000,
									"max_output_tokens": 64000,
									"max_prompt_tokens": 108792
								},
								"object": "model_capabilities",
								"supports": {
									"streaming": true,
									"structured_outputs": true,
									"tool_calls": true
								},
								"tokenizer": "o200k_base",
								"type": "chat"
							},
							"id": "grok-code-fast-1",
							"is_chat_default": false,
							"is_chat_fallback": false,
							"model_picker_category": "powerful",
							"model_picker_enabled": false,
							"name": "Grok Code Fast 1 (Preview)",
							"object": "model",
							"policy": {
								"state": "enabled",
								"terms": "Enable access to the latest Grok Code Fast 1 model from xAI. If enabled, you instruct GitHub Copilot to send data to xAI Grok Code Fast 1. [Learn more about how GitHub Copilot serves Grok Code Fast 1](https://docs.github.com/en/copilot/reference/ai-models/model-hosting#xai-models). During launch week, [promotional pricing is 0x](https://gh.io/copilot-grok-code-promo)."
							},
							"preview": true,
							"vendor": "xAI",
							"version": "grok-code-fast-1"
						},
						{
							"billing": {
								"is_premium": true,
								"multiplier": 1,
								"restricted_to": [
									"pro",
									"pro_plus",
									"max",
									"business",
									"enterprise"
								]
							},
							"capabilities": {
								"family": "gemini-2.5-pro",
								"limits": {
									"max_context_window_tokens": 128000,
									"max_output_tokens": 64000,
									"max_prompt_tokens": 108792,
									"vision": {
										"max_prompt_image_size": 3145728,
										"max_prompt_images": 1,
										"supported_media_types": [
											"image/jpeg",
											"image/png",
											"image/webp",
											"image/heic",
											"image/heif"
										]
									}
								},
								"object": "model_capabilities",
								"supports": {
									"max_thinking_budget": 32768,
									"min_thinking_budget": 128,
									"parallel_tool_calls": true,
									"streaming": true,
									"tool_calls": true,
									"vision": true
								},
								"tokenizer": "o200k_base",
								"type": "chat"
							},
							"id": "gemini-2.5-pro",
							"is_chat_default": false,
							"is_chat_fallback": false,
							"model_picker_category": "powerful",
							"model_picker_enabled": false,
							"name": "Gemini 2.5 Pro",
							"object": "model",
							"policy": {
								"state": "enabled",
								"terms": "Enable access to the latest Gemini 2.5 Pro model from Google. [Learn more about how GitHub Copilot serves Gemini 2.5 Pro](https://docs.github.com/en/copilot/using-github-copilot/ai-models/choosing-the-right-ai-model-for-your-task#gemini-25-pro)."
							},
							"preview": false,
							"vendor": "Google",
							"version": "gemini-2.5-pro"
						}
					]
			`);
            }
            // NOTE - 模型配置，只是用于通过验证，实际配置利用 OAI 插件
            this._familyMap.clear();
            const data = models;
            // const data: IModelAPIResponse[] = (await response.json()).data;
            this._requestLogger.logModelListCall(requestId, requestMetadata, data);
            for (const rawModel of data) {
                const model = await this._hydrateResolvedModel(rawModel);
                const isCompletionModel = (0, endpointProvider_1.isCompletionModelInformation)(model);
                // The base model is whatever model is deemed "fallback" by the server
                if (model.is_chat_fallback && !isCompletionModel) {
                    this._copilotBaseModel = model;
                }
                const family = model.capabilities.family;
                const familyMap = isCompletionModel ? this._completionsFamilyMap : this._familyMap;
                if (!familyMap.has(family)) {
                    familyMap.set(family, []);
                }
                familyMap.get(family)?.push(model);
            }
            this._lastFetchError = undefined;
            this._onDidModelRefresh.fire();
            if (this.collectFetcherTelemetry) {
                this._instantiationService.invokeFunction(this.collectFetcherTelemetry, undefined);
            }
        }
        catch (e) {
            this._logService.error(e, `Failed to fetch models (${requestId})`);
            this._lastFetchError = e;
            this._lastFetchTime = 0;
            // If we fail to fetch models, we should try again next time
            if (this.collectFetcherTelemetry) {
                this._instantiationService.invokeFunction(this.collectFetcherTelemetry, e);
            }
        }
    }
    async _fetchModel(modelId) {
        const copilotToken = (await this._authService.getCopilotToken()).token;
        const requestId = (0, uuid_1.generateUuid)();
        const requestMetadata = { type: copilot_api_1.RequestType.ListModel, modelId: modelId };
        try {
            const response = await (0, networking_1.getRequest)(this._fetcher, this._telemetryService, this._capiClientService, requestMetadata, copilotToken, await (0, crypto_1.createRequestHMAC)(process.env.HMAC_SECRET), 'model-access', requestId);
            const data = await response.json();
            if (response.status !== 200) {
                this._logService.error(`Failed to fetch model ${modelId} (requestId: ${requestId}): ${JSON.stringify(data)}`);
                return;
            }
            this._requestLogger.logModelListCall(requestId, requestMetadata, [data]);
            if (data.capabilities.type === 'completion') {
                return;
            }
            // Functions that call this method, check the family map first so this shouldn't result in duplicate entries
            if (this._familyMap.has(data.capabilities.family)) {
                this._familyMap.get(data.capabilities.family)?.push(data);
            }
            else {
                this._familyMap.set(data.capabilities.family, [data]);
            }
            this._onDidModelRefresh.fire();
            return data;
        }
        catch {
            // Couldn't find this model, must not be availabe in CAPI.
            return undefined;
        }
    }
    async _findExpOverride(resolvedModel) {
        // This is a mapping of model id to model id. Allowing us to override the request for any model with a different model
        let modelExpOverrides = {};
        const expResult = this._expService.getTreatmentVariable('copilotchat.modelOverrides');
        try {
            modelExpOverrides = JSON.parse(expResult || '{}');
        }
        catch {
            // No-op if parsing experiment fails
        }
        if (modelExpOverrides[resolvedModel.id]) {
            for (const [, models] of this._familyMap) {
                const model = models.find(m => m.id === modelExpOverrides[resolvedModel.id]);
                // Found the model in the cache, return it
                if (model) {
                    return model;
                }
            }
            const experimentalModel = await this._taskSingler.getOrCreate(modelExpOverrides[resolvedModel.id], () => this._fetchModel(modelExpOverrides[resolvedModel.id]));
            // Use the experimental model if it exists, otherwise fallback to the normal model we resolved
            resolvedModel = experimentalModel ?? resolvedModel;
        }
        return resolvedModel;
    }
};
exports.ModelMetadataFetcher = ModelMetadataFetcher;
exports.ModelMetadataFetcher = ModelMetadataFetcher = ModelMetadataFetcher_1 = __decorate([
    __param(2, fetcherService_1.IFetcherService),
    __param(3, requestLogger_1.IRequestLogger),
    __param(4, capiClient_1.ICAPIClientService),
    __param(5, configurationService_1.IConfigurationService),
    __param(6, nullExperimentationService_1.IExperimentationService),
    __param(7, envService_1.IEnvService),
    __param(8, authentication_1.IAuthenticationService),
    __param(9, telemetry_1.ITelemetryService),
    __param(10, logService_1.ILogService),
    __param(11, instantiation_1.IInstantiationService)
], ModelMetadataFetcher);
//#endregion
//# sourceMappingURL=modelMetadataFetcher.js.map