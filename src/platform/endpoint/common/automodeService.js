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
exports.AutomodeService = exports.IAutomodeService = void 0;
const copilot_api_1 = require("@vscode/copilot-api");
const vscode_1 = require("vscode");
const services_1 = require("../../../util/common/services");
const taskSingler_1 = require("../../../util/common/taskSingler");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const authentication_1 = require("../../authentication/common/authentication");
const chatMLFetcher_1 = require("../../chat/common/chatMLFetcher");
const logService_1 = require("../../log/common/logService");
const autoChatEndpoint_1 = require("./autoChatEndpoint");
const capiClient_1 = require("./capiClient");
exports.IAutomodeService = (0, services_1.createServiceIdentifier)('IAutomodeService');
let AutomodeService = class AutomodeService extends lifecycle_1.Disposable {
    constructor(_capiClientService, _authService, _logService, _chatMLFetcher) {
        super();
        this._capiClientService = _capiClientService;
        this._authService = _authService;
        this._logService = _logService;
        this._chatMLFetcher = _chatMLFetcher;
        this._autoModelCache = new Map();
        this._taskSingler = new taskSingler_1.TaskSingler();
        this._register(this._authService.onDidAuthenticationChange(() => {
            this._autoModelCache.clear();
        }));
        this._serviceBrand = undefined;
    }
    async _updateAutoEndpointCache(chatRequest, knownEndpoints) {
        const startTime = Date.now();
        const conversationId = getConversationId(chatRequest);
        const cacheEntry = this._autoModelCache.get(conversationId);
        const existingToken = cacheEntry?.autoModeToken;
        const isExpired = cacheEntry && (cacheEntry.expiration <= Date.now());
        const authToken = (await this._authService.getCopilotToken()).token;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        };
        if (existingToken && !isExpired) {
            headers['Copilot-Session-Token'] = existingToken;
        }
        let data;
        try {
            let config = vscode_1.workspace.getConfiguration('github.copilot').get('forceOffline');
            if (config) {
                throw Error('offline');
            }
            const response = await this._capiClientService.makeRequest({
                json: {
                    "auto_mode": { "model_hints": ["auto"] },
                },
                headers,
                method: 'POST'
            }, { type: copilot_api_1.RequestType.AutoModels });
            data = await response.json();
        }
        catch (e) {
            data = JSON.parse(`
			{
				"available_models": [
					"gpt-5-mini"
				],
				"selected_model": "gpt-5-mini",
				"session_token": "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdmFpbGFibGVfbW9kZWxzIjpbImdwdC01LW1pbmkiXSwic2VsZWN0ZWRfbW9kZWwiOiJncHQtNS1taW5pIiwic3ViIjoiNzBiMzZjOWUtZWEwOC00OGMyLWIyOGUtMGRkNTM1YjM5OTgyIiwiaWF0IjoxNzYwMDI5OTEzLCJleHAiOjE3NjAwMzM1MTMsImRpc2NvdW50ZWRfY29zdHMiOnsiZ3B0LTUtbWluaSI6MC4xfX0.0ldG2uQkBiuiC7BtHHbFvqFrEsxo50L5Jaai5BZWoRd9M_lX8hWr-waNdx6zQ1qVQUIVnwa-AIw7ENHvPNMvIw",
				"expires_at": 2770033513,
				"discounted_costs": {
					"gpt-5-mini": 0.1
				}
			}
			`);
        }
        const selectedModel = knownEndpoints.find(e => e.model === data.selected_model) || knownEndpoints[0];
        const autoEndpoint = new autoChatEndpoint_1.AutoChatEndpoint(selectedModel, this._chatMLFetcher, data.session_token, data.discounted_costs?.[selectedModel.model] || 0);
        this._autoModelCache.set(conversationId, {
            endpoint: autoEndpoint,
            expiration: data.expires_at * 1000,
            autoModeToken: data.session_token,
            lastRequestId: chatRequest?.id
        });
        this._logService.info(`Fetched auto model in ${Date.now() - startTime}ms.`);
        return autoEndpoint;
    }
    async resolveAutoModeEndpoint(chatRequest, knownEndpoints) {
        const cacheEntry = this._autoModelCache.get(getConversationId(chatRequest));
        const expiringSoon = cacheEntry && (cacheEntry.expiration - Date.now() < 5 * 60 * 1000);
        const isExpired = cacheEntry && (cacheEntry.expiration < Date.now());
        if (cacheEntry && !expiringSoon) { // Not expiring soon -> Return cached
            return cacheEntry.endpoint;
        }
        else if (cacheEntry && expiringSoon && !isExpired && chatRequest?.id === cacheEntry.lastRequestId) { // Expiring soon but the request is the same, so keep model sticky
            return cacheEntry.endpoint;
        }
        else { // Either no cache, it's expiring soon and a new request, or it has expired
            return this._taskSingler.getOrCreate(getConversationId(chatRequest), () => this._updateAutoEndpointCache(chatRequest, knownEndpoints));
        }
    }
};
exports.AutomodeService = AutomodeService;
exports.AutomodeService = AutomodeService = __decorate([
    __param(0, capiClient_1.ICAPIClientService),
    __param(1, authentication_1.IAuthenticationService),
    __param(2, logService_1.ILogService),
    __param(3, chatMLFetcher_1.IChatMLFetcher)
], AutomodeService);
/**
 * Get the conversation ID from the chat request. This is representative of a single chat thread
 * @param chatRequest The chat request object.
 * @returns The conversation ID or 'unknown' if not available.
 */
function getConversationId(chatRequest) {
    if (!chatRequest) {
        return 'unknown';
    }
    return chatRequest?.toolInvocationToken?.sessionId || 'unknown';
}
//# sourceMappingURL=automodeService.js.map