"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.elidableTextForSourceCode = elidableTextForSourceCode;
const api_1 = require("../../common/indentation/api");
const api_2 = require("../tokenization/api");
const fromIndentationTrees_1 = require("./fromIndentationTrees");
/**
 * Construct an {@link ElidableText} from a piece of source code, focussing on
 * the first line and last leaf that is not a closer.
 */
function elidableTextForSourceCode(contents, focusOnLastLeaf = true, focusOnFirstLine = true, metadata, tokenizer = (0, api_2.getTokenizer)()) {
    // if contents is a DocumentInfo, it has source and languageId, and we want to pass both to parseTree
    const tree = typeof contents === 'string' ? (0, api_1.parseTree)(contents) : (0, api_1.parseTree)(contents.source, contents.languageId);
    (0, api_1.flattenVirtual)(tree);
    // we may want to include the last leaf that is not a closer, seeing the end as informative e.g. for appending
    const treeWithFocussedLines = (0, api_1.mapLabels)(tree, label => focusOnLastLeaf && label !== 'closer');
    // if the label was closer, it's false now, but if there was no label, there still is no label
    // let's make it explicit that a node is true iff it's not a closer and we do want to focusOnLastLeaf
    (0, api_1.visitTree)(treeWithFocussedLines, node => {
        if (node.label === undefined) {
            node.label = focusOnLastLeaf && node.label !== false;
        }
    }, 'topDown');
    if (focusOnLastLeaf) {
        (0, api_1.visitTree)(treeWithFocussedLines, node => {
            if (node.label) {
                let foundLastTrue = false;
                for (const subnode of [...node.subs].reverse()) {
                    if (subnode.label && !foundLastTrue) {
                        foundLastTrue = true;
                    }
                    else {
                        subnode.label = false;
                    }
                }
            }
            else {
                // all subs get label false
                for (const subnode of node.subs) {
                    subnode.label = false;
                }
            }
            // we want to find the last _leaf_, so if there are subs, this is not it
            if (node.subs.length > 0) {
                node.label = false;
            }
        }, 'topDown');
    }
    // we may want to focus on the first lines, seeing the beginning as informative e.g. for the setup
    if (focusOnFirstLine) {
        (0, api_1.visitTree)(treeWithFocussedLines, node => {
            node.label ||= ((0, api_1.isLine)(node) || (0, api_1.isBlank)(node)) && node.lineNumber === 0;
        }, 'topDown');
    }
    return (0, fromIndentationTrees_1.fromTreeWithFocussedLines)(treeWithFocussedLines, metadata, tokenizer);
}
//# sourceMappingURL=fromSourceCode.js.map