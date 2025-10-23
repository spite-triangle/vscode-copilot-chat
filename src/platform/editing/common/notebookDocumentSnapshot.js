"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotebookDocumentSnapshot = void 0;
exports.isNotebookDocumentSnapshotJSON = isNotebookDocumentSnapshotJSON;
const vscodeTypes_1 = require("../../../vscodeTypes");
const uri_1 = require("../../../util/vs/base/common/uri");
const alternativeContent_1 = require("../../notebook/common/alternativeContent");
const types_1 = require("../../../util/vs/base/common/types");
const helpers_1 = require("../../notebook/common/helpers");
function isNotebookDocumentSnapshotJSON(thing) {
    if (!thing || typeof thing !== 'object') {
        return false;
    }
    return thing.type === 'notebook' && (0, uri_1.isUriComponents)(thing.uri) && (0, types_1.isString)(thing._text) &&
        (0, types_1.isString)(thing.languageId) && (0, types_1.isNumber)(thing.version) && (0, types_1.isString)(thing.alternativeFormat);
}
class NotebookDocumentSnapshot {
    static create(doc, format) {
        const uri = doc.uri;
        const version = doc.version;
        return new NotebookDocumentSnapshot(doc, uri, version, format);
    }
    static fromJSON(doc, json) {
        // TODO@DonJayamanne
        return NotebookDocumentSnapshot.create(doc, json.alternativeFormat);
    }
    constructor(doc, uri, version, alternativeFormat) {
        this.alternativeFormat = alternativeFormat;
        this.type = 'notebook';
        this.document = doc;
        this.uri = uri;
        this.version = version;
        this.languageId = alternativeFormat === 'text' ? (0, helpers_1.getDefaultLanguage)(doc) || 'python' : alternativeFormat;
        this._alternativeDocument = (0, alternativeContent_1.getAlternativeNotebookDocumentProvider)(alternativeFormat).getAlternativeDocument(doc);
        this._text = this._alternativeDocument.getText();
    }
    getText(range) {
        return this._alternativeDocument.getText(range);
    }
    getSelection() {
        return new vscodeTypes_1.Selection(0, 0, this.lineCount, 0);
    }
    getWholeRange() {
        return new vscodeTypes_1.Range(0, 0, this.lineCount, 0);
    }
    get lines() {
        return this._alternativeDocument.lines;
    }
    get lineCount() {
        return this._alternativeDocument.lineCount;
    }
    lineAt(lineOrPosition) {
        let line;
        if (lineOrPosition instanceof vscodeTypes_1.Position) {
            line = lineOrPosition.line;
        }
        else if (typeof lineOrPosition === 'number') {
            line = lineOrPosition;
        }
        else {
            throw new Error(`Invalid argument`);
        }
        if (line < 0 || line >= this.lines.length) {
            throw new Error('Illegal value for `line`');
        }
        return this._alternativeDocument.lineAt(line);
    }
    offsetAt(position) {
        return this._alternativeDocument.offsetAt(position);
    }
    positionAt(offset) {
        return this._alternativeDocument.positionAt(offset);
    }
    validateRange(range) {
        return this._alternativeDocument.validateRange(range);
    }
    validatePosition(position) {
        return this._alternativeDocument.validatePosition(position);
    }
    toJSON() {
        return {
            type: 'notebook',
            uri: this.uri.toJSON(),
            languageId: this.languageId,
            version: this.version,
            _text: this._alternativeDocument.getText(),
            alternativeFormat: this.alternativeFormat
        };
    }
}
exports.NotebookDocumentSnapshot = NotebookDocumentSnapshot;
//# sourceMappingURL=notebookDocumentSnapshot.js.map