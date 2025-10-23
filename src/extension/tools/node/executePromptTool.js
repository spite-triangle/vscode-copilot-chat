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
Object.defineProperty(exports, "__esModule", { value: true });
const chatResponseStreamImpl_1 = require("../../../util/common/chatResponseStreamImpl");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const conversation_1 = require("../../prompt/common/conversation");
const executePromptToolCalling_1 = require("../../prompt/node/executePromptToolCalling");
const toolNames_1 = require("../common/toolNames");
const toolsRegistry_1 = require("../common/toolsRegistry");
let ExecutePromptTool = class ExecutePromptTool {
    static { this.toolName = toolNames_1.ToolName.ExecutePrompt; }
    constructor(instantiationService) {
        this.instantiationService = instantiationService;
    }
    async invoke(options, token) {
        const loop = this.instantiationService.createInstance(executePromptToolCalling_1.ExecutePromptToolCallingLoop, {
            toolCallLimit: 25,
            conversation: new conversation_1.Conversation('', [new conversation_1.Turn('', { type: 'user', message: options.input.prompt })]),
            request: this._inputContext.request,
            location: this._inputContext.request.location,
            promptText: options.input.prompt,
        });
        // I want to render this content as thinking blocks when we they include tool calls
        const stream = this._inputContext?.stream && chatResponseStreamImpl_1.ChatResponseStreamImpl.filter(this._inputContext.stream, part => part instanceof vscodeTypes_1.ChatPrepareToolInvocationPart);
        const loopResult = await loop.run(stream, token);
        // Return the text of the last assistant response from the tool calling loop
        const lastRoundResponse = loopResult.toolCallRounds.at(-1)?.response ?? loopResult.round.response ?? '';
        const result = new vscodeTypes_1.ExtendedLanguageModelToolResult([new vscodeTypes_1.LanguageModelTextPart(lastRoundResponse)]);
        return result;
    }
    prepareInvocation(options, token) {
        const { input } = options;
        try {
            return {
                invocationMessage: input.description,
            };
        }
        catch {
            return;
        }
    }
    async resolveInput(input, promptContext, mode) {
        this._inputContext = promptContext;
        return input;
    }
};
ExecutePromptTool = __decorate([
    __param(0, instantiation_1.IInstantiationService)
], ExecutePromptTool);
toolsRegistry_1.ToolRegistry.registerTool(ExecutePromptTool);
//# sourceMappingURL=executePromptTool.js.map