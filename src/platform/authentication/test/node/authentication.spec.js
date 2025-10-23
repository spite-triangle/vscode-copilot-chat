"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const event_1 = require("../../../../util/vs/base/common/event");
const lifecycle_1 = require("../../../../util/vs/base/common/lifecycle");
const configurationService_1 = require("../../../configuration/common/configurationService");
const capiClient_1 = require("../../../endpoint/common/capiClient");
const domainService_1 = require("../../../endpoint/common/domainService");
const envService_1 = require("../../../env/common/envService");
const logService_1 = require("../../../log/common/logService");
const fetcherService_1 = require("../../../networking/common/fetcherService");
const telemetry_1 = require("../../../telemetry/common/telemetry");
const services_1 = require("../../../test/node/services");
const staticGitHubAuthenticationService_1 = require("../../common/staticGitHubAuthenticationService");
const copilotToken_1 = require("../../common/copilotToken");
const copilotTokenStore_1 = require("../../common/copilotTokenStore");
const copilotTokenManager_1 = require("../../node/copilotTokenManager");
(0, vitest_1.suite)('AuthenticationService', function () {
    let disposables;
    // These will be used to test the authentication service, but eventually these will
    // be folded into the authentication service itself.
    let copilotTokenManager;
    let authenticationService;
    const testToken = 'tid=test';
    (0, vitest_1.beforeEach)(async () => {
        disposables = new lifecycle_1.DisposableStore();
        const accessor = disposables.add((0, services_1.createPlatformServices)().createTestingAccessor());
        copilotTokenManager = new copilotTokenManager_1.FixedCopilotTokenManager(testToken, accessor.get(logService_1.ILogService), accessor.get(telemetry_1.ITelemetryService), accessor.get(capiClient_1.ICAPIClientService), accessor.get(domainService_1.IDomainService), accessor.get(fetcherService_1.IFetcherService), accessor.get(envService_1.IEnvService));
        authenticationService = new staticGitHubAuthenticationService_1.StaticGitHubAuthenticationService(() => testToken, accessor.get(logService_1.ILogService), accessor.get(copilotTokenStore_1.ICopilotTokenStore), copilotTokenManager, accessor.get(configurationService_1.IConfigurationService));
        disposables.add(authenticationService);
    });
    (0, vitest_1.afterEach)(() => {
        disposables.dispose();
    });
    (0, vitest_1.test)('Can get anyGitHubToken', async () => {
        const token = await authenticationService.getAnyGitHubSession({ silent: true });
        (0, vitest_1.expect)(token?.accessToken).toBe(testToken);
        (0, vitest_1.expect)(authenticationService.anyGitHubSession?.accessToken).toBe(testToken);
    });
    (0, vitest_1.test)('Can get permissiveGitHubToken', async () => {
        const token = await authenticationService.getPermissiveGitHubSession({ silent: true });
        (0, vitest_1.expect)(token?.accessToken).toBe(testToken);
        (0, vitest_1.expect)(authenticationService.permissiveGitHubSession?.accessToken).toBe(testToken);
    });
    (0, vitest_1.test)('Can get copilotToken', async () => {
        const token = await authenticationService.getCopilotToken();
        (0, vitest_1.expect)(token.token).toBe(testToken);
        (0, vitest_1.expect)(authenticationService.copilotToken?.token).toBe(testToken);
    });
    (0, vitest_1.test)('Emits onDidAuthenticationChange when a Copilot Token change is notified', async () => {
        const promise = event_1.Event.toPromise(authenticationService.onDidAuthenticationChange);
        const newToken = 'tid=new';
        authenticationService.setCopilotToken(new copilotToken_1.CopilotToken({
            expires_at: Date.now() + 1000,
            refresh_in: 1000,
            token: newToken,
            username: 'fake',
            isVscodeTeamMember: false,
            copilot_plan: 'unknown',
        }));
        await promise;
        (0, vitest_1.expect)(authenticationService.copilotToken?.token).toBe(newToken);
    });
    vitest_1.test.skip('Emits onDidAuthenticationChange when a Copilot Token change is notified from the manager', async () => {
        const promise = event_1.Event.toPromise(authenticationService.onDidAuthenticationChange);
        const newToken = 'tid=new';
        copilotTokenManager.completionsToken = newToken;
        await promise;
        (0, vitest_1.expect)(authenticationService.copilotToken?.token).toBe(newToken);
    });
});
//# sourceMappingURL=authentication.spec.js.map