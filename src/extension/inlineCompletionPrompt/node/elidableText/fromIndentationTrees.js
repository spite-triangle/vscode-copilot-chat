"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_TREE_TRAVERSAL_CONFIG = void 0;
exports.fromTreeWithFocussedLines = fromTreeWithFocussedLines;
exports.fromTreeWithValuedLines = fromTreeWithValuedLines;
/**
 * @fileoverview Utility functions for creating elidable texts from indentation trees.
 */
const api_1 = require("../../common/indentation/api");
const api_2 = require("../tokenization/api");
const elidableText_1 = require("./elidableText");
exports.DEFAULT_TREE_TRAVERSAL_CONFIG = {
    worthUp: 0.9,
    worthSibling: 0.88,
    worthDown: 0.8,
};
/**
 * Take some nodes of an indentation tree and make an elidable text from it,
 * valuing nodes closer to nodes labeled "true" more highly.
 * @param tree
 */
function fromTreeWithFocussedLines(tree, metadata, tokenizer = (0, api_2.getTokenizer)(), config = exports.DEFAULT_TREE_TRAVERSAL_CONFIG) {
    // go through the tree and relabel the nodes with their distance from the nearest "true" node
    const treeWithDistances = (0, api_1.mapLabels)(tree, (x) => (x ? 1 : undefined));
    // traverse the tree bottomUp to add config.costUp to the labels of the parents
    (0, api_1.visitTree)(treeWithDistances, node => {
        if ((0, api_1.isBlank)(node)) {
            return;
        }
        const maxChildLabel = node.subs.reduce((memo, child) => Math.max(memo, child.label ?? 0), 0);
        node.label = Math.max(node.label ?? 0, maxChildLabel * config.worthUp);
    }, 'bottomUp');
    // traverse the tree topDown and for all children, add config.costDown and config.costSibling
    (0, api_1.visitTree)(treeWithDistances, node => {
        if ((0, api_1.isBlank)(node)) {
            return;
        }
        const values = node.subs.map(sub => sub.label ?? 0);
        let new_values = [...values];
        for (let i = 0; i < values.length; i++) {
            if (values[i] === 0) {
                continue;
            }
            else {
                new_values = new_values.map((v, j) => Math.max(v, Math.pow(config.worthSibling, Math.abs(i - j)) * values[i]));
            }
        }
        // add config.costDown
        const nodeLabel = node.label;
        if (nodeLabel !== undefined) {
            new_values = new_values.map(v => Math.max(v, config.worthDown * nodeLabel));
        }
        node.subs.forEach((sub, i) => (sub.label = new_values[i]));
    }, 'topDown');
    return fromTreeWithValuedLines(treeWithDistances, metadata, tokenizer);
}
function fromTreeWithValuedLines(tree, metadata, tokenizer = (0, api_2.getTokenizer)()) {
    const valuedLines = (0, api_1.foldTree)(tree, [], (node, acc) => {
        if (node.type === 'line' || node.type === 'blank') {
            acc.push(node.type === 'line' ? [(0, api_1.deparseLine)(node).trimEnd(), node.label ?? 0] : ['', node.label ?? 0]);
        }
        return acc;
    }, 'topDown');
    return new elidableText_1.ElidableText(valuedLines, metadata, tokenizer);
}
//# sourceMappingURL=fromIndentationTrees.js.map