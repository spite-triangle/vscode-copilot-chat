"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const suffixMatchCriteria_1 = require("../../common/suffixMatchCriteria");
(0, vitest_1.suite)('EditDistanceScore Test Suite', function () {
    (0, vitest_1.test)('findEditDistanceScore computes correct score of two number[]', function () {
        vitest_1.assert.strictEqual((0, suffixMatchCriteria_1.findEditDistanceScore)([], [])?.score, 0);
        vitest_1.assert.strictEqual((0, suffixMatchCriteria_1.findEditDistanceScore)([1], [1])?.score, 0);
        vitest_1.assert.strictEqual((0, suffixMatchCriteria_1.findEditDistanceScore)([1], [2])?.score, 1);
        vitest_1.assert.strictEqual((0, suffixMatchCriteria_1.findEditDistanceScore)([1], [])?.score, 1);
        vitest_1.assert.strictEqual((0, suffixMatchCriteria_1.findEditDistanceScore)([], [1])?.score, 1);
        vitest_1.assert.strictEqual((0, suffixMatchCriteria_1.findEditDistanceScore)([1, 2, 3], [3, 2, 1])?.score, 2);
    });
});
//# sourceMappingURL=suffixmatch.spec.js.map