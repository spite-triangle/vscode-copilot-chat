"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const lineEdit_1 = require("../../../../util/vs/editor/common/core/edits/lineEdit");
const lineRange_1 = require("../../../../util/vs/editor/common/core/ranges/lineRange");
const statelessNextEditProviders_1 = require("../../common/statelessNextEditProviders");
(0, vitest_1.describe)('IgnoreFormattingChangesAspect', () => {
    // Helper to create test cases with less boilerplate
    function createEdit(baseLines, newLines) {
        return new lineEdit_1.LineReplacement(new lineRange_1.LineRange(1, baseLines.length + 1), newLines);
    }
    function isFormattingOnly(base, edited) {
        return statelessNextEditProviders_1.IgnoreWhitespaceOnlyChanges._isFormattingOnlyChange(base, createEdit(base, edited));
    }
    // Test the core algorithm: formatting-only changes preserve content after whitespace removal
    (0, vitest_1.it)('identifies formatting vs content changes correctly', () => {
        // Formatting-only: content identical after removing whitespace
        (0, vitest_1.expect)(isFormattingOnly(['x=1;'], ['x = 1;'])).toBe(true);
        (0, vitest_1.expect)(isFormattingOnly(['  x'], ['x'])).toBe(true);
        (0, vitest_1.expect)(isFormattingOnly(['a', 'b'], ['a b'])).toBe(true);
        // Content changes: content differs after removing whitespace
        (0, vitest_1.expect)(isFormattingOnly(['x=1;'], ['x=2;'])).toBe(false);
        (0, vitest_1.expect)(isFormattingOnly(['x'], ['x+1'])).toBe(false);
        (0, vitest_1.expect)(isFormattingOnly(['a'], ['a', 'b'])).toBe(false);
    });
    // Representative examples of common scenarios
    (0, vitest_1.describe)('common scenarios', () => {
        const testCases = [
            // Formatting-only changes
            { name: 'indentation', base: ['  code'], edited: ['    code'], expected: true },
            { name: 'space normalization', base: ['a  b'], edited: ['a b'], expected: true },
            { name: 'line breaks', base: ['a;', 'b;'], edited: ['a; b;'], expected: true },
            { name: 'empty lines', base: ['   '], edited: ['\t'], expected: true },
            // Content changes
            { name: 'value change', base: ['x=1'], edited: ['x=2'], expected: false },
            { name: 'added code', base: ['f()'], edited: ['f()', 'g()'], expected: false },
            { name: 'removed code', base: ['a', 'b'], edited: ['a'], expected: false },
        ];
        vitest_1.it.each(testCases)('$name', ({ base, edited, expected }) => {
            (0, vitest_1.expect)(isFormattingOnly(base, edited)).toBe(expected);
        });
    });
    // Edge cases that could break the algorithm
    (0, vitest_1.describe)('edge cases', () => {
        (0, vitest_1.it)('handles empty content correctly', () => {
            (0, vitest_1.expect)(isFormattingOnly([''], [''])).toBe(true);
            (0, vitest_1.expect)(isFormattingOnly([''], ['   '])).toBe(true);
            (0, vitest_1.expect)(isFormattingOnly(['   '], [''])).toBe(true);
        });
        (0, vitest_1.it)('handles single character changes', () => {
            (0, vitest_1.expect)(isFormattingOnly(['a'], ['a '])).toBe(true);
            (0, vitest_1.expect)(isFormattingOnly(['a'], ['b'])).toBe(false);
        });
    });
});
//# sourceMappingURL=statelessNextEditProviers.spec.js.map