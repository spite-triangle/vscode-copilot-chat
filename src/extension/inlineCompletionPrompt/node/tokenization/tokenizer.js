"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeTokenizers = exports.TTokenizer = void 0;
exports.getTokenizer = getTokenizer;
exports.getTokenizerAsync = getTokenizerAsync;
const tiktokenizer_1 = require("@microsoft/tiktokenizer");
const parseTikTokens_1 = require("../../../../platform/tokenizer/node/parseTikTokens");
const error_1 = require("../../common/error");
const tokenizer_1 = require("../../common/tokenization/tokenizer");
const fileLoader_1 = require("../fileLoader");
const tokenizers = new Map();
function getTokenizer(name = tokenizer_1.TokenizerName.o200k) {
    let tokenizer = tokenizers.get(name);
    if (tokenizer !== undefined) {
        return tokenizer;
    }
    // Fallback to o200k
    tokenizer = tokenizers.get(tokenizer_1.TokenizerName.o200k);
    if (tokenizer !== undefined) {
        return tokenizer;
    }
    // Fallback to approximate tokenizer
    return new tokenizer_1.ApproximateTokenizer();
}
async function getTokenizerAsync(name = tokenizer_1.TokenizerName.o200k) {
    await exports.initializeTokenizers;
    return getTokenizer(name);
}
class TTokenizer {
    constructor(_tokenizer) {
        this._tokenizer = _tokenizer;
    }
    static async create(encoder) {
        try {
            const tokenizer = (0, tiktokenizer_1.createTokenizer)((0, parseTikTokens_1.parseTikTokenBinary)((0, fileLoader_1.locateFile)(`${encoder}.tiktoken`)), (0, tiktokenizer_1.getSpecialTokensByEncoder)(encoder), (0, tiktokenizer_1.getRegexByEncoder)(encoder), 32768);
            return new TTokenizer(tokenizer);
        }
        catch (e) {
            if (e instanceof Error) {
                throw new error_1.CopilotPromptLoadFailure(`Could not load tokenizer`, e);
            }
            throw e;
        }
    }
    tokenize(text) {
        return this._tokenizer.encode(text);
    }
    detokenize(tokens) {
        return this._tokenizer.decode(tokens);
    }
    tokenLength(text) {
        return this.tokenize(text).length;
    }
    tokenizeStrings(text) {
        const tokens = this.tokenize(text);
        return tokens.map(token => this.detokenize([token]));
    }
    takeLastTokens(text, n) {
        if (n <= 0) {
            return { text: '', tokens: [] };
        }
        // Find long enough suffix of text that has >= n + 2 tokens
        // We add the 2 extra tokens to avoid the edge case where
        // we cut at exactly n tokens and may get an odd tokenization.
        const CHARS_PER_TOKENS_START = 4;
        const CHARS_PER_TOKENS_ADD = 1;
        let chars = Math.min(text.length, n * CHARS_PER_TOKENS_START); //First guess
        let suffix = text.slice(-chars);
        let suffixT = this.tokenize(suffix);
        while (suffixT.length < n + 2 && chars < text.length) {
            chars = Math.min(text.length, chars + n * CHARS_PER_TOKENS_ADD);
            suffix = text.slice(-chars);
            suffixT = this.tokenize(suffix);
        }
        if (suffixT.length < n) {
            // text must be <= n tokens long
            return { text, tokens: suffixT };
        }
        // Return last n tokens
        suffixT = suffixT.slice(-n);
        return { text: this.detokenize(suffixT), tokens: suffixT };
    }
    takeFirstTokens(text, n) {
        if (n <= 0) {
            return { text: '', tokens: [] };
        }
        // Find long enough suffix of text that has >= n + 2 tokens
        // We add the 2 extra tokens to avoid the edge case where
        // we cut at exactly n tokens and may get an odd tokenization.
        const CHARS_PER_TOKENS_START = 4;
        const CHARS_PER_TOKENS_ADD = 1;
        let chars = Math.min(text.length, n * CHARS_PER_TOKENS_START); //First guess
        let prefix = text.slice(0, chars);
        let prefix_t = this.tokenize(prefix);
        while (prefix_t.length < n + 2 && chars < text.length) {
            chars = Math.min(text.length, chars + n * CHARS_PER_TOKENS_ADD);
            prefix = text.slice(0, chars);
            prefix_t = this.tokenize(prefix);
        }
        if (prefix_t.length < n) {
            // text must be <= n tokens long
            return {
                text: text,
                tokens: prefix_t,
            };
        }
        // Return first n tokens
        // This implicit "truncate final tokens" text processing algorithm
        // could be extracted into a generic snippet text processing function managed by the SnippetTextProcessor class.
        prefix_t = prefix_t.slice(0, n);
        return {
            text: this.detokenize(prefix_t),
            tokens: prefix_t,
        };
    }
    takeLastLinesTokens(text, n) {
        const { text: suffix } = this.takeLastTokens(text, n);
        if (suffix.length === text.length || text[text.length - suffix.length - 1] === '\n') {
            // Edge case: We already took whole lines
            return suffix;
        }
        const newline = suffix.indexOf('\n');
        return suffix.substring(newline + 1);
    }
}
exports.TTokenizer = TTokenizer;
async function setTokenizer(name) {
    try {
        const tokenizer = await TTokenizer.create(name);
        tokenizers.set(name, tokenizer);
    }
    catch {
        // Ignore errors loading tokenizer
    }
}
/** Load tokenizers on start. Export promise for to be awaited by initialization. */
exports.initializeTokenizers = (async () => {
    tokenizers.set(tokenizer_1.TokenizerName.mock, new tokenizer_1.MockTokenizer());
    await Promise.all([setTokenizer(tokenizer_1.TokenizerName.cl100k), setTokenizer(tokenizer_1.TokenizerName.o200k)]);
})();
//# sourceMappingURL=tokenizer.js.map