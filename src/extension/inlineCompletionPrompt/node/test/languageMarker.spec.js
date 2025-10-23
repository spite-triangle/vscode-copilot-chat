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
// we need useless escapes before `!` or some tooling breaks; contact @johanrosenkilde for details
const fs = __importStar(require("fs"));
const path_1 = require("path");
const vitest_1 = require("vitest");
const languageMarker_1 = require("../../common/languageMarker");
(0, vitest_1.suite)('LanguageMarker Test Suite', function () {
    let doc;
    (0, vitest_1.beforeAll)(function () {
        const source = fs.readFileSync((0, path_1.resolve)(__dirname, 'testdata/example.py'), 'utf8');
        const languageId = 'python';
        doc = {
            uri: 'file:///home/user/test.py',
            source,
            languageId,
            offset: 0,
        };
    });
    (0, vitest_1.test)('getLanguageMarker', function () {
        doc.languageId = 'python';
        vitest_1.assert.strictEqual((0, languageMarker_1.getLanguageMarker)(doc), '#!/usr/bin/env python3');
        doc.languageId = 'cpp';
        vitest_1.assert.strictEqual((0, languageMarker_1.getLanguageMarker)(doc), 'Language: cpp');
        doc.languageId = 'css';
        vitest_1.assert.strictEqual((0, languageMarker_1.getLanguageMarker)(doc), 'Language: css');
        doc.languageId = 'html';
        vitest_1.assert.strictEqual((0, languageMarker_1.getLanguageMarker)(doc), '<!DOCTYPE html>');
        doc.languageId = 'php';
        vitest_1.assert.strictEqual((0, languageMarker_1.getLanguageMarker)(doc), '');
        doc.languageId = 'yaml';
        vitest_1.assert.strictEqual((0, languageMarker_1.getLanguageMarker)(doc), '# YAML data');
        doc.languageId = 'unknown';
        vitest_1.assert.strictEqual((0, languageMarker_1.getLanguageMarker)(doc), 'Language: unknown');
    });
    (0, vitest_1.test)('hasLanguageMarker', function () {
        doc.languageId = 'python';
        doc.source = 'import mypants\ndef my_socks():\n  pass';
        vitest_1.assert.ok(!(0, languageMarker_1.hasLanguageMarker)(doc));
        doc.source = '#!/bin/python\n' + doc.source; //Note: not the shebang we add ourselves
        vitest_1.assert.ok((0, languageMarker_1.hasLanguageMarker)(doc));
        doc.languageId = 'html';
        doc.source = '<html><body><p>My favourite web page</p></body></html>';
        vitest_1.assert.ok(!(0, languageMarker_1.hasLanguageMarker)(doc));
        doc.source = '<!DOCTYPE html>' + doc.source;
        vitest_1.assert.ok((0, languageMarker_1.hasLanguageMarker)(doc));
        doc.languageId = 'shellscript';
        doc.source = 'echo Wonderful script';
        vitest_1.assert.ok(!(0, languageMarker_1.hasLanguageMarker)(doc));
        doc.source = '#!/bin/bash\n' + doc.source;
        vitest_1.assert.ok((0, languageMarker_1.hasLanguageMarker)(doc));
    });
    (0, vitest_1.test)('comment normal', function () {
        vitest_1.assert.strictEqual((0, languageMarker_1.comment)('', 'python'), '# ');
        vitest_1.assert.strictEqual((0, languageMarker_1.comment)('hello', 'python'), '# hello');
        vitest_1.assert.strictEqual((0, languageMarker_1.comment)('hello', 'typescript'), '// hello');
    });
    (0, vitest_1.test)('comment demonstrate multiple lines gives unintuitive result', function () {
        vitest_1.assert.strictEqual((0, languageMarker_1.comment)('hello\nworld', 'typescript'), '// hello\nworld');
    });
    (0, vitest_1.test)('comment non-existing language', function () {
        vitest_1.assert.strictEqual((0, languageMarker_1.comment)('hello', 'nonexistent'), '// hello');
    });
    (0, vitest_1.test)('comment normal with default', function () {
        vitest_1.assert.strictEqual((0, languageMarker_1.comment)('', 'python'), '# ');
        vitest_1.assert.strictEqual((0, languageMarker_1.comment)('', 'nonexistent'), '// ');
        vitest_1.assert.strictEqual((0, languageMarker_1.comment)('hello', 'nonexistent'), '// hello');
    });
    (0, vitest_1.test)('commentBlockAsSingles normal', function () {
        vitest_1.assert.strictEqual((0, languageMarker_1.commentBlockAsSingles)('', 'python'), '');
        vitest_1.assert.strictEqual((0, languageMarker_1.commentBlockAsSingles)('hello', 'python'), '# hello');
        vitest_1.assert.strictEqual((0, languageMarker_1.commentBlockAsSingles)('hello\nworld', 'python'), '# hello\n# world');
        vitest_1.assert.strictEqual((0, languageMarker_1.commentBlockAsSingles)('hello\nworld', 'typescript'), '// hello\n// world');
    });
    (0, vitest_1.test)('commentBlockAsSingles trailing newline', function () {
        vitest_1.assert.strictEqual((0, languageMarker_1.commentBlockAsSingles)('hello\nworld\n', 'python'), '# hello\n# world\n');
        vitest_1.assert.strictEqual((0, languageMarker_1.commentBlockAsSingles)('\n', 'python'), '# \n');
    });
    (0, vitest_1.test)('commentBlockAsSingles nonexistent language', function () {
        vitest_1.assert.strictEqual((0, languageMarker_1.commentBlockAsSingles)('hello\nworld', 'nonexistent'), '// hello\n// world');
    });
    (0, vitest_1.test)('commentBlockAsSingles with default', function () {
        vitest_1.assert.strictEqual((0, languageMarker_1.commentBlockAsSingles)('hello\nworld', 'python'), '# hello\n# world');
        vitest_1.assert.strictEqual((0, languageMarker_1.commentBlockAsSingles)('hello\nworld', 'nonexistent'), '// hello\n// world');
    });
    const markdownLanguageIdsTestCases = [
        { input: 'h', expected: 'c' },
        { input: 'py', expected: 'python' },
        { input: 'js', expected: 'javascript' },
        { input: 'ts', expected: 'typescript' },
        { input: 'cpp', expected: 'cpp' },
        { input: 'java', expected: 'java' },
        { input: 'cs', expected: 'csharp' },
        { input: 'rb', expected: 'ruby' },
        { input: 'php', expected: 'php' },
        { input: 'html', expected: 'html' },
        { input: 'css', expected: 'css' },
        { input: 'xml', expected: 'xml' },
        { input: 'sh', expected: 'shellscript' },
        { input: 'go', expected: 'go' },
        { input: 'rs', expected: 'rust' },
        { input: 'swift', expected: 'swift' },
        { input: 'kt', expected: 'kotlin' },
        { input: 'lua', expected: 'lua' },
        { input: 'sql', expected: 'sql' },
        { input: 'yaml', expected: 'yaml' },
        { input: 'md', expected: 'markdown' },
        { input: 'plaintext', expected: undefined },
    ];
    markdownLanguageIdsTestCases.forEach(({ input, expected }) => {
        (0, vitest_1.test)(`test markdownLanguageId ${input} to language id ${expected}`, function () {
            const languageId = (0, languageMarker_1.mdCodeBlockLangToLanguageId)(input);
            vitest_1.assert.strictEqual(languageId, expected);
        });
    });
    const getLanguageTestCases = [
        { input: 'python', expected: 'python', expCommentStart: '#', expCommentEnd: '' },
        { input: 'javascript', expected: 'javascript', expCommentStart: '//', expCommentEnd: '' },
        { input: 'typescript', expected: 'typescript', expCommentStart: '//', expCommentEnd: '' },
        { input: 'cpp', expected: 'cpp', expCommentStart: '//', expCommentEnd: '' },
        { input: 'java', expected: 'java', expCommentStart: '//', expCommentEnd: '' },
        { input: 'csharp', expected: 'csharp', expCommentStart: '//', expCommentEnd: '' },
        { input: 'ruby', expected: 'ruby', expCommentStart: '#', expCommentEnd: '' },
        { input: 'php', expected: 'php', expCommentStart: '//', expCommentEnd: '' },
        { input: 'html', expected: 'html', expCommentStart: '<!--', expCommentEnd: '-->' },
        { input: 'css', expected: 'css', expCommentStart: '/*', expCommentEnd: '*/' },
        { input: 'xml', expected: 'xml', expCommentStart: '<!--', expCommentEnd: '-->' },
        { input: 'shellscript', expected: 'shellscript', expCommentStart: '#', expCommentEnd: '' },
        { input: 'go', expected: 'go', expCommentStart: '//', expCommentEnd: '' },
        { input: 'rust', expected: 'rust', expCommentStart: '//', expCommentEnd: '' },
        { input: 'swift', expected: 'swift', expCommentStart: '//', expCommentEnd: '' },
        { input: 'kotlin', expected: 'kotlin', expCommentStart: '//', expCommentEnd: '' },
        { input: 'lua', expected: 'lua', expCommentStart: '--', expCommentEnd: '' },
        { input: 'sql', expected: 'sql', expCommentStart: '--', expCommentEnd: '' },
        { input: 'yaml', expected: 'yaml', expCommentStart: '#', expCommentEnd: '' },
        { input: 'markdown', expected: 'markdown', expCommentStart: '[]: #', expCommentEnd: '' },
        { input: 'plaintext', expected: 'plaintext', expCommentStart: '//', expCommentEnd: '' },
        { input: 'not-existed', expected: 'not-existed', expCommentStart: '//', expCommentEnd: '' },
        { input: undefined, expected: 'plaintext', expCommentStart: '//', expCommentEnd: '' },
    ];
    getLanguageTestCases.forEach(({ input, expected, expCommentStart, expCommentEnd }) => {
        (0, vitest_1.test)(`test getLanguage for language id ${input} to language id ${expected}`, function () {
            const language = (0, languageMarker_1.getLanguage)(input);
            vitest_1.assert.strictEqual(language.languageId, expected);
            vitest_1.assert.strictEqual(language.lineComment.start, expCommentStart);
            vitest_1.assert.strictEqual(language.lineComment.end, expCommentEnd);
        });
    });
});
//# sourceMappingURL=languageMarker.spec.js.map