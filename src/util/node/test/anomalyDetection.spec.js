"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const vitest_1 = require("vitest");
const anomalyDetection_1 = require("../../common/anomalyDetection");
(0, vitest_1.suite)('Anomaly Repetition Tests', function () {
    (0, vitest_1.test)('recognizes sequence consisting of single repeated token', function () {
        const tokens = 'Bar Bar Bar Bar Bar Bar Bar Bar Bar Bar Bar Bar Bar Bar'.split(' ');
        const repetitive = (0, anomalyDetection_1.isRepetitive)(tokens);
        assert_1.default.strictEqual(repetitive, true, 'Repetition should be recognized.');
    });
    (0, vitest_1.test)('does nothing on a too short sequence of single repeated token', function () {
        const tokens = 'Bar Bar Bar Bar Bar Bar Bar Bar Bar'.split(' ');
        const repetitive = (0, anomalyDetection_1.isRepetitive)(tokens);
        assert_1.default.strictEqual(repetitive, false, 'Repetition should not be recognized.');
    });
    (0, vitest_1.test)('recognizes single repeated token in proper suffix', function () {
        const tokens = 'Baz Baz Baz Bar Bar Bar Bar Bar Bar Bar Bar Bar Bar Bar Bar Bar Bar'.split(' ');
        const repetitive = (0, anomalyDetection_1.isRepetitive)(tokens);
        assert_1.default.strictEqual(repetitive, true, 'Repetition should be recognized.');
    });
    (0, vitest_1.test)('recognizes repeated pattern', function () {
        const tokens = ('Bar Far Car Bar Far Car Bar Far Car Bar Far Car Bar Far Car Bar Far Car ' +
            'Bar Far Car Bar Far Car Bar Far Car Bar Far Car Bar Far Car Bar Far Car').split(' ');
        const repetitive = (0, anomalyDetection_1.isRepetitive)(tokens);
        assert_1.default.strictEqual(repetitive, true, 'Repetition should be recognized.');
    });
    (0, vitest_1.test)('does nothing on a too short repeated pattern', function () {
        const tokens = ('Bar Far Car Bar Far Car Bar Far Car Bar Far Car Bar Far Car Bar Far Car ' +
            'Bar Far Car Bar Far Car Bar Far Car').split(' ');
        const repetitive = (0, anomalyDetection_1.isRepetitive)(tokens);
        assert_1.default.strictEqual(repetitive, false, 'Repetition should not be recognized.');
    });
    (0, vitest_1.test)('does nothing in absence of a pattern', function () {
        const tokens = ('12 1 23 43 ac er gf gf 12 er gd 34 dg 35 ;o lo 34 xc ' +
            '4t ggf gf 46 l7 dg qs 5y ku df 34 gr gr gr df er gr gr').split(' ');
        const repetitive = (0, anomalyDetection_1.isRepetitive)(tokens);
        assert_1.default.strictEqual(repetitive, false, 'No repetition should be claimed.');
    });
    (0, vitest_1.test)('does nothing on too long a pattern', function () {
        const tokens = '12 1 23 43 ac er gf gf 12 er gd '.repeat(4).split(' ');
        const repetitive = (0, anomalyDetection_1.isRepetitive)(tokens);
        assert_1.default.strictEqual(repetitive, false, 'No repetition should be claimed.');
    });
    (0, vitest_1.test)('recognizes short real world example', function () {
        const tokens = [
            'C',
            ' LIM',
            'IT',
            ' 1',
            ')',
            '\n',
            '\t',
            '\t',
            '\t',
            '\t',
            '\t',
            '\t',
            '\t',
            '\t',
            '\t',
            '\t',
            '\t',
            '\t',
            '\t',
            '\t',
            '\t',
        ];
        const repetitive = (0, anomalyDetection_1.isRepetitive)(tokens);
        assert_1.default.strictEqual(repetitive, true, 'Repetition should be found.');
    });
    (0, vitest_1.test)('recognizes long real world example', function () {
        const tokens = 'Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the'.split(' ');
        const repetitive = (0, anomalyDetection_1.isRepetitive)(tokens);
        assert_1.default.strictEqual(repetitive, true, 'Repetition should be found.');
    });
    (0, vitest_1.test)('recognizes repetitions with some prefix', function () {
        const tokens = ['prefix', 'foo', 'foo', 'foo', 'foo', 'foo', 'foo', 'foo', 'foo', 'foo', 'foo'];
        const repetitive = (0, anomalyDetection_1.isRepetitive)(tokens);
        assert_1.default.strictEqual(repetitive, true, 'Repetition should be found.');
    });
    (0, vitest_1.test)('recognizes repetitions that differ only in whitespace tokens, with some prefix', function () {
        const tokens = ['prefix', 'foo', 'foo', 'foo', 'foo', 'foo', 'foo', 'foo', 'foo', 'foo', '   ', 'foo'];
        const repetitive = (0, anomalyDetection_1.isRepetitive)(tokens);
        assert_1.default.strictEqual(repetitive, true, 'Repetition should be found.');
    });
    (0, vitest_1.test)('vscode-copilot-release #1662', function () {
        /**
         * This is a tokenized repetition of the following sequence:
            "browser.safebrowsing.provider.google.reportURL": "",
            "browser.safebrowsing.provider.google.reportPhishMistakeURL": "",
            "browser.safebrowsing.provider.google.reportMalwareMistakeURL": "",
        */
        const tokens = [
            "\"",
            "browser",
            ".s",
            "af",
            "eb",
            "rows",
            "ing",
            ".provider",
            ".google",
            ".report",
            "URL",
            "\":",
            " \"\",",
            "\"",
            "browser",
            ".s",
            "af",
            "eb",
            "rows",
            "ing",
            ".provider",
            ".google",
            ".report",
            "Ph",
            "ish",
            "Mist",
            "ake",
            "URL",
            "\":",
            " \"\",",
            "\"",
            "browser",
            ".s",
            "af",
            "eb",
            "rows",
            "ing",
            ".provider",
            ".google",
            ".report",
            "Mal",
            "ware",
            "Mist",
            "ake",
            "URL",
            "\":",
            " \"\",",
            "\"",
            "browser",
            ".s",
            "af",
            "eb",
            "rows",
            "ing",
            ".provider",
            ".google",
            ".report",
            "URL",
            "\":",
            " \"\",",
            "\"",
            "browser",
            ".s",
            "af",
            "eb",
            "rows",
            "ing",
            ".provider",
            ".google",
            ".report",
            "Ph",
            "ish",
            "Mist",
            "ake",
            "URL",
            "\":",
            " \"\",",
            "\"",
            "browser",
            ".s",
            "af",
            "eb",
            "rows",
            "ing",
            ".provider",
            ".google",
            ".report",
            "Mal",
            "ware",
            "Mist",
            "ake",
            "URL",
            "\":",
            " \"\",",
            "\"",
            "browser",
            ".s",
            "af",
            "eb",
            "rows",
            "ing",
            ".provider",
            ".google",
            ".report",
            "URL",
            "\":",
            " \"\",",
            "\"",
            "browser",
            ".s",
            "af",
            "eb",
            "rows",
            "ing",
            ".provider",
            ".google",
            ".report",
            "Ph",
            "ish",
            "Mist",
            "ake",
            "URL",
            "\":",
            " \"\",",
            "\"",
            "browser",
            ".s",
            "af",
            "eb",
            "rows",
            "ing",
            ".provider",
            ".google",
            ".report",
            "Mal",
            "ware",
            "Mist",
            "ake",
            "URL",
            "\":",
            " \"\",",
            "\"",
            "browser",
            ".s",
            "af",
            "eb",
            "rows",
            "ing",
            ".provider",
            ".google",
            ".report",
            "URL",
            "\":",
            " \"\",",
            "\"",
            "browser",
            ".s",
            "af",
            "eb",
            "rows",
            "ing",
            ".provider",
            ".google",
            ".report",
            "Ph",
            "ish",
            "Mist",
            "ake",
            "URL",
            "\":",
            " \"\",",
            "\"",
            "browser",
            ".s",
            "af",
            "eb",
            "rows",
            "ing",
            ".provider",
            ".google",
            ".report",
            "Mal",
            "ware",
            "Mist",
            "ake",
            "URL",
            "\":",
            " \"\","
        ];
        const repetitive = (0, anomalyDetection_1.isRepetitive)(tokens);
        assert_1.default.strictEqual(repetitive, true, 'Repetition should be found.');
    });
});
//# sourceMappingURL=anomalyDetection.spec.js.map