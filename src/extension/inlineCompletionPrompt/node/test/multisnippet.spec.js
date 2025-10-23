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
const similarFiles_1 = require("../snippetInclusion/similarFiles");
(0, vitest_1.suite)('Test Multiple Snippet Selection', function () {
    const docSource = (0, ts_dedent_1.default) `
      A
          B
          C
      D|
          E
      F
      G`;
    const doc = {
        relativePath: 'source1',
        uri: 'source1',
        source: docSource,
        languageId: 'python',
        offset: docSource.indexOf('|'), // reference snippet will be A B C D
    };
    const similarFiles = [
        {
            relativePath: 'similarFile1',
            uri: 'similarFile1',
            source: (0, ts_dedent_1.default) `
          A
              B
              C
              H
          X
              Y
              Z
          `,
        },
        {
            relativePath: 'similarFile2',
            uri: 'similarFile2',
            source: (0, ts_dedent_1.default) `
          D
              H
          `,
        },
    ];
    const fixedWinDocSrc = 'abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz'
        .split('')
        .join('\n');
    const fixedWinDoc = {
        relativePath: 'source1',
        uri: 'source1',
        source: fixedWinDocSrc,
        languageId: 'python',
        offset: fixedWinDocSrc.length, // Reference doc qrstuvqxyz with conservative option (10 characters), stuv...abc...xyz with eager (60 characters)
    };
    const fixedWinSimilarFiles = [
        {
            relativePath: 'similarFile1',
            uri: 'similarFile1',
            source: 'abcdefghijklmno1234567890abcdefghijklmnopqrstuvwxyzabcdefghijklmno1234567890abcdefghijklmnopqrstuvwxyzabcdefghijklmno1234567890abcdefghijklmnopqrstuvwxyz'
                .split('')
                .join('\n'),
        },
    ];
    (0, vitest_1.test)('FixedWindow Matcher None', async function () {
        /** Test under FixedWindow matcher no match gets picked up */
        const options = similarFiles_1.nullSimilarFilesOptions;
        const snippets = await (0, similarFiles_1.getSimilarSnippets)(doc, similarFiles, options);
        vitest_1.assert.deepStrictEqual(snippets, []);
    });
    (0, vitest_1.test)('FixedWindow Matcher Eager No Selection Option', async function () {
        /** This is to test Multisnippet selection with FixedWindow Matcher and Eager Neibhbortab
         * option. windows size for Eager option is 60 and minimum score threshold for inclusion is 0.0.
         * We expect only 1 match from line 0 to 60. WIth no selection option, we expect the best match to be returned.
         */
        const options = similarFiles_1.defaultSimilarFilesOptions;
        const snippetLocationsTop1 = (await (0, similarFiles_1.getSimilarSnippets)(fixedWinDoc, fixedWinSimilarFiles, options)).map(snippet => [snippet.startLine, snippet.endLine]);
        const correctSnippetLocations = [[0, 60]];
        vitest_1.assert.deepStrictEqual(snippetLocationsTop1.sort(), correctSnippetLocations.sort());
    });
});
//# sourceMappingURL=multisnippet.spec.js.map