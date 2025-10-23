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
const vitest_1 = require("vitest");
const async_1 = require("../../../../util/vs/base/common/async");
const event_1 = require("../../../../util/vs/base/common/event");
const lifecycle_1 = require("../../../../util/vs/base/common/lifecycle");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const capiClient_1 = require("../../../endpoint/common/capiClient");
const domainService_1 = require("../../../endpoint/common/domainService");
const envService_1 = require("../../../env/common/envService");
const nullOctokitServiceImpl_1 = require("../../../github/common/nullOctokitServiceImpl");
const logService_1 = require("../../../log/common/logService");
const fetcherService_1 = require("../../../networking/common/fetcherService");
const telemetry_1 = require("../../../telemetry/common/telemetry");
const fetcher_1 = require("../../../test/node/fetcher");
const services_1 = require("../../../test/node/services");
const copilotToken_1 = require("../../common/copilotToken");
const copilotTokenManager_1 = require("../../node/copilotTokenManager");
// This is a fake version of CopilotTokenManagerFromGitHubToken.
let RefreshFakeCopilotTokenManager = class RefreshFakeCopilotTokenManager extends copilotTokenManager_1.BaseCopilotTokenManager {
    constructor(throwErrorCount, logService, telemetryService, domainService, capiClientService, fetcherService, envService) {
        super(new nullOctokitServiceImpl_1.NullBaseOctoKitService(capiClientService, fetcherService, logService, telemetryService), logService, telemetryService, domainService, capiClientService, fetcherService, envService);
        this.throwErrorCount = throwErrorCount;
        this.calls = 0;
    }
    async getCopilotToken(force) {
        this.calls++;
        await new Promise(resolve => setTimeout(resolve, 10));
        if (this.calls === this.throwErrorCount) {
            throw new Error('fake error');
        }
        if (!force && this.copilotToken) {
            return new copilotToken_1.CopilotToken(this.copilotToken);
        }
        this.copilotToken = { token: 'done', expires_at: 0, refresh_in: 0, username: 'fake', isVscodeTeamMember: false, copilot_plan: 'unknown' };
        return new copilotToken_1.CopilotToken(this.copilotToken);
    }
};
RefreshFakeCopilotTokenManager = __decorate([
    __param(1, logService_1.ILogService),
    __param(2, telemetry_1.ITelemetryService),
    __param(3, domainService_1.IDomainService),
    __param(4, capiClient_1.ICAPIClientService),
    __param(5, fetcherService_1.IFetcherService),
    __param(6, envService_1.IEnvService)
], RefreshFakeCopilotTokenManager);
(0, vitest_1.describe)('Copilot token unit tests', function () {
    let accessor;
    let disposables;
    (0, vitest_1.beforeEach)(() => {
        disposables = new lifecycle_1.DisposableStore();
        accessor = disposables.add((0, services_1.createPlatformServices)().createTestingAccessor());
    });
    (0, vitest_1.afterEach)(() => {
        disposables.dispose();
    });
    (0, vitest_1.it)('includes editor information in token request', async function () {
        const fetcher = new StaticFetcherService({
            token: 'token',
            expires_at: 1,
            refresh_in: 1,
        });
        const testingServiceCollection = (0, services_1.createPlatformServices)();
        testingServiceCollection.define(fetcherService_1.IFetcherService, fetcher);
        accessor = disposables.add(testingServiceCollection.createTestingAccessor());
        const tokenManager = disposables.add(accessor.get(instantiation_1.IInstantiationService).createInstance(RefreshFakeCopilotTokenManager, 1));
        await tokenManager.authFromGitHubToken('fake-token', 'fake-user');
        (0, vitest_1.expect)(fetcher.requests.size).toBe(2);
    });
    (0, vitest_1.it)(`notifies about token on token retrieval`, async function () {
        const tokenManager = disposables.add(accessor.get(instantiation_1.IInstantiationService).createInstance(RefreshFakeCopilotTokenManager, 3));
        const deferredTokenPromise = new async_1.DeferredPromise();
        tokenManager.onDidCopilotTokenRefresh(async () => {
            const notifiedValue = await tokenManager.getCopilotToken();
            deferredTokenPromise.complete(notifiedValue);
        });
        await tokenManager.getCopilotToken(true);
        const notifiedValue = await deferredTokenPromise.p;
        (0, vitest_1.expect)(notifiedValue.token).toBe('done');
    });
    (0, vitest_1.it)('invalid GitHub token', async function () {
        const fetcher = new StaticFetcherService({
            error_details: {
                message: 'fake error message',
                url: 'https://github.com/settings?param={EDITOR}',
                notification_id: 'fake-notification-id',
            },
        });
        const testingServiceCollection = (0, services_1.createPlatformServices)();
        testingServiceCollection.define(fetcherService_1.IFetcherService, fetcher);
        accessor = disposables.add(testingServiceCollection.createTestingAccessor());
        const tokenManager = accessor.get(instantiation_1.IInstantiationService).createInstance(copilotTokenManager_1.CopilotTokenManagerFromGitHubToken, 'invalid', 'invalid-user');
        const result = await tokenManager.checkCopilotToken();
        (0, vitest_1.expect)(result).toEqual({
            kind: 'failure',
            reason: 'NotAuthorized',
            message: 'fake error message',
            notification_id: 'fake-notification-id',
            url: 'https://github.com/settings?param={EDITOR}',
        });
    });
    (0, vitest_1.it)('properly propagates errors', async function () {
        const expectedError = new Error('to be handled');
        const testingServiceCollection = (0, services_1.createPlatformServices)();
        testingServiceCollection.define(fetcherService_1.IFetcherService, new ErrorFetcherService(expectedError));
        accessor = disposables.add(testingServiceCollection.createTestingAccessor());
        const tokenManager = accessor.get(instantiation_1.IInstantiationService).createInstance(copilotTokenManager_1.CopilotTokenManagerFromGitHubToken, 'invalid', 'invalid-user');
        try {
            await tokenManager.checkCopilotToken();
        }
        catch (err) {
            (0, vitest_1.expect)(err).toBe(expectedError);
        }
    });
    (0, vitest_1.it)('ignore v1 token', async function () {
        const token = '0123456789abcdef0123456789abcdef:org1.com:1674258990:0000000000000000000000000000000000000000000000000000000000000000';
        const copilotToken = new copilotToken_1.CopilotToken({ token, expires_at: 0, refresh_in: 0, username: 'fake', isVscodeTeamMember: false, copilot_plan: 'unknown' });
        (0, vitest_1.expect)(copilotToken.getTokenValue('tid')).toBeUndefined();
    });
    (0, vitest_1.it)('parsing v2 token', async function () {
        const token = 'tid=0123456789abcdef0123456789abcdef;dom=org1.com;ol=org1,org2;exp=1674258990:0000000000000000000000000000000000000000000000000000000000000000';
        const copilotToken = new copilotToken_1.CopilotToken({ token, expires_at: 0, refresh_in: 0, username: 'fake', isVscodeTeamMember: false, copilot_plan: 'unknown' });
        (0, vitest_1.expect)(copilotToken.getTokenValue('tid')).toBe('0123456789abcdef0123456789abcdef');
    });
    (0, vitest_1.it)('parsing v2 token, multiple values', async function () {
        const token = 'tid=0123456789abcdef0123456789abcdef;rt=1;ssc=0;dom=org1.com;ol=org1,org2;exp=1674258990:0000000000000000000000000000000000000000000000000000000000000000';
        const copilotToken = new copilotToken_1.CopilotToken({ token, expires_at: 0, refresh_in: 0, username: 'fake', isVscodeTeamMember: false, copilot_plan: 'unknown' });
        (0, vitest_1.expect)(copilotToken.getTokenValue('rt')).toBe('1');
        (0, vitest_1.expect)(copilotToken.getTokenValue('ssc')).toBe('0');
        (0, vitest_1.expect)(copilotToken.getTokenValue('foo')).toBeUndefined();
    });
    (0, vitest_1.it)('With a GitHub Enterprise configuration, retrieves token from the GHEC server', async () => {
        const ghecConfig = {
            _serviceBrand: undefined,
            onDidChangeDomains: event_1.Event.None,
        };
        const fetcher = new StaticFetcherService({
            token: 'token',
            expires_at: 1,
            refresh_in: 1,
        });
        const testingServiceCollection = (0, services_1.createPlatformServices)();
        testingServiceCollection.define(domainService_1.IDomainService, ghecConfig);
        testingServiceCollection.define(fetcherService_1.IFetcherService, fetcher);
        accessor = disposables.add(testingServiceCollection.createTestingAccessor());
        const tokenManager = disposables.add(accessor.get(instantiation_1.IInstantiationService).createInstance(RefreshFakeCopilotTokenManager, 1));
        await tokenManager.authFromGitHubToken('fake-token', 'invalid-user');
        (0, vitest_1.expect)(fetcher.requests.size).toBe(2);
    });
});
class StaticFetcherService {
    constructor(tokenResponse) {
        this.tokenResponse = tokenResponse;
        this.requests = new Map();
    }
    getUserAgentLibrary() {
        return 'test';
    }
    fetch(url, options) {
        this.requests.set(url, options);
        if (url.endsWith('copilot_internal/v2/token')) {
            return Promise.resolve((0, fetcher_1.createFakeResponse)(200, this.tokenResponse));
        }
        else if (url.endsWith('copilot_internal/notification')) {
            return Promise.resolve((0, fetcher_1.createFakeResponse)(200, ''));
        }
        return Promise.resolve((0, fetcher_1.createFakeResponse)(404, ''));
    }
    disconnectAll() {
        throw new Error('Method not implemented.');
    }
    makeAbortController() {
        throw new Error('Method not implemented.');
    }
    isAbortError(e) {
        throw new Error('Method not implemented.');
    }
    isInternetDisconnectedError(e) {
        throw new Error('Method not implemented.');
    }
    isFetcherError(err) {
        throw new Error('Method not implemented.');
    }
    getUserMessageForFetcherError(err) {
        throw new Error('Method not implemented.');
    }
}
class ErrorFetcherService extends StaticFetcherService {
    constructor(error) {
        super({});
        this.error = error;
    }
    fetch(url, options) {
        throw this.error;
    }
}
//# sourceMappingURL=copilotToken.spec.js.map