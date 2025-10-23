"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxyExperimentEndpoint = void 0;
exports.getCustomDefaultModelExperimentConfig = getCustomDefaultModelExperimentConfig;
exports.applyExperimentModifications = applyExperimentModifications;
class ProxyExperimentEndpoint {
    constructor(name, model, selectedEndpoint, _isDefault) {
        this.name = name;
        this.model = model;
        this.selectedEndpoint = selectedEndpoint;
        this._isDefault = _isDefault;
        // This is a proxy endpoint that wraps another endpoint, typically used for experiments.
        // This should be used to show the endpoint in the model picker, when in experiment.
        this.showInModelPicker = true;
        this.family = this.name;
        if (selectedEndpoint.getExtraHeaders) {
            this.getExtraHeaders = selectedEndpoint.getExtraHeaders.bind(selectedEndpoint);
        }
        if (selectedEndpoint.interceptBody) {
            this.interceptBody = selectedEndpoint.interceptBody.bind(selectedEndpoint);
        }
    }
    get maxOutputTokens() {
        return this.selectedEndpoint.maxOutputTokens;
    }
    get supportsToolCalls() {
        return this.selectedEndpoint.supportsToolCalls;
    }
    get supportsVision() {
        return this.selectedEndpoint.supportsVision;
    }
    get supportsPrediction() {
        return this.selectedEndpoint.supportsPrediction;
    }
    get isPremium() {
        return this.selectedEndpoint.isPremium;
    }
    get multiplier() {
        return this.selectedEndpoint.multiplier;
    }
    get restrictedToSkus() {
        return this.selectedEndpoint.restrictedToSkus;
    }
    get isDefault() {
        if (this._isDefault !== undefined) {
            return this._isDefault;
        }
        return this.selectedEndpoint.isDefault;
    }
    get isFallback() {
        return this.selectedEndpoint.isFallback;
    }
    get policy() {
        return this.selectedEndpoint.policy;
    }
    get urlOrRequestMetadata() {
        return this.selectedEndpoint.urlOrRequestMetadata;
    }
    get modelMaxPromptTokens() {
        return this.selectedEndpoint.modelMaxPromptTokens;
    }
    get version() {
        return this.selectedEndpoint.version;
    }
    get tokenizer() {
        return this.selectedEndpoint.tokenizer;
    }
    processResponseFromChatEndpoint(telemetryService, logService, response, expectedNumChoices, finishCallback, telemetryData, cancellationToken) {
        return this.selectedEndpoint.processResponseFromChatEndpoint(telemetryService, logService, response, expectedNumChoices, finishCallback, telemetryData, cancellationToken);
    }
    acceptChatPolicy() {
        return this.selectedEndpoint.acceptChatPolicy();
    }
    makeChatRequest2(options, token) {
        return this.selectedEndpoint.makeChatRequest2(options, token);
    }
    makeChatRequest(debugName, messages, finishedCb, token, location, source, requestOptions, userInitiatedRequest, telemetryProperties) {
        return this.selectedEndpoint.makeChatRequest(debugName, messages, finishedCb, token, location, source, requestOptions, userInitiatedRequest, telemetryProperties);
    }
    cloneWithTokenOverride(modelMaxPromptTokens) {
        return this.selectedEndpoint.cloneWithTokenOverride(modelMaxPromptTokens);
    }
    acquireTokenizer() {
        return this.selectedEndpoint.acquireTokenizer();
    }
    createRequestBody(options) {
        return this.selectedEndpoint.createRequestBody(options);
    }
}
exports.ProxyExperimentEndpoint = ProxyExperimentEndpoint;
function getCustomDefaultModelExperimentConfig(expService) {
    const selected = expService.getTreatmentVariable('custommodel1');
    const id = expService.getTreatmentVariable('custommodel1.id');
    const name = expService.getTreatmentVariable('custommodel1.name');
    if (selected && id && name) {
        return { selected, id, name };
    }
    return undefined;
}
function applyExperimentModifications(modelMetadata, experimentConfig) {
    const knownDefaults = ['gpt-4.1'];
    if (modelMetadata && experimentConfig && modelMetadata.is_chat_default && knownDefaults.includes(modelMetadata.id)) {
        return { ...modelMetadata, is_chat_default: false };
    }
    return modelMetadata;
}
//# sourceMappingURL=proxyExperimentEndpoint.js.map