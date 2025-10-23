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
const snippets_1 = require("../snippetInclusion/snippets");
(0, vitest_1.suite)('Unit tests for snippet.ts', () => {
    const bogusSnippet = {
        relativePath: 'snippet1.ts',
        score: 1.0,
        startLine: 1,
        endLine: 3,
        provider: snippets_1.SnippetProviderType.Path,
        semantics: snippets_1.SnippetSemantics.Snippet,
        snippet: (0, ts_dedent_1.default) `
                A
                    B
                    C`,
    };
    (0, vitest_1.test)('announceSnippet', function () {
        vitest_1.assert.deepStrictEqual((0, snippets_1.announceSnippet)(bogusSnippet), {
            headline: 'Compare this snippet from snippet1.ts:',
            snippet: (0, ts_dedent_1.default) `
                A
                    B
                    C`,
        });
    });
});
//# sourceMappingURL=snippets.spec.js.map