"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.PositionOffsetTransformer = void 0;
const strings_1 = require("../../../util/vs/base/common/strings");
const stringEdit_1 = require("../../../util/vs/editor/common/core/edits/stringEdit");
const offsetRange_1 = require("../../../util/vs/editor/common/core/ranges/offsetRange");
const prefixSumComputer_1 = require("../../../util/vs/editor/common/model/prefixSumComputer");
const vscodeTypes_1 = require("../../../vscodeTypes");
class PositionOffsetTransformer {
    constructor(text) {
        this._lines = (0, strings_1.splitLines)(text);
        this._eol = text.charAt(this._lines[0].length) === '\r' ? '\r\n' : '\n';
        const lineStartValues = new Uint32Array(this._lines.length);
        for (let i = 0; i < this._lines.length; i++) {
            lineStartValues[i] = this._lines[i].length + this._eol.length;
        }
        this._lineStarts = new prefixSumComputer_1.PrefixSumComputer(lineStartValues);
    }
    getText() {
        return this._lines.join(this._eol);
    }
    applyOffsetEdits(offsetEdits) {
        const { replacements } = offsetEdits;
        for (let i = replacements.length - 1; i >= 0; i--) {
            const edit = replacements[i];
            const range = this.toRange(edit.replaceRange);
            this._acceptDeleteRange(range);
            this._acceptInsertText(range.start, edit.newText);
        }
    }
    _acceptDeleteRange(range) {
        if (range.start.line === range.end.line) {
            if (range.start.character === range.end.character) {
                // Nothing to delete
                return;
            }
            // Delete text on the affected line
            this._setLineText(range.start.line, this._lines[range.start.line].substring(0, range.start.character)
                + this._lines[range.start.line].substring(range.end.character));
            return;
        }
        // Take remaining text on last line and append it to remaining text on first line
        this._setLineText(range.start.line, this._lines[range.start.line].substring(0, range.start.character)
            + this._lines[range.end.line].substring(range.end.character));
        // Delete middle lines
        this._lines.splice(range.start.line + 1, range.end.line - range.start.line);
        this._lineStarts.removeValues(range.start.line + 1, range.end.line - range.start.line);
    }
    _acceptInsertText(position, insertText) {
        if (insertText.length === 0) {
            // Nothing to insert
            return;
        }
        const insertLines = (0, strings_1.splitLines)(insertText);
        if (insertLines.length === 1) {
            // Inserting text on one line
            this._setLineText(position.line, this._lines[position.line].substring(0, position.character)
                + insertLines[0]
                + this._lines[position.line].substring(position.character));
            return;
        }
        // Append overflowing text from first line to the end of text to insert
        insertLines[insertLines.length - 1] += this._lines[position.line].substring(position.character);
        // Delete overflowing text from first line and insert text on first line
        this._setLineText(position.line, this._lines[position.line].substring(0, position.character)
            + insertLines[0]);
        // Insert new lines & store lengths
        const newLengths = new Uint32Array(insertLines.length - 1);
        for (let i = 1; i < insertLines.length; i++) {
            this._lines.splice(position.line + 1 + i - 1, 0, insertLines[i]);
            newLengths[i - 1] = insertLines[i].length + this._eol.length;
        }
        this._lineStarts.insertValues(position.line + 1, newLengths);
    }
    /**
     * All changes to a line's text go through this method
     */
    _setLineText(lineIndex, newValue) {
        this._lines[lineIndex] = newValue;
        this._lineStarts.setValue(lineIndex, this._lines[lineIndex].length + this._eol.length);
    }
    getLineCount() {
        return this._lines.length;
    }
    getOffset(position) {
        position = this.validatePosition(position);
        return this._lineStarts.getPrefixSum(position.line - 1) + position.character;
    }
    getPosition(offset) {
        offset = Math.floor(offset);
        offset = Math.max(0, offset);
        const out = this._lineStarts.getIndexOf(offset);
        const lineLength = this._lines[out.index].length;
        // Ensure we return a valid position
        return new vscodeTypes_1.Position(out.index, Math.min(out.remainder, lineLength));
    }
    toRange(offsetRange) {
        return new vscodeTypes_1.Range(this.getPosition(offsetRange.start), this.getPosition(offsetRange.endExclusive));
    }
    toOffsetRange(range) {
        return new offsetRange_1.OffsetRange(this.getOffset(range.start), this.getOffset(range.end));
    }
    toOffsetEdit(edits) {
        const validEdits = edits.map(edit => new vscodeTypes_1.TextEdit(this.validateRange(edit.range), edit.newText));
        return new stringEdit_1.StringEdit(validEdits.map(edit => {
            return new stringEdit_1.StringReplacement(this.toOffsetRange(edit.range), edit.newText);
        }));
    }
    toTextEdits(edit) {
        return edit.replacements.map(edit => {
            return new vscodeTypes_1.TextEdit(this.toRange(edit.replaceRange), edit.newText);
        });
    }
    validatePosition(position) {
        if (!(position instanceof vscodeTypes_1.Position)) {
            throw new Error('Invalid argument');
        }
        if (this._lines.length === 0) {
            return position.with(0, 0);
        }
        let { line, character } = position;
        let hasChanged = false;
        if (line < 0) {
            line = 0;
            character = 0;
            hasChanged = true;
        }
        else if (line >= this._lines.length) {
            line = this._lines.length - 1;
            character = this._lines[line].length;
            hasChanged = true;
        }
        else {
            const maxCharacter = this._lines[line].length;
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
    validateRange(range) {
        return new vscodeTypes_1.Range(this.validatePosition(range.start), this.validatePosition(range.end));
    }
}
exports.PositionOffsetTransformer = PositionOffsetTransformer;
//# sourceMappingURL=positionOffsetTransformer.js.map