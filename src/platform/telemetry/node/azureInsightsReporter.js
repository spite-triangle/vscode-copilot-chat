"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzureInsightReporter = void 0;
exports.wrapEventNameForPrefixRemoval = wrapEventNameForPrefixRemoval;
// Need to set this env variable even before import to avoid stat beat
process.env.APPLICATION_INSIGHTS_NO_STATSBEAT = 'true';
const appInsights = __importStar(require("applicationinsights"));
const os = __importStar(require("os"));
function wrapEventNameForPrefixRemoval(eventName) {
    return `wrapped-telemetry-event-name-${eventName}-wrapped-telemetry-event-name`;
}
function isWrappedEventName(eventName) {
    return eventName.includes('wrapped-telemetry-event-name-') && eventName.endsWith('-wrapped-telemetry-event-name');
}
function unwrapEventNameFromPrefix(eventName) {
    const match = eventName.match(/wrapped-telemetry-event-name-(.*?)-wrapped-telemetry-event-name/);
    return match ? match[1] : eventName;
}
class AzureInsightReporter {
    constructor(capiClientService, envService, tokenStore, namespace, key) {
        this.tokenStore = tokenStore;
        this.namespace = namespace;
        this.client = createAppInsightsClient(capiClientService, envService, key);
        configureReporter(capiClientService, envService, this.client);
    }
    separateData(data) {
        if (data.properties !== undefined || data.measurements !== undefined) {
            data.properties = data.properties || {};
            data.measurements = data.measurements || {};
            return data;
        }
        const properties = {};
        const measurements = {};
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'number') {
                measurements[key] = value;
            }
            else {
                properties[key] = value;
            }
        }
        return { properties, measurements };
    }
    sendEventData(eventName, data) {
        const { properties, measurements } = this.separateData(data || {});
        const trackingId = this.tokenStore.copilotToken?.getTokenValue('tid');
        this.client.trackEvent({
            name: this.massageEventName(eventName),
            properties,
            measurements,
            tagOverrides: trackingId ? { 'ai.user.id': trackingId } : undefined
        });
    }
    sendErrorData(error, data) {
        const { properties, measurements } = this.separateData(data || {});
        this.client.trackException({
            exception: error,
            properties,
            measurements,
        });
    }
    flush() {
        return new Promise(resolve => {
            this.client.flush({
                callback: () => {
                    resolve(undefined);
                },
            });
        });
    }
    massageEventName(eventName) {
        if (isWrappedEventName(eventName)) {
            return unwrapEventNameFromPrefix(eventName);
        }
        return eventName.includes(this.namespace) ? eventName : `${this.namespace}/${eventName}`;
    }
}
exports.AzureInsightReporter = AzureInsightReporter;
function createAppInsightsClient(capiClientService, envService, key) {
    const client = new appInsights.TelemetryClient(key);
    client.config.enableAutoCollectRequests = false;
    client.config.enableAutoCollectPerformance = false;
    client.config.enableAutoCollectExceptions = false;
    client.config.enableAutoCollectConsole = false;
    client.config.enableAutoCollectDependencies = false;
    client.config.noDiagnosticChannel = true;
    configureReporter(capiClientService, envService, client);
    return client;
}
function configureReporter(capiClientService, envService, client) {
    client.commonProperties = decorateWithCommonProperties(client.commonProperties, envService);
    // Do not want personal machine names to be sent
    client.context.tags[client.context.keys.cloudRoleInstance] = 'REDACTED';
    client.context.tags[client.context.keys.sessionId] = envService.sessionId;
    client.config.endpointUrl = capiClientService.copilotTelemetryURL;
}
function decorateWithCommonProperties(properties, envService) {
    properties = properties || {};
    properties['common_os'] = os.platform();
    properties['common_platformversion'] = os.release();
    properties['common_arch'] = os.arch();
    properties['common_cpu'] = Array.from(new Set(os.cpus().map(c => c.model))).join();
    // We have editor-agnostic fields but keep the vs-specific ones for backward compatibility
    properties['common_vscodemachineid'] = envService.machineId;
    properties['common_vscodesessionid'] = envService.sessionId;
    properties['common_uikind'] = envService.uiKind;
    properties['common_remotename'] = envService.remoteName ?? 'none';
    properties['common_isnewappinstall'] = '';
    return properties;
}
//# sourceMappingURL=azureInsightsReporter.js.map