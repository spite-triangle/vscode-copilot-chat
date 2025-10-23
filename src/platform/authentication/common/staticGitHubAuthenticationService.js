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
exports.StaticGitHubAuthenticationService = void 0;
exports.setCopilotToken = setCopilotToken;
const configurationService_1 = require("../../configuration/common/configurationService");
const logService_1 = require("../../log/common/logService");
const authentication_1 = require("./authentication");
const copilotTokenManager_1 = require("./copilotTokenManager");
const copilotTokenStore_1 = require("./copilotTokenStore");
let StaticGitHubAuthenticationService = class StaticGitHubAuthenticationService extends authentication_1.BaseAuthenticationService {
    get githubToken() {
        if (!this._githubToken) {
            this._githubToken = this.tokenProvider();
        }
        return this._githubToken;
    }
    constructor(tokenProvider, logService, tokenStore, tokenManager, configurationService) {
        super(logService, tokenStore, tokenManager, configurationService);
        this.tokenProvider = tokenProvider;
        const that = this;
        this._anyGitHubSession = {
            get id() { return that.githubToken; },
            get accessToken() { return that.githubToken; },
            scopes: authentication_1.GITHUB_SCOPE_USER_EMAIL,
            account: {
                id: 'user',
                label: 'User'
            }
        };
        this._permissiveGitHubSession = {
            get id() { return that.githubToken; },
            get accessToken() { return that.githubToken; },
            scopes: authentication_1.GITHUB_SCOPE_ALIGNED,
            account: {
                id: 'user',
                label: 'User'
            }
        };
    }
    getAnyGitHubSession(_options) {
        return Promise.resolve(this._anyGitHubSession);
    }
    getPermissiveGitHubSession(options) {
        if (this.isMinimalMode) {
            if (options.createIfNone || options.forceNewSession) {
                throw new authentication_1.MinimalModeError();
            }
            return Promise.resolve(undefined);
        }
        return Promise.resolve(this._permissiveGitHubSession);
    }
    async getCopilotToken(force) {
        return await super.getCopilotToken(force);
    }
    setCopilotToken(token) {
        this._tokenStore.copilotToken = token;
        this._onDidAuthenticationChange.fire();
    }
    getAnyAdoSession(_options) {
        return Promise.resolve(undefined);
    }
    getAdoAccessTokenBase64(options) {
        return Promise.resolve(undefined);
    }
};
exports.StaticGitHubAuthenticationService = StaticGitHubAuthenticationService;
exports.StaticGitHubAuthenticationService = StaticGitHubAuthenticationService = __decorate([
    __param(1, logService_1.ILogService),
    __param(2, copilotTokenStore_1.ICopilotTokenStore),
    __param(3, copilotTokenManager_1.ICopilotTokenManager),
    __param(4, configurationService_1.IConfigurationService)
], StaticGitHubAuthenticationService);
function setCopilotToken(authenticationService, token) {
    if (!(authenticationService instanceof StaticGitHubAuthenticationService)) {
        throw new Error('This function should only be used with StaticGitHubAuthenticationService');
    }
    authenticationService.setCopilotToken(token);
}
//# sourceMappingURL=staticGitHubAuthenticationService.js.map