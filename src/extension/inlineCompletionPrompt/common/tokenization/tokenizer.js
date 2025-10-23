"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApproximateTokenizer = exports.EFFECTIVE_TOKEN_LENGTH = exports.MockTokenizer = exports.TokenizerName = void 0;
var TokenizerName;
(function (TokenizerName) {
    TokenizerName["cl100k"] = "cl100k_base";
    TokenizerName["o200k"] = "o200k_base";
    TokenizerName["mock"] = "mock";
})(TokenizerName || (exports.TokenizerName = TokenizerName = {}));
class MockTokenizer {
    constructor() {
        this.hash = (str) => {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = (hash << 5) - hash + char;
                hash &= hash & 0xffff;
            }
            return hash;
        };
    }
    tokenize(text) {
        return this.tokenizeStrings(text).map(this.hash);
    }
    detokenize(tokens) {
        // Note because this is using hashing to mock tokenization, it is not
        // reversible, so detokenize will not return the original input.
        return tokens.map(token => token.toString()).join(' ');
    }
    tokenizeStrings(text) {
        return text.split(/\b/);
    }
    tokenLength(text) {
        return this.tokenizeStrings(text).length;
    }
    takeLastTokens(text, n) {
        const tokens = this.tokenizeStrings(text).slice(-n);
        return { text: tokens.join(''), tokens: tokens.map(this.hash) };
    }
    takeFirstTokens(text, n) {
        const tokens = this.tokenizeStrings(text).slice(0, n);
        return { text: tokens.join(''), tokens: tokens.map(this.hash) };
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
exports.MockTokenizer = MockTokenizer;
// These are the effective token lengths for each language. They are based on empirical data to balance the risk of accidental overflow and overeager elision.
// Note: These may need to be recalculated in the future if typical prompt lengths are significantly changed.
exports.EFFECTIVE_TOKEN_LENGTH = {
    [TokenizerName.cl100k]: {
        python: 3.99,
        typescript: 4.54,
        typescriptreact: 4.58,
        javascript: 4.76,
        csharp: 5.13,
        java: 4.86,
        cpp: 3.85,
        php: 4.1,
        html: 4.57,
        vue: 4.22,
        go: 3.93,
        dart: 5.66,
        javascriptreact: 4.81,
        css: 3.37,
    },
    [TokenizerName.o200k]: {
        python: 4.05,
        typescript: 4.12,
        typescriptreact: 5.01,
        javascript: 4.47,
        csharp: 5.47,
        java: 4.86,
        cpp: 3.8,
        php: 4.35,
        html: 4.86,
        vue: 4.3,
        go: 4.21,
        dart: 5.7,
        javascriptreact: 4.83,
        css: 3.33,
    },
};
/** Max decimals per code point for ApproximateTokenizer mock tokenization. */
const MAX_CODE_POINT_SIZE = 4;
/** A best effort tokenizer computing the length of the text by dividing the
 * number of characters by estimated constants near the number 4.
 * It is not a real tokenizer. */
class ApproximateTokenizer {
    constructor(tokenizerName = TokenizerName.o200k, languageId) {
        this.languageId = languageId;
        this.tokenizerName = tokenizerName;
    }
    tokenize(text) {
        return this.tokenizeStrings(text).map(substring => {
            let charCode = 0;
            for (let i = 0; i < substring.length; i++) {
                charCode = charCode * Math.pow(10, MAX_CODE_POINT_SIZE) + substring.charCodeAt(i);
            }
            return charCode;
        });
    }
    detokenize(tokens) {
        return tokens
            .map(token => {
            const chars = [];
            let charCodes = token.toString();
            while (charCodes.length > 0) {
                const charCode = charCodes.slice(-MAX_CODE_POINT_SIZE);
                const char = String.fromCharCode(parseInt(charCode));
                chars.unshift(char);
                charCodes = charCodes.slice(0, -MAX_CODE_POINT_SIZE);
            }
            return chars.join('');
        })
            .join('');
    }
    tokenizeStrings(text) {
        // Mock tokenize by defaultETL
        return text.match(/.{1,4}/g) ?? [];
    }
    getEffectiveTokenLength() {
        // Our default is 4, used for tail languages and error handling
        const defaultETL = 4;
        if (this.tokenizerName && this.languageId) {
            // Use our calculated effective token length for head languages
            return exports.EFFECTIVE_TOKEN_LENGTH[this.tokenizerName]?.[this.languageId] ?? defaultETL;
        }
        return defaultETL;
    }
    tokenLength(text) {
        return Math.ceil(text.length / this.getEffectiveTokenLength());
    }
    takeLastTokens(text, n) {
        if (n <= 0) {
            return { text: '', tokens: [] };
        }
        // Return the last characters approximately. It doesn't matter what we return as token, just that it has the correct length.
        const suffix = text.slice(-Math.floor(n * this.getEffectiveTokenLength()));
        return { text: suffix, tokens: Array.from({ length: this.tokenLength(suffix) }, (_, i) => i) };
    }
    takeFirstTokens(text, n) {
        if (n <= 0) {
            return { text: '', tokens: [] };
        }
        // Return the first characters approximately.
        const prefix = text.slice(0, Math.floor(n * this.getEffectiveTokenLength()));
        return { text: prefix, tokens: Array.from({ length: this.tokenLength(prefix) }, (_, i) => i) };
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
exports.ApproximateTokenizer = ApproximateTokenizer;
//# sourceMappingURL=tokenizer.js.map