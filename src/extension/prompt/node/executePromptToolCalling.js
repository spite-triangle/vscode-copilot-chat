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
var ExecutePromptToolCallingLoop_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutePromptToolCallingLoop = void 0;
const crypto_1 = require("crypto");
const authenticationUpgrade_1 = require("../../../platform/authentication/common/authenticationUpgrade");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const logService_1 = require("../../../platform/log/common/logService");
const requestLogger_1 = require("../../../platform/requestLogger/node/requestLogger");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const agentIntent_1 = require("../../intents/node/agentIntent");
const toolCallingLoop_1 = require("../../intents/node/toolCallingLoop");
const agentPrompt_1 = require("../../prompts/node/agent/agentPrompt");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const toolNames_1 = require("../../tools/common/toolNames");
const chatVariablesCollection_1 = require("../common/chatVariablesCollection");
const toolSchemaNormalizer_1 = require("../../tools/common/toolSchemaNormalizer");
let ExecutePromptToolCallingLoop = class ExecutePromptToolCallingLoop extends toolCallingLoop_1.ToolCallingLoop {
    static { ExecutePromptToolCallingLoop_1 = this; }
    static { this.ID = 'executePromptTool'; }
    constructor(options, instantiationService, logService, requestLogger, endpointProvider, authenticationChatUpgradeService, telemetryService) {
        super(options, instantiationService, endpointProvider, logService, requestLogger, authenticationChatUpgradeService, telemetryService);
        this.instantiationService = instantiationService;
        this.endpointProvider = endpointProvider;
    }
    createPromptContext(availableTools, outputStream) {
        const context = super.createPromptContext(availableTools, outputStream);
        if (context.tools) {
            context.tools = {
                ...context.tools,
                toolReferences: [],
                inSubAgent: true
            };
        }
        context.query = this.options.promptText;
        context.chatVariables = new chatVariablesCollection_1.ChatVariablesCollection();
        context.conversation = undefined;
        return context;
    }
    async getEndpoint(request) {
        let endpoint = await this.endpointProvider.getChatEndpoint(this.options.request);
        if (!endpoint.supportsToolCalls) {
            endpoint = await this.endpointProvider.getChatEndpoint('gpt-4.1');
        }
        return endpoint;
    }
    async buildPrompt(promptContext, progress, token) {
        const endpoint = await this.getEndpoint(this.options.request);
        const renderer = promptRenderer_1.PromptRenderer.create(this.instantiationService, endpoint, agentPrompt_1.AgentPrompt, {
            endpoint,
            promptContext: promptContext,
            location: this.options.location,
            enableCacheBreakpoints: false,
        });
        return await renderer.render(progress, token);
    }
    async getAvailableTools() {
        const excludedTools = new Set([toolNames_1.ToolName.ExecutePrompt, toolNames_1.ToolName.CoreManageTodoList]);
        return (await (0, agentIntent_1.getAgentTools)(this.instantiationService, this.options.request))
            .filter(tool => !excludedTools.has(tool.name))
            // TODO can't do virtual tools at this level
            .slice(0, 128);
    }
    async fetch({ messages, finishedCb, requestOptions }, token) {
        const endpoint = await this.getEndpoint(this.options.request);
        return endpoint.makeChatRequest2({
            debugName: ExecutePromptToolCallingLoop_1.ID,
            messages,
            finishedCb,
            location: this.options.location,
            requestOptions: {
                ...(requestOptions ?? {}),
                temperature: 0,
                tools: (0, toolSchemaNormalizer_1.normalizeToolSchema)(endpoint.family, requestOptions?.tools, (tool, rule) => {
                    this._logService.warn(`Tool ${tool} failed validation: ${rule}`);
                }),
            },
            // This loop is inside a tool called from another request, so never user initiated
            userInitiatedRequest: false,
            telemetryProperties: {
                messageId: (0, crypto_1.randomUUID)(),
                messageSource: ExecutePromptToolCallingLoop_1.ID
            },
        }, token);
    }
};
exports.ExecutePromptToolCallingLoop = ExecutePromptToolCallingLoop;
exports.ExecutePromptToolCallingLoop = ExecutePromptToolCallingLoop = ExecutePromptToolCallingLoop_1 = __decorate([
    __param(1, instantiation_1.IInstantiationService),
    __param(2, logService_1.ILogService),
    __param(3, requestLogger_1.IRequestLogger),
    __param(4, endpointProvider_1.IEndpointProvider),
    __param(5, authenticationUpgrade_1.IAuthenticationChatUpgradeService),
    __param(6, telemetry_1.ITelemetryService)
], ExecutePromptToolCallingLoop);
//# sourceMappingURL=executePromptToolCalling.js.map