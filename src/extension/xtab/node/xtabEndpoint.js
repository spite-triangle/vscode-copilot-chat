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
var XtabEndpoint_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.XtabEndpoint = void 0;
const authentication_1 = require("../../../platform/authentication/common/authentication");
const chatMLFetcher_1 = require("../../../platform/chat/common/chatMLFetcher");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const capiClient_1 = require("../../../platform/endpoint/common/capiClient");
const domainService_1 = require("../../../platform/endpoint/common/domainService");
const chatEndpoint_1 = require("../../../platform/endpoint/node/chatEndpoint");
const logService_1 = require("../../../platform/log/common/logService");
const fetcherService_1 = require("../../../platform/networking/common/fetcherService");
const nullExperimentationService_1 = require("../../../platform/telemetry/common/nullExperimentationService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const tokenizer_1 = require("../../../platform/tokenizer/node/tokenizer");
const tokenizer_2 = require("../../../util/common/tokenizer");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
let XtabEndpoint = class XtabEndpoint extends chatEndpoint_1.ChatEndpoint {
    static { XtabEndpoint_1 = this; }
    static { this.chatModelInfo = {
        id: "xtab-4o-mini-finetuned" /* CHAT_MODEL.XTAB_4O_MINI_FINETUNED */,
        name: 'xtab-4o-mini-finetuned',
        model_picker_enabled: false,
        is_chat_default: false,
        is_chat_fallback: false,
        version: 'unknown',
        capabilities: {
            type: 'chat',
            family: 'xtab-4o-mini-finetuned',
            tokenizer: tokenizer_2.TokenizerType.O200K,
            limits: {
                max_prompt_tokens: 12285,
                max_output_tokens: 4096,
            },
            supports: {
                streaming: true,
                parallel_tool_calls: false,
                tool_calls: false,
                vision: false,
                prediction: true,
            }
        }
    }; }
    constructor(_url, _apiKey, _configuredModelName, _configService, _domainService, _fetcherService, _capiClientService, _telemetryService, _authService, _chatMLFetcher, _tokenizerProvider, _instantiationService, _experimentationService, _logService) {
        const chatModelInfo = _configuredModelName ? { ...XtabEndpoint_1.chatModelInfo, id: _configuredModelName } : XtabEndpoint_1.chatModelInfo;
        super(chatModelInfo, _domainService, _capiClientService, _fetcherService, _telemetryService, _authService, _chatMLFetcher, _tokenizerProvider, _instantiationService, _configService, _experimentationService, _logService);
        this._url = _url;
        this._apiKey = _apiKey;
        this._configService = _configService;
    }
    get urlOrRequestMetadata() {
        return this._configService.getConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabProviderUrl) || this._url;
    }
    getExtraHeaders() {
        const apiKey = this._configService.getConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabProviderApiKey) || this._apiKey;
        if (!apiKey) {
            const message = `Missing API key for custom URL (${this.urlOrRequestMetadata}). Provide the API key using vscode setting \`github.copilot.chat.advanced.inlineEdits.xtabProvider.apiKey\` or, if in simulations using \`--nes-api-key\` or \`--config-file\``;
            console.error(message);
            throw new Error(message);
        }
        return {
            'Authorization': `Bearer ${apiKey}`,
            'api-key': apiKey,
        };
    }
};
exports.XtabEndpoint = XtabEndpoint;
exports.XtabEndpoint = XtabEndpoint = XtabEndpoint_1 = __decorate([
    __param(3, configurationService_1.IConfigurationService),
    __param(4, domainService_1.IDomainService),
    __param(5, fetcherService_1.IFetcherService),
    __param(6, capiClient_1.ICAPIClientService),
    __param(7, telemetry_1.ITelemetryService),
    __param(8, authentication_1.IAuthenticationService),
    __param(9, chatMLFetcher_1.IChatMLFetcher),
    __param(10, tokenizer_1.ITokenizerProvider),
    __param(11, instantiation_1.IInstantiationService),
    __param(12, nullExperimentationService_1.IExperimentationService),
    __param(13, logService_1.ILogService)
], XtabEndpoint);
//# sourceMappingURL=xtabEndpoint.js.map