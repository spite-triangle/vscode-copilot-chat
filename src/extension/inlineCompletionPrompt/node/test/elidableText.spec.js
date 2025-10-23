"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const elidableText_1 = require("../elidableText/elidableText");
const api_1 = require("../tokenization/api");
(0, vitest_1.suite)('Test ElidableText', function () {
    (0, vitest_1.test)('Creating ElidableText from homogeneous structures', function () {
        // from strings
        for (const length of [0, 1, 5, 10, 100]) {
            const text = new elidableText_1.ElidableText(Array(length).fill('hello world'));
            vitest_1.assert.strictEqual(text.lines.length, length);
        }
        // from string / number pairs
        for (const length of [0, 1, 5, 10, 100]) {
            const text = new elidableText_1.ElidableText(Array(length).fill(['hello world', 1]));
            vitest_1.assert.strictEqual(text.lines.length, length);
        }
        // from ElidableTexts
        for (const length of [0, 1, 5, 10, 100]) {
            const text = new elidableText_1.ElidableText(Array(length).fill(new elidableText_1.ElidableText(['hello world'])));
            vitest_1.assert.strictEqual(text.lines.length, length);
        }
        // from ElidableText / number pairs
        for (const length of [0, 1, 5, 10, 100]) {
            const text = new elidableText_1.ElidableText(Array(length).fill([new elidableText_1.ElidableText(['hello world']), 1]));
            vitest_1.assert.strictEqual(text.lines.length, length);
        }
    });
    (0, vitest_1.test)('Creating ElidableText from heterogeneous structures', function () {
        // from a mixture of strings and ElidableTexts
        for (const length of [0, 1, 5, 10, 100]) {
            const lines = Array(length);
            for (let i = 0; i < length; i++) {
                // alternate between the four modes
                if (i % 4 === 0) {
                    lines[i] = 'hello world';
                }
                else if (i % 4 === 1) {
                    lines[i] = new elidableText_1.ElidableText(['hello world']);
                }
                else if (i % 4 === 2) {
                    lines[i] = ['hello world', 1];
                }
                else {
                    lines[i] = [new elidableText_1.ElidableText(['hello world']), 1];
                }
            }
            const text = new elidableText_1.ElidableText(lines);
            vitest_1.assert.strictEqual(text.lines.length, length);
        }
    });
    (0, vitest_1.test)('Elidable texts from multiline blocks', function () {
        const text = new elidableText_1.ElidableText([
            'hello world\nhow are you',
            'hello world\nhow are you\ngoodbye',
            'hello world\nhow are you\ngoodbye\nfarewell',
            'hello world\nhow are you\ngoodbye\nfarewell\nbye',
            'hello world\nhow are you\ngoodbye\nfarewell\nbye\nsee you',
        ]);
        vitest_1.assert.strictEqual(text.lines.length, 20);
    });
    (0, vitest_1.test)('Elidable texts make prompts within their budget, converging to the original text', function () {
        const originalText = `
      foo bar baz
      foo bar baz
      They just kept talking and talking the whole line long. It was so long
      hi
      hello world
      how are you
      goodbye
      farewell
      bye
      see you
    `;
        const text = new elidableText_1.ElidableText([originalText]);
        for (const budget of [1, 5, 10, 100, 1000]) {
            try {
                const prompt = text.elide(budget).getText();
                vitest_1.assert.ok((0, api_1.getTokenizer)().tokenLength(prompt) <= budget);
                if (budget > (0, api_1.getTokenizer)().tokenLength(originalText)) {
                    vitest_1.assert.strictEqual(prompt, originalText);
                }
            }
            catch (e) {
                const castError = e;
                // it's ok if the error has a message field, that is "maxTokens must be larger than the ellipsis length" and the budget is indeed smaller than the ellipsis length
                //expect(castError.message).toBe("maxTokens must be larger than the ellipsis length");
                vitest_1.assert.strictEqual(castError.message, 'maxTokens must be larger than the ellipsis length');
                vitest_1.assert.ok((0, api_1.getTokenizer)().tokenLength('[...]' + '\n') > budget);
            }
        }
    });
    (0, vitest_1.test)('Lower worth lines are removed first', function () {
        const text = new elidableText_1.ElidableText([
            ['hello world 5', 0.5],
            ['hello world 3', 0.3],
            ['hello world 0', 0.0],
            ['hello world 2', 0.2],
            ['hello world 1', 0.1],
            ['hello world 4', 0.4],
            ['hello world 6', 0.6],
        ]);
        for (const multiple of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
            const prompt = text.elide(6 * multiple);
            // for each number in there, expect the higher ones to be in there as well
            for (let i = 0; i < 6; i++) {
                if (prompt.getText().includes(`hello world ${i}`)) {
                    vitest_1.assert.ok(prompt.getText().includes(`hello world ${i + 1}`));
                }
            }
        }
    });
    (0, vitest_1.test)('Carries metadata', function () {
        const metadata = new Map();
        metadata.set('key', 'value');
        const text = new elidableText_1.ElidableText([
            ['hello world 5', 0.5],
            ['hello world 3', 0.3],
            ['hello world 0', 0.0],
            ['hello world 2', 0.2],
            ['hello world 1', 0.1],
            ['hello world 4', 0.4],
            ['hello world 6', 0.6],
        ], metadata, (0, api_1.getTokenizer)());
        const lines = text.elide(100).getLines();
        for (const line of lines) {
            vitest_1.assert.strictEqual(line.metadata?.get('key'), 'value');
        }
    });
    (0, vitest_1.test)('Return ellipses if text cannot fit into the budget', function () {
        const tokenizer = (0, api_1.getTokenizer)();
        const text = 'A very long line that exceeds the budget';
        const textTokenLength = tokenizer.tokenLength(text);
        const elidableText = new elidableText_1.ElidableText([text]);
        const elidedText = elidableText.elide(textTokenLength);
        vitest_1.assert.deepStrictEqual(elidedText.getText(), '[...]');
    });
});
//# sourceMappingURL=elidableText.spec.js.map