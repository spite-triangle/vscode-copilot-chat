"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.InformationDelta = void 0;
exports.editWouldDeleteWhatWasJustInserted = editWouldDeleteWhatWasJustInserted;
exports.getInformationDelta = getInformationDelta;
const N_GRAM_UNDO_RATIO_TO_FILTER_OUT = 0.7;
function editWouldDeleteWhatWasJustInserted(activeDocument, lineEdit) {
    let edit = lineEdit.toEdit(activeDocument.documentAfterEdits);
    // ! important: reduce it to the minimal set of changes
    edit = edit.normalizeOnSource(activeDocument.documentAfterEdits.value);
    if (!editIsDeletion(edit)) {
        return false;
    }
    // We are deleting something. Is it what was just inserted?
    for (let i = activeDocument.recentEdits.edits.length - 1; i >= 0; i--) {
        const recentEdit = activeDocument.recentEdits.edits[i];
        const rebaseResult = edit.tryRebase(recentEdit);
        if (!rebaseResult) {
            // the edit we want to do cannot be rebased, which indicates that it would interfere with a recent edit
            return true;
        }
        edit = rebaseResult;
    }
    return false;
}
function editIsDeletion(edit) {
    const deletedChars = edit.replacements.reduce((acc, singleEdit) => acc + singleEdit.replaceRange.length, 0);
    const insertedChars = edit.replacements.reduce((acc, singleEdit) => acc + singleEdit.newText.length, 0);
    return insertedChars === 0 && deletedChars > 0;
}
/**
 * Represents information loss/gain (4-grams) via an edit.
 */
class InformationDelta {
    constructor(inserted = new Set(), deleted = new Set()) {
        this.inserted = inserted;
        this.deleted = deleted;
    }
    combine(other) {
        return new InformationDelta(setUnion(this.inserted, other.inserted), setUnion(this.deleted, other.deleted));
    }
    isUndoneBy(other) {
        const otherReallyNewInsertions = setMinus(other.inserted, other.deleted);
        const otherReallyDeleted = setMinus(other.deleted, other.inserted);
        const otherReallyDeletesMyInserts = setIntersectionCount(otherReallyDeleted, this.inserted);
        const otherReallyInsertsMyDeletes = setIntersectionCount(otherReallyNewInsertions, this.deleted);
        if (otherReallyDeleted.size > 6 && otherReallyDeletesMyInserts / otherReallyDeleted.size > N_GRAM_UNDO_RATIO_TO_FILTER_OUT) {
            return true;
        }
        if (otherReallyNewInsertions.size > 6 && otherReallyInsertsMyDeletes / otherReallyNewInsertions.size > N_GRAM_UNDO_RATIO_TO_FILTER_OUT) {
            return true;
        }
        return false;
    }
}
exports.InformationDelta = InformationDelta;
function getInformationDelta(source, edit) {
    const inserted = new Set();
    const deleted = new Set();
    const tryAddDeleted = (deletedRange) => {
        if (!deletedRange) {
            return;
        }
        const deletedText = source.substring(deletedRange.start, deletedRange.endExclusive);
        for (let line of deletedText.split(/\r\n|\r|\n/)) {
            line = line.trim();
            for (const piece of to4grams(line)) {
                deleted.add(piece);
            }
        }
    };
    const tryAddInserted = (insertedText) => {
        for (let line of insertedText.split(/\r\n|\r|\n/)) {
            line = line.trim();
            for (const piece of to4grams(line)) {
                inserted.add(piece);
            }
        }
    };
    for (const e of edit.replacements) {
        const e1 = e.removeCommonPrefix(source).removeCommonSuffix(source);
        const e2 = e.removeCommonSuffix(source).removeCommonPrefix(source);
        if (e1.isEmpty) {
            continue;
        }
        tryAddDeleted(e1.replaceRange);
        tryAddDeleted(e2.replaceRange);
        tryAddDeleted(e1.replaceRange.intersect(e2.replaceRange));
        // tryAddInserted(e1.newText);
        // tryAddInserted(e2.newText);
        // e1 might have a suffix overlap with the prefix of e1
        tryAddInserted(trimOverlap(e1.newText, e2.newText));
    }
    return new InformationDelta(inserted, deleted);
}
function trimOverlap(stringToEliminateEnd, stringToEliminateStart) {
    const length = Math.min(stringToEliminateEnd.length, stringToEliminateStart.length);
    for (let trimLength = 0; trimLength < length; trimLength++) {
        const str1 = stringToEliminateEnd.slice(0, stringToEliminateEnd.length - trimLength);
        const str2 = stringToEliminateStart.slice(trimLength);
        if (str1 === str2) {
            return str1;
        }
    }
    return '';
}
function to4grams(text) {
    const result = [];
    for (let i = 4; i < text.length; i++) {
        const ngram = text.slice(i - 4, i);
        result.push(ngram);
    }
    return result;
}
function setUnion(a, b) {
    const result = new Set();
    for (const el of a) {
        result.add(el);
    }
    for (const el of b) {
        result.add(el);
    }
    return result;
}
function setMinus(a, b) {
    const result = new Set();
    for (const el of a) {
        if (!b.has(el)) {
            result.add(el);
        }
    }
    return result;
}
function setIntersectionCount(a, b) {
    let result = 0;
    for (const el of a) {
        if (b.has(el)) {
            result++;
        }
    }
    return result;
}
//# sourceMappingURL=ghNearbyNesProvider.js.map