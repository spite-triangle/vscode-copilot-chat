"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const configurationService_1 = require("../../common/configurationService");
(0, vitest_1.suite)('AbstractConfigurationService', () => {
    (0, vitest_1.suite)('_extractHashValue', () => {
        (0, vitest_1.test)('should return a value between 0 and 1', () => {
            const value = configurationService_1.AbstractConfigurationService._extractHashValue('test');
            vitest_1.assert.strictEqual(typeof value, 'number');
            vitest_1.assert.ok(value >= 0 && value <= 1, `Value ${value} should be between 0 and 1`);
        });
        (0, vitest_1.test)('should return the same value for the same input', () => {
            const input = 'github.copilot.advanced.testSetting;user1';
            const value1 = configurationService_1.AbstractConfigurationService._extractHashValue(input);
            const value2 = configurationService_1.AbstractConfigurationService._extractHashValue(input);
            vitest_1.assert.strictEqual(value1, value2);
        });
        (0, vitest_1.test)('should return different values for different inputs', () => {
            const value1 = configurationService_1.AbstractConfigurationService._extractHashValue('setting1;user1');
            const value2 = configurationService_1.AbstractConfigurationService._extractHashValue('setting2;user1');
            vitest_1.assert.notStrictEqual(value1, value2);
        });
        (0, vitest_1.test)('should handle empty string', () => {
            const value = configurationService_1.AbstractConfigurationService._extractHashValue('');
            vitest_1.assert.strictEqual(typeof value, 'number');
            vitest_1.assert.ok(value >= 0 && value <= 1);
        });
        (0, vitest_1.test)('should produce different values when username changes', () => {
            const setting = 'github.copilot.advanced.testSetting';
            const value1 = configurationService_1.AbstractConfigurationService._extractHashValue(`${setting};user1`);
            const value2 = configurationService_1.AbstractConfigurationService._extractHashValue(`${setting};user2`);
            vitest_1.assert.notStrictEqual(value1, value2);
        });
        (0, vitest_1.test)('should be deterministic for complex strings', () => {
            const input = 'github.copilot.advanced.someComplexSetting;username123!@#$%^&*()';
            const expected = configurationService_1.AbstractConfigurationService._extractHashValue(input);
            // Call multiple times to ensure determinism
            for (let i = 0; i < 5; i++) {
                const actual = configurationService_1.AbstractConfigurationService._extractHashValue(input);
                vitest_1.assert.strictEqual(actual, expected);
            }
        });
    });
});
//# sourceMappingURL=configurationService.spec.js.map