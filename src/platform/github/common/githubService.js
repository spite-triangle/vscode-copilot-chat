"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseOctoKitService = exports.VSCodeTeamId = exports.IOctoKitService = exports.IGithubRepositoryService = void 0;
const services_1 = require("../../../util/common/services");
const githubAPI_1 = require("./githubAPI");
exports.IGithubRepositoryService = (0, services_1.createServiceIdentifier)('IGithubRepositoryService');
exports.IOctoKitService = (0, services_1.createServiceIdentifier)('IOctoKitService');
exports.VSCodeTeamId = 1682102;
/**
 * The same as {@link OctoKitService} but doesn't require the AuthService.
 * This is because we want to call certain Octokit method inside the Authservice and must
 * avoid a circular dependency.
 * Note: Only OctoKitService is exposed on the accessor to avoid confusion.
 */
class BaseOctoKitService {
    constructor(_capiClientService, _fetcherService, _logService, _telemetryService) {
        this._capiClientService = _capiClientService;
        this._fetcherService = _fetcherService;
        this._logService = _logService;
        this._telemetryService = _telemetryService;
    }
    async getCurrentAuthedUserWithToken(token) {
        return this._makeGHAPIRequest('user', 'GET', token);
    }
    async getTeamMembershipWithToken(teamId, token, username) {
        return this._makeGHAPIRequest(`teams/${teamId}/memberships/${username}`, 'GET', token);
    }
    async _makeGHAPIRequest(routeSlug, method, token, body) {
        return (0, githubAPI_1.makeGitHubAPIRequest)(this._fetcherService, this._logService, this._telemetryService, this._capiClientService.dotcomAPIURL, routeSlug, method, token, body);
    }
}
exports.BaseOctoKitService = BaseOctoKitService;
//# sourceMappingURL=githubService.js.map