"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlternativeNotebookDocument = void 0;
const wordHelper_1 = require("../../../util/vs/editor/common/core/wordHelper");
const vscodeTypes_1 = require("../../../vscodeTypes");
const positionOffsetTransformer_1 = require("../../editing/common/positionOffsetTransformer");
const textDocumentSnapshot_1 = require("../../editing/common/textDocumentSnapshot");
class AlternativeNotebookDocument {
    get transformer() {
        if (!this._transformer) {
            this._transformer = new positionOffsetTransformer_1.PositionOffsetTransformer(this._text);
        }
        return this._transformer;
    }
    getText(range) {
        return range ? this._getTextInRange(range) : this._text;
    }
    _getTextInRange(_range) {
        const range = this.validateRange(_range);
        if (range.isEmpty) {
            return '';
        }
        const offsetRange = this.transformer.toOffsetRange(range);
        return this._text.substring(offsetRange.start, offsetRange.endExclusive);
    }
    constructor(_text, notebook) {
        this._text = _text;
        this.notebook = notebook;
        this._transformer = null;
        this._lines = null;
    }
    positionToOffset(position) {
        position = this.validatePosition(position);
        return this.transformer.getOffset(position);
    }
    getWordRangeAtPosition(_position) {
        const position = this.validatePosition(_position);
        const wordAtText = (0, wordHelper_1.getWordAtText)(position.character + 1, wordHelper_1.DEFAULT_WORD_REGEXP, this.lines[position.line], 0);
        if (wordAtText) {
            return new vscodeTypes_1.Range(position.line, wordAtText.startColumn - 1, position.line, wordAtText.endColumn - 1);
        }
        return undefined;
    }
    get lines() {
        if (!this._lines) {
            this._lines = this._text.split(/\r\n|\r|\n/g);
        }
        return this._lines;
    }
    get lineCount() {
        return this.lines.length;
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
        return new textDocumentSnapshot_1.SnapshotDocumentLine(line, this.lines[line], line === this.lines.length - 1);
    }
    offsetAt(position) {
        return this.transformer.getOffset(position);
    }
    positionAt(offset) {
        offset = Math.floor(offset);
        offset = Math.max(0, offset);
        return this.transformer.getPosition(offset);
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
}
exports.AlternativeNotebookDocument = AlternativeNotebookDocument;
//# sourceMappingURL=alternativeNotebookDocument.js.map