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
exports.AlternativeNotebookContentService = exports.IAlternativeNotebookContentService = void 0;
exports.getAlternativeNotebookDocumentProvider = getAlternativeNotebookDocumentProvider;
exports.inferAlternativeNotebookContentFormat = inferAlternativeNotebookContentFormat;
exports.getAltNotebookRange = getAltNotebookRange;
const notebooks_1 = require("../../../util/common/notebooks");
const services_1 = require("../../../util/common/services");
const vscodeTypes_1 = require("../../../vscodeTypes");
const configurationService_1 = require("../../configuration/common/configurationService");
const chatModelCapabilities_1 = require("../../endpoint/common/chatModelCapabilities");
const nullExperimentationService_1 = require("../../telemetry/common/nullExperimentationService");
const alternativeContentProvider_json_1 = require("./alternativeContentProvider.json");
const alternativeContentProvider_text_1 = require("./alternativeContentProvider.text");
const alternativeContentProvider_xml_1 = require("./alternativeContentProvider.xml");
function getAlternativeNotebookDocumentProvider(kind) {
    switch (kind) {
        case 'xml':
            return new alternativeContentProvider_xml_1.AlternativeXmlNotebookContentProvider();
        case 'text':
            return new alternativeContentProvider_text_1.AlternativeTextNotebookContentProvider();
        case 'json':
            return new alternativeContentProvider_json_1.AlternativeJsonNotebookContentProvider();
        default:
            throw new Error(`Unsupported kind '${kind}'`);
    }
}
/**
 * Given the content, determine the format of the content.
 */
function inferAlternativeNotebookContentFormat(content) {
    if ((0, alternativeContentProvider_xml_1.isXmlContent)(content)) {
        return 'xml';
    }
    if ((0, alternativeContentProvider_json_1.isJsonContent)(content)) {
        return 'json';
    }
    return 'text';
}
exports.IAlternativeNotebookContentService = (0, services_1.createServiceIdentifier)('IAlternativeNotebookContentService');
let AlternativeNotebookContentService = class AlternativeNotebookContentService {
    constructor(configurationService, experimentationService) {
        this.configurationService = configurationService;
        this.experimentationService = experimentationService;
        //
    }
    getFormat(options) {
        // GPT 4.1 supports apply_patch, such models work best with JSON format (doesn't have great support for XML yet, thats being worked on).
        if (options && (0, chatModelCapabilities_1.modelPrefersJsonNotebookRepresentation)(options)) {
            return 'json';
        }
        return this.configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.NotebookAlternativeDocumentFormat, this.experimentationService);
    }
    create(format) {
        return getAlternativeNotebookDocumentProvider(format);
    }
};
exports.AlternativeNotebookContentService = AlternativeNotebookContentService;
exports.AlternativeNotebookContentService = AlternativeNotebookContentService = __decorate([
    __param(0, configurationService_1.IConfigurationService),
    __param(1, nullExperimentationService_1.IExperimentationService)
], AlternativeNotebookContentService);
function getAltNotebookRange(range, cellUri, notebook, format) {
    // If we have a range for cell, then translate that from notebook cell range to alternative range.
    const cell = (0, notebooks_1.findCell)(cellUri, notebook);
    if (!cell) {
        return undefined;
    }
    const doc = getAlternativeNotebookDocumentProvider(format).getAlternativeDocument(notebook);
    return new vscodeTypes_1.Range(doc.fromCellPosition(cell, range.start), doc.fromCellPosition(cell, range.end));
}
//# sourceMappingURL=alternativeContent.js.map