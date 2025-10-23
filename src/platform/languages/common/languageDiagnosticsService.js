"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractLanguageDiagnosticsService = exports.ILanguageDiagnosticsService = void 0;
exports.rangeSpanningDiagnostics = rangeSpanningDiagnostics;
exports.isError = isError;
exports.getDiagnosticsAtSelection = getDiagnosticsAtSelection;
const services_1 = require("../../../util/common/services");
const resources_1 = require("../../../util/vs/base/common/resources");
const vscodeTypes_1 = require("../../../vscodeTypes");
exports.ILanguageDiagnosticsService = (0, services_1.createServiceIdentifier)('ILanguageDiagnosticService');
class AbstractLanguageDiagnosticsService {
    waitForNewDiagnostics(resource, token, timeout = 5000) {
        let onCancellationRequest;
        let diagnosticsChangeListener;
        let timer;
        return new Promise((resolve) => {
            onCancellationRequest = token.onCancellationRequested(() => resolve([]));
            timer = setTimeout(() => resolve(this.getDiagnostics(resource)), timeout);
            diagnosticsChangeListener = this.onDidChangeDiagnostics(e => {
                for (const uri of e.uris) {
                    if ((0, resources_1.isEqual)(uri, resource)) {
                        resolve(this.getDiagnostics(resource));
                        break;
                    }
                }
            });
        }).finally(() => {
            onCancellationRequest.dispose();
            diagnosticsChangeListener.dispose();
            clearTimeout(timer);
        });
    }
}
exports.AbstractLanguageDiagnosticsService = AbstractLanguageDiagnosticsService;
/**
* Smallest range covering all of the diagnostics
* @param diagnostics diagnostics to cover
* @returns minimal covering range
*/
function rangeSpanningDiagnostics(diagnostics) {
    return diagnostics.map(d => d.range).reduce((a, b) => a.union(b));
}
function isError(diagnostics) {
    return diagnostics.severity === vscodeTypes_1.DiagnosticSeverity.Error;
}
function getDiagnosticsAtSelection(diagnostics, selection, severities = [vscodeTypes_1.DiagnosticSeverity.Error, vscodeTypes_1.DiagnosticSeverity.Warning]) {
    return diagnostics.find(d => d.range.contains(selection) && severities.includes(d.severity));
}
//# sourceMappingURL=languageDiagnosticsService.js.map