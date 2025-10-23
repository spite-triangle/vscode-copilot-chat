"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.MicrosoftTelemetrySender = void 0;
const extension_telemetry_1 = require("@vscode/extension-telemetry");
const msftTelemetrySender_1 = require("../common/msftTelemetrySender");
class MicrosoftTelemetrySender extends msftTelemetrySender_1.BaseMsftTelemetrySender {
    constructor(internalAIKey, internalLargeEventAIKey, externalAIKey, tokenStore) {
        const telemetryReporterFactory = (internal, largeEventReporter) => {
            if (internal && !largeEventReporter) {
                return new extension_telemetry_1.TelemetryReporter(internalAIKey);
            }
            else if (internal && largeEventReporter) {
                return new extension_telemetry_1.TelemetryReporter(internalLargeEventAIKey);
            }
            else {
                return new extension_telemetry_1.TelemetryReporter(externalAIKey);
            }
        };
        super(tokenStore, telemetryReporterFactory);
    }
}
exports.MicrosoftTelemetrySender = MicrosoftTelemetrySender;
//# sourceMappingURL=microsoftTelemetrySender.js.map