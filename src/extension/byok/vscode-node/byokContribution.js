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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BYOKContrib = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const vscode_1 = require("vscode");
const authentication_1 = require("../../../platform/authentication/common/authentication");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const capiClient_1 = require("../../../platform/endpoint/common/capiClient");
const extensionContext_1 = require("../../../platform/extContext/common/extensionContext");
const logService_1 = require("../../../platform/log/common/logService");
const fetcherService_1 = require("../../../platform/networking/common/fetcherService");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const byokProvider_1 = require("../../byok/common/byokProvider");
const anthropicProvider_1 = require("./anthropicProvider");
const azureProvider_1 = require("./azureProvider");
const byokStorageService_1 = require("./byokStorageService");
const customOAIModelConfigurator_1 = require("./customOAIModelConfigurator");
const customOAIProvider_1 = require("./customOAIProvider");
const geminiProvider_1 = require("./geminiProvider");
const groqProvider_1 = require("./groqProvider");
const ollamaProvider_1 = require("./ollamaProvider");
const openAIProvider_1 = require("./openAIProvider");
const openRouterProvider_1 = require("./openRouterProvider");
const xAIProvider_1 = require("./xAIProvider");
let BYOKContrib = class BYOKContrib extends lifecycle_1.Disposable {
    constructor(_fetcherService, _logService, _configurationService, _capiClientService, extensionContext, authService, _instantiationService) {
        super();
        this._fetcherService = _fetcherService;
        this._logService = _logService;
        this._configurationService = _configurationService;
        this._capiClientService = _capiClientService;
        this._instantiationService = _instantiationService;
        this.id = 'byok-contribution';
        this._providers = new Map();
        this._byokProvidersRegistered = false;
        this._register(vscode_1.commands.registerCommand('github.copilot.chat.manageBYOK', async (vendor) => {
            const provider = this._providers.get(vendor);
            // Show quick pick for Azure and CustomOAI providers
            if (provider && (vendor === azureProvider_1.AzureBYOKModelProvider.providerName.toLowerCase() || vendor === customOAIProvider_1.CustomOAIBYOKModelProvider.providerName.toLowerCase())) {
                const configurator = new customOAIModelConfigurator_1.CustomOAIModelConfigurator(this._configurationService, vendor, provider);
                await configurator.configureModelOrUpdateAPIKey();
            }
            else if (provider) {
                // For all other providers, directly go to API key management
                await provider.updateAPIKey();
            }
        }));
        this._byokStorageService = new byokStorageService_1.BYOKStorageService(extensionContext);
        this._authChange(authService, this._instantiationService);
        this._register(authService.onDidAuthenticationChange(() => {
            this._authChange(authService, this._instantiationService);
        }));
    }
    async _authChange(authService, instantiationService) {
        if (authService.copilotToken && (0, byokProvider_1.isBYOKEnabled)(authService.copilotToken, this._capiClientService) && !this._byokProvidersRegistered) {
            this._byokProvidersRegistered = true;
            // Update known models list from CDN so all providers have the same list
            const knownModels = await this.fetchKnownModelList(this._fetcherService);
            this._providers.set(ollamaProvider_1.OllamaLMProvider.providerName.toLowerCase(), instantiationService.createInstance(ollamaProvider_1.OllamaLMProvider, this._configurationService.getConfig(configurationService_1.ConfigKey.OllamaEndpoint), this._byokStorageService));
            this._providers.set(anthropicProvider_1.AnthropicLMProvider.providerName.toLowerCase(), instantiationService.createInstance(anthropicProvider_1.AnthropicLMProvider, knownModels[anthropicProvider_1.AnthropicLMProvider.providerName], this._byokStorageService));
            this._providers.set(groqProvider_1.GroqBYOKLMProvider.providerName.toLowerCase(), instantiationService.createInstance(groqProvider_1.GroqBYOKLMProvider, knownModels[groqProvider_1.GroqBYOKLMProvider.providerName], this._byokStorageService));
            this._providers.set(geminiProvider_1.GeminiBYOKLMProvider.providerName.toLowerCase(), instantiationService.createInstance(geminiProvider_1.GeminiBYOKLMProvider, knownModels[geminiProvider_1.GeminiBYOKLMProvider.providerName], this._byokStorageService));
            this._providers.set(xAIProvider_1.XAIBYOKLMProvider.providerName.toLowerCase(), instantiationService.createInstance(xAIProvider_1.XAIBYOKLMProvider, knownModels[xAIProvider_1.XAIBYOKLMProvider.providerName], this._byokStorageService));
            this._providers.set(openAIProvider_1.OAIBYOKLMProvider.providerName.toLowerCase(), instantiationService.createInstance(openAIProvider_1.OAIBYOKLMProvider, knownModels[openAIProvider_1.OAIBYOKLMProvider.providerName], this._byokStorageService));
            this._providers.set(openRouterProvider_1.OpenRouterLMProvider.providerName.toLowerCase(), instantiationService.createInstance(openRouterProvider_1.OpenRouterLMProvider, this._byokStorageService));
            this._providers.set(azureProvider_1.AzureBYOKModelProvider.providerName.toLowerCase(), instantiationService.createInstance(azureProvider_1.AzureBYOKModelProvider, this._byokStorageService));
            for (const [providerName, provider] of this._providers) {
                this._store.add(vscode_1.lm.registerLanguageModelChatProvider(providerName, provider));
            }
        }
    }
    async fetchKnownModelList(fetcherService) {
        const data = await (await fetcherService.fetch('https://main.vscode-cdn.net/extensions/copilotChat.json', { method: "GET" })).json();
        let knownModels;
        if (data.version !== 1) {
            this._logService.warn('BYOK: Copilot Chat known models list is not in the expected format. Defaulting to empty list.');
            knownModels = {};
        }
        else {
            knownModels = data.modelInfo;
        }
        this._logService.info('BYOK: Copilot Chat known models list fetched successfully.');
        return knownModels;
    }
};
exports.BYOKContrib = BYOKContrib;
exports.BYOKContrib = BYOKContrib = __decorate([
    __param(0, fetcherService_1.IFetcherService),
    __param(1, logService_1.ILogService),
    __param(2, configurationService_1.IConfigurationService),
    __param(3, capiClient_1.ICAPIClientService),
    __param(4, extensionContext_1.IVSCodeExtensionContext),
    __param(5, authentication_1.IAuthenticationService),
    __param(6, instantiation_1.IInstantiationService)
], BYOKContrib);
//# sourceMappingURL=byokContribution.js.map