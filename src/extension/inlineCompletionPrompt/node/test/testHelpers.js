"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareTreeWithSpec = compareTreeWithSpec;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const vitest_1 = require("vitest");
const classes_1 = require("../../common/indentation/classes");
const description_1 = require("../../common/indentation/description");
/**
 * Asserts that two trees are isomorphic.
 * @param actual The tree to test.
 * @param expected The tree expected to be equal (source lines can be abbreviated with '...').
 * @param strictness Should the tree be deeply equal (including indentation and line numbers),
 * or is in enough for the children and types of each node match?
 * @param treeParent The tree's parent for context (optional)
 * @param parentIndex The index for the tree in its parent's subs (optional)
 */
function compareTreeWithSpec(actual, expected, strictness = 'strict', treeParent, parentIndex) {
    if (actual.type !== expected.type) {
        failCompare(actual, expected, `type of tree doesn't match, ${actual.type} ${expected.type}`, treeParent, parentIndex);
    }
    if (actual.subs.length !== expected.subs.length) {
        failCompare(actual, expected, 'number of children do not match', treeParent, parentIndex);
    }
    if (strictness === 'strict' && (0, classes_1.isLine)(actual)) {
        if (actual.indentation !== expected.indentation) {
            failCompare(actual, expected, "virtual node indentation doesn't match", treeParent, parentIndex);
        }
    }
    for (let i = 0; i < actual.subs.length; ++i) {
        compareTreeWithSpec(actual.subs[i], expected.subs[i], strictness, actual, i);
    }
}
function failCompare(tree, expected, reason, treeParent, parentIndex) {
    vitest_1.assert.fail(`Reason: ${reason}
    Tree: ${(0, description_1.describeTree)(tree)}
    Expected: ${(0, description_1.describeTree)(expected)}`);
}
//# sourceMappingURL=testHelpers.js.map