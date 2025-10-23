"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.SnapshotDocumentLine = exports.TextDocumentSnapshot = void 0;
exports.isTextDocumentSnapshotJSON = isTextDocumentSnapshotJSON;
const types_1 = require("../../../util/vs/base/common/types");
const uri_1 = require("../../../util/vs/base/common/uri");
const wordHelper_1 = require("../../../util/vs/editor/common/core/wordHelper");
const vscodeTypes_1 = require("../../../vscodeTypes");
const positionOffsetTransformer_1 = require("./positionOffsetTransformer");
function isTextDocumentSnapshotJSON(thing) {
    if (!thing || typeof thing !== 'object') {
        return false;
    }
    return (0, uri_1.isUriComponents)(thing.uri) && (0, types_1.isString)(thing._text) && (0, types_1.isString)(thing.languageId) && (0, types_1.isNumber)(thing.version) && (0, types_1.isNumber)(thing.eol);
}
class TextDocumentSnapshot {
    static create(doc) {
        return new TextDocumentSnapshot(doc, doc.uri, doc.getText(), doc.languageId, doc.eol, doc.version);
    }
    static fromNewText(text, doc) {
        return new TextDocumentSnapshot(doc, doc.uri, doc.getText(), doc.languageId, doc.eol, doc.version + 1);
    }
    static fromJSON(doc, json) {
        return new TextDocumentSnapshot(doc, uri_1.URI.from(json.uri), json._text, json.languageId, json.eol, json.version);
    }
    get transformer() {
        if (!this._transformer) {
            this._transformer = new positionOffsetTransformer_1.PositionOffsetTransformer(this._text);
        }
        return this._transformer;
    }
    get fileName() {
        return this.uri.fsPath;
    }
    get isUntitled() {
        return this.uri.scheme === 'untitled';
    }
    get lineCount() {
        return this.lines.length;
    }
    get lines() {
        if (!this._lines) {
            this._lines = this._text.split(/\r\n|\r|\n/g);
        }
        return this._lines;
    }
    constructor(document, uri, text, languageId, eol, version) {
        this._transformer = null;
        this._lines = null;
        this.document = document;
        this.uri = uri;
        this._text = text;
        this.languageId = languageId;
        this.eol = eol;
        this.version = version;
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
        return new SnapshotDocumentLine(line, this.lines[line], line === this.lines.length - 1);
    }
    offsetAt(position) {
        if (this.version === this.document.version) {
            return this.document.offsetAt(position);
        }
        position = this.validatePosition(position);
        return this.transformer.getOffset(position);
    }
    positionAt(offset) {
        if (this.version === this.document.version) {
            return this.document.positionAt(offset);
        }
        offset = Math.floor(offset);
        offset = Math.max(0, offset);
        return this.transformer.getPosition(offset);
    }
    getText(range) {
        return range ? this._getTextInRange(range) : this._text;
    }
    _getTextInRange(_range) {
        if (this.version === this.document.version) {
            return this.document.getText(_range);
        }
        const range = this.validateRange(_range);
        if (range.isEmpty) {
            return '';
        }
        const offsetRange = this.transformer.toOffsetRange(range);
        return this._text.substring(offsetRange.start, offsetRange.endExclusive);
    }
    getWordRangeAtPosition(_position) {
        const position = this.validatePosition(_position);
        const wordAtText = (0, wordHelper_1.getWordAtText)(position.character + 1, wordHelper_1.DEFAULT_WORD_REGEXP, this.lines[position.line], 0);
        if (wordAtText) {
            return new vscodeTypes_1.Range(position.line, wordAtText.startColumn - 1, position.line, wordAtText.endColumn - 1);
        }
        return undefined;
    }
    validateRange(range) {
        const start = this.validatePosition(range.start);
        const end = this.validatePosition(range.end);
        if (start === range.start && end === range.end) {
            return range;
        }
        return new vscodeTypes_1.Range(start.line, start.character, end.line, end.character);
    }
    validatePosition(position) {
        if (this._text.length === 0) {
            return position.with(0, 0);
        }
        let { line, character } = position;
        let hasChanged = false;
        if (line < 0) {
            line = 0;
            character = 0;
            hasChanged = true;
        }
        else if (line >= this.lines.length) {
            line = this.lines.length - 1;
            character = this.lines[line].length;
            hasChanged = true;
        }
        else {
            const maxCharacter = this.lines[line].length;
            if (character < 0) {
                character = 0;
                hasChanged = true;
            }
            else if (character > maxCharacter) {
                character = maxCharacter;
                hasChanged = true;
            }
        }
        if (!hasChanged) {
            return position;
        }
        return new vscodeTypes_1.Position(line, character);
    }
    toJSON() {
        return {
            uri: this.uri.toJSON(),
            languageId: this.languageId,
            version: this.version,
            eol: this.eol,
            _text: this._text
        };
    }
}
exports.TextDocumentSnapshot = TextDocumentSnapshot;
class SnapshotDocumentLine {
    constructor(line, text, isLastLine) {
        this._line = line;
        this._text = text;
        this._isLastLine = isLastLine;
    }
    get lineNumber() {
        return this._line;
    }
    get text() {
        return this._text;
    }
    get range() {
        return new vscodeTypes_1.Range(this._line, 0, this._line, this._text.length);
    }
    get rangeIncludingLineBreak() {
        if (this._isLastLine) {
            return this.range;
        }
        return new vscodeTypes_1.Range(this._line, 0, this._line + 1, 0);
    }
    get firstNonWhitespaceCharacterIndex() {
        //TODO@api, rename to 'leadingWhitespaceLength'
        return /^(\s*)/.exec(this._text)[1].length;
    }
    get isEmptyOrWhitespace() {
        return this.firstNonWhitespaceCharacterIndex === this._text.length;
    }
}
exports.SnapshotDocumentLine = SnapshotDocumentLine;
//# sourceMappingURL=textDocumentSnapshot.js.map