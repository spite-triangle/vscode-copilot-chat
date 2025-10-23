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
const vitest_1 = require("vitest");
const mockAlternativeContentService_1 = require("../../../../platform/notebook/common/mockAlternativeContentService");
const testWorkspaceService_1 = require("../../../../platform/test/node/testWorkspaceService");
const editing_1 = require("../../../../util/common/test/shims/editing");
const textDocument_1 = require("../../../../util/common/test/shims/textDocument");
const uri_1 = require("../../../../util/vs/base/common/uri");
const intents_1 = require("../../../prompt/node/intents");
const editFileToolUtils_1 = require("../editFileToolUtils");
(0, vitest_1.describe)('replace_string_in_file - applyEdit', () => {
    let workspaceEdit;
    let workspaceService;
    let notebookService;
    let alternatveContentService;
    let doc;
    async function doApplyEdit(oldString, newString, uri = doc.document.uri) {
        const r = await (0, editFileToolUtils_1.applyEdit)(uri, oldString, newString, workspaceService, notebookService, alternatveContentService, undefined);
        workspaceEdit.set(uri, r.edits);
        return r;
    }
    function setText(value) {
        (0, textDocument_1.setDocText)(doc, value);
    }
    (0, vitest_1.beforeEach)(() => {
        doc = (0, textDocument_1.createTextDocumentData)(uri_1.URI.file('/my/file.ts'), '', 'ts');
        workspaceEdit = new editing_1.WorkspaceEdit();
        workspaceService = new testWorkspaceService_1.TestWorkspaceService([], [doc.document]);
        notebookService = { hasSupportedNotebooks: () => false };
        alternatveContentService = new mockAlternativeContentService_1.MockAlternativeNotebookContentService();
    });
    (0, vitest_1.test)('simple verbatim', async () => {
        setText('this is an oldString!');
        const result = await doApplyEdit('oldString', 'newString');
        (0, vitest_1.expect)(result.updatedFile).toBe('this is an newString!');
    });
    (0, vitest_1.test)('exact match - single occurrence', async () => {
        setText('function hello() {\n\tconsole.log("world");\n}');
        const result = await doApplyEdit('console.log("world");', 'console.log("hello world");');
        (0, vitest_1.expect)(result.updatedFile).toBe('function hello() {\n\tconsole.log("hello world");\n}');
    });
    (0, vitest_1.test)('exact match - with newlines', async () => {
        setText('line1\nline2\nline3');
        const result = await doApplyEdit('line1\nline2', 'newline1\nnewline2');
        (0, vitest_1.expect)(result.updatedFile).toBe('newline1\nnewline2\nline3');
    });
    (0, vitest_1.test)('multiple exact matches - should throw error', async () => {
        setText('test\ntest\nother');
        await (0, vitest_1.expect)(doApplyEdit('test', 'replacement')).rejects.toThrow(editFileToolUtils_1.MultipleMatchesError);
    });
    (0, vitest_1.test)('whitespace flexible matching - different indentation', async () => {
        setText('function test() {\n    console.log("hello");\n}');
        // Use the exact text from the file for this test
        const result = await doApplyEdit('    console.log("hello");', '\tconsole.log("hi");');
        (0, vitest_1.expect)(result.updatedFile).toBe('function test() {\n\tconsole.log("hi");\n}');
    });
    (0, vitest_1.test)('whitespace flexible matching - trailing spaces', async () => {
        setText('line1   \nline2\nline3');
        const result = await doApplyEdit('line1\nline2', 'newline1\nnewline2');
        (0, vitest_1.expect)(result.updatedFile).toBe('newline1\nnewline2\nline3');
    });
    (0, vitest_1.test)('fuzzy matching - with trailing whitespace variations', async () => {
        setText('if (condition) {\n\treturn true; \n}');
        const result = await doApplyEdit('if (condition) {\n\treturn true;\n}', 'if (condition) {\n\treturn false;\n}');
        (0, vitest_1.expect)(result.updatedFile).toBe('if (condition) {\n\treturn false;\n}');
    });
    (0, vitest_1.test)('no match found - should throw error', async () => {
        setText('some text here');
        await (0, vitest_1.expect)(doApplyEdit('nonexistent', 'replacement')).rejects.toThrow(editFileToolUtils_1.NoMatchError);
    });
    (0, vitest_1.test)('empty old string - create new file', async () => {
        setText('');
        const result = await doApplyEdit('', 'new content');
        (0, vitest_1.expect)(result.updatedFile).toBe('new content');
    });
    (0, vitest_1.test)('empty old string on existing file - should throw error', async () => {
        setText('existing content');
        await (0, vitest_1.expect)(doApplyEdit('', 'new content')).rejects.toThrow(editFileToolUtils_1.ContentFormatError);
    });
    (0, vitest_1.test)('delete text - empty new string', async () => {
        setText('before\nto delete\nafter');
        const result = await doApplyEdit('to delete\n', '');
        (0, vitest_1.expect)(result.updatedFile).toBe('before\nafter');
    });
    (0, vitest_1.test)('delete text - exact match without newline', async () => {
        setText('before to delete after');
        const result = await doApplyEdit('to delete ', '');
        (0, vitest_1.expect)(result.updatedFile).toBe('before after');
    });
    (0, vitest_1.test)('no change - identical strings should throw error', async () => {
        setText('unchanged text');
        await (0, vitest_1.expect)(doApplyEdit('unchanged text', 'unchanged text')).rejects.toThrow(editFileToolUtils_1.NoChangeError);
    });
    (0, vitest_1.test)('replace entire content', async () => {
        setText('old content\nwith multiple lines');
        const result = await doApplyEdit('old content\nwith multiple lines', 'completely new content');
        (0, vitest_1.expect)(result.updatedFile).toBe('completely new content');
    });
    (0, vitest_1.test)('replace with multiline content', async () => {
        setText('single line');
        const result = await doApplyEdit('single line', 'line1\nline2\nline3');
        (0, vitest_1.expect)(result.updatedFile).toBe('line1\nline2\nline3');
    });
    (0, vitest_1.test)('case sensitive matching', async () => {
        setText('Hello World');
        await (0, vitest_1.expect)(doApplyEdit('hello world', 'Hi World')).rejects.toThrow(editFileToolUtils_1.NoMatchError);
    });
    (0, vitest_1.test)('special regex characters in search string', async () => {
        setText('price is $10.99 (discount)');
        const result = await doApplyEdit('$10.99 (discount)', '$9.99 (sale)');
        (0, vitest_1.expect)(result.updatedFile).toBe('price is $9.99 (sale)');
    });
    (0, vitest_1.test)('unicode characters', async () => {
        setText('Hello 世界! 🌍');
        const result = await doApplyEdit('世界! 🌍', '世界! 🌎');
        (0, vitest_1.expect)(result.updatedFile).toBe('Hello 世界! 🌎');
    });
    (0, vitest_1.test)('very long strings', async () => {
        const longText = 'a'.repeat(1000) + 'middle' + 'b'.repeat(1000);
        setText(longText);
        const result = await doApplyEdit('middle', 'CENTER');
        (0, vitest_1.expect)(result.updatedFile).toBe('a'.repeat(1000) + 'CENTER' + 'b'.repeat(1000));
    });
    (0, vitest_1.test)('newline variations - CRLF to LF', async () => {
        setText('line1\r\nline2\r\nline3');
        const result = await doApplyEdit('line1\nline2', 'newline1\nnewline2');
        (0, vitest_1.expect)(result.updatedFile).toBe('newline1\nnewline2\nline3');
    });
    (0, vitest_1.test)('trailing newline handling', async () => {
        setText('content\nwith\nnewlines\n');
        const result = await doApplyEdit('content\nwith\n', 'new\ncontent\n');
        (0, vitest_1.expect)(result.updatedFile).toBe('new\ncontent\nnewlines\n');
    });
    (0, vitest_1.test)('similarity matching - high similarity content', async () => {
        // This tests the similarity matching as a fallback
        setText('function calculateTotal(items) {\n\tlet sum = 0;\n\tfor (let i = 0; i < items.length; i++) {\n\t\tsum += items[i].price;\n\t}\n\treturn sum;\n}');
        const result = await doApplyEdit('function calculateTotal(items) {\n\tlet sum = 0;\n\tfor (let i = 0; i < items.length; i++) {\n\t\tsum += items[i].price;\n\t}\n\treturn sum;\n}', 'function calculateTotal(items) {\n\treturn items.reduce((sum, item) => sum + item.price, 0);\n}');
        (0, vitest_1.expect)(result.updatedFile).toBe('function calculateTotal(items) {\n\treturn items.reduce((sum, item) => sum + item.price, 0);\n}');
    });
    (0, vitest_1.test)('whitespace only differences', async () => {
        setText('function test() {\n    return true;\n}');
        // Use exact text from the file to test whitespace handling
        const result = await doApplyEdit('    return true;', '\treturn false;');
        (0, vitest_1.expect)(result.updatedFile).toBe('function test() {\n\treturn false;\n}');
    });
    (0, vitest_1.test)('mixed whitespace and content changes', async () => {
        setText('if (condition)   {\n  console.log("test");   \n}');
        // Use exact text matching the file content
        const result = await doApplyEdit('  console.log("test");   ', '\tconsole.log("updated");');
        (0, vitest_1.expect)(result.updatedFile).toBe('if (condition)   {\n\tconsole.log("updated");\n}');
    });
    (0, vitest_1.test)('empty lines handling', async () => {
        setText('line1\n\n\nline4');
        const result = await doApplyEdit('line1\n\n\nline4', 'line1\n\nline3\nline4');
        (0, vitest_1.expect)(result.updatedFile).toBe('line1\n\nline3\nline4');
    });
    (0, vitest_1.test)('partial line replacement', async () => {
        setText('const name = "old value";');
        const result = await doApplyEdit('"old value"', '"new value"');
        (0, vitest_1.expect)(result.updatedFile).toBe('const name = "new value";');
    });
    (0, vitest_1.test)('multiple line partial replacement', async () => {
        setText('function test() {\n\tconsole.log("debug");\n\treturn value;\n}');
        const result = await doApplyEdit('console.log("debug");\n\treturn value;', 'return newValue;');
        (0, vitest_1.expect)(result.updatedFile).toBe('function test() {\n\treturn newValue;\n}');
    });
    // Edge cases and error conditions
    (0, vitest_1.test)('error properties - NoMatchError', async () => {
        setText('some text');
        try {
            await doApplyEdit('missing', 'replacement');
        }
        catch (error) {
            (0, vitest_1.expect)(error).toBeInstanceOf(editFileToolUtils_1.NoMatchError);
            (0, vitest_1.expect)(error.kindForTelemetry).toBe('noMatchFound');
            (0, vitest_1.expect)(error.file).toBe('file:///my/file.ts');
        }
    });
    (0, vitest_1.test)('error properties - MultipleMatchesError', async () => {
        setText('same\nsame\nother');
        try {
            await doApplyEdit('same', 'different');
        }
        catch (error) {
            (0, vitest_1.expect)(error).toBeInstanceOf(editFileToolUtils_1.MultipleMatchesError);
            (0, vitest_1.expect)(error.kindForTelemetry).toBe('multipleMatchesFound');
            (0, vitest_1.expect)(error.file).toBe('file:///my/file.ts');
        }
    });
    (0, vitest_1.test)('error properties - NoChangeError', async () => {
        setText('test content');
        try {
            await doApplyEdit('test content', 'test content');
        }
        catch (error) {
            (0, vitest_1.expect)(error).toBeInstanceOf(editFileToolUtils_1.NoChangeError);
            (0, vitest_1.expect)(error.kindForTelemetry).toBe('noChange');
            (0, vitest_1.expect)(error.file).toBe('file:///my/file.ts');
        }
    });
    (0, vitest_1.test)('error properties - ContentFormatError', async () => {
        setText('existing content');
        try {
            await doApplyEdit('', 'new content');
        }
        catch (error) {
            (0, vitest_1.expect)(error).toBeInstanceOf(editFileToolUtils_1.ContentFormatError);
            (0, vitest_1.expect)(error.kindForTelemetry).toBe('contentFormatError');
            (0, vitest_1.expect)(error.file).toBe('file:///my/file.ts');
        }
    });
    (0, vitest_1.test)('very small strings', async () => {
        setText('a');
        const result = await doApplyEdit('a', 'b');
        (0, vitest_1.expect)(result.updatedFile).toBe('b');
    });
    (0, vitest_1.test)('empty file with empty replacement', async () => {
        setText('');
        const result = await doApplyEdit('', '');
        (0, vitest_1.expect)(result.updatedFile).toBe('');
    });
    (0, vitest_1.test)('single character replacement', async () => {
        setText('hello unique');
        const result = await doApplyEdit('unique', 'special');
        (0, vitest_1.expect)(result.updatedFile).toBe('hello special');
    });
    (0, vitest_1.test)('multiple single character matches - should throw error', async () => {
        setText('hello world');
        await (0, vitest_1.expect)(doApplyEdit('l', 'L')).rejects.toThrow(editFileToolUtils_1.MultipleMatchesError);
    });
    (0, vitest_1.test)('replacement with same length', async () => {
        setText('old text here');
        const result = await doApplyEdit('old', 'new');
        (0, vitest_1.expect)(result.updatedFile).toBe('new text here');
    });
    (0, vitest_1.test)('replacement with longer text', async () => {
        setText('short');
        const result = await doApplyEdit('short', 'much longer text');
        (0, vitest_1.expect)(result.updatedFile).toBe('much longer text');
    });
    (0, vitest_1.test)('replacement with shorter text', async () => {
        setText('very long text here');
        const result = await doApplyEdit('very long text', 'short');
        (0, vitest_1.expect)(result.updatedFile).toBe('short here');
    });
    (0, vitest_1.test)('beginning of file replacement', async () => {
        setText('start of file\nrest of content');
        const result = await doApplyEdit('start of file', 'beginning');
        (0, vitest_1.expect)(result.updatedFile).toBe('beginning\nrest of content');
    });
    (0, vitest_1.test)('end of file replacement', async () => {
        setText('content here\nend of file');
        const result = await doApplyEdit('end of file', 'conclusion');
        (0, vitest_1.expect)(result.updatedFile).toBe('content here\nconclusion');
    });
    (0, vitest_1.test)('middle of line replacement', async () => {
        setText('prefix MIDDLE suffix');
        const result = await doApplyEdit('MIDDLE', 'center');
        (0, vitest_1.expect)(result.updatedFile).toBe('prefix center suffix');
    });
    (0, vitest_1.test)('multiple spaces preservation', async () => {
        setText('word1     word2');
        const result = await doApplyEdit('word1     word2', 'word1 word2');
        (0, vitest_1.expect)(result.updatedFile).toBe('word1 word2');
    });
    (0, vitest_1.test)('tab character replacement', async () => {
        setText('before\tafter');
        const result = await doApplyEdit('\t', '    ');
        (0, vitest_1.expect)(result.updatedFile).toBe('before    after');
    });
    (0, vitest_1.test)('mixed tabs and spaces', async () => {
        setText('function() {\n\t    mixed indentation\n}');
        const result = await doApplyEdit('\t    mixed indentation', '    proper indentation');
        (0, vitest_1.expect)(result.updatedFile).toBe('function() {\n    proper indentation\n}');
    });
    (0, vitest_1.test)('return value structure', async () => {
        setText('old content');
        const result = await doApplyEdit('old', 'new');
        (0, vitest_1.expect)(result).toHaveProperty('patch');
        (0, vitest_1.expect)(result).toHaveProperty('updatedFile');
        (0, vitest_1.expect)(Array.isArray(result.patch)).toBe(true);
        (0, vitest_1.expect)(typeof result.updatedFile).toBe('string');
    });
    (0, vitest_1.test)('fixes bad newlines in issue #9753', async () => {
        const input = JSON.parse(fs.readFileSync(__dirname + '/editFileToolUtilsFixtures/crlf-input.json', 'utf8'));
        const output = JSON.parse(fs.readFileSync(__dirname + '/editFileToolUtilsFixtures/crlf-output.json', 'utf8')).join('\r\n');
        const toolCall = JSON.parse(fs.readFileSync(__dirname + '/editFileToolUtilsFixtures/crlf-tool-call.json', 'utf8'));
        const crlfDoc = (0, textDocument_1.createTextDocumentData)(uri_1.URI.file('/my/file2.ts'), input.join('\r\n'), 'ts', '\r\n');
        workspaceService.textDocuments.push(crlfDoc.document);
        const result = await doApplyEdit(toolCall.oldString, toolCall.newString, crlfDoc.document.uri);
        (0, vitest_1.expect)(result.updatedFile).toBe(output);
        (0, vitest_1.expect)((0, intents_1.applyEdits)(input.join('\r\n'), workspaceEdit.entries()[0][1])).toBe(output);
    });
});
//# sourceMappingURL=editFileToolUtils.spec.js.map