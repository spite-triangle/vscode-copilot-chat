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
exports.AuthenticationChatUpgradeService = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const arrays_1 = require("../../../util/vs/base/common/arrays");
const arraysFind_1 = require("../../../util/vs/base/common/arraysFind");
const event_1 = require("../../../util/vs/base/common/event");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const uri_1 = require("../../../util/vs/base/common/uri");
const vscodeTypes_1 = require("../../../vscodeTypes");
const configurationService_1 = require("../../configuration/common/configurationService");
const gitService_1 = require("../../git/common/gitService");
const githubService_1 = require("../../github/common/githubService");
const logService_1 = require("../../log/common/logService");
const authentication_1 = require("./authentication");
let AuthenticationChatUpgradeService = class AuthenticationChatUpgradeService extends lifecycle_1.Disposable {
    //#endregion
    constructor(_authenticationService, gitService, logService, ghRepoService, configurationService) {
        super();
        this._authenticationService = _authenticationService;
        this.gitService = gitService;
        this.logService = logService;
        this.ghRepoService = ghRepoService;
        this.configurationService = configurationService;
        this.hasRequestedPermissiveSessionUpgrade = false;
        //#region Localization
        this._permissionRequest = l10n.t('Permission Request');
        this._permissionRequestGrant = l10n.t('Grant');
        this._permissionRequestNotNow = l10n.t('Not Now');
        this._permissionRequestNeverAskAgain = l10n.t('Never Ask Again');
        this._onDidGrantAuthUpgrade = this._register(new event_1.Emitter());
        this.onDidGrantAuthUpgrade = this._onDidGrantAuthUpgrade.event;
        // If the user signs out, reset the upgrade state
        this._register(this._authenticationService.onDidAuthenticationChange(() => {
            if (this._authenticationService.anyGitHubSession) {
                this.hasRequestedPermissiveSessionUpgrade = false;
            }
        }));
    }
    async shouldRequestPermissiveSessionUpgrade() {
        let reason = 'true';
        try {
            // We don't want to be annoying
            if (this.hasRequestedPermissiveSessionUpgrade) {
                reason = 'false - already requested';
                return false;
            }
            // The user does not want to be asked
            if (this._authenticationService.isMinimalMode) {
                reason = 'false - minimal mode';
                return false;
            }
            // We already have a permissive session
            if (await this._authenticationService.getPermissiveGitHubSession({ silent: true })) {
                reason = 'false - already have permissive session';
                return false;
            }
            // The user is not signed in at all
            if (!(await this._authenticationService.getAnyGitHubSession({ silent: true }))) {
                reason = 'false - not signed in';
                return false;
            }
            // The user has access to all repositories
            if (await this._canAccessAllRepositories()) {
                reason = 'false - access to all repositories';
                return false;
            }
            return true;
        }
        finally {
            this.logService.trace(`Should request permissive session upgrade: ${reason}`);
        }
    }
    async showPermissiveSessionModal() {
        if (this.hasRequestedPermissiveSessionUpgrade) {
            this.logService.trace('Already requested permissive session upgrade');
            return false;
        }
        this.logService.trace('Requesting permissive session upgrade');
        this.hasRequestedPermissiveSessionUpgrade = true;
        try {
            await this._authenticationService.getPermissiveGitHubSession({
                forceNewSession: {
                    detail: l10n.t('To get more relevant Chat results, we need permission to read the contents of your repository on GitHub.'),
                    learnMore: uri_1.URI.parse('https://aka.ms/copilotRepoScope'),
                },
                clearSessionPreference: true
            });
            return true;
        }
        catch (e) {
            // User cancelled so show the badge
            await this._authenticationService.getPermissiveGitHubSession({});
            return false;
        }
    }
    showPermissiveSessionUpgradeInChat(stream, data, detail) {
        this.logService.trace('Requesting permissive session upgrade in chat');
        this.hasRequestedPermissiveSessionUpgrade = true;
        stream.confirmation(this._permissionRequest, detail || l10n.t('To get more relevant Chat results, we need permission to read the contents of your repository on GitHub.'), { authPermissionPrompted: true, ...data }, [
            this._permissionRequestGrant,
            this._permissionRequestNotNow,
            this._permissionRequestNeverAskAgain
        ]);
    }
    async handleConfirmationRequest(stream, request, history) {
        const findConfirmationRequested = request.acceptedConfirmationData?.find(ref => ref?.authPermissionPrompted);
        if (!findConfirmationRequested) {
            return request;
        }
        this.logService.trace('Handling confirmation request');
        switch (request.prompt) {
            case `${this._permissionRequestGrant}: "${this._permissionRequest}"`:
                this.logService.trace('User granted permission');
                try {
                    await this._authenticationService.getPermissiveGitHubSession({ createIfNone: true });
                    this._onDidGrantAuthUpgrade.fire();
                }
                catch (e) {
                    // User cancelled so show the badge
                    await this._authenticationService.getPermissiveGitHubSession({});
                }
                break;
            case `${this._permissionRequestNotNow}: "${this._permissionRequest}"`:
                this.logService.trace('User declined permission');
                stream.markdown(l10n.t("Ok. I won't bother you again for now. If you change your mind, you can react to the authentication request in the Account menu.") + '\n\n');
                await this._authenticationService.getPermissiveGitHubSession({});
                break;
            case `${this._permissionRequestNeverAskAgain}: "${this._permissionRequest}"`:
                this.logService.trace('User chose never ask again for permission');
                await this.configurationService.setConfig(configurationService_1.ConfigKey.Shared.AuthPermissions, configurationService_1.AuthPermissionMode.Minimal);
                // Change this back to false to handle if the user changes back to allowing permissive tokens.
                this.hasRequestedPermissiveSessionUpgrade = false;
                stream.markdown(l10n.t('Ok. I saved this decision to the `{0}` setting', configurationService_1.ConfigKey.Shared.AuthPermissions.fullyQualifiedId) + '\n\n');
                break;
        }
        const previousRequest = (0, arraysFind_1.findLast)(history, item => item instanceof vscodeTypes_1.ChatRequestTurn);
        // Simple types can be used from the findConfirmationRequested request. Classes will have been serialized and not deserialized into class instances.
        // Props that exist on the history entry are used, otherwise fall back to either the current request or the saved request.
        if (previousRequest) {
            return {
                prompt: previousRequest.prompt,
                command: previousRequest.command,
                references: previousRequest.references,
                toolReferences: previousRequest.toolReferences,
                toolInvocationToken: request.toolInvocationToken,
                attempt: request.attempt,
                enableCommandDetection: request.enableCommandDetection,
                isParticipantDetected: findConfirmationRequested.isParticipantDetected,
                location: request.location,
                location2: request.location2,
                model: request.model,
                tools: new Map(),
                id: request.id,
                sessionId: '1'
            };
        }
        else {
            // Something went wrong, history item was deleted or lost?
            return {
                prompt: findConfirmationRequested.prompt,
                command: findConfirmationRequested.command,
                references: [],
                toolReferences: [],
                toolInvocationToken: request.toolInvocationToken,
                attempt: request.attempt,
                enableCommandDetection: request.enableCommandDetection,
                isParticipantDetected: findConfirmationRequested.isParticipantDetected,
                location: request.location,
                location2: request.location2,
                model: request.model,
                tools: new Map(),
                id: request.id,
                sessionId: '1'
            };
        }
    }
    async _canAccessAllRepositories() {
        const repoContexts = this.gitService?.repositories;
        if (!repoContexts) {
            this.logService.debug('No git repositories found');
            return false;
        }
        const repoIds = (0, arrays_1.coalesce)(repoContexts.map(x => (0, gitService_1.getGitHubRepoInfoFromContext)(x)?.id));
        const result = await Promise.all(repoIds.map(repoId => {
            return this.ghRepoService.isAvailable(repoId.org, repoId.repo);
        }));
        return result.every(level => level);
    }
};
exports.AuthenticationChatUpgradeService = AuthenticationChatUpgradeService;
exports.AuthenticationChatUpgradeService = AuthenticationChatUpgradeService = __decorate([
    __param(0, authentication_1.IAuthenticationService),
    __param(1, gitService_1.IGitService),
    __param(2, logService_1.ILogService),
    __param(3, githubService_1.IGithubRepositoryService),
    __param(4, configurationService_1.IConfigurationService)
], AuthenticationChatUpgradeService);
//# sourceMappingURL=authenticationUpgradeService.js.map