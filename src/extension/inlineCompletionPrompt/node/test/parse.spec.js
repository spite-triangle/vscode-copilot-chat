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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const web_tree_sitter_1 = __importDefault(require("web-tree-sitter"));
const parse = __importStar(require("../parse"));
(0, vitest_1.suite)('Tree-sitter Parsing Tests', function () {
    (0, vitest_1.test)('language wasm loading', async function () {
        await web_tree_sitter_1.default.init();
        await parse.getLanguage('python');
        await parse.getLanguage('javascript');
        await parse.getLanguage('go');
        // todo@dbaeumer
        // await parse.getLanguage('php');
        await parse.getLanguage('c');
        await parse.getLanguage('cpp');
        try {
            await parse.getLanguage('xxx');
            vitest_1.assert.fail('Expected an error for unsupported language');
        }
        catch (e) {
        }
    });
    (0, vitest_1.suite)('getBlockCloseToken', function () {
        (0, vitest_1.test)('all', function () {
            vitest_1.assert.strictEqual(parse.getBlockCloseToken('javascript'), '}');
            vitest_1.assert.strictEqual(parse.getBlockCloseToken('typescript'), '}');
            vitest_1.assert.strictEqual(parse.getBlockCloseToken('python'), null);
            vitest_1.assert.strictEqual(parse.getBlockCloseToken('ruby'), 'end');
            vitest_1.assert.strictEqual(parse.getBlockCloseToken('go'), '}');
        });
    });
});
//# sourceMappingURL=parse.spec.js.map