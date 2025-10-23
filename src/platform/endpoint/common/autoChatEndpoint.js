"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoChatEndpoint = void 0;
exports.isAutoModelEnabled = isAutoModelEnabled;
exports.isAutoModelDefault = isAutoModelDefault;
/**
 * This endpoint represents the "Auto" model in the model picker.
 * It just effectively wraps a different endpoint and adds the auto stuff on top
 */
class AutoChatEndpoint {
    static { this.id = 'auto'; }
    constructor(_wrappedEndpoint, _chatMLFetcher, _sessionToken, _discountPercent) {
        this._wrappedEndpoint = _wrappedEndpoint;
        this._chatMLFetcher = _chatMLFetcher;
        this._sessionToken = _sessionToken;
        this._discountPercent = _discountPercent;
        this.maxOutputTokens = this._wrappedEndpoint.maxOutputTokens;
        this.model = AutoChatEndpoint.id;
        this.supportsToolCalls = this._wrappedEndpoint.supportsToolCalls;
        this.supportsVision = this._wrappedEndpoint.supportsVision;
        this.supportsPrediction = this._wrappedEndpoint.supportsPrediction;
        this.showInModelPicker = true;
        this.isPremium = this._wrappedEndpoint.isPremium;
        this.restrictedToSkus = this._wrappedEndpoint.restrictedToSkus;
        this.isDefault = this._wrappedEndpoint.isDefault;
        this.isFallback = this._wrappedEndpoint.isFallback;
        this.policy = this._wrappedEndpoint.policy;
        this.urlOrRequestMetadata = this._wrappedEndpoint.urlOrRequestMetadata;
        this.modelMaxPromptTokens = this._wrappedEndpoint.modelMaxPromptTokens;
        this.name = this._wrappedEndpoint.name;
        this.version = this._wrappedEndpoint.version;
        this.family = this._wrappedEndpoint.family;
        this.tokenizer = this._wrappedEndpoint.tokenizer;
        // Calculate the multiplier including the discount percent, rounding to two decimal places
        const baseMultiplier = this._wrappedEndpoint.multiplier ?? 1;
        this.multiplier = Math.round(baseMultiplier * (1 - this._discountPercent) * 100) / 100;
    }
    get apiType() {
        return this._wrappedEndpoint.apiType;
    }
    getExtraHeaders() {
        return {
            ...(this._wrappedEndpoint.getExtraHeaders?.() || {}),
            'Copilot-Session-Token': this._sessionToken
        };
    }
    createRequestBody(options) {
        return this._wrappedEndpoint.createRequestBody(options);
    }
    processResponseFromChatEndpoint(telemetryService, logService, response, expectedNumChoices, finishCallback, telemetryData, cancellationToken) {
        return this._wrappedEndpoint.processResponseFromChatEndpoint(telemetryService, logService, response, expectedNumChoices, finishCallback, telemetryData, cancellationToken);
    }
    acceptChatPolicy() {
        return this._wrappedEndpoint.acceptChatPolicy();
    }
    cloneWithTokenOverride(modelMaxPromptTokens) {
        return this._wrappedEndpoint.cloneWithTokenOverride(modelMaxPromptTokens);
    }
    acquireTokenizer() {
        return this._wrappedEndpoint.acquireTokenizer();
    }
    async makeChatRequest2(options, token) {
        return this._chatMLFetcher.fetchOne({
            requestOptions: {},
            ...options,
            endpoint: this,
            // TODO https://github.com/microsoft/vscode/issues/266410
            ignoreStatefulMarker: options.ignoreStatefulMarker ?? true
        }, token);
    }
    async makeChatRequest(debugName, messages, finishedCb, token, location, source, requestOptions, userInitiatedRequest, telemetryProperties) {
        return this.makeChatRequest2({
            debugName,
            messages,
            finishedCb,
            location,
            source,
            requestOptions,
            userInitiatedRequest,
            telemetryProperties,
        }, token);
    }
}
exports.AutoChatEndpoint = AutoChatEndpoint;
/**
 * Checks if the auto chat mode is enabled.
 * @param expService The experimentation service to use to check if the auto mode is enabled
 * @param envService The environment service to use to check if the auto mode is enabled
 * @returns True if the auto mode is enabled, false otherwise
 */
async function isAutoModelEnabled(expService, envService, authService) {
    if (envService.isPreRelease() || authService.copilotToken?.isNoAuthUser) {
        return true;
    }
    if (!!expService.getTreatmentVariable('autoModelEnabled')) {
        try {
            return (await authService.getCopilotToken()).isEditorPreviewFeaturesEnabled();
        }
        catch (e) {
            return false;
        }
    }
    return false;
}
/**
 * Checks if the auto chat model is the default model
 * @param expService The experimentation service to use to check if the auto model is the default
 * @param authService The authentication service to use to check if the auto model is the default
 * @returns True if the auto model is the default, false otherwise
 */
function isAutoModelDefault(expService, authService) {
    if (authService.copilotToken?.isNoAuthUser) {
        return true;
    }
    return !!expService.getTreatmentVariable('autoModelDefault');
}
//# sourceMappingURL=autoChatEndpoint.js.map