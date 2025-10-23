"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.elidableTextForDiff = elidableTextForDiff;
const diff = __importStar(require("diff"));
const api_1 = require("../../common/indentation/api");
const fromIndentationTrees_1 = require("./fromIndentationTrees");
/**
 * Returns two {@link ElidableText} objects, one for each of the two contents.
 * Lines that changed are focussed on.
 * @param oldContent
 * @param newContent
 * @returns
 */
function elidableTextForDiff(oldContent, newContent) {
    // languageId is: if one of the contents is a DocumentInfo, use its, otherwise only if both are equal
    const languageId = typeof oldContent === 'string'
        ? typeof newContent === 'string'
            ? undefined
            : newContent.languageId
        : typeof newContent === 'string'
            ? oldContent.languageId
            : oldContent.languageId === newContent.languageId
                ? oldContent.languageId
                : undefined;
    oldContent = typeof oldContent === 'string' ? oldContent : oldContent.source;
    newContent = typeof newContent === 'string' ? newContent : newContent.source;
    // collect lines that changed
    const patch = diff.structuredPatch('', '', oldContent, newContent);
    const changedLinesOld = new Set();
    const changedLinesNew = new Set();
    for (const hunk of patch.hunks) {
        for (let i = hunk.oldStart; i < hunk.oldStart + hunk.oldLines; i++) {
            changedLinesOld.add(i);
        }
        for (let i = hunk.newStart; i < hunk.newStart + hunk.newLines; i++) {
            changedLinesNew.add(i);
        }
    }
    // build indentation trees
    const oldTree = (0, api_1.mapLabels)((0, api_1.flattenVirtual)((0, api_1.parseTree)(oldContent, languageId)), () => false);
    const newTree = (0, api_1.mapLabels)((0, api_1.flattenVirtual)((0, api_1.parseTree)(newContent, languageId)), () => false);
    // mark changed lines
    (0, api_1.visitTree)(oldTree, node => {
        if (node.type === 'line' || node.type === 'blank') {
            if (changedLinesOld.has(node.lineNumber)) {
                node.label = true;
            }
        }
    }, 'topDown');
    (0, api_1.visitTree)(newTree, node => {
        if (node.type === 'line' || node.type === 'blank') {
            if (changedLinesNew.has(node.lineNumber)) {
                node.label = true;
            }
        }
    }, 'topDown');
    return [(0, fromIndentationTrees_1.fromTreeWithFocussedLines)(oldTree), (0, fromIndentationTrees_1.fromTreeWithFocussedLines)(newTree)];
}
//# sourceMappingURL=fromDiff.js.map