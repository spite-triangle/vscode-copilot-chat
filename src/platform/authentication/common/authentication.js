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
exports.BaseAuthenticationService = exports.IAuthenticationService = exports.MinimalModeError = exports.GITHUB_SCOPE_ALIGNED = exports.GITHUB_SCOPE_READ_USER = exports.GITHUB_SCOPE_USER_EMAIL = void 0;
const services_1 = require("../../../util/common/services");
const event_1 = require("../../../util/vs/base/common/event");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const observableInternal_1 = require("../../../util/vs/base/common/observableInternal");
const configurationService_1 = require("../../configuration/common/configurationService");
const logService_1 = require("../../log/common/logService");
const copilotTokenManager_1 = require("./copilotTokenManager");
const copilotTokenStore_1 = require("./copilotTokenStore");
// Minimum set of scopes needed for Copilot to work
exports.GITHUB_SCOPE_USER_EMAIL = ['user:email'];
// Old list of scopes still used for backwards compatibility
exports.GITHUB_SCOPE_READ_USER = ['read:user'];
// The same scopes that GitHub Pull Request, GitHub Repositories, and others use
exports.GITHUB_SCOPE_ALIGNED = ['read:user', 'user:email', 'repo', 'workflow'];
class MinimalModeError extends Error {
    constructor() {
        super('The authentication service is in minimal mode.');
        this.name = 'MinimalModeError';
    }
}
exports.MinimalModeError = MinimalModeError;
exports.IAuthenticationService = (0, services_1.createServiceIdentifier)('IAuthenticationService');
let BaseAuthenticationService = class BaseAuthenticationService extends lifecycle_1.Disposable {
    constructor(_logService, _tokenStore, _tokenManager, _configurationService) {
        super();
        this._logService = _logService;
        this._tokenStore = _tokenStore;
        this._tokenManager = _tokenManager;
        this._configurationService = _configurationService;
        this._onDidAuthenticationChange = this._register(new event_1.Emitter());
        this.onDidAuthenticationChange = this._onDidAuthenticationChange.event;
        this._onDidAccessTokenChange = this._register(new event_1.Emitter());
        this.onDidAccessTokenChange = this._onDidAccessTokenChange.event;
        this._onDidAdoAuthenticationChange = this._register(new event_1.Emitter());
        this.onDidAdoAuthenticationChange = this._onDidAdoAuthenticationChange.event;
        //#region isMinimalMode
        this._isMinimalMode = (0, observableInternal_1.derived)(r => this._configurationService.getConfigObservable(configurationService_1.ConfigKey.Shared.AuthPermissions).read(r) === configurationService_1.AuthPermissionMode.Minimal);
        this._register(_tokenManager.onDidCopilotTokenRefresh(() => {
            this._logService.debug('Handling CopilotToken refresh.');
            void this._handleAuthChangeEvent();
        }));
    }
    get isMinimalMode() {
        return this._isMinimalMode.get();
    }
    get anyGitHubSession() {
        return this._anyGitHubSession;
    }
    get permissiveGitHubSession() {
        return this._permissiveGitHubSession;
    }
    get anyAdoSession() {
        return this._anyAdoSession;
    }
    get copilotToken() {
        return this._tokenStore.copilotToken;
    }
    async getCopilotToken(force) {
        try {
            const token = await this._tokenManager.getCopilotToken(force);
            this._tokenStore.copilotToken = token;
            this._copilotTokenError = undefined;
            return token;
        }
        catch (afterError) {
            this._tokenStore.copilotToken = undefined;
            const beforeError = this._copilotTokenError;
            this._copilotTokenError = afterError;
            // This handles the case where the user still can't get a Copilot Token,
            // but the error has change. I.e. They go from being not signed in (no copilot token can be minted)
            // to an account that doesn't have a valid subscription (no copilot token can be minted).
            // NOTE: if either error is undefined, this event should be fired elsewhere already.
            if (beforeError && afterError && beforeError.message !== afterError.message) {
                this._onDidAuthenticationChange.fire();
            }
            throw afterError;
        }
    }
    resetCopilotToken(httpError) {
        this._tokenStore.copilotToken = undefined;
        this._tokenManager.resetCopilotToken(httpError);
    }
    //#endregion
    async _handleAuthChangeEvent() {
        const anyGitHubSessionBefore = this._anyGitHubSession;
        const permissiveGitHubSessionBefore = this._permissiveGitHubSession;
        const anyAdoSessionBefore = this._anyAdoSession;
        const copilotTokenBefore = this._tokenStore.copilotToken;
        const copilotTokenErrorBefore = this._copilotTokenError;
        // Update caches
        const resolved = await Promise.allSettled([
            this.getAnyGitHubSession({ silent: true }),
            this.getPermissiveGitHubSession({ silent: true }),
            this.getAnyAdoSession({ silent: true }),
        ]);
        for (const res of resolved) {
            if (res.status === 'rejected') {
                this._logService.error(`Error getting a session: ${res.reason}`);
            }
        }
        if (anyGitHubSessionBefore?.accessToken !== this._anyGitHubSession?.accessToken ||
            permissiveGitHubSessionBefore?.accessToken !== this._permissiveGitHubSession?.accessToken) {
            this._onDidAccessTokenChange.fire();
            this._logService.debug('Auth state changed, minting a new CopilotToken...');
            // The auth state has changed, so mint a new Copilot token
            try {
                await this.getCopilotToken(true);
            }
            catch (e) {
                // Ignore errors
            }
            this._logService.debug('Minted a new CopilotToken.');
            return;
        }
        if (anyAdoSessionBefore?.accessToken !== this._anyAdoSession?.accessToken) {
            this._logService.debug(`Ado auth state changed, firing event. Had token before: ${!!anyAdoSessionBefore?.accessToken}. Has token now: ${!!this._anyAdoSession?.accessToken}.`);
            this._onDidAdoAuthenticationChange.fire();
        }
        // Auth state hasn't changed, but the Copilot token might have
        try {
            await this.getCopilotToken();
        }
        catch (e) {
            // Ignore errors
        }
        if (copilotTokenBefore?.token !== this._tokenStore.copilotToken?.token ||
            // React to errors changing too (i.e. I go from zero session to a session that doesn't have Copilot access)
            copilotTokenErrorBefore?.message !== this._copilotTokenError?.message) {
            this._logService.debug('CopilotToken state changed, firing event.');
            this._onDidAuthenticationChange.fire();
        }
        this._logService.debug('Finished handling auth change event.');
    }
};
exports.BaseAuthenticationService = BaseAuthenticationService;
exports.BaseAuthenticationService = BaseAuthenticationService = __decorate([
    __param(0, logService_1.ILogService),
    __param(1, copilotTokenStore_1.ICopilotTokenStore),
    __param(2, copilotTokenManager_1.ICopilotTokenManager),
    __param(3, configurationService_1.IConfigurationService)
], BaseAuthenticationService);
//# sourceMappingURL=authentication.js.map