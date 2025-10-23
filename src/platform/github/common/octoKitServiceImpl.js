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
exports.OctoKitService = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const authentication_1 = require("../../authentication/common/authentication");
const capiClient_1 = require("../../endpoint/common/capiClient");
const logService_1 = require("../../log/common/logService");
const fetcherService_1 = require("../../networking/common/fetcherService");
const telemetry_1 = require("../../telemetry/common/telemetry");
const githubService_1 = require("./githubService");
let OctoKitService = class OctoKitService extends githubService_1.BaseOctoKitService {
    constructor(_authService, capiClientService, fetcherService, logService, telemetryService) {
        super(capiClientService, fetcherService, logService, telemetryService);
        this._authService = _authService;
    }
    async getCurrentAuthedUser() {
        const authToken = (await this._authService.getAnyGitHubSession())?.accessToken;
        if (!authToken) {
            return undefined;
        }
        return await this.getCurrentAuthedUserWithToken(authToken);
    }
    async getTeamMembership(teamId) {
        const session = (await this._authService.getAnyGitHubSession());
        const token = session?.accessToken;
        const username = session?.account.label;
        if (!token || !username) {
            return undefined;
        }
        return await this.getTeamMembershipWithToken(teamId, token, username);
    }
};
exports.OctoKitService = OctoKitService;
exports.OctoKitService = OctoKitService = __decorate([
    __param(0, authentication_1.IAuthenticationService),
    __param(1, capiClient_1.ICAPIClientService),
    __param(2, fetcherService_1.IFetcherService),
    __param(3, logService_1.ILogService),
    __param(4, telemetry_1.ITelemetryService)
], OctoKitService);
//# sourceMappingURL=octoKitServiceImpl.js.map