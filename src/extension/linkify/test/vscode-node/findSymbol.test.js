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
const assert_1 = __importDefault(require("assert"));
const vscode = __importStar(require("vscode"));
const findSymbol_1 = require("../../vscode-node/findSymbol");
suite('Find symbol', () => {
    function docSymbol(name, ...children) {
        return {
            name,
            children,
            detail: '',
            range: new vscode.Range(0, 0, 0, 0),
            selectionRange: new vscode.Range(0, 0, 0, 0),
            kind: vscode.SymbolKind.Variable,
        };
    }
    function symbolInfo(name) {
        return {
            name,
            containerName: '',
            kind: vscode.SymbolKind.Variable,
            location: {
                uri: vscode.Uri.file('fake'),
                range: new vscode.Range(0, 0, 0, 0),
            }
        };
    }
    test('Should find exact match', () => {
        assert_1.default.strictEqual((0, findSymbol_1.findBestSymbolByPath)([docSymbol('a')], 'a')?.name, 'a');
        assert_1.default.strictEqual((0, findSymbol_1.findBestSymbolByPath)([symbolInfo('a')], 'a')?.name, 'a');
    });
    test('Should find nested', () => {
        assert_1.default.strictEqual((0, findSymbol_1.findBestSymbolByPath)([docSymbol('x', docSymbol('a'))], 'a')?.name, 'a');
    });
    test('Should find child match', () => {
        assert_1.default.strictEqual((0, findSymbol_1.findBestSymbolByPath)([docSymbol('a', docSymbol('b'))], 'a.b')?.name, 'b');
    });
    test('Should find child match skipping level', () => {
        assert_1.default.strictEqual((0, findSymbol_1.findBestSymbolByPath)([docSymbol('a', docSymbol('x', docSymbol('b')))], 'a.b')?.name, 'b');
    });
    test(`Should find match even when children don't match`, () => {
        assert_1.default.strictEqual((0, findSymbol_1.findBestSymbolByPath)([docSymbol('a')], 'a.b')?.name, 'a');
    });
    test(`Should find longest match`, () => {
        assert_1.default.strictEqual((0, findSymbol_1.findBestSymbolByPath)([
            docSymbol('a', docSymbol('x')),
            docSymbol('x', docSymbol('a', docSymbol('b', docSymbol('z'))))
        ], 'a.b')?.name, 'b');
    });
    test('Should ignore function call notation', () => {
        assert_1.default.strictEqual((0, findSymbol_1.findBestSymbolByPath)([docSymbol('a')], 'a()')?.name, 'a');
        assert_1.default.strictEqual((0, findSymbol_1.findBestSymbolByPath)([docSymbol('a')], 'a(1, 2, 3)')?.name, 'a');
        assert_1.default.strictEqual((0, findSymbol_1.findBestSymbolByPath)([docSymbol('a')], 'a(b, c)')?.name, 'a');
        assert_1.default.strictEqual((0, findSymbol_1.findBestSymbolByPath)([docSymbol('a')], 'a(b: string)')?.name, 'a');
    });
    test('Should ignore generic notation', () => {
        assert_1.default.strictEqual((0, findSymbol_1.findBestSymbolByPath)([docSymbol('a')], 'a<T>')?.name, 'a');
        assert_1.default.strictEqual((0, findSymbol_1.findBestSymbolByPath)([docSymbol('a')], 'a<T>.b')?.name, 'a');
    });
    test('Should match on symbols with $', () => {
        assert_1.default.strictEqual((0, findSymbol_1.findBestSymbolByPath)([docSymbol('$a')], '$a')?.name, '$a');
    });
    test('Should match on symbols with _', () => {
        assert_1.default.strictEqual((0, findSymbol_1.findBestSymbolByPath)([docSymbol('_a_')], '_a_')?.name, '_a_');
    });
});
//# sourceMappingURL=findSymbol.test.js.map