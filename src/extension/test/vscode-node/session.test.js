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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const sinon = __importStar(require("sinon"));
const vscode_1 = require("vscode");
const authentication_1 = require("../../../platform/authentication/common/authentication");
const session_1 = require("../../../platform/authentication/vscode-node/session");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const defaultsOnlyConfigurationService_1 = require("../../../platform/configuration/common/defaultsOnlyConfigurationService");
const inMemoryConfigurationService_1 = require("../../../platform/configuration/test/common/inMemoryConfigurationService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const descriptors_1 = require("../../../util/vs/platform/instantiation/common/descriptors");
const services_1 = require("./services");
suite('Session tests', function () {
    const testingServiceCollection = (0, services_1.createExtensionTestingServices)();
    testingServiceCollection.define(telemetry_1.ITelemetryUserConfig, new descriptors_1.SyncDescriptor(telemetry_1.TelemetryUserConfigImpl, ['test', false]));
    const accessor = testingServiceCollection.createTestingAccessor();
    let sandbox;
    let getSessionStub;
    let getAccountsStub;
    let configurationStub;
    function seedSessions(sessions) {
        getAccountsStub.resolves(sessions.map(session => session.account));
        const sessionsByScope = new Map();
        for (const session of sessions) {
            const scopeKey = session.scopes.join(' ');
            const sessionsWithScope = sessionsByScope.get(scopeKey) || [];
            sessionsWithScope.push(session);
            sessionsByScope.set(scopeKey, sessionsWithScope);
        }
        getSessionStub.callsFake((_providerId, scopes, options) => {
            let sessionsWithScope = sessionsByScope.get(scopes.join(' '));
            if (sessionsWithScope) {
                if (options?.account) {
                    sessionsWithScope = sessionsWithScope.filter(session => session.account.label === options.account?.label);
                }
                return Promise.resolve(sessionsWithScope[0]);
            }
            return Promise.resolve(undefined);
        });
    }
    setup(() => {
        sandbox = sinon.createSandbox();
        getSessionStub = sandbox.stub(vscode_1.authentication, 'getSession');
        // default to no session
        getSessionStub.resolves(undefined);
        getAccountsStub = sandbox.stub(vscode_1.authentication, 'getAccounts');
        // default to no accounts
        getAccountsStub.resolves([]);
        configurationStub = sandbox.stub(vscode_1.workspace, 'getConfiguration');
        configurationStub.returns(new class {
            constructor() {
                this._data = new Map();
            }
            get(section, defaultValue) {
                return this._data.get(section) ?? defaultValue;
            }
            has(section) {
                return !!this._data.get(section);
            }
            inspect(section) {
                return undefined;
            }
            update(section, value, configurationTarget, overrideInLanguage) {
                this._data.set(section, value);
                return Promise.resolve();
            }
        });
    });
    teardown(() => {
        sandbox.restore();
    });
    suite('getAnyAuthSession', () => {
        test('should return a session with ["user:email"] scope if it is available', async () => {
            const scopes = authentication_1.GITHUB_SCOPE_USER_EMAIL;
            const sessionId = 'session-id-1';
            seedSessions([{ id: sessionId, scopes, accessToken: 'token', account: { id: 'account', label: 'account-label' } }]);
            const result = await (0, session_1.getAnyAuthSession)(accessor.get(configurationService_1.IConfigurationService));
            assert_1.default.strictEqual(result?.id, sessionId);
        });
        test('should return a session with ["read:user"] scope if it is available', async () => {
            const scopes = authentication_1.GITHUB_SCOPE_READ_USER;
            const sessionId = 'session-id-1';
            seedSessions([{ id: sessionId, scopes, accessToken: 'token', account: { id: 'account', label: 'account-label' } }]);
            const result = await (0, session_1.getAnyAuthSession)(accessor.get(configurationService_1.IConfigurationService));
            assert_1.default.strictEqual(result?.id, sessionId);
        });
        test('should return a session with aligned scopes if it is available', async () => {
            const scopes = authentication_1.GITHUB_SCOPE_ALIGNED;
            const sessionId = 'session-id-1';
            seedSessions([{ id: sessionId, scopes, accessToken: 'token', account: { id: 'account', label: 'account-label' } }]);
            const result = await (0, session_1.getAnyAuthSession)(accessor.get(configurationService_1.IConfigurationService));
            assert_1.default.strictEqual(result?.id, sessionId);
        });
        test('should return a session with the ["user:email"] scope over ["read:user"] if it is available', async () => {
            const newSessionId = 'new-session-id-1';
            const oldSessionId = 'old-session-id-2';
            seedSessions([
                {
                    id: oldSessionId,
                    accessToken: 'old-token',
                    scopes: authentication_1.GITHUB_SCOPE_READ_USER,
                    account: { id: 'account', label: 'account-label' },
                },
                {
                    id: newSessionId,
                    accessToken: 'new-token',
                    scopes: authentication_1.GITHUB_SCOPE_USER_EMAIL,
                    account: { id: 'account', label: 'account-label' },
                }
            ]);
            const result = await (0, session_1.getAnyAuthSession)(accessor.get(configurationService_1.IConfigurationService));
            assert_1.default.strictEqual(result?.id, newSessionId);
        });
        test('should return a session with the aligned scopes if it is available', async () => {
            const newSessionId = 'new-session-id-1';
            const oldSessionId = 'old-session-id-2';
            const alignedSessionId = 'aligned-session-id-3';
            seedSessions([
                {
                    id: alignedSessionId,
                    accessToken: 'aligned-token',
                    scopes: authentication_1.GITHUB_SCOPE_ALIGNED,
                    account: { id: 'account', label: 'account-label' },
                },
                {
                    id: oldSessionId,
                    accessToken: 'old-token',
                    scopes: authentication_1.GITHUB_SCOPE_READ_USER,
                    account: { id: 'account', label: 'account-label' },
                },
                {
                    id: newSessionId,
                    accessToken: 'new-token',
                    scopes: authentication_1.GITHUB_SCOPE_USER_EMAIL,
                    account: { id: 'account', label: 'account-label' },
                },
            ]);
            const result = await (0, session_1.getAnyAuthSession)(accessor.get(configurationService_1.IConfigurationService));
            assert_1.default.strictEqual(result?.id, alignedSessionId);
        });
        test('should return undefined if there are no pre-existing sessions', async () => {
            const alignedScopeSessionStub = getSessionStub.withArgs('github', authentication_1.GITHUB_SCOPE_ALIGNED, sinon.match.any);
            const userEmailSessionStub = getSessionStub.withArgs('github', authentication_1.GITHUB_SCOPE_USER_EMAIL, sinon.match.any);
            const readUserScopeSessionStub = getSessionStub.withArgs('github', authentication_1.GITHUB_SCOPE_READ_USER, sinon.match.any);
            const result = await (0, session_1.getAnyAuthSession)(accessor.get(configurationService_1.IConfigurationService));
            assert_1.default.strictEqual(result, undefined);
            assert_1.default.strictEqual(alignedScopeSessionStub.calledOnce, false);
            // Only call the user:email scope one since we have no accounts
            assert_1.default.strictEqual(userEmailSessionStub.calledOnce, true);
            assert_1.default.strictEqual(readUserScopeSessionStub.calledOnce, false);
        });
        test('should use the github-enterprise provider if configured', async () => {
            const configurationService = new inMemoryConfigurationService_1.InMemoryConfigurationService(new defaultsOnlyConfigurationService_1.DefaultsOnlyConfigurationService(), new Map([
                [configurationService_1.ConfigKey.Shared.AuthProvider, configurationService_1.AuthProviderId.GitHubEnterprise]
            ]), undefined);
            const gheSessionId = 'ghe-session-id-1';
            getAccountsStub.resolves([{ id: 'account', label: 'ghe-session-label' }]);
            const gheSessionStub = getSessionStub.withArgs('github-enterprise', authentication_1.GITHUB_SCOPE_READ_USER, sinon.match.any);
            gheSessionStub.resolves({
                id: gheSessionId,
                accessToken: 'new-token',
                scopes: authentication_1.GITHUB_SCOPE_READ_USER,
                account: { id: 'account', label: 'ghe-session-label' },
            });
            const ghSessionStub = getSessionStub.withArgs('github', authentication_1.GITHUB_SCOPE_READ_USER, sinon.match.any);
            const result = await (0, session_1.getAnyAuthSession)(configurationService);
            assert_1.default.strictEqual(result?.id, gheSessionId);
            assert_1.default.strictEqual(gheSessionStub.calledOnce, true);
            assert_1.default.strictEqual(ghSessionStub.notCalled, true);
        });
    });
    suite('getAlignedSession', () => {
        test('should return a session with more permissive scopes if there is one', async () => {
            const alignedSessionId = 'session-id';
            seedSessions([
                {
                    id: alignedSessionId,
                    accessToken: 'token',
                    scopes: authentication_1.GITHUB_SCOPE_ALIGNED,
                    account: { id: 'account', label: 'account-label' },
                }
            ]);
            const result = await (0, session_1.getAlignedSession)(accessor.get(configurationService_1.IConfigurationService), { silent: true });
            assert_1.default.strictEqual(result?.id, alignedSessionId);
        });
        test('should return undefined if there is no session with permissive scopes', async () => {
            const alignedSessionId = 'session-id';
            seedSessions([
                {
                    id: alignedSessionId,
                    accessToken: 'token',
                    scopes: authentication_1.GITHUB_SCOPE_USER_EMAIL,
                    account: { id: 'account', label: 'account-label' },
                }
            ]);
            const result = await (0, session_1.getAlignedSession)(accessor.get(configurationService_1.IConfigurationService), { silent: true });
            assert_1.default.strictEqual(result, undefined);
        });
    });
});
//# sourceMappingURL=session.test.js.map