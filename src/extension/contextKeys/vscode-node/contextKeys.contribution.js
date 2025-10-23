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
exports.ContextKeysContribution = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const vscode_1 = require("vscode");
const authentication_1 = require("../../../platform/authentication/common/authentication");
const copilotTokenManager_1 = require("../../../platform/authentication/vscode-node/copilotTokenManager");
const session_1 = require("../../../platform/authentication/vscode-node/session");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const envService_1 = require("../../../platform/env/common/envService");
const logService_1 = require("../../../platform/log/common/logService");
const fetcherService_1 = require("../../../platform/networking/common/fetcherService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const telemetryData_1 = require("../../../platform/telemetry/common/telemetryData");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const observableInternal_1 = require("../../../util/vs/base/common/observableInternal");
const welcomeViewContextKeys = {
    Activated: 'github.copilot-chat.activated',
    Offline: 'github.copilot.offline',
    IndividualDisabled: 'github.copilot.interactiveSession.individual.disabled',
    IndividualExpired: 'github.copilot.interactiveSession.individual.expired',
    ContactSupport: 'github.copilot.interactiveSession.contactSupport',
    EnterpriseDisabled: 'github.copilot.interactiveSession.enterprise.disabled',
    CopilotChatDisabled: 'github.copilot.interactiveSession.chatDisabled'
};
const chatQuotaExceededContextKey = 'github.copilot.chat.quotaExceeded';
const showLogViewContextKey = `github.copilot.chat.showLogView`;
const debugReportFeedbackContextKey = 'github.copilot.debugReportFeedback';
const previewFeaturesDisabledContextKey = 'github.copilot.previewFeaturesDisabled';
const debugContextKey = 'github.copilot.chat.debug';
let ContextKeysContribution = class ContextKeysContribution extends lifecycle_1.Disposable {
    constructor(_authenticationService, _telemetryService, _fetcherService, _logService, _configService, _envService) {
        super();
        this._authenticationService = _authenticationService;
        this._telemetryService = _telemetryService;
        this._fetcherService = _fetcherService;
        this._logService = _logService;
        this._configService = _configService;
        this._envService = _envService;
        this._needsOfflineCheck = false;
        this._showLogView = false;
        void this._inspectContext().catch(console.error);
        this._register(_authenticationService.onDidAuthenticationChange(async () => await this._onAuthenticationChange()));
        this._register(vscode_1.commands.registerCommand('github.copilot.refreshToken', async () => await this._inspectContext()));
        this._register(vscode_1.commands.registerCommand('github.copilot.debug.showChatLogView', async () => {
            this._showLogView = true;
            await vscode_1.commands.executeCommand('setContext', showLogViewContextKey, true);
            await vscode_1.commands.executeCommand('copilot-chat.focus');
        }));
        this._register({ dispose: () => this._cancelPendingOfflineCheck() });
        this._register(vscode_1.window.onDidChangeWindowState(() => this._runOfflineCheck('Window state change')));
        this._updateShowLogViewContext();
        this._updateDebugContext();
        const debugReportFeedback = this._configService.getConfigObservable(configurationService_1.ConfigKey.Internal.DebugReportFeedback);
        this._register((0, observableInternal_1.autorun)(reader => {
            vscode_1.commands.executeCommand('setContext', debugReportFeedbackContextKey, debugReportFeedback.read(reader));
        }));
    }
    _scheduleOfflineCheck() {
        this._cancelPendingOfflineCheck();
        this._needsOfflineCheck = true;
        this._logService.debug(`[context keys] Scheduling offline check. Active: ${vscode_1.window.state.active}, focused: ${vscode_1.window.state.focused}.`);
        if (vscode_1.window.state.active && vscode_1.window.state.focused) {
            const delayInSeconds = 60;
            this._scheduledOfflineCheck = setTimeout(() => {
                this._scheduledOfflineCheck = undefined;
                this._runOfflineCheck('Scheduled offline check');
            }, delayInSeconds * 1000);
        }
    }
    _runOfflineCheck(trigger) {
        this._logService.debug(`[context keys] ${trigger}. Needs offline check: ${this._needsOfflineCheck}, active: ${vscode_1.window.state.active}, focused: ${vscode_1.window.state.focused}.`);
        if (this._needsOfflineCheck && vscode_1.window.state.active && vscode_1.window.state.focused) {
            this._inspectContext()
                .catch(err => this._logService.error(err));
        }
    }
    _cancelPendingOfflineCheck() {
        this._needsOfflineCheck = false;
        if (this._scheduledOfflineCheck) {
            clearTimeout(this._scheduledOfflineCheck);
            this._scheduledOfflineCheck = undefined;
        }
    }
    async _inspectContext() {
        this._logService.debug(`[context keys] Updating context keys.`);
        this._cancelPendingOfflineCheck();
        const allKeys = Object.values(welcomeViewContextKeys);
        let error = undefined;
        let key;
        try {
            await this._authenticationService.getCopilotToken();
            key = welcomeViewContextKeys.Activated;
        }
        catch (e) {
            error = e;
            const reason = e.message || e;
            const data = telemetryData_1.TelemetryData.createAndMarkAsIssued({ reason });
            this._telemetryService.sendGHTelemetryErrorEvent('activationFailed', data.properties, data.measurements);
            const message = reason === 'GitHubLoginFailed'
                ? session_1.SESSION_LOGIN_MESSAGE
                : `GitHub Copilot could not connect to server. Extension activation failed: "${reason}"`;
            this._logService.error(message);
        }
        if (error instanceof copilotTokenManager_1.NotSignedUpError) {
            key = welcomeViewContextKeys.IndividualDisabled;
        }
        else if (error instanceof copilotTokenManager_1.SubscriptionExpiredError) {
            key = welcomeViewContextKeys.IndividualExpired;
        }
        else if (error instanceof copilotTokenManager_1.EnterpriseManagedError) {
            key = welcomeViewContextKeys.EnterpriseDisabled;
        }
        else if (error instanceof copilotTokenManager_1.ContactSupportError) {
            key = welcomeViewContextKeys.ContactSupport;
        }
        else if (error instanceof copilotTokenManager_1.ChatDisabledError) {
            key = welcomeViewContextKeys.CopilotChatDisabled;
        }
        else if (this._fetcherService.isFetcherError(error)) {
            key = welcomeViewContextKeys.Offline;
            this._scheduleOfflineCheck();
        }
        if (key) {
            vscode_1.commands.executeCommand('setContext', key, true);
        }
        // Unset all other context keys
        for (const contextKey of allKeys) {
            if (contextKey !== key) {
                vscode_1.commands.executeCommand('setContext', contextKey, false);
            }
        }
    }
    async _updateQuotaExceededContext() {
        try {
            const copilotToken = await this._authenticationService.getCopilotToken();
            vscode_1.commands.executeCommand('setContext', chatQuotaExceededContextKey, copilotToken.isChatQuotaExceeded);
        }
        catch (e) {
            vscode_1.commands.executeCommand('setContext', chatQuotaExceededContextKey, false);
        }
    }
    async _updatePreviewFeaturesDisabledContext() {
        try {
            const copilotToken = await this._authenticationService.getCopilotToken();
            const disabled = !copilotToken.isEditorPreviewFeaturesEnabled();
            if (disabled) {
                this._logService.warn(`Copilot preview features are disabled by organizational policy. Learn more: https://aka.ms/github-copilot-org-enable-features`);
            }
            vscode_1.commands.executeCommand('setContext', previewFeaturesDisabledContextKey, disabled);
        }
        catch (e) {
            vscode_1.commands.executeCommand('setContext', previewFeaturesDisabledContextKey, undefined);
        }
    }
    _updateShowLogViewContext() {
        if (this._showLogView) {
            return;
        }
        this._showLogView = !!this._authenticationService.copilotToken?.isInternal || !this._envService.isProduction();
        if (this._showLogView) {
            vscode_1.commands.executeCommand('setContext', showLogViewContextKey, this._showLogView);
        }
    }
    _updateDebugContext() {
        vscode_1.commands.executeCommand('setContext', debugContextKey, !this._envService.isProduction());
    }
    async _onAuthenticationChange() {
        this._inspectContext();
        this._updateQuotaExceededContext();
        this._updatePreviewFeaturesDisabledContext();
        this._updateShowLogViewContext();
    }
};
exports.ContextKeysContribution = ContextKeysContribution;
exports.ContextKeysContribution = ContextKeysContribution = __decorate([
    __param(0, authentication_1.IAuthenticationService),
    __param(1, telemetry_1.ITelemetryService),
    __param(2, fetcherService_1.IFetcherService),
    __param(3, logService_1.ILogService),
    __param(4, configurationService_1.IConfigurationService),
    __param(5, envService_1.IEnvService)
], ContextKeysContribution);
//# sourceMappingURL=contextKeys.contribution.js.map