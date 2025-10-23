"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgnoreWhitespaceOnlyChanges = exports.IgnoreEmptyLineAndLeadingTrailingWhitespaceChanges = void 0;
class IgnoreEmptyLineAndLeadingTrailingWhitespaceChanges {
    static filterEdit(resultDocument, singleEdits) {
        const filteredEdits = singleEdits.filter(e => !IgnoreEmptyLineAndLeadingTrailingWhitespaceChanges._isWhitespaceOnlyChange(e, resultDocument.documentAfterEditsLines));
        return filteredEdits;
    }
    static _isWhitespaceOnlyChange(edit, baseLines) {
        const originalLines = edit.lineRange.toOffsetRange().slice(baseLines);
        const newLines = edit.newLines;
        const isRemoval = newLines.length === 0;
        // is removing empty lines
        if (isRemoval && originalLines.every(line => line.trim() === '')) {
            return true;
        }
        // is adding empty lines
        if (!isRemoval && newLines.every(line => line.trim() === '')) {
            return true;
        }
        if (originalLines.length !== newLines.length) {
            return false;
        }
        for (let i = 0; i < originalLines.length; i++) {
            const originalLine = originalLines[i];
            const newLine = newLines[i];
            if (originalLine.trim() !== newLine.trim()) {
                return false;
            }
        }
        return true;
    }
}
exports.IgnoreEmptyLineAndLeadingTrailingWhitespaceChanges = IgnoreEmptyLineAndLeadingTrailingWhitespaceChanges;
class IgnoreWhitespaceOnlyChanges {
    static filterEdit(resultDocument, singleEdits) {
        return singleEdits.filter(e => !IgnoreWhitespaceOnlyChanges._isFormattingOnlyChange(resultDocument.documentAfterEditsLines, e));
    }
    /**
     * @remarks public only for testing
     */
    static _isFormattingOnlyChange(baseLines, singleEdit) {
        const originalLines = singleEdit.lineRange.toOffsetRange().slice(baseLines).join('').replace(/\s/g, '');
        const newLines = singleEdit.newLines.join('').replace(/\s/g, '');
        return originalLines === newLines;
    }
}
exports.IgnoreWhitespaceOnlyChanges = IgnoreWhitespaceOnlyChanges;
//# sourceMappingURL=statelessNextEditProviders.js.map