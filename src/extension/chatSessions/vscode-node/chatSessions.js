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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatSessionsContrib = void 0;
const vscode = __importStar(require("vscode"));
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const descriptors_1 = require("../../../util/vs/platform/instantiation/common/descriptors");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const serviceCollection_1 = require("../../../util/vs/platform/instantiation/common/serviceCollection");
const claudeCodeAgent_1 = require("../../agents/claude/node/claudeCodeAgent");
const claudeCodeSdkService_1 = require("../../agents/claude/node/claudeCodeSdkService");
const claudeCodeSessionService_1 = require("../../agents/claude/node/claudeCodeSessionService");
const langModelServer_1 = require("../../agents/node/langModelServer");
const claudeChatSessionContentProvider_1 = require("./claudeChatSessionContentProvider");
const claudeChatSessionItemProvider_1 = require("./claudeChatSessionItemProvider");
const claudeChatSessionParticipant_1 = require("./claudeChatSessionParticipant");
let ChatSessionsContrib = class ChatSessionsContrib extends lifecycle_1.Disposable {
    constructor(instantiationService) {
        super();
        this.id = 'chatSessions';
        this.sessionType = 'claude-code';
        const claudeAgentInstaService = instantiationService.createChild(new serviceCollection_1.ServiceCollection([claudeCodeSessionService_1.IClaudeCodeSessionService, new descriptors_1.SyncDescriptor(claudeCodeSessionService_1.ClaudeCodeSessionService)], [claudeCodeSdkService_1.IClaudeCodeSdkService, new descriptors_1.SyncDescriptor(claudeCodeSdkService_1.ClaudeCodeSdkService)], [langModelServer_1.ILanguageModelServer, new descriptors_1.SyncDescriptor(langModelServer_1.LanguageModelServer)]));
        const sessionItemProvider = this._register(claudeAgentInstaService.createInstance(claudeChatSessionItemProvider_1.ClaudeChatSessionItemProvider));
        this._register(vscode.chat.registerChatSessionItemProvider(this.sessionType, sessionItemProvider));
        this._register(vscode.commands.registerCommand('github.copilot.claude.sessions.refresh', () => {
            sessionItemProvider.refresh();
        }));
        const claudeAgentManager = this._register(claudeAgentInstaService.createInstance(claudeCodeAgent_1.ClaudeAgentManager));
        const chatSessionContentProvider = claudeAgentInstaService.createInstance(claudeChatSessionContentProvider_1.ClaudeChatSessionContentProvider);
        const claudeChatSessionParticipant = claudeAgentInstaService.createInstance(claudeChatSessionParticipant_1.ClaudeChatSessionParticipant, this.sessionType, claudeAgentManager, sessionItemProvider);
        const chatParticipant = vscode.chat.createChatParticipant(this.sessionType, claudeChatSessionParticipant.createHandler());
        this._register(vscode.chat.registerChatSessionContentProvider(this.sessionType, chatSessionContentProvider, chatParticipant));
    }
};
exports.ChatSessionsContrib = ChatSessionsContrib;
exports.ChatSessionsContrib = ChatSessionsContrib = __decorate([
    __param(0, instantiation_1.IInstantiationService)
], ChatSessionsContrib);
//# sourceMappingURL=chatSessions.js.map