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
exports.CopilotTokenManagerFromGitHubToken = exports.FixedCopilotTokenManager = exports.BaseCopilotTokenManager = exports.tokenErrorString = void 0;
exports.getStaticGitHubToken = getStaticGitHubToken;
exports.getOrCreateTestingCopilotTokenManager = getOrCreateTestingCopilotTokenManager;
const copilot_api_1 = require("@vscode/copilot-api");
const node_stream_1 = require("node:stream");
const vscode_1 = require("vscode");
const event_1 = require("../../../util/vs/base/common/event");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const descriptors_1 = require("../../../util/vs/platform/instantiation/common/descriptors");
const configurationService_1 = require("../../configuration/common/configurationService");
const capiClient_1 = require("../../endpoint/common/capiClient");
const domainService_1 = require("../../endpoint/common/domainService");
const envService_1 = require("../../env/common/envService");
const githubService_1 = require("../../github/common/githubService");
const nullOctokitServiceImpl_1 = require("../../github/common/nullOctokitServiceImpl");
const logService_1 = require("../../log/common/logService");
const fetcherService_1 = require("../../networking/common/fetcherService");
const telemetry_1 = require("../../telemetry/common/telemetry");
const telemetryData_1 = require("../../telemetry/common/telemetryData");
const copilotToken_1 = require("../common/copilotToken");
const copilotTokenManager_1 = require("../common/copilotTokenManager");
exports.tokenErrorString = `Tests: either GITHUB_PAT or GITHUB_OAUTH_TOKEN must be set. Run "npm run get_token" to get one.`;
function getStaticGitHubToken() {
    if (process.env.GITHUB_PAT) {
        return process.env.GITHUB_PAT;
    }
    if (process.env.GITHUB_OAUTH_TOKEN) {
        return process.env.GITHUB_OAUTH_TOKEN;
    }
    throw new Error(exports.tokenErrorString);
}
function getOrCreateTestingCopilotTokenManager() {
    let result;
    if (process.env.GITHUB_PAT) {
        result = new descriptors_1.SyncDescriptor(FixedCopilotTokenManager, [process.env.GITHUB_PAT]);
    }
    if (process.env.GITHUB_OAUTH_TOKEN) {
        result = new descriptors_1.SyncDescriptor(CopilotTokenManagerFromGitHubToken, [process.env.GITHUB_OAUTH_TOKEN]);
    }
    if (!result) {
        throw new Error(exports.tokenErrorString);
    }
    return result;
}
//TODO: Move this to common
class BaseCopilotTokenManager extends lifecycle_1.Disposable {
    //#endregion
    constructor(_baseOctokitservice, _logService, _telemetryService, _domainService, _capiClientService, _fetcherService, _envService) {
        super();
        this._baseOctokitservice = _baseOctokitservice;
        this._logService = _logService;
        this._telemetryService = _telemetryService;
        this._domainService = _domainService;
        this._capiClientService = _capiClientService;
        this._fetcherService = _fetcherService;
        this._envService = _envService;
        this._isDisposed = false;
        //#region Events
        this._copilotTokenRefreshEmitter = this._register(new event_1.Emitter());
        this.onDidCopilotTokenRefresh = this._copilotTokenRefreshEmitter.event;
        this._register((0, lifecycle_1.toDisposable)(() => this._isDisposed = true));
    }
    get copilotToken() {
        return this._copilotToken;
    }
    set copilotToken(token) {
        if (token !== this._copilotToken) {
            this._copilotToken = token;
            this._copilotTokenRefreshEmitter.fire();
        }
    }
    //#endregion
    //#region Public methods
    resetCopilotToken(httpError) {
        if (httpError !== undefined) {
            this._telemetryService.sendGHTelemetryEvent('auth.reset_token_' + httpError);
        }
        this._logService.debug(`Resetting copilot token on HTTP error ${httpError || 'unknown'}`);
        this.copilotToken = undefined;
    }
    /**
     * Fetches a Copilot token from the GitHub token.
     * @param githubToken A GitHub token to mint a Copilot token from.
     * @returns A Copilot token info or an error.
     * @todo this should be not be public, but it is for now to allow testing.
     */
    async authFromGitHubToken(githubToken, ghUsername) {
        return this.doAuthFromGitHubTokenOrDevDeviceId({ githubToken, ghUsername });
    }
    /**
     * Fetches a Copilot token from the devDeviceId.
     * @param devDeviceId A device ID to mint a Copilot token from.
     * @returns A Copilot token info or an error.
     * @todo this should be not be public, but it is for now to allow testing.
     */
    async authFromDevDeviceId(devDeviceId) {
        return this.doAuthFromGitHubTokenOrDevDeviceId({ devDeviceId });
    }
    async doAuthFromGitHubTokenOrDevDeviceId(context) {
        this._telemetryService.sendGHTelemetryEvent('auth.new_login');
        let response, userInfo, ghUsername;
        try {
            let config = vscode_1.workspace.getConfiguration('github.copilot').get('forceOffline');
            if (config) {
                throw Error('offline');
            }
            if ('githubToken' in context) {
                ghUsername = context.ghUsername;
                [response, userInfo] = (await Promise.all([
                    this.fetchCopilotTokenFromGitHubToken(context.githubToken),
                    this.fetchCopilotUserInfo(context.githubToken)
                ]));
            }
            else {
                response = await this.fetchCopilotTokenFromDevDeviceId(context.devDeviceId);
            }
            if (!response) {
                this._logService.warn('Failed to get copilot token');
                this._telemetryService.sendGHTelemetryErrorEvent('auth.request_failed');
                return { kind: 'failure', reason: 'FailedToGetToken' };
            }
        }
        catch {
            // '{"sku":"yearly_subscriber","token":"tid=b42207b857c9db3b7b4e71fce67a4070;exp=1761006846;sku=yearly_subscriber;proxy-ep=proxy.individual.githubcopilot.com;st=dotcom;chat=1;cit=1;malfil=1;editor_preview_features=1;rt=1;8kp=1;ip=175.152.125.150;asn=AS4134;cq=2000;rd=1744502400:d13adeb7feb5cc90d19080e54bc76420ae3d97ad5bf4d9ab844f474f7dc14b7f","expire_at":1761006846,"prompt_8k":true,"telemetry":"disabled","expires_at":1761006846,"individual":true,"refresh_in":86400,"nes_enabled":true,"tracking_id":"…r":false,"code_quote_enabled":true,"public_suggestions":"disabled","annotations_enabled":true,"vsc_electron_fetcher":false,"copilotignore_enabled":false,"chat_jetbrains_enabled":true,"intellij_editor_fetcher":false,"snippy_load_test_enabled":false,"copilot_ide_agent_chat_gpt4_small_prompt":false,"code_review_enabled":false,"codesearch":true,"limited_user_quotas":{"chat":500,"completions":2000},"limited_user_reset_date":1761006846,"vsc_electron_fetcher_v2":false,"xcode_chat":false,"xcode":true}'
            // NOTE - TOKEN 验证
            let data1 = `
				{
					"sku": "yearly_subscriber",
					"token": "tid=b42207b857c9db3b7b4e71fce67a4070;exp=1761007296;sku=yearly_subscriber;proxy-ep=proxy.individual.githubcopilot.com;st=dotcom;chat=1;cit=1;malfil=1;editor_preview_features=1;rt=1;8kp=1;ip=175.152.125.150;asn=AS4134;cq=2000;rd=1744502400:d13adeb7feb5cc90d19080e54bc76420ae3d97ad5bf4d9ab844f474f7dc14b7f",
					"expire_at": 2761007296,
					"prompt_8k": true,
					"telemetry": "disabled",
					"expires_at": 2761007296,
					"individual": true,
					"refresh_in": 86400,
					"nes_enabled": true,
					"tracking_id": "b42207b857c9db3b7b4e71fce67a4070",
					"chat_enabled": true,
					"vsc_panel_v2": false,
					"vs_editor_fetcher": false,
					"code_quote_enabled": true,
					"public_suggestions": "disabled",
					"annotations_enabled": true,
					"vsc_electron_fetcher": false,
					"copilotignore_enabled": false,
					"chat_jetbrains_enabled": true,
					"intellij_editor_fetcher": false,
					"snippy_load_test_enabled": false,
					"copilot_ide_agent_chat_gpt4_small_prompt": false,
					"code_review_enabled": false,
					"codesearch": true,
					"limited_user_quotas": {
						"chat": 500,
						"completions": 2000
					},
					"limited_user_reset_date": 1761007296,
					"vsc_electron_fetcher_v2": false,
					"xcode_chat": false,
					"xcode": true
				}
			`;
            let data2 = `
				{
					"annotations_enabled": false,
					"blackbird_clientside_indexing": false,
					"chat_enabled": true,
					"chat_jetbrains_enabled": false,
					"code_quote_enabled": false,
					"code_review_enabled": false,
					"codesearch": false,
					"copilotignore_enabled": false,
					"endpoints": {
						"api": "https://api.individual.githubcopilot.com",
						"origin-tracker": "https://origin-tracker.individual.githubcopilot.com",
						"proxy": "https://proxy.individual.githubcopilot.com",
						"telemetry": "https://telemetry.individual.githubcopilot.com"
					},
					"expires_at": 2760850265,
					"individual": false,
					"prompt_8k": true,
					"public_suggestions": "disabled",
					"refresh_in": 300,
					"sku": "no_auth_limited_copilot",
					"snippy_load_test_enabled": false,
					"telemetry": "disabled",
					"token": "tid=70b36c9e-ea08-48c2-b28e-0dd535b39982;exp=1760850265;sku=no_auth_limited_copilot;proxy-ep=proxy.individual.githubcopilot.com;st=dotcom;chat=1;malfil=1;agent_mode=1;mcp=1;8kp=1;ip=103.135.103.18;asn=AS38136:55183d53996e868667171d1850e50f4b318ee14f91da013658423649da8279e9",
					"tracking_id": "70b36c9e-ea08-48c2-b28e-0dd535b39982",
					"vsc_electron_fetcher_v2": false,
					"xcode": false,
					"xcode_chat": false
				}
			`;
            let data = data1;
            response = new fetcherService_1.Response(200, "", new Map(), () => {
                return Promise.resolve(data);
                ;
            }, () => {
                return Promise.resolve({});
            }, () => {
                return Promise.resolve(node_stream_1.Readable.from(data));
            });
        }
        // FIXME: Unverified type after inputting response
        const tokenInfo = await (0, fetcherService_1.jsonVerboseError)(response);
        if (!tokenInfo) {
            this._logService.warn('Failed to get copilot token');
            this._telemetryService.sendGHTelemetryErrorEvent('auth.request_read_failed');
            return { kind: 'failure', reason: 'FailedToGetToken' };
        }
        if (response.status === 401) {
            this._logService.warn('Failed to get copilot token due to 401 status');
            this._telemetryService.sendGHTelemetryErrorEvent('auth.unknown_401');
            return { kind: 'failure', reason: 'HTTP401' };
        }
        if (response.status === 403 && tokenInfo.message?.startsWith('API rate limit exceeded')) {
            this._logService.warn('Failed to get copilot token due to exceeding API rate limit');
            this._telemetryService.sendGHTelemetryErrorEvent('auth.rate_limited');
            return { kind: 'failure', reason: 'RateLimited' };
        }
        if (!response.ok || !tokenInfo.token) {
            this._logService.warn(`Invalid copilot token: missing token: ${response.status} ${response.statusText}`);
            const data = telemetryData_1.TelemetryData.createAndMarkAsIssued({
                status: response.status.toString(),
                status_text: response.statusText,
            });
            this._telemetryService.sendGHTelemetryErrorEvent('auth.invalid_token', data.properties, data.measurements);
            const error_details = tokenInfo.error_details;
            return { kind: 'failure', reason: 'NotAuthorized', ...error_details };
        }
        const expires_at = tokenInfo.expires_at;
        // some users have clocks adjusted ahead, expires_at will immediately be less than current clock time;
        // adjust expires_at to the refresh time + a buffer to avoid expiring the token before the refresh can fire.
        tokenInfo.expires_at = (0, copilotTokenManager_1.nowSeconds)() + tokenInfo.refresh_in + 60; // extra buffer to allow refresh to happen successfully
        // extend the token envelope
        const login = ghUsername ?? 'unknown';
        let isVscodeTeamMember = false;
        // VS Code team members are guaranteed to be a part of an internal org so we can check that first to minimize API calls
        if ((0, copilotToken_1.containsInternalOrg)(tokenInfo.organization_list ?? []) && 'githubToken' in context) {
            isVscodeTeamMember = !!(await this._baseOctokitservice.getTeamMembershipWithToken(githubService_1.VSCodeTeamId, context.githubToken, login));
        }
        const extendedInfo = {
            ...tokenInfo,
            copilot_plan: userInfo?.copilot_plan ?? tokenInfo.sku ?? '',
            quota_snapshots: userInfo?.quota_snapshots,
            quota_reset_date: userInfo?.quota_reset_date,
            username: login,
            isVscodeTeamMember,
        };
        const telemetryData = telemetryData_1.TelemetryData.createAndMarkAsIssued({}, {
            adjusted_expires_at: tokenInfo.expires_at,
            expires_at: expires_at, // track original expires_at
            current_time: (0, copilotTokenManager_1.nowSeconds)(),
        });
        this._telemetryService.sendGHTelemetryEvent('auth.new_token', telemetryData.properties, telemetryData.measurements);
        return { kind: 'success', ...extendedInfo };
    }
    //#endregion
    //#region Private methods
    async fetchCopilotTokenFromGitHubToken(githubToken) {
        const options = {
            headers: {
                Authorization: `token ${githubToken}`,
                'X-GitHub-Api-Version': '2025-04-01'
            },
            retryFallbacks: true,
            expectJSON: true,
        };
        return await this._capiClientService.makeRequest(options, { type: copilot_api_1.RequestType.CopilotToken });
    }
    async fetchCopilotTokenFromDevDeviceId(devDeviceId) {
        const options = {
            headers: {
                'X-GitHub-Api-Version': '2025-04-01',
                'Editor-Device-Id': `${devDeviceId}`
            },
            retryFallbacks: true,
            expectJSON: true,
        };
        return await this._capiClientService.makeRequest(options, { type: copilot_api_1.RequestType.CopilotNLToken });
    }
    async fetchCopilotUserInfo(githubToken) {
        const options = {
            headers: {
                Authorization: `token ${githubToken}`,
                'X-GitHub-Api-Version': '2025-04-01',
            },
            retryFallbacks: true,
            expectJSON: true,
        };
        const response = await this._capiClientService.makeRequest(options, { type: copilot_api_1.RequestType.CopilotUserInfo });
        const data = await response.json();
        return data;
    }
}
exports.BaseCopilotTokenManager = BaseCopilotTokenManager;
//#region FixedCopilotTokenManager
/**
 * A `CopilotTokenManager` that always returns the same token.
 * Mostly only useful for short periods, e.g. tests or single completion requests,
 * as these tokens typically expire after a few hours.
 * @todo Move this to a test layer
 */
let FixedCopilotTokenManager = class FixedCopilotTokenManager extends BaseCopilotTokenManager {
    constructor(_completionsToken, logService, telemetryService, capiClientService, domainService, fetcherService, envService) {
        super(new nullOctokitServiceImpl_1.NullBaseOctoKitService(capiClientService, fetcherService, logService, telemetryService), logService, telemetryService, domainService, capiClientService, fetcherService, envService);
        this._completionsToken = _completionsToken;
        this.copilotToken = { token: _completionsToken, expires_at: 0, refresh_in: 0, username: 'fixedTokenManager', isVscodeTeamMember: false, copilot_plan: 'unknown' };
    }
    set completionsToken(token) {
        this._completionsToken = token;
        this.copilotToken = { token, expires_at: 0, refresh_in: 0, username: 'fixedTokenManager', isVscodeTeamMember: false, copilot_plan: 'unknown' };
    }
    get completionsToken() {
        return this._completionsToken;
    }
    async getCopilotToken() {
        return new copilotToken_1.CopilotToken(this.copilotToken);
    }
    async checkCopilotToken() {
        // assume it's valid
        return { status: 'OK' };
    }
};
exports.FixedCopilotTokenManager = FixedCopilotTokenManager;
exports.FixedCopilotTokenManager = FixedCopilotTokenManager = __decorate([
    __param(1, logService_1.ILogService),
    __param(2, telemetry_1.ITelemetryService),
    __param(3, capiClient_1.ICAPIClientService),
    __param(4, domainService_1.IDomainService),
    __param(5, fetcherService_1.IFetcherService),
    __param(6, envService_1.IEnvService)
], FixedCopilotTokenManager);
//#endregion
//#region CopilotTokenManagerFromGitHubToken
/**
 * Given a GitHub token, return a Copilot token, refreshing it as needed.
 * The caller that initializes the object is responsible for checking telemetry consent before
 * using the object.
 */
let CopilotTokenManagerFromGitHubToken = class CopilotTokenManagerFromGitHubToken extends BaseCopilotTokenManager {
    constructor(githubToken, githubUsername, logService, telemetryService, domainService, capiClientService, fetcherService, envService, configurationService) {
        super(new nullOctokitServiceImpl_1.NullBaseOctoKitService(capiClientService, fetcherService, logService, telemetryService), logService, telemetryService, domainService, capiClientService, fetcherService, envService);
        this.githubToken = githubToken;
        this.githubUsername = githubUsername;
        this.configurationService = configurationService;
    }
    async getCopilotToken(force) {
        if (!this.copilotToken || this.copilotToken.expires_at < (0, copilotTokenManager_1.nowSeconds)() - (60 * 5 /* 5min */) || force) {
            const tokenResult = await this.authFromGitHubToken(this.githubToken, this.githubUsername);
            if (tokenResult.kind === 'failure') {
                throw Error(`Failed to get copilot token: ${tokenResult.reason.toString()} ${tokenResult.message ?? ''}`);
            }
            this.copilotToken = { ...tokenResult };
        }
        return new copilotToken_1.CopilotToken(this.copilotToken);
    }
    async checkCopilotToken() {
        if (!this.copilotToken || this.copilotToken.expires_at < (0, copilotTokenManager_1.nowSeconds)()) {
            const tokenResult = await this.authFromGitHubToken(this.githubToken, this.githubUsername);
            if (tokenResult.kind === 'failure') {
                return tokenResult;
            }
            this.copilotToken = { ...tokenResult };
        }
        const result = {
            status: 'OK',
        };
        return result;
    }
};
exports.CopilotTokenManagerFromGitHubToken = CopilotTokenManagerFromGitHubToken;
exports.CopilotTokenManagerFromGitHubToken = CopilotTokenManagerFromGitHubToken = __decorate([
    __param(2, logService_1.ILogService),
    __param(3, telemetry_1.ITelemetryService),
    __param(4, domainService_1.IDomainService),
    __param(5, capiClient_1.ICAPIClientService),
    __param(6, fetcherService_1.IFetcherService),
    __param(7, envService_1.IEnvService),
    __param(8, configurationService_1.IConfigurationService)
], CopilotTokenManagerFromGitHubToken);
//# sourceMappingURL=copilotTokenManager.js.map