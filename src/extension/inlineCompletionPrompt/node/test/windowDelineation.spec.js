"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ts_dedent_1 = __importDefault(require("ts-dedent"));
const vitest_1 = require("vitest");
const windowDelineations_1 = require("../../common/snippetInclusion/windowDelineations");
const SOURCE = {
    source: (0, ts_dedent_1.default) `
    f1:
        a1
    f2:
        a2
        a3
`,
    name: '',
};
(0, vitest_1.suite)('Test window delineation', function () {
    (0, vitest_1.test)('Correct line number range, standard input', function () {
        const testLineNumbers = (0, windowDelineations_1.getIndentationWindowsDelineations)(SOURCE.source.split('\n'), 'python', 1, 3);
        const correctLineNumbers = [
            [0, 2], // f1: a1
            [1, 2], // a1
            [2, 5], // f2: a2 a3
            [3, 4], // a2
            [4, 5], // a3
        ];
        vitest_1.assert.deepStrictEqual(testLineNumbers.sort(), correctLineNumbers.sort());
    });
    (0, vitest_1.test)('Correct line number range, standard input, decreased maxLength', function () {
        const testLineNumbers = (0, windowDelineations_1.getIndentationWindowsDelineations)(SOURCE.source.split('\n'), 'python', 1, 2);
        const correctLineNumbers = [
            [0, 2], // f1: a1
            [1, 2], // a1
            [3, 4], // a2
            [4, 5], // a3
            // We lose [2, 5] f2: a2 a3 as too long
            // But we gain the following which were previously swallowed up by [2, 5]
            [2, 4], // f2: a2
            [3, 5], // a2 a3
        ];
        vitest_1.assert.deepStrictEqual(testLineNumbers.sort(), correctLineNumbers.sort());
    });
    (0, vitest_1.test)('Correct line number range, standard input, increased minLength', function () {
        const testLineNumbers = (0, windowDelineations_1.getIndentationWindowsDelineations)(SOURCE.source.split('\n'), 'python', 2, 3);
        const correctLineNumbers = [
            [0, 2], // f1: a1
            [2, 5], // f2: a2 a3
            // We lose the following as too short
            // [1, 2] a1
            // [3, 4] a2
            // [4, 5] a3
        ];
        vitest_1.assert.deepStrictEqual(testLineNumbers.sort(), correctLineNumbers.sort());
    });
    (0, vitest_1.test)('Correct line number range, flat input', function () {
        const source = (0, ts_dedent_1.default) `
        a1
        a2
        a3
        `;
        const testLineNumbers = (0, windowDelineations_1.getIndentationWindowsDelineations)(source.split('\n'), 'python', 1, 3);
        const correctLineNumbers = [
            [0, 1], // a1
            [1, 2], // a2
            [2, 3], // a3
            [0, 3], // a1 a2 a3
            // Don't get [0, 2] nor [1, 3] because they not single children nor the whole tree
        ];
        vitest_1.assert.deepStrictEqual(testLineNumbers.sort(), correctLineNumbers.sort());
    });
    (0, vitest_1.test)('Check degenerate case', function () {
        const testLineNumbers = (0, windowDelineations_1.getIndentationWindowsDelineations)(SOURCE.source.split('\n'), 'python', 0, 0);
        const correctLineNumbers = [];
        vitest_1.assert.deepStrictEqual(testLineNumbers.sort(), correctLineNumbers.sort());
    });
});
//# sourceMappingURL=windowDelineation.spec.js.map