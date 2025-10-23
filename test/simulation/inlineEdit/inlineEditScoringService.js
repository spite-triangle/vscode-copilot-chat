"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.inlineEditScoringService = exports.EditScoreResult = void 0;
const promises_1 = require("fs/promises");
const path_1 = require("path");
const editUtils_1 = require("../../../src/platform/inlineEdits/common/dataTypes/editUtils");
const jsonFile_1 = require("../../../src/util/node/jsonFile");
const cache_1 = require("../../../src/util/vs/base/common/cache");
const equals_1 = require("../../../src/util/vs/base/common/equals");
const types_1 = require("../../../src/util/vs/base/common/types");
const USE_SIMPLE_SCORING = true;
class EditScoreResult {
    constructor(category, 
    /**
     * When comparing two edits with the same scoreCategory, the one with the higher score is considered better.
     * The score does not convey any other meaning (such as its absolute value).
     * Should be below 100.
     */
    score) {
        this.category = category;
        this.score = score;
    }
    toString() {
        return `${this.category}#${this.score}`;
    }
    getScoreValue() {
        if (USE_SIMPLE_SCORING) {
            switch (this.category) {
                case 'bad': return 0;
                case 'valid': return 0.1;
                case 'nextEdit': return 1;
            }
        }
        else {
            const getVal = () => {
                switch (this.category) {
                    case 'bad': return 0;
                    case 'valid': return 10 + (this.score / 100) * 3;
                    case 'nextEdit': return 100 + 10 * (this.score / 100);
                }
            };
            const maxValue = 110;
            return Math.round(Math.min(getVal() / maxValue, maxValue) * 1000) / 1000;
        }
    }
}
exports.EditScoreResult = EditScoreResult;
class InlineEditScoringService {
    constructor() {
        this._scoredEdits = new cache_1.CachedFunction(async (path) => {
            await (0, promises_1.mkdir)((0, path_1.dirname)(path), { recursive: true });
            const file = await jsonFile_1.JSONFile.readOrCreate(path, null, '\t');
            return {
                scoredEdits: undefined,
                file,
            };
        });
    }
    async scoreEdit(scoredEditsFilePath, context, docId, editDocumentValue, edit) {
        const existing = await this._scoredEdits.get(scoredEditsFilePath);
        let shouldWrite = false;
        if (!existing.scoredEdits) {
            const value = existing.file.value;
            if (!value) {
                existing.scoredEdits = ScoredEdits.create(context);
                shouldWrite = true; // first test run
            }
            else {
                existing.scoredEdits = ScoredEdits.fromJson(value, context);
                shouldWrite = existing.scoredEdits.removeUnscored(); // we deleted all unscored edits (might be re-added though)
                const shouldNormalizeExisting = false; // Edits are now normalized before adding to the score database.
                if (shouldNormalizeExisting) {
                    shouldWrite = existing.scoredEdits.normalizeEdits(editDocumentValue.value) || shouldWrite;
                }
            }
        }
        const result = existing.scoredEdits.getScoreOrAddAsUnscored(docId, edit);
        if (!result) {
            shouldWrite = true; // edit was added as unscored
        }
        if (shouldWrite) {
            const newData = existing.scoredEdits.serialize();
            await existing.file.setValue(newData);
        }
        return result;
    }
}
class ScoredEdits {
    static fromJson(data, scoringContext) {
        // TOD check if context matches!
        return new ScoredEdits(scoringContext, data.edits);
    }
    static create(scoringContext) {
        return new ScoredEdits(scoringContext, []);
    }
    constructor(_scoringContext, edits) {
        this._scoringContext = _scoringContext;
        this._editMatchers = [];
        this._edits = edits;
        this._editMatchers = edits.map(e => new EditMatcher(e));
    }
    hasUnscored() {
        return this._edits.some(e => !isScoredEdit(e));
    }
    normalizeEdits(source) {
        const existing = new Set();
        this._edits = this._edits.map(e => {
            let n = e.edit ? (0, editUtils_1.deserializeStringEdit)(e.edit).normalizeOnSource(source) : undefined;
            if (n?.isEmpty()) {
                n = undefined;
            }
            const key = e.documentUri + '#' + JSON.stringify(n?.toJson());
            if (existing.has(key)) {
                return null;
            }
            existing.add(key);
            return {
                ...e,
                edit: n ? (0, editUtils_1.serializeStringEdit)(n) : null,
            };
        }).filter(types_1.isDefined);
        this._editMatchers = this._edits.map(e => new EditMatcher(e));
        return true;
    }
    removeUnscored() {
        if (!this.hasUnscored()) {
            return false;
        }
        this._edits = this._edits.filter(e => isScoredEdit(e));
        this._editMatchers = this._editMatchers.filter(e => e.isScored());
        return true;
    }
    getScoreOrAddAsUnscored(docId, edit) {
        edit = edit?.normalize();
        if (edit?.edit.isEmpty()) {
            edit = undefined;
        }
        const documentUri = docId.uri;
        let existingEdit = this._editMatchers.find(e => e.matches(documentUri, edit));
        if (!existingEdit) {
            const e = {
                documentUri: documentUri,
                edit: edit ? (0, editUtils_1.serializeStringEdit)(edit.edit) : null,
                score: 'unscored',
                scoreCategory: 'unscored',
            };
            const m = new EditMatcher(e);
            this._edits.push(e);
            this._editMatchers.push(m);
            existingEdit = m;
        }
        return existingEdit.getScore();
    }
    serialize() {
        return {
            ...{
                "$web-editor.format-json": true,
                "$web-editor.default-url": "https://microsoft.github.io/vscode-workbench-recorder-viewer/?editRating",
            },
            edits: this._edits,
            // Last, so that it is easier to review the file
            scoringContext: this._scoringContext,
        };
    }
}
class EditMatcher {
    constructor(data) {
        this.data = data;
        this.documentUri = this.data.documentUri;
        this.edit = data.edit ? (0, editUtils_1.deserializeStringEdit)(data.edit) : undefined;
    }
    isScored() {
        return isScoredEdit(this.data);
    }
    getScore() {
        if (!isScoredEdit(this.data)) {
            return undefined;
        }
        return new EditScoreResult(this.data.scoreCategory, this.data.score);
    }
    matches(editDocumentUri, edit) {
        if (editDocumentUri !== this.documentUri) {
            return false;
        }
        // TODO improve! (check if strings after applied the edits are the same)
        return (0, equals_1.equalsIfDefined)(this.edit, edit?.edit, (0, equals_1.itemEquals)());
    }
}
function isScoredEdit(edit) {
    return edit.score !== 'unscored' && edit.scoreCategory !== 'unscored';
}
// Has to be a singleton to avoid writing race conditions
exports.inlineEditScoringService = new InlineEditScoringService();
//# sourceMappingURL=inlineEditScoringService.js.map