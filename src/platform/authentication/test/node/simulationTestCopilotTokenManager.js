"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationTestCopilotTokenManager = void 0;
const errors_1 = require("../../../../util/vs/base/common/errors");
const event_1 = require("../../../../util/vs/base/common/event");
const objects_1 = require("../../../../util/vs/base/common/objects");
const nullEnvService_1 = require("../../../env/common/nullEnvService");
const copilotToken_1 = require("../../common/copilotToken");
const copilotTokenManager_1 = require("../../common/copilotTokenManager");
class SimulationTestCopilotTokenManager {
    constructor() {
        this._actual = SingletonSimulationTestCopilotTokenManager.getInstance();
        this.onDidCopilotTokenRefresh = this._actual.onDidCopilotTokenRefresh;
    }
    getCopilotToken(force) {
        return this._actual.getCopilotToken();
    }
    resetCopilotToken(httpError) {
        // nothing
    }
}
exports.SimulationTestCopilotTokenManager = SimulationTestCopilotTokenManager;
class SimulationTestFixedCopilotTokenManager {
    constructor(_completionsToken) {
        this._completionsToken = _completionsToken;
        this.onDidCopilotTokenRefresh = event_1.Event.None;
    }
    async getCopilotToken() {
        return new copilotToken_1.CopilotToken({ token: this._completionsToken, expires_at: 0, refresh_in: 0, username: 'fixedTokenManager', isVscodeTeamMember: false, copilot_plan: 'unknown' });
    }
}
let fetchAlreadyGoing = false;
class SimulationTestCopilotTokenManagerFromGitHubToken {
    constructor(_githubToken) {
        this._githubToken = _githubToken;
        this._onDidCopilotTokenRefresh = new event_1.Emitter();
        this.onDidCopilotTokenRefresh = this._onDidCopilotTokenRefresh.event;
    }
    async getCopilotToken() {
        if (!this._cachedToken) {
            this._cachedToken = this.fetchCopilotTokenFromGitHubToken();
        }
        return this._cachedToken;
    }
    /**
     * Fetches a Copilot token from the GitHub token.
     */
    async fetchCopilotTokenFromGitHubToken() {
        if (fetchAlreadyGoing) {
            throw new errors_1.BugIndicatingError(`This fetch should only happen once!`);
        }
        fetchAlreadyGoing = true;
        let response;
        try {
            response = await fetch(`https://api.github.com/copilot_internal/v2/token`, {
                headers: {
                    Authorization: `token ${this._githubToken}`,
                    ...nullEnvService_1.NullEnvService.Instance.getEditorVersionHeaders(),
                }
            });
        }
        catch (err) {
            let errAsString;
            if (err instanceof Error) {
                errAsString = `${err.stack ? err.stack : err.message}\n${'cause' in err ? 'Cause:\n' + err['cause'] : ''}`;
            }
            else {
                errAsString = (0, objects_1.safeStringify)(err);
            }
            throw new Error(`Failed to get copilot token: ${errAsString}`);
        }
        const tokenInfo = await response.json();
        if (!response.ok || response.status === 401 || response.status === 403 || !tokenInfo || !tokenInfo.token) {
            throw new Error(`Failed to get copilot token: ${response.status} ${response.statusText}`);
        }
        // some users have clocks adjusted ahead, expires_at will immediately be less than current clock time;
        // adjust expires_at to the refresh time + a buffer to avoid expiring the token before the refresh can fire.
        tokenInfo.expires_at = (0, copilotTokenManager_1.nowSeconds)() + tokenInfo.refresh_in + 60; // extra buffer to allow refresh to happen successfully
        // extend the token envelope
        const extendedInfo = {
            ...tokenInfo,
            username: 'NullUser',
            copilot_plan: 'unknown',
            isVscodeTeamMember: false,
        };
        setTimeout(() => {
            // refresh the promise
            fetchAlreadyGoing = false; // reset the spam prevention flag as longer runs will need to refresh the token
            this._cachedToken = this.fetchCopilotTokenFromGitHubToken();
            this._onDidCopilotTokenRefresh.fire();
        }, tokenInfo.refresh_in * 1000);
        return new copilotToken_1.CopilotToken(extendedInfo);
    }
}
/**
 * This is written without any dependencies on any services because it is instantiated once across all tests.
 * We do this to avoid fetching the copilot token and spamming the GitHub API.
 */
class SingletonSimulationTestCopilotTokenManager {
    constructor() {
        this._actual = undefined;
        this.onDidCopilotTokenRefreshRelay = new event_1.Relay();
        this.onDidCopilotTokenRefresh = this.onDidCopilotTokenRefreshRelay.event;
    }
    static { this._instance = null; }
    static getInstance() {
        if (!this._instance) {
            this._instance = new SingletonSimulationTestCopilotTokenManager();
        }
        return this._instance;
    }
    getCopilotToken() {
        if (!this._actual) {
            if (process.env.GITHUB_PAT) {
                this._actual = new SimulationTestFixedCopilotTokenManager(process.env.GITHUB_PAT);
            }
            else if (process.env.GITHUB_OAUTH_TOKEN) {
                this._actual = new SimulationTestCopilotTokenManagerFromGitHubToken(process.env.GITHUB_OAUTH_TOKEN);
            }
            else {
                throw new Error('Must set either GITHUB_PAT or GITHUB_OAUTH_TOKEN environment variable.');
            }
            this.onDidCopilotTokenRefreshRelay.input = this._actual.onDidCopilotTokenRefresh;
        }
        return this._actual.getCopilotToken();
    }
}
//# sourceMappingURL=simulationTestCopilotTokenManager.js.map