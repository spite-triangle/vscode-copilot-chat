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
exports.GitHubPullRequestReviewerCommentsProvider = void 0;
const authentication_1 = require("../../../platform/authentication/common/authentication");
const interactionService_1 = require("../../../platform/chat/common/interactionService");
const runCommandExecutionService_1 = require("../../../platform/commands/common/runCommandExecutionService");
const capiClient_1 = require("../../../platform/endpoint/common/capiClient");
const domainService_1 = require("../../../platform/endpoint/common/domainService");
const envService_1 = require("../../../platform/env/common/envService");
const gitExtensionService_1 = require("../../../platform/git/common/gitExtensionService");
const ignoreService_1 = require("../../../platform/ignore/common/ignoreService");
const logService_1 = require("../../../platform/log/common/logService");
const fetcherService_1 = require("../../../platform/networking/common/fetcherService");
const notificationService_1 = require("../../../platform/notification/common/notificationService");
const reviewService_1 = require("../../../platform/review/common/reviewService");
const scopeSelection_1 = require("../../../platform/scopeSelection/common/scopeSelection");
const tabsAndEditorsService_1 = require("../../../platform/tabs/common/tabsAndEditorsService");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const doReview_1 = require("./doReview");
let GitHubPullRequestReviewerCommentsProvider = class GitHubPullRequestReviewerCommentsProvider {
    constructor(scopeSelector, instantiationService, reviewService, authService, logService, gitExtensionService, domainService, capiClientService, fetcherService, envService, ignoreService, interactionService, tabsAndEditorsService, workspaceService, commandService, notificationService) {
        this.scopeSelector = scopeSelector;
        this.instantiationService = instantiationService;
        this.reviewService = reviewService;
        this.authService = authService;
        this.logService = logService;
        this.gitExtensionService = gitExtensionService;
        this.domainService = domainService;
        this.capiClientService = capiClientService;
        this.fetcherService = fetcherService;
        this.envService = envService;
        this.ignoreService = ignoreService;
        this.interactionService = interactionService;
        this.tabsAndEditorsService = tabsAndEditorsService;
        this.workspaceService = workspaceService;
        this.commandService = commandService;
        this.notificationService = notificationService;
    }
    async provideReviewerComments(context, token) {
        this.interactionService.startInteraction();
        const reviewResult = await (0, doReview_1.doReview)(this.scopeSelector, this.instantiationService, this.reviewService, this.authService, this.logService, this.gitExtensionService, this.capiClientService, this.domainService, this.fetcherService, this.envService, this.ignoreService, this.tabsAndEditorsService, this.workspaceService, this.commandService, this.notificationService, context, notificationService_1.ProgressLocation.Notification, token);
        const files = [];
        if (reviewResult?.type === 'success') {
            for (const comment of reviewResult.comments) {
                files.push(comment.uri);
            }
        }
        const succeeded = reviewResult?.type === 'success';
        return { files, succeeded };
    }
};
exports.GitHubPullRequestReviewerCommentsProvider = GitHubPullRequestReviewerCommentsProvider;
exports.GitHubPullRequestReviewerCommentsProvider = GitHubPullRequestReviewerCommentsProvider = __decorate([
    __param(0, scopeSelection_1.IScopeSelector),
    __param(1, instantiation_1.IInstantiationService),
    __param(2, reviewService_1.IReviewService),
    __param(3, authentication_1.IAuthenticationService),
    __param(4, logService_1.ILogService),
    __param(5, gitExtensionService_1.IGitExtensionService),
    __param(6, domainService_1.IDomainService),
    __param(7, capiClient_1.ICAPIClientService),
    __param(8, fetcherService_1.IFetcherService),
    __param(9, envService_1.IEnvService),
    __param(10, ignoreService_1.IIgnoreService),
    __param(11, interactionService_1.IInteractionService),
    __param(12, tabsAndEditorsService_1.ITabsAndEditorsService),
    __param(13, workspaceService_1.IWorkspaceService),
    __param(14, runCommandExecutionService_1.IRunCommandExecutionService),
    __param(15, notificationService_1.INotificationService)
], GitHubPullRequestReviewerCommentsProvider);
//# sourceMappingURL=githubPullRequestReviewerCommentsProvider.js.map