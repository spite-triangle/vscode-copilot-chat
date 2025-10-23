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
const fs = __importStar(require("fs"));
const path_1 = require("path");
const vitest_1 = require("vitest");
const api_1 = require("../tokenization/api");
// Read the source files and normalize the line endings
const source = fs.readFileSync((0, path_1.resolve)(__dirname, 'testdata/example.py'), 'utf8').replace(/\r\n?/g, '\n');
(0, vitest_1.suite)('Tokenizers can be loaded', function () {
    for (const tokenizer of Object.values(api_1.TokenizerName)) {
        (0, vitest_1.test)(`Tokenizer ${tokenizer} can be loaded`, function () {
            (0, api_1.getTokenizer)(tokenizer);
        });
    }
});
// test suite for MockTokenizer
(0, vitest_1.suite)('MockTokenizer', function () {
    const tokenizer = (0, api_1.getTokenizer)(api_1.TokenizerName.mock);
    (0, vitest_1.test)('tokenize', function () {
        const tokens = tokenizer.tokenize('a b c');
        vitest_1.assert.strictEqual(tokens.length, 5);
        for (const token of tokens) {
            vitest_1.assert.strictEqual(typeof token, 'number');
        }
    });
    (0, vitest_1.test)('detokenize', function () {
        const tokens = tokenizer.tokenize('a b c');
        const text = tokenizer.detokenize(tokens);
        // unfortunately the mock tokenizer doesn't correctly round-trip the text
        // because the token representation is a number. If this matters then we'll
        // have to change the mock tokenizer to use a different representation.
        vitest_1.assert.strictEqual(text, '97 32 98 32 99');
    });
    (0, vitest_1.test)('tokenLength', function () {
        vitest_1.assert.strictEqual(tokenizer.tokenLength('a b c'), 5);
    });
    (0, vitest_1.test)('takeFirstTokens', function () {
        const tokens = tokenizer.takeFirstTokens('a b c', 3);
        vitest_1.assert.strictEqual(tokens.text, 'a b');
        vitest_1.assert.strictEqual(tokens.tokens.length, 3);
    });
    (0, vitest_1.test)('takeLastTokens', function () {
        const tokens = tokenizer.takeLastTokens('a b c', 3);
        vitest_1.assert.strictEqual(tokens.text, 'b c');
    });
    (0, vitest_1.test)('takeLastLinesTokens', function () {
        const tokens = tokenizer.takeLastLinesTokens('a b c', 3);
        vitest_1.assert.strictEqual(tokens, 'b c');
    });
});
(0, vitest_1.suite)('Tokenizer Test Suite - cl100k', function () {
    let tokenizer;
    (0, vitest_1.beforeAll)(async function () {
        await api_1.initializeTokenizers;
        tokenizer = (0, api_1.getTokenizer)(api_1.TokenizerName.cl100k);
    });
    (0, vitest_1.test)('empty string', function () {
        const str = '';
        vitest_1.assert.deepStrictEqual(tokenizer.tokenize(str), []);
        vitest_1.assert.strictEqual(tokenizer.detokenize(tokenizer.tokenize(str)), str);
    });
    (0, vitest_1.test)('space', function () {
        const str = ' ';
        vitest_1.assert.deepStrictEqual(tokenizer.tokenize(str), [220]);
        vitest_1.assert.strictEqual(tokenizer.detokenize(tokenizer.tokenize(str)), str);
    });
    (0, vitest_1.test)('tab', function () {
        const str = '\t';
        vitest_1.assert.deepStrictEqual(tokenizer.tokenize(str), [197]);
        vitest_1.assert.strictEqual(tokenizer.detokenize(tokenizer.tokenize(str)), str);
    });
    (0, vitest_1.test)('simple text', function () {
        const str = 'This is some text';
        vitest_1.assert.strictEqual(tokenizer.detokenize(tokenizer.tokenize(str)), str);
        vitest_1.assert.deepStrictEqual(tokenizer.tokenize(str), [2028, 374, 1063, 1495]);
    });
    (0, vitest_1.test)('multi-token word', function () {
        const str = 'indivisible';
        vitest_1.assert.deepStrictEqual(tokenizer.tokenize(str), [485, 344, 23936]);
        vitest_1.assert.strictEqual(tokenizer.detokenize(tokenizer.tokenize(str)), str);
    });
    (0, vitest_1.test)('emojis', function () {
        const str = 'hello 👋 world 🌍';
        vitest_1.assert.deepStrictEqual(tokenizer.tokenize(str), [15339, 62904, 233, 1917, 11410, 234, 235]);
        vitest_1.assert.strictEqual(tokenizer.detokenize(tokenizer.tokenize(str)), str);
    });
    (0, vitest_1.test)('contractions', function () {
        const str = "you'll";
        vitest_1.assert.deepStrictEqual(tokenizer.tokenize(str), [9514, 3358]);
        vitest_1.assert.strictEqual(tokenizer.detokenize(tokenizer.tokenize(str)), str);
    });
    (0, vitest_1.test)('assert that consecutive newline is never tokenized as multiple newlines', function () {
        // This is due to a regular expression change in the tokenizer.
        // See https://github.com/github/copilot-client/issues/4224#issuecomment-1761193165
        // Loop through all possible ascii numbers and letters
        for (let i = 0; i < 128; i++) {
            const char = String.fromCharCode(i);
            if (char !== '\n') {
                vitest_1.assert.deepStrictEqual(tokenizer.tokenLength(`\n\n${char}`), 2);
            }
        }
        // Test special characters
        vitest_1.assert.deepStrictEqual(tokenizer.tokenize('\n\n👋'), [271, 9468, 239, 233]);
        vitest_1.assert.deepStrictEqual(tokenizer.tokenize('\n\n '), [271, 220]);
        vitest_1.assert.deepStrictEqual(tokenizer.tokenize('\n\n 👋'), [271, 62904, 233]);
        vitest_1.assert.deepStrictEqual(tokenizer.tokenize('\n\n\t'), [271, 197]);
        vitest_1.assert.deepStrictEqual(tokenizer.tokenize('\n\n\r'), [271, 201]);
        // New lines are treated specially tho
        for (let i = 1; i < 10; i++) {
            vitest_1.assert.deepStrictEqual(tokenizer.tokenLength('\n'.repeat(i)), 1);
        }
    });
    (0, vitest_1.test)('tokenizeStrings', function () {
        const tokens_s = tokenizer.tokenizeStrings(source);
        vitest_1.assert.strictEqual(tokens_s.join(''), source, 'tokenizeStrings does not join to form the input string');
        const tokens = tokenizer.tokenize(source);
        vitest_1.assert.strictEqual(tokens_s.length, tokens.length, 'tokenizeStrings should have same length as tokenize');
        const half = Math.floor(tokens_s.length / 2);
        vitest_1.assert.strictEqual(tokens_s.slice(0, half).join(''), tokenizer.detokenize(tokens.slice(0, half)), 'tokenizeStrings slice should represent the corresponding slice with tokenize');
    });
    (0, vitest_1.test)('takeLastTokens invariant of starting position', function () {
        const suffix = tokenizer.takeLastTokens(source, 25);
        vitest_1.assert.strictEqual(suffix.text, `"To the import {imp.module} as {imp.as_name}, we add the following comment: {description}")\n        return description`);
        vitest_1.assert.strictEqual(suffix.tokens.length, 25);
        vitest_1.assert.strictEqual(suffix.text, tokenizer.takeLastTokens(source.substring(50), 25).text);
        vitest_1.assert.strictEqual(suffix.text, tokenizer.takeLastTokens(source.substring(100), 25).text);
        vitest_1.assert.strictEqual(suffix.text, tokenizer.takeLastTokens(source.substring(150), 25).text);
        vitest_1.assert.strictEqual(suffix.text, tokenizer.takeLastTokens(source.substring(200), 25).text);
    });
    (0, vitest_1.test)('takeLastTokens returns the desired number of tokens', function () {
        vitest_1.assert.strictEqual(tokenizer.takeLastTokens(source, 30).tokens.length, 30);
        vitest_1.assert.strictEqual(tokenizer.takeLastTokens(source, 29).tokens.length, 29);
        vitest_1.assert.strictEqual(tokenizer.takeLastTokens(source, 28).tokens.length, 28);
        vitest_1.assert.strictEqual(tokenizer.takeLastTokens(source, 5).tokens.length, 5);
        vitest_1.assert.strictEqual(tokenizer.takeLastTokens(source, 0).tokens.length, 0);
        vitest_1.assert.strictEqual(tokenizer.takeLastTokens(source, 1).tokens.length, 1);
        vitest_1.assert.strictEqual(tokenizer.takeLastTokens(source, 1000).tokens.length, 1000);
        vitest_1.assert.strictEqual(tokenizer.takeLastTokens(source, 100000).text, source);
        vitest_1.assert.strictEqual(tokenizer.takeLastTokens('\n\n\n', 1).tokens.length, 1);
    });
    (0, vitest_1.test)('takeLastTokens returns a suffix of the sought length', function () {
        function check(n) {
            const { text: suffix } = tokenizer.takeLastTokens(source, n);
            vitest_1.assert.strictEqual(tokenizer.tokenLength(suffix), n);
            vitest_1.assert.strictEqual(suffix, source.substring(source.length - suffix.length));
        }
        check(0);
        check(1);
        check(5);
        check(29);
        check(30);
        check(100);
        check(1000);
        vitest_1.assert.strictEqual(tokenizer.takeLastTokens(source, 100000).text, source);
    });
    (0, vitest_1.test)('test takeLastLinesTokens', function () {
        let example = 'a b c\nd e f\ng h i';
        vitest_1.assert.strictEqual(tokenizer.takeLastLinesTokens(example, 3), 'g h i');
        vitest_1.assert.strictEqual(tokenizer.takeLastLinesTokens(example, 4), 'g h i');
        vitest_1.assert.strictEqual(tokenizer.takeLastLinesTokens(example, 5), 'g h i');
        vitest_1.assert.strictEqual(tokenizer.takeLastLinesTokens(example, 6), 'g h i');
        vitest_1.assert.strictEqual(tokenizer.takeLastLinesTokens(example, 7), 'd e f\ng h i');
        vitest_1.assert.strictEqual(tokenizer.takeLastLinesTokens(example, 11), example);
        example = 'a b\n\n c d';
        vitest_1.assert.strictEqual(tokenizer.takeLastLinesTokens(example, 2), ' c d');
        vitest_1.assert.strictEqual(tokenizer.takeLastLinesTokens(example, 3), '\n c d');
        vitest_1.assert.strictEqual(tokenizer.takeLastLinesTokens(example, 4), '\n c d');
        vitest_1.assert.strictEqual(tokenizer.takeLastLinesTokens(example, 5), 'a b\n\n c d');
    });
    (0, vitest_1.test)('takeFirstTokens return corresponding text and tokens', function () {
        let prefix = tokenizer.takeFirstTokens(source, 30);
        vitest_1.assert.strictEqual(prefix.text, tokenizer.detokenize(prefix.tokens));
        prefix = tokenizer.takeFirstTokens(source, 0);
        vitest_1.assert.strictEqual(prefix.text, tokenizer.detokenize(prefix.tokens));
        prefix = tokenizer.takeFirstTokens('', 30);
        vitest_1.assert.strictEqual(prefix.text, tokenizer.detokenize(prefix.tokens));
        prefix = tokenizer.takeFirstTokens('', 0);
        vitest_1.assert.strictEqual(prefix.text, tokenizer.detokenize(prefix.tokens));
    });
    (0, vitest_1.test)('takeFirstTokens invariant of ending position', function () {
        const prefix = tokenizer.takeFirstTokens(source, 29).text;
        const expected = `"""
This is an example Python source file to use as test data.  It's pulled from the synth repo
with minor edits to make it`;
        vitest_1.assert.strictEqual(prefix, expected);
        vitest_1.assert.strictEqual(tokenizer.tokenLength(prefix), 29);
        vitest_1.assert.strictEqual(prefix, tokenizer.takeFirstTokens(source.substring(0, 150), 29).text);
        vitest_1.assert.strictEqual(prefix, tokenizer.takeFirstTokens(source.substring(0, 200), 29).text);
    });
    (0, vitest_1.test)('takeFirstTokens returns the desired number of tokens', function () {
        vitest_1.assert.strictEqual(tokenizer.tokenLength(tokenizer.takeFirstTokens(source, 30).text), 30);
        vitest_1.assert.strictEqual(tokenizer.tokenLength(tokenizer.takeFirstTokens(source, 29).text), 29);
        vitest_1.assert.strictEqual(tokenizer.tokenLength(tokenizer.takeFirstTokens(source, 28).text), 28);
        vitest_1.assert.strictEqual(tokenizer.tokenLength(tokenizer.takeFirstTokens(source, 5).text), 5);
        vitest_1.assert.strictEqual(tokenizer.tokenLength(tokenizer.takeFirstTokens(source, 0).text), 0);
        vitest_1.assert.strictEqual(tokenizer.tokenLength(tokenizer.takeFirstTokens(source, 1).text), 1);
        vitest_1.assert.strictEqual(tokenizer.tokenLength(tokenizer.takeFirstTokens(source, 1000).text), 1000);
        vitest_1.assert.strictEqual(tokenizer.takeFirstTokens(source, 100000).text, source);
        vitest_1.assert.strictEqual(tokenizer.tokenLength(tokenizer.takeFirstTokens('\n\n\n', 1).text), 1);
    });
    (0, vitest_1.test)('takeFirstTokens returns a prefix of the sought length', function () {
        function check(n) {
            const prefix = tokenizer.takeFirstTokens(source, n).text;
            vitest_1.assert.strictEqual(tokenizer.tokenLength(prefix), n);
            vitest_1.assert.strictEqual(prefix, source.substring(0, prefix.length));
        }
        check(0);
        check(1);
        check(5);
        check(29);
        check(30);
        check(100);
        check(1000);
        vitest_1.assert.strictEqual(tokenizer.takeFirstTokens(source, 100000).text, source);
    });
    /**
     * Long sequences of spaces are tokenized as a sequence of 16-space tokens.  This tests that
     * the logic in takeFirstTokens correctly handles very long tokens.
     */
    (0, vitest_1.test)('takeFirstTokens handles very long tokens', function () {
        const longestSpaceToken = ' '.repeat(4000);
        const tokens = tokenizer.takeFirstTokens(longestSpaceToken, 30);
        vitest_1.assert.strictEqual(tokenizer.tokenLength(tokens.text), 30);
    }, 15000);
});
(0, vitest_1.suite)('Tokenizer Test Suite - o200k', function () {
    let tokenizer;
    (0, vitest_1.beforeAll)(async function () {
        await api_1.initializeTokenizers;
        tokenizer = (0, api_1.getTokenizer)(api_1.TokenizerName.o200k);
    });
    (0, vitest_1.test)('empty string', function () {
        const str = '';
        vitest_1.assert.deepStrictEqual(tokenizer.tokenize(str), []);
        vitest_1.assert.strictEqual(tokenizer.detokenize(tokenizer.tokenize(str)), str);
    });
    (0, vitest_1.test)('space', function () {
        const str = ' ';
        vitest_1.assert.deepStrictEqual(tokenizer.tokenize(str), [220]);
        vitest_1.assert.strictEqual(tokenizer.detokenize(tokenizer.tokenize(str)), str);
    });
    (0, vitest_1.test)('tab', function () {
        const str = '\t';
        vitest_1.assert.deepStrictEqual(tokenizer.tokenize(str), [197]);
        vitest_1.assert.strictEqual(tokenizer.detokenize(tokenizer.tokenize(str)), str);
    });
    (0, vitest_1.test)('simple text', function () {
        const str = 'This is some text';
        vitest_1.assert.strictEqual(tokenizer.detokenize(tokenizer.tokenize(str)), str);
        vitest_1.assert.deepStrictEqual(tokenizer.tokenize(str), [2500, 382, 1236, 2201]);
    });
    (0, vitest_1.test)('multi-token word', function () {
        const str = 'indivisible';
        vitest_1.assert.deepStrictEqual(tokenizer.tokenize(str), [521, 349, 181386]);
        vitest_1.assert.strictEqual(tokenizer.detokenize(tokenizer.tokenize(str)), str);
    });
    (0, vitest_1.test)('emojis', function () {
        const str = 'hello 👋 world 🌍';
        vitest_1.assert.deepStrictEqual(tokenizer.tokenize(str), [24912, 61138, 233, 2375, 130321, 235]);
        vitest_1.assert.strictEqual(tokenizer.detokenize(tokenizer.tokenize(str)), str);
    });
    (0, vitest_1.test)('contractions', function () {
        const str = "you'll";
        vitest_1.assert.deepStrictEqual(tokenizer.tokenize(str), [13320, 6090]);
        vitest_1.assert.strictEqual(tokenizer.detokenize(tokenizer.tokenize(str)), str);
    });
    (0, vitest_1.test)('assert that consecutive newline is never tokenized as multiple newlines', function () {
        // This is due to a regular expression change in the tokenizer.
        // See https://github.com/github/copilot-client/issues/4224#issuecomment-1761193165
        // Loop through all possible ascii numbers and letters
        for (let i = 0; i < 128; i++) {
            const char = String.fromCharCode(i);
            if (char !== '\n') {
                vitest_1.assert.deepStrictEqual(tokenizer.tokenLength(`\n\n${char}`), 2);
            }
        }
        // Test special characters
        vitest_1.assert.deepStrictEqual(tokenizer.tokenize('\n\n👋'), [279, 28823, 233]);
        vitest_1.assert.deepStrictEqual(tokenizer.tokenize('\n\n '), [279, 220]);
        vitest_1.assert.deepStrictEqual(tokenizer.tokenize('\n\n 👋'), [279, 61138, 233]);
        vitest_1.assert.deepStrictEqual(tokenizer.tokenize('\n\n\t'), [279, 197]);
        vitest_1.assert.deepStrictEqual(tokenizer.tokenize('\n\n\r'), [279, 201]);
        // New lines are treated specially tho
        for (let i = 1; i < 10; i++) {
            vitest_1.assert.deepStrictEqual(tokenizer.tokenLength('\n'.repeat(i)), 1);
        }
    });
    (0, vitest_1.test)('tokenizeStrings', function () {
        const tokens_s = tokenizer.tokenizeStrings(source);
        vitest_1.assert.strictEqual(tokens_s.join(''), source, 'tokenizeStrings does not join to form the input string');
        const tokens = tokenizer.tokenize(source);
        vitest_1.assert.strictEqual(tokens_s.length, tokens.length, 'tokenizeStrings should have same length as tokenize');
        const half = Math.floor(tokens_s.length / 2);
        vitest_1.assert.strictEqual(tokens_s.slice(0, half).join(''), tokenizer.detokenize(tokens.slice(0, half)), 'tokenizeStrings slice should represent the corresponding slice with tokenize');
    });
    (0, vitest_1.test)('takeLastTokens invariant of starting position', function () {
        const suffix = tokenizer.takeLastTokens(source, 25);
        vitest_1.assert.strictEqual(suffix.text, `To the import {imp.module} as {imp.as_name}, we add the following comment: {description}")\n        return description`);
        vitest_1.assert.strictEqual(suffix.tokens.length, 25);
        vitest_1.assert.strictEqual(suffix.text, tokenizer.takeLastTokens(source.substring(50), 25).text);
        vitest_1.assert.strictEqual(suffix.text, tokenizer.takeLastTokens(source.substring(100), 25).text);
        vitest_1.assert.strictEqual(suffix.text, tokenizer.takeLastTokens(source.substring(150), 25).text);
        vitest_1.assert.strictEqual(suffix.text, tokenizer.takeLastTokens(source.substring(200), 25).text);
    });
    (0, vitest_1.test)('takeLastTokens returns the desired number of tokens', function () {
        vitest_1.assert.strictEqual(tokenizer.takeLastTokens(source, 30).tokens.length, 30);
        vitest_1.assert.strictEqual(tokenizer.takeLastTokens(source, 29).tokens.length, 29);
        vitest_1.assert.strictEqual(tokenizer.takeLastTokens(source, 28).tokens.length, 28);
        vitest_1.assert.strictEqual(tokenizer.takeLastTokens(source, 5).tokens.length, 5);
        vitest_1.assert.strictEqual(tokenizer.takeLastTokens(source, 0).tokens.length, 0);
        vitest_1.assert.strictEqual(tokenizer.takeLastTokens(source, 1).tokens.length, 1);
        vitest_1.assert.strictEqual(tokenizer.takeLastTokens(source, 1000).tokens.length, 1000);
        vitest_1.assert.strictEqual(tokenizer.takeLastTokens(source, 100000).text, source);
        vitest_1.assert.strictEqual(tokenizer.takeLastTokens('\n\n\n', 1).tokens.length, 1);
    });
    (0, vitest_1.test)('takeLastTokens returns a suffix of the sought length', function () {
        function check(n) {
            const { text: suffix } = tokenizer.takeLastTokens(source, n);
            vitest_1.assert.strictEqual(tokenizer.tokenLength(suffix), n);
            vitest_1.assert.strictEqual(suffix, source.substring(source.length - suffix.length));
        }
        check(0);
        check(1);
        check(5);
        check(29);
        check(30);
        check(100);
        check(1000);
        vitest_1.assert.strictEqual(tokenizer.takeLastTokens(source, 100000).text, source);
    });
    (0, vitest_1.test)('test takeLastLinesTokens', function () {
        let example = 'a b c\nd e f\ng h i';
        vitest_1.assert.strictEqual(tokenizer.takeLastLinesTokens(example, 3), 'g h i');
        vitest_1.assert.strictEqual(tokenizer.takeLastLinesTokens(example, 4), 'g h i');
        vitest_1.assert.strictEqual(tokenizer.takeLastLinesTokens(example, 5), 'g h i');
        vitest_1.assert.strictEqual(tokenizer.takeLastLinesTokens(example, 6), 'g h i');
        vitest_1.assert.strictEqual(tokenizer.takeLastLinesTokens(example, 7), 'd e f\ng h i');
        vitest_1.assert.strictEqual(tokenizer.takeLastLinesTokens(example, 11), example);
        example = 'a b\n\n c d';
        vitest_1.assert.strictEqual(tokenizer.takeLastLinesTokens(example, 2), ' c d');
        vitest_1.assert.strictEqual(tokenizer.takeLastLinesTokens(example, 3), '\n c d');
        vitest_1.assert.strictEqual(tokenizer.takeLastLinesTokens(example, 4), '\n c d');
        vitest_1.assert.strictEqual(tokenizer.takeLastLinesTokens(example, 5), 'a b\n\n c d');
    });
    (0, vitest_1.test)('takeFirstTokens return corresponding text and tokens', function () {
        let prefix = tokenizer.takeFirstTokens(source, 30);
        vitest_1.assert.strictEqual(prefix.text, tokenizer.detokenize(prefix.tokens));
        prefix = tokenizer.takeFirstTokens(source, 0);
        vitest_1.assert.strictEqual(prefix.text, tokenizer.detokenize(prefix.tokens));
        prefix = tokenizer.takeFirstTokens('', 30);
        vitest_1.assert.strictEqual(prefix.text, tokenizer.detokenize(prefix.tokens));
        prefix = tokenizer.takeFirstTokens('', 0);
        vitest_1.assert.strictEqual(prefix.text, tokenizer.detokenize(prefix.tokens));
    });
    (0, vitest_1.test)('takeFirstTokens invariant of ending position', function () {
        const prefix = tokenizer.takeFirstTokens(source, 29).text;
        const expected = `"""
This is an example Python source file to use as test data.  It's pulled from the synth repo
with minor edits to make it a`;
        vitest_1.assert.strictEqual(prefix, expected);
        vitest_1.assert.strictEqual(tokenizer.tokenLength(prefix), 29);
        vitest_1.assert.strictEqual(prefix, tokenizer.takeFirstTokens(source.substring(0, 150), 29).text);
        vitest_1.assert.strictEqual(prefix, tokenizer.takeFirstTokens(source.substring(0, 200), 29).text);
    });
    (0, vitest_1.test)('takeFirstTokens returns the desired number of tokens', function () {
        vitest_1.assert.strictEqual(tokenizer.tokenLength(tokenizer.takeFirstTokens(source, 30).text), 30);
        vitest_1.assert.strictEqual(tokenizer.tokenLength(tokenizer.takeFirstTokens(source, 29).text), 29);
        vitest_1.assert.strictEqual(tokenizer.tokenLength(tokenizer.takeFirstTokens(source, 28).text), 28);
        vitest_1.assert.strictEqual(tokenizer.tokenLength(tokenizer.takeFirstTokens(source, 5).text), 5);
        vitest_1.assert.strictEqual(tokenizer.tokenLength(tokenizer.takeFirstTokens(source, 0).text), 0);
        vitest_1.assert.strictEqual(tokenizer.tokenLength(tokenizer.takeFirstTokens(source, 1).text), 1);
        vitest_1.assert.strictEqual(tokenizer.tokenLength(tokenizer.takeFirstTokens(source, 1000).text), 1000);
        vitest_1.assert.strictEqual(tokenizer.takeFirstTokens(source, 100000).text, source);
        vitest_1.assert.strictEqual(tokenizer.tokenLength(tokenizer.takeFirstTokens('\n\n\n', 1).text), 1);
    });
    (0, vitest_1.test)('takeFirstTokens returns a prefix of the sought length', function () {
        function check(n) {
            const prefix = tokenizer.takeFirstTokens(source, n).text;
            vitest_1.assert.strictEqual(tokenizer.tokenLength(prefix), n);
            vitest_1.assert.strictEqual(prefix, source.substring(0, prefix.length));
        }
        check(0);
        check(1);
        check(5);
        check(29);
        check(30);
        check(100);
        check(1000);
        vitest_1.assert.strictEqual(tokenizer.takeFirstTokens(source, 100000).text, source);
    });
    /**
     * Long sequences of spaces are tokenized as a sequence of 16-space tokens.  This tests that
     * the logic in takeFirstTokens correctly handles very long tokens.
     */
    (0, vitest_1.test)('takeFirstTokens handles very long tokens', function () {
        const longestSpaceToken = ' '.repeat(4000);
        const tokens = tokenizer.takeFirstTokens(longestSpaceToken, 30);
        vitest_1.assert.strictEqual(tokenizer.tokenLength(tokens.text), 30);
    }, 15000);
});
(0, vitest_1.suite)('ApproximateTokenizer', function () {
    const cl100kTokenizer = new api_1.ApproximateTokenizer(api_1.TokenizerName.cl100k, 'python');
    const o200kTokenizer = new api_1.ApproximateTokenizer(api_1.TokenizerName.o200k, 'python');
    const defaultTokenizer = new api_1.ApproximateTokenizer(); // o200k, no language;
    (0, vitest_1.suite)('tokenizeStrings', function () {
        (0, vitest_1.test)('should split text into chunks of 4 characters', function () {
            const result = defaultTokenizer.tokenizeStrings('abcdefgh');
            vitest_1.assert.deepStrictEqual(result, ['abcd', 'efgh']);
        });
        (0, vitest_1.test)('should handle text not divisible by 4', function () {
            const result = defaultTokenizer.tokenizeStrings('abcdefg');
            vitest_1.assert.deepStrictEqual(result, ['abcd', 'efg']);
        });
        (0, vitest_1.test)('should handle empty string', function () {
            const result = defaultTokenizer.tokenizeStrings('');
            vitest_1.assert.deepStrictEqual(result, []);
        });
        (0, vitest_1.test)('should handle single character', function () {
            const result = defaultTokenizer.tokenizeStrings('a');
            vitest_1.assert.deepStrictEqual(result, ['a']);
        });
    });
    (0, vitest_1.suite)('tokenize', function () {
        (0, vitest_1.test)('should convert string chunks to numeric tokens', function () {
            const result = defaultTokenizer.tokenize('ab');
            vitest_1.assert.ok(Array.isArray(result));
            vitest_1.assert.strictEqual(result.length, 1);
            vitest_1.assert.strictEqual(typeof result[0], 'number');
        });
        (0, vitest_1.test)('should produce consistent tokens for same input', function () {
            const result1 = defaultTokenizer.tokenize('test');
            const result2 = defaultTokenizer.tokenize('test');
            vitest_1.assert.deepStrictEqual(result1, result2);
        });
    });
    (0, vitest_1.suite)('detokenize', function () {
        (0, vitest_1.test)('should convert tokens back to string', function () {
            const original = 'test';
            const tokens = defaultTokenizer.tokenize(original);
            const result = defaultTokenizer.detokenize(tokens);
            vitest_1.assert.strictEqual(result, original);
        });
        (0, vitest_1.test)('should handle empty token array', function () {
            const result = defaultTokenizer.detokenize([]);
            vitest_1.assert.strictEqual(result, '');
        });
    });
    (0, vitest_1.test)('tokenLength', function () {
        vitest_1.assert.strictEqual(cl100kTokenizer.tokenLength('a b c'), 2);
    });
    (0, vitest_1.test)('tokenLength with language take approximated char chunks', function () {
        vitest_1.assert.strictEqual(cl100kTokenizer.tokenLength('abc def gh'), 3);
    });
    (0, vitest_1.test)('tokenLength with no language take 4 char chunks', function () {
        const str = 'w'.repeat(400);
        vitest_1.assert.strictEqual(cl100kTokenizer.tokenLength(str), 101);
        vitest_1.assert.strictEqual(defaultTokenizer.tokenLength(str), 100);
    });
    (0, vitest_1.test)('tokenLength approximated char chunks are correct for each approximated tokenizer', function () {
        const str = 'w'.repeat(400);
        vitest_1.assert.strictEqual(cl100kTokenizer.tokenLength(str), 101);
        vitest_1.assert.strictEqual(o200kTokenizer.tokenLength(str), 99);
    });
    (0, vitest_1.test)('takeFirstTokens', function () {
        const first2Tokens = cl100kTokenizer.takeFirstTokens('123 456 7890', 2);
        vitest_1.assert.deepStrictEqual(first2Tokens, {
            text: '123 456',
            tokens: [0, 1],
        });
        vitest_1.assert.deepStrictEqual(cl100kTokenizer.tokenLength(first2Tokens.text), 2);
    });
    (0, vitest_1.test)('takeFirstTokens returns the full string if shorter', function () {
        const first100Tokens = cl100kTokenizer.takeFirstTokens('123 456 7890', 100);
        vitest_1.assert.deepStrictEqual(first100Tokens, {
            text: '123 456 7890',
            tokens: [0, 1, 2, 3],
        });
        vitest_1.assert.deepStrictEqual(cl100kTokenizer.tokenLength(first100Tokens.text), 4);
    });
    (0, vitest_1.test)('takeLastTokens', function () {
        const last2Tokens = cl100kTokenizer.takeLastTokens('123 456 7890', 2);
        vitest_1.assert.deepStrictEqual(last2Tokens, {
            text: '56 7890',
            tokens: [0, 1],
        });
        vitest_1.assert.deepStrictEqual(cl100kTokenizer.tokenLength(last2Tokens.text), 2);
    });
    (0, vitest_1.test)('takeLastTokens returns the full string if shorter', function () {
        const last100Tokens = cl100kTokenizer.takeLastTokens('123 456 7890', 100);
        vitest_1.assert.deepStrictEqual(last100Tokens, {
            text: '123 456 7890',
            tokens: [0, 1, 2, 3],
        });
        vitest_1.assert.deepStrictEqual(cl100kTokenizer.tokenLength(last100Tokens.text), 4);
    });
    (0, vitest_1.suite)('takeLastLinesTokens', function () {
        (0, vitest_1.test)('should return complete lines from suffix', function () {
            const text = 'line1\nline2\nline3\nline4';
            const result = cl100kTokenizer.takeLastLinesTokens(text, 4);
            vitest_1.assert.strictEqual(result, 'line3\nline4');
        });
        (0, vitest_1.test)('should handle text already within token limit', function () {
            const text = 'short\ntext';
            const result = cl100kTokenizer.takeLastLinesTokens(text, 100);
            vitest_1.assert.strictEqual(result, text);
        });
        (0, vitest_1.test)('should handle text ending with newline', function () {
            const text = 'line1\nline2\n';
            const result = cl100kTokenizer.takeLastLinesTokens(text, 10);
            vitest_1.assert.strictEqual(typeof result, 'string');
        });
    });
});
//# sourceMappingURL=tokenizer.spec.js.map