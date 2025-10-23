"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.SESSION_LOGIN_MESSAGE = void 0;
exports.authProviderId = authProviderId;
exports.getAnyAuthSession = getAnyAuthSession;
exports.getAlignedSession = getAlignedSession;
exports.authChangeAffectsCopilot = authChangeAffectsCopilot;
const vscode_1 = require("vscode");
const uri_1 = require("../../../util/vs/base/common/uri");
const configurationService_1 = require("../../configuration/common/configurationService");
const authentication_1 = require("../common/authentication");
const objects_1 = require("../../../util/vs/base/common/objects");
exports.SESSION_LOGIN_MESSAGE = 'You are not signed in to GitHub. Please sign in to use Copilot.';
function authProviderId(configurationService) {
    return (configurationService.getConfig(configurationService_1.ConfigKey.Shared.AuthProvider) === configurationService_1.AuthProviderId.GitHubEnterprise
        ? configurationService_1.AuthProviderId.GitHubEnterprise
        : configurationService_1.AuthProviderId.GitHub);
}
async function getAuthSession(providerId, defaultScopes, getSilentSession, options = {}) {
    const accounts = await vscode_1.authentication.getAccounts(providerId);
    if (!accounts.length) {
        return await vscode_1.authentication.getSession(providerId, defaultScopes, options);
    }
    if (options.forceNewSession) {
        const session = await vscode_1.authentication.getSession(providerId, defaultScopes, {
            ...options,
            forceNewSession: (0, objects_1.mixin)({ learnMore: uri_1.URI.parse('https://aka.ms/copilotRepoScope') }, options.forceNewSession),
            // When GitHub becomes a true multi-account provider, we won't have to clearSessionPreference.
            clearSessionPreference: true
        });
        return session;
    }
    const silentSession = await getSilentSession();
    if (silentSession) {
        return silentSession;
    }
    if (options.createIfNone) {
        // This will force GitHub auth to present a picker to choose which account you want to log in to if there
        // are multiple accounts.
        // When GitHub becomes a true multi-account provider, we can change this to just createIfNone: true.
        const session = await vscode_1.authentication.getSession(providerId, defaultScopes, { forceNewSession: { learnMore: uri_1.URI.parse('https://aka.ms/copilotRepoScope') }, clearSessionPreference: true });
        return session;
    }
    // Pass the options in as they are
    return await vscode_1.authentication.getSession(providerId, defaultScopes, options);
}
/**
 * Cast a wide net to get a session with any of the scopes that Copilot needs.
 * @param configurationService for determining the auth provider
 * @returns an auth session with any of the scopes that Copilot needs, or undefined if none is found
 * @deprecated use `IAuthenticationService` instead
 */
function getAnyAuthSession(configurationService, options) {
    const providerId = authProviderId(configurationService);
    return getAuthSession(providerId, authentication_1.GITHUB_SCOPE_USER_EMAIL, async () => {
        // Ask for aligned scopes first, since that's what we want to use going forward.
        if (configurationService.getConfig(configurationService_1.ConfigKey.Shared.AuthPermissions) !== configurationService_1.AuthPermissionMode.Minimal) {
            const permissive = await vscode_1.authentication.getSession(providerId, authentication_1.GITHUB_SCOPE_ALIGNED, { silent: true });
            if (permissive) {
                return permissive;
            }
        }
        const minimal = await vscode_1.authentication.getSession(providerId, authentication_1.GITHUB_SCOPE_USER_EMAIL, { silent: true });
        if (minimal) {
            return minimal;
        }
        // This is what Completions extension use to ask for and is here mostly for backwards compatibility.
        const fallback = await vscode_1.authentication.getSession(providerId, authentication_1.GITHUB_SCOPE_READ_USER, { silent: true });
        if (fallback) {
            return fallback;
        }
        return undefined;
    }, options);
}
/**
 * Get a session with an access token that has the same scopes as other GitHub extensions like GitHub Pull Requests.
 * @param configurationService for determining the auth provider
 * @param options what get passed in to getSession
 * @returns an auth session with a token with the aligned scopes, or undefined if none is found
 * @deprecated use `IAuthenticationService` instead
 */
function getAlignedSession(configurationService, options) {
    if (configurationService.getConfig(configurationService_1.ConfigKey.Shared.AuthPermissions) === configurationService_1.AuthPermissionMode.Minimal) {
        if (options.createIfNone || options.forceNewSession) {
            throw new authentication_1.MinimalModeError();
        }
        return Promise.resolve(undefined);
    }
    const providerId = authProviderId(configurationService);
    return getAuthSession(providerId, authentication_1.GITHUB_SCOPE_ALIGNED, async () => await vscode_1.authentication.getSession(providerId, authentication_1.GITHUB_SCOPE_ALIGNED, { silent: true }), options);
}
function authChangeAffectsCopilot(event, configurationService) {
    const provider = event.provider;
    const providerId = authProviderId(configurationService);
    return provider.id === providerId;
}
//# sourceMappingURL=session.js.map