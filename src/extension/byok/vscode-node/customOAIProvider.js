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
var CustomOAIBYOKModelProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomOAIBYOKModelProvider = void 0;
exports.resolveCustomOAIUrl = resolveCustomOAIUrl;
const vscode_1 = require("vscode");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const logService_1 = require("../../../platform/log/common/logService");
const nullExperimentationService_1 = require("../../../platform/telemetry/common/nullExperimentationService");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const languageModelAccess_1 = require("../../conversation/vscode-node/languageModelAccess");
const byokProvider_1 = require("../common/byokProvider");
const openAIEndpoint_1 = require("../node/openAIEndpoint");
const byokUIService_1 = require("./byokUIService");
const customOAIModelConfigurator_1 = require("./customOAIModelConfigurator");
function resolveCustomOAIUrl(modelId, url) {
    // The fully resolved url was already passed in
    if (url.includes('/chat/completions')) {
        return url;
    }
    // Remove the trailing slash
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    // Check if URL already contains any version pattern like /v1, /v2, etc
    const versionPattern = /\/v\d+$/;
    if (versionPattern.test(url)) {
        return `${url}/chat/completions`;
    }
    // For standard OpenAI-compatible endpoints, just append the standard path
    return `${url}/v1/chat/completions`;
}
let CustomOAIBYOKModelProvider = class CustomOAIBYOKModelProvider {
    static { CustomOAIBYOKModelProvider_1 = this; }
    static { this.providerName = 'CustomOAI'; }
    constructor(_byokStorageService, _configurationService, _logService, _instantiationService, _experimentationService) {
        this._byokStorageService = _byokStorageService;
        this._configurationService = _configurationService;
        this._logService = _logService;
        this._instantiationService = _instantiationService;
        this._experimentationService = _experimentationService;
        this.authType = 1 /* BYOKAuthType.PerModelDeployment */;
        this.providerName = CustomOAIBYOKModelProvider_1.providerName;
        this._lmWrapper = this._instantiationService.createInstance(languageModelAccess_1.CopilotLanguageModelWrapper);
    }
    getConfigKey() {
        return configurationService_1.ConfigKey.CustomOAIModels;
    }
    resolveUrl(modelId, url) {
        return resolveCustomOAIUrl(modelId, url);
    }
    getUserModelConfig() {
        const modelConfig = this._configurationService.getConfig(this.getConfigKey());
        return modelConfig;
    }
    requiresAPIKey(modelId) {
        const userModelConfig = this.getUserModelConfig();
        return userModelConfig[modelId]?.requiresAPIKey !== false;
    }
    async getAllModels() {
        const modelConfig = this.getUserModelConfig();
        const models = {};
        for (const [modelId, modelInfo] of Object.entries(modelConfig)) {
            models[modelId] = {
                name: modelInfo.name,
                url: this.resolveUrl(modelId, modelInfo.url),
                toolCalling: modelInfo.toolCalling,
                vision: modelInfo.vision,
                maxInputTokens: modelInfo.maxInputTokens,
                maxOutputTokens: modelInfo.maxOutputTokens,
                thinking: modelInfo.thinking,
                editTools: modelInfo.editTools,
            };
        }
        return models;
    }
    async getModelsWithAPIKeys(silent) {
        const models = await this.getAllModels();
        const modelsWithApiKeys = {};
        for (const [modelId, modelInfo] of Object.entries(models)) {
            const requireAPIKey = this.requiresAPIKey(modelId);
            if (!requireAPIKey) {
                modelsWithApiKeys[modelId] = modelInfo;
                continue;
            }
            let apiKey = await this._byokStorageService.getAPIKey(this.providerName, modelId);
            if (!silent && !apiKey) {
                apiKey = await (0, byokUIService_1.promptForAPIKey)(`${this.providerName} - ${modelId}`, false);
                if (apiKey) {
                    await this._byokStorageService.storeAPIKey(this.providerName, apiKey, 1 /* BYOKAuthType.PerModelDeployment */, modelId);
                }
            }
            if (apiKey) {
                modelsWithApiKeys[modelId] = modelInfo;
            }
        }
        return modelsWithApiKeys;
    }
    createModelInfo(id, capabilities) {
        const baseInfo = {
            id,
            url: capabilities.url || '',
            name: capabilities.name,
            detail: this.providerName,
            version: '1.0.0',
            maxOutputTokens: capabilities.maxOutputTokens,
            maxInputTokens: capabilities.maxInputTokens,
            family: this.providerName,
            tooltip: `${capabilities.name} is contributed via the ${this.providerName} provider.`,
            capabilities: {
                toolCalling: capabilities.toolCalling,
                imageInput: capabilities.vision,
                editTools: capabilities.editTools
            },
            thinking: capabilities.thinking || false,
        };
        return baseInfo;
    }
    async provideLanguageModelChatInformation(options, token) {
        try {
            let knownModels = await this.getModelsWithAPIKeys(options.silent);
            if (Object.keys(knownModels).length === 0 && !options.silent) {
                await new customOAIModelConfigurator_1.CustomOAIModelConfigurator(this._configurationService, this.providerName.toLowerCase(), this).configure(true);
                knownModels = await this.getModelsWithAPIKeys(options.silent);
            }
            return Object.entries(knownModels).map(([id, capabilities]) => {
                return this.createModelInfo(id, capabilities);
            });
        }
        catch {
            return [];
        }
    }
    async provideLanguageModelChatResponse(model, messages, options, progress, token) {
        const requireAPIKey = this.requiresAPIKey(model.id);
        let apiKey;
        if (requireAPIKey) {
            apiKey = await this._byokStorageService.getAPIKey(this.providerName, model.id);
            if (!apiKey) {
                this._logService.error(`No API key found for model ${model.id}`);
                throw new Error(`No API key found for model ${model.id}`);
            }
        }
        const modelInfo = (0, byokProvider_1.resolveModelInfo)(model.id, this.providerName, undefined, {
            maxInputTokens: model.maxInputTokens,
            maxOutputTokens: model.maxOutputTokens,
            toolCalling: !!model.capabilities?.toolCalling || false,
            vision: !!model.capabilities?.imageInput || false,
            name: model.name,
            url: model.url,
            thinking: model.thinking,
            editTools: model.capabilities.editTools?.filter(endpointProvider_1.isEndpointEditToolName),
        });
        const openAIChatEndpoint = this._instantiationService.createInstance(openAIEndpoint_1.OpenAIEndpoint, modelInfo, apiKey ?? '', model.url);
        return this._lmWrapper.provideLanguageModelResponse(openAIChatEndpoint, messages, options, options.requestInitiator, progress, token);
    }
    async provideTokenCount(model, text, token) {
        const requireAPIKey = this.requiresAPIKey(model.id);
        let apiKey;
        if (requireAPIKey) {
            apiKey = await this._byokStorageService.getAPIKey(this.providerName, model.id);
            if (!apiKey) {
                this._logService.error(`No API key found for model ${model.id}`);
                throw new Error(`No API key found for model ${model.id}`);
            }
        }
        const modelInfo = (0, byokProvider_1.resolveModelInfo)(model.id, this.providerName, undefined, {
            maxInputTokens: model.maxInputTokens,
            maxOutputTokens: model.maxOutputTokens,
            toolCalling: !!model.capabilities?.toolCalling || false,
            vision: !!model.capabilities?.imageInput || false,
            name: model.name,
            url: model.url,
            thinking: model.thinking
        });
        const openAIChatEndpoint = this._instantiationService.createInstance(openAIEndpoint_1.OpenAIEndpoint, modelInfo, apiKey ?? '', model.url);
        return this._lmWrapper.provideTokenCount(openAIChatEndpoint, text);
    }
    async updateAPIKey() {
        // Get all available models
        const allModels = await this.getAllModels();
        if (Object.keys(allModels).length === 0) {
            await vscode_1.window.showInformationMessage(`No ${this.providerName} models are configured. Please configure models first.`);
            return;
        }
        const modelItems = Object.entries(allModels).filter(m => this.requiresAPIKey(m[0])).map(([modelId, modelInfo]) => ({
            label: modelInfo.name || modelId,
            description: modelId,
            detail: `URL: ${modelInfo.url}`,
            modelId: modelId
        }));
        // Show quick pick to select which model's API key to update
        const quickPick = vscode_1.window.createQuickPick();
        quickPick.title = `Update ${this.providerName} Model API Key`;
        quickPick.placeholder = 'Select a model to update its API key';
        quickPick.items = modelItems;
        quickPick.ignoreFocusOut = true;
        const selectedModel = await new Promise((resolve) => {
            quickPick.onDidAccept(() => {
                const selected = quickPick.selectedItems[0];
                quickPick.hide();
                resolve(selected);
            });
            quickPick.onDidHide(() => {
                resolve(undefined);
            });
            quickPick.show();
        });
        if (!selectedModel) {
            return; // User cancelled
        }
        // Prompt for new API key
        const newApiKey = await (0, byokUIService_1.promptForAPIKey)(`${this.providerName} - ${selectedModel.modelId}`, true);
        if (newApiKey !== undefined) {
            if (newApiKey.trim() === '') {
                // Empty string means delete the API key
                await this._byokStorageService.deleteAPIKey(this.providerName, 1 /* BYOKAuthType.PerModelDeployment */, selectedModel.modelId);
                await vscode_1.window.showInformationMessage(`API key for ${selectedModel.label} has been deleted.`);
            }
            else {
                // Store the new API key
                await this._byokStorageService.storeAPIKey(this.providerName, newApiKey, 1 /* BYOKAuthType.PerModelDeployment */, selectedModel.modelId);
                await vscode_1.window.showInformationMessage(`API key for ${selectedModel.label} has been updated.`);
            }
        }
    }
};
exports.CustomOAIBYOKModelProvider = CustomOAIBYOKModelProvider;
exports.CustomOAIBYOKModelProvider = CustomOAIBYOKModelProvider = CustomOAIBYOKModelProvider_1 = __decorate([
    __param(1, configurationService_1.IConfigurationService),
    __param(2, logService_1.ILogService),
    __param(3, instantiation_1.IInstantiationService),
    __param(4, nullExperimentationService_1.IExperimentationService)
], CustomOAIBYOKModelProvider);
//# sourceMappingURL=customOAIProvider.js.map