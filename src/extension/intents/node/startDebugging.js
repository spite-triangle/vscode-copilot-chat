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
var StartDebuggingIntent_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StartDebuggingIntent = exports.startDebuggingIntentPromptSnippet = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const packagejson_1 = require("../../../platform/env/common/packagejson");
const extensionsService_1 = require("../../../platform/extensions/common/extensionsService");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const parseLaunchConfigFromResponse_1 = require("../../onboardDebug/node/parseLaunchConfigFromResponse");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const startDebugging_1 = require("../../prompts/node/panel/startDebugging");
exports.startDebuggingIntentPromptSnippet = 'Attach to node app at port 5870 with outFiles';
let StartDebuggingIntent = class StartDebuggingIntent {
    static { StartDebuggingIntent_1 = this; }
    static { this.ID = "startDebugging" /* Intent.StartDebugging */; }
    constructor(endpointProvider, instantiationService, extensionsService) {
        this.endpointProvider = endpointProvider;
        this.instantiationService = instantiationService;
        this.extensionsService = extensionsService;
        this.id = StartDebuggingIntent_1.ID;
        this.locations = [commonTypes_1.ChatLocation.Panel];
        this.description = l10n.t('Start Debugging');
        // todo@meganrogge: remove this when it's ready to use.
        this.isListedCapability = false;
        this.commandInfo = {
            allowsEmptyArgs: true,
            defaultEnablement: packagejson_1.isPreRelease,
        };
    }
    async invoke(invocationContext) {
        const location = invocationContext.location;
        const endpoint = await this.endpointProvider.getChatEndpoint(invocationContext.request);
        return {
            intent: this,
            location,
            endpoint,
            processResponse: async (context, responseStream, progress, token) => {
                let response = '';
                progress.progress(l10n.t('Solving for launch configuration...'));
                for await (const { delta } of responseStream) {
                    if (token.isCancellationRequested) {
                        return;
                    }
                    response += delta.text;
                }
                const config = (0, parseLaunchConfigFromResponse_1.parseLaunchConfigFromResponse)(response, this.extensionsService);
                if (!config) {
                    progress.markdown(response);
                    return;
                }
                const hasConfigNoQuery = response.match('HAS_CONFIG_NO_QUERY');
                const hasMatch = response.match('HAS_MATCH');
                const generatedConfig = response.match('GENERATED_CONFIG');
                response = response.replaceAll(/"type": "python",/g, '"type": "debugpy",');
                response = response.replace(/HAS_CONFIG_NO_QUERY/g, '');
                response = response.replace(/HAS_MATCH/g, '');
                response = response.replace(/GENERATED_CONFIG/g, '');
                progress.markdown(response);
                if (hasConfigNoQuery) {
                    progress.markdown('\n' + l10n.t('Generate a new launch configuration by providing more specifics in your query.') + '\n');
                    progress.button({
                        title: l10n.t('Select and Start Debugging'),
                        command: 'workbench.action.debug.selectandstart'
                    });
                }
                else if (hasMatch) {
                    progress.markdown('\n' + l10n.t('Generate a new launch configuration by providing more specifics in your query.') + '\n');
                    progress.button({
                        title: l10n.t('Start Debugging Existing'),
                        command: 'github.copilot.startDebugging',
                        arguments: [config, progress]
                    });
                }
                else if (generatedConfig) {
                    const hasTask = config.tasks?.length;
                    progress.button({
                        title: hasTask ? l10n.t('Run Task and Start Debugging') : l10n.t('Start Debugging'),
                        command: 'github.copilot.startDebugging',
                        arguments: [config, progress]
                    });
                    progress.button({
                        title: hasTask ? l10n.t('Save Task and Configuration') : l10n.t('Save Configuration'),
                        command: 'github.copilot.createLaunchJsonFileWithContents',
                        arguments: [config]
                    });
                }
                progress.markdown('\n' + l10n.t('Debugging can be started in the [Debug View]({0}) or by using the [Start Debugging Command]({1}).', 'command:workbench.view.debug', 'command:workbench.action.debug.run'));
            },
            buildPrompt: async (context, progress, token) => {
                const renderer = promptRenderer_1.PromptRenderer.create(this.instantiationService, endpoint, startDebugging_1.StartDebuggingPrompt, {
                    input: { type: 0 /* StartDebuggingType.UserQuery */, userQuery: context.query },
                    history: context.history
                });
                const result = await renderer.render(progress, token);
                return result;
            }
        };
    }
};
exports.StartDebuggingIntent = StartDebuggingIntent;
exports.StartDebuggingIntent = StartDebuggingIntent = StartDebuggingIntent_1 = __decorate([
    __param(0, endpointProvider_1.IEndpointProvider),
    __param(1, instantiation_1.IInstantiationService),
    __param(2, extensionsService_1.IExtensionsService)
], StartDebuggingIntent);
//# sourceMappingURL=startDebugging.js.map