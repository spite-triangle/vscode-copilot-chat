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
exports.ChatReplayConfigProvider = exports.ChatReplayContribution = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const vscode_1 = require("vscode");
const requestLogger_1 = require("../../../platform/requestLogger/node/requestLogger");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const replayDebugSession_1 = require("./replayDebugSession");
let ChatReplayContribution = class ChatReplayContribution extends lifecycle_1.Disposable {
    constructor(_instantiationService) {
        super();
        this._instantiationService = _instantiationService;
        const provider = new ChatReplayConfigProvider();
        this._register(vscode_1.debug.registerDebugConfigurationProvider('vscode-chat-replay', provider));
        const factory = new InlineDebugAdapterFactory();
        this._register(vscode_1.debug.registerDebugAdapterDescriptorFactory('vscode-chat-replay', factory));
        this.registerStartReplayCommand();
        this.registerEnableWorkspaceEditTracingCommand();
        this.registerDisableWorkspaceEditTracingCommand();
        vscode_1.commands.executeCommand('setContext', 'github.copilot.chat.replay.workspaceEditTracing', false);
    }
    registerStartReplayCommand() {
        this._register(vscode_1.commands.registerCommand('github.copilot.chat.replay', async () => {
            const editor = vscode_1.window.activeTextEditor;
            if (!editor || editor.document.languageId !== 'chatReplay') {
                vscode_1.window.showInformationMessage('Open a chat replay file to debug.');
                return;
            }
            const debugConfig = {
                type: 'vscode-chat-replay',
                name: 'Debug Chat Replay',
                request: 'launch',
                program: editor.document.uri.fsPath,
                stopOnEntry: true
            };
            await vscode_1.debug.startDebugging(undefined, debugConfig);
        }));
    }
    registerEnableWorkspaceEditTracingCommand() {
        this._register(vscode_1.commands.registerCommand('github.copilot.chat.replay.enableWorkspaceEditTracing', async () => {
            const logger = this._instantiationService.invokeFunction(accessor => accessor.get(requestLogger_1.IRequestLogger));
            logger.enableWorkspaceEditTracing();
            await vscode_1.commands.executeCommand('setContext', 'github.copilot.chat.replay.workspaceEditTracing', true);
        }));
    }
    registerDisableWorkspaceEditTracingCommand() {
        this._register(vscode_1.commands.registerCommand('github.copilot.chat.replay.disableWorkspaceEditTracing', async () => {
            const logger = this._instantiationService.invokeFunction(accessor => accessor.get(requestLogger_1.IRequestLogger));
            logger.disableWorkspaceEditTracing();
            await vscode_1.commands.executeCommand('setContext', 'github.copilot.chat.replay.workspaceEditTracing', false);
        }));
    }
};
exports.ChatReplayContribution = ChatReplayContribution;
exports.ChatReplayContribution = ChatReplayContribution = __decorate([
    __param(0, instantiation_1.IInstantiationService)
], ChatReplayContribution);
class InlineDebugAdapterFactory {
    createDebugAdapterDescriptor(session) {
        return new vscode_1.DebugAdapterInlineImplementation(new replayDebugSession_1.ChatReplayDebugSession(session.workspaceFolder));
    }
}
class ChatReplayConfigProvider {
    resolveDebugConfiguration(folder, config, token) {
        // if launch.json is missing or empty
        if (!config.type && !config.request && !config.name) {
            const editor = vscode_1.window.activeTextEditor;
            if (editor && editor.document.languageId === 'chatReplay') {
                config.type = 'vscode-chat-replay';
                config.name = 'Launch';
                config.request = 'launch';
                config.program = '${file}';
                config.stopOnEntry = true;
            }
        }
        if (!config.program) {
            return vscode_1.window.showInformationMessage("Cannot find a program to debug").then(_ => {
                return undefined; // abort launch
            });
        }
        return config;
    }
}
exports.ChatReplayConfigProvider = ChatReplayConfigProvider;
//# sourceMappingURL=chatReplayContrib.js.map