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
exports.GithubTelemetryForwardingContrib = void 0;
const vscode_1 = require("vscode");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
let GithubTelemetryForwardingContrib = class GithubTelemetryForwardingContrib extends lifecycle_1.Disposable {
    constructor(_telemetryService) {
        super();
        this._telemetryService = _telemetryService;
        const channel = vscode_1.env.getDataChannel('editTelemetry');
        this._register(channel.onDidReceiveData((args) => {
            if (!isGithubExtensionDataEvent(args.data.eventName, args.data.data)) {
                return;
            }
            const data = translateToGithubProperties(args.data.eventName, args.data.data);
            const { properties, measurements } = dataToPropsAndMeasurements(data);
            this._telemetryService.sendGHTelemetryEvent('vscode.' + args.data.eventName, properties, measurements);
        }));
    }
};
exports.GithubTelemetryForwardingContrib = GithubTelemetryForwardingContrib;
exports.GithubTelemetryForwardingContrib = GithubTelemetryForwardingContrib = __decorate([
    __param(0, telemetry_1.ITelemetryService)
], GithubTelemetryForwardingContrib);
function isGithubExtensionDataEvent(eventName, data) {
    // TODO: should this also apply to other/all events?
    if (eventName === 'inlineCompletion.endOfLife' && 'extensionId' in data) {
        const extId = data['extensionId'];
        if (typeof extId === 'string' && extId !== 'github.copilot' && extId !== 'github.copilot-chat') {
            return false;
        }
    }
    return true;
}
function translateToGithubProperties(eventName, data) {
    const githubProperties = { ...data };
    for (const [key, value] of Object.entries(data)) {
        const translatedProperty = translateToGithubProperty(eventName, key, value);
        if (translatedProperty) {
            githubProperties[translatedProperty.key] = translatedProperty.value;
            delete githubProperties[key];
        }
    }
    return githubProperties;
}
function translateToGithubProperty(eventName, key, value) {
    if (eventName === 'inlineCompletion.endOfLife') {
        switch (key) {
            case 'id': return { key: 'opportunityId', value };
        }
    }
    return undefined;
}
function dataToPropsAndMeasurements(data) {
    const properties = {};
    const measurements = {};
    for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'number') {
            measurements[key] = value;
        }
        else if (typeof value === 'boolean') {
            measurements[key] = value ? 1 : 0;
        }
        else if (typeof value === 'string') {
            properties[key] = value;
        }
    }
    return { properties, measurements };
}
//# sourceMappingURL=githubTelemetryForwardingContrib.js.map