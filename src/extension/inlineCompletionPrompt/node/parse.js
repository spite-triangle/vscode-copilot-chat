"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WASMLanguage = void 0;
exports.isSupportedLanguageId = isSupportedLanguageId;
exports.languageIdToWasmLanguage = languageIdToWasmLanguage;
exports.getLanguage = getLanguage;
exports.parseTreeSitter = parseTreeSitter;
exports.parseTreeSitterIncludingVersion = parseTreeSitterIncludingVersion;
exports.getBlockCloseToken = getBlockCloseToken;
exports.queryPythonIsDocstring = queryPythonIsDocstring;
const web_tree_sitter_1 = __importDefault(require("web-tree-sitter"));
const languageLoader_1 = require("../../../platform/parser/node/languageLoader");
const treeSitterLanguages_1 = require("../../../platform/parser/node/treeSitterLanguages");
const fileLoader_1 = require("./fileLoader");
var treeSitterLanguages_2 = require("../../../platform/parser/node/treeSitterLanguages");
Object.defineProperty(exports, "WASMLanguage", { enumerable: true, get: function () { return treeSitterLanguages_2.WASMLanguage; } });
const languageIdToWasmLanguageMapping = {
    python: treeSitterLanguages_1.WASMLanguage.Python,
    javascript: treeSitterLanguages_1.WASMLanguage.JavaScript,
    javascriptreact: treeSitterLanguages_1.WASMLanguage.JavaScript,
    jsx: treeSitterLanguages_1.WASMLanguage.JavaScript,
    typescript: treeSitterLanguages_1.WASMLanguage.TypeScript,
    typescriptreact: treeSitterLanguages_1.WASMLanguage.TypeScriptTsx,
    go: treeSitterLanguages_1.WASMLanguage.Go,
    ruby: treeSitterLanguages_1.WASMLanguage.Ruby,
    csharp: treeSitterLanguages_1.WASMLanguage.Csharp,
    java: treeSitterLanguages_1.WASMLanguage.Java,
    // todo@dbaeumer reenable PHP
    // php: WASMLanguage.Php,
    c: treeSitterLanguages_1.WASMLanguage.Cpp,
    cpp: treeSitterLanguages_1.WASMLanguage.Cpp,
};
function isSupportedLanguageId(languageId) {
    // Temporarily disable C# support until the tree-sitter parser for it is
    // fully spec-ed.
    return (languageId in languageIdToWasmLanguageMapping &&
        languageId !== 'csharp' &&
        languageId !== 'java' &&
        languageId !== 'php' &&
        languageId !== 'c' &&
        languageId !== 'cpp');
}
function languageIdToWasmLanguage(languageId) {
    if (!(languageId in languageIdToWasmLanguageMapping)) {
        throw new Error(`Unrecognized language: ${languageId}`);
    }
    return languageIdToWasmLanguageMapping[languageId];
}
const languageLoadPromises = new Map();
// async function loadWasmLanguage(language: WASMLanguage): Promise<Language> {
// 	// construct a path that works both for the TypeScript source, which lives under `/src`, and for
// 	// the transpiled JavaScript, which lives under `/dist`
// 	let wasmBytes;
// 	try {
// 		wasmBytes = await readFile(`tree-sitter-${language}.wasm`);
// 	} catch (e: unknown) {
// 		if (e instanceof Error && 'code' in e && typeof e.code === 'string' && e.name === 'Error') {
// 			throw new CopilotPromptLoadFailure(`Could not load tree-sitter-${language}.wasm`, e);
// 		}
// 		throw e;
// 	}
// 	return Parser.Language.load(wasmBytes);
// }
function getLanguage(language) {
    const wasmLanguage = languageIdToWasmLanguage(language);
    if (!languageLoadPromises.has(wasmLanguage)) {
        // IMPORTANT: This function does not have an async signature to prevent interleaved execution
        // that can cause duplicate loading of the same language during yields/awaits prior to them
        // being added to the cache.
        const loader = new languageLoader_1.LanguageLoader();
        // Use the chat tree sitter loader instead of the one from the Copilot client.
        const loadedLang = loader.loadLanguage(wasmLanguage);
        languageLoadPromises.set(wasmLanguage, loadedLang);
    }
    return languageLoadPromises.get(wasmLanguage);
}
class WrappedError extends Error {
    constructor(message, cause) {
        super(message, { cause });
    }
}
// This method returns a tree that the user needs to call `.delete()` before going out of scope.
async function parseTreeSitter(language, source) {
    return (await parseTreeSitterIncludingVersion(language, source))[0];
}
// This method returns a tree that the user needs to call `.delete()` before going out of scope.
async function parseTreeSitterIncludingVersion(language, source) {
    // `Parser.init` needs to be called before `new Parser()` below
    await web_tree_sitter_1.default.init({
        locateFile: (filename) => (0, fileLoader_1.locateFile)(filename),
    });
    let parser;
    try {
        parser = new web_tree_sitter_1.default();
    }
    catch (e) {
        if (e &&
            typeof e === 'object' &&
            'message' in e &&
            typeof e.message === 'string' &&
            e.message.includes('table index is out of bounds')) {
            throw new WrappedError(`Could not init Parse for language <${language}>`, e);
        }
        throw e;
    }
    const treeSitterLanguage = await getLanguage(language);
    parser.setLanguage(treeSitterLanguage);
    const parsedTree = parser.parse(source);
    // Need to delete parser objects directly
    parser.delete();
    return [parsedTree, treeSitterLanguage.version];
}
function getBlockCloseToken(language) {
    const wasmLanguage = languageIdToWasmLanguage(language);
    switch (wasmLanguage) {
        case treeSitterLanguages_1.WASMLanguage.Python:
            return null;
        case treeSitterLanguages_1.WASMLanguage.JavaScript:
        case treeSitterLanguages_1.WASMLanguage.TypeScript:
        case treeSitterLanguages_1.WASMLanguage.TypeScriptTsx:
        case treeSitterLanguages_1.WASMLanguage.Go:
        case treeSitterLanguages_1.WASMLanguage.Csharp:
        case treeSitterLanguages_1.WASMLanguage.Java:
        // todo@dbaeumer reenable PHP
        // case WASMLanguage.Php:
        case treeSitterLanguages_1.WASMLanguage.Cpp:
            return '}';
        case treeSitterLanguages_1.WASMLanguage.Ruby:
            return 'end';
        default:
            return null;
    }
}
function innerQuery(queries, root) {
    const matches = [];
    for (const query of queries) {
        // parse and cache query if this is the first time we've used it
        if (!query[1]) {
            const lang = root.tree.getLanguage();
            // cache parsed query object
            query[1] = lang.query(query[0]);
        }
        matches.push(...query[1].matches(root));
    }
    return matches;
}
const docstringQuery = [
    `[
    (class_definition (block (expression_statement (string))))
    (function_definition (block (expression_statement (string))))
]`,
];
function queryPythonIsDocstring(blockNode) {
    return innerQuery([docstringQuery], blockNode).length === 1;
}
//# sourceMappingURL=parse.js.map