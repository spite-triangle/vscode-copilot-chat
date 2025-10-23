"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtHostNotebookDocumentData = exports.ExtHostCell = void 0;
exports.translateDisplayDataOutput = translateDisplayDataOutput;
exports.translateErrorOutput = translateErrorOutput;
exports.translateStreamOutput = translateStreamOutput;
exports.jupyterCellOutputToCellOutput = jupyterCellOutputToCellOutput;
const hash_1 = require("../../../vs/base/common/hash");
const network_1 = require("../../../vs/base/common/network");
const notebooks_1 = require("../../../vs/workbench/api/common/extHostTypes/notebooks");
const textDocument_1 = require("./textDocument");
function concatMultilineString(str, trim) {
    const nonLineFeedWhiteSpaceTrim = /(^[\t\f\v\r ]+|[\t\f\v\r ]+$)/g;
    if (Array.isArray(str)) {
        let result = '';
        for (let i = 0; i < str.length; i += 1) {
            const s = str[i];
            if (i < str.length - 1 && !s.endsWith('\n')) {
                result = result.concat(`${s}\n`);
            }
            else {
                result = result.concat(s);
            }
        }
        // Just trim whitespace. Leave \n in place
        return trim ? result.replace(nonLineFeedWhiteSpaceTrim, '') : result;
    }
    return trim ? str.toString().replace(nonLineFeedWhiteSpaceTrim, '') : str.toString();
}
var CellOutputMimeTypes;
(function (CellOutputMimeTypes) {
    CellOutputMimeTypes["error"] = "application/vnd.code.notebook.error";
    CellOutputMimeTypes["stderr"] = "application/vnd.code.notebook.stderr";
    CellOutputMimeTypes["stdout"] = "application/vnd.code.notebook.stdout";
})(CellOutputMimeTypes || (CellOutputMimeTypes = {}));
const textMimeTypes = ['text/plain', 'text/markdown', 'text/latex', CellOutputMimeTypes.stderr, CellOutputMimeTypes.stdout];
function convertJupyterOutputToBuffer(mime, value) {
    if (!value) {
        return notebooks_1.NotebookCellOutputItem.text('', mime);
    }
    try {
        if ((mime.startsWith('text/') || textMimeTypes.includes(mime)) &&
            (Array.isArray(value) || typeof value === 'string')) {
            const stringValue = Array.isArray(value) ? concatMultilineString(value) : value;
            return notebooks_1.NotebookCellOutputItem.text(stringValue, mime);
        }
        else if (mime.startsWith('image/') && typeof value === 'string' && mime !== 'image/svg+xml') {
            // Images in Jupyter are stored in base64 encoded format.
            // VS Code expects bytes when rendering images.
            if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') {
                return new notebooks_1.NotebookCellOutputItem(Buffer.from(value, 'base64'), mime);
            }
            else {
                const data = Uint8Array.from(atob(value), c => c.charCodeAt(0));
                return new notebooks_1.NotebookCellOutputItem(data, mime);
            }
        }
        else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            return notebooks_1.NotebookCellOutputItem.text(JSON.stringify(value), mime);
        }
        else if (mime === 'application/json') {
            return notebooks_1.NotebookCellOutputItem.json(value, mime);
        }
        else {
            // For everything else, treat the data as strings (or multi-line strings).
            value = Array.isArray(value) ? concatMultilineString(value) : value;
            return notebooks_1.NotebookCellOutputItem.text(value, mime);
        }
    }
    catch (ex) {
        return notebooks_1.NotebookCellOutputItem.error(ex);
    }
}
function translateDisplayDataOutput(output) {
    const items = [];
    if (output.data) {
        for (const key in output.data) {
            items.push(convertJupyterOutputToBuffer(key, output.data[key]));
        }
    }
    return new notebooks_1.NotebookCellOutput(items, {});
}
function translateErrorOutput(output) {
    output = output || { output_type: 'error', ename: '', evalue: '', traceback: [] };
    return new notebooks_1.NotebookCellOutput([
        notebooks_1.NotebookCellOutputItem.error({
            name: output?.ename || '',
            message: output?.evalue || '',
            stack: (output?.traceback || []).join('\n')
        })
    ], { originalError: output });
}
function translateStreamOutput(output) {
    const value = concatMultilineString(output.text);
    const item = output.name === 'stderr' ? notebooks_1.NotebookCellOutputItem.stderr(value) : notebooks_1.NotebookCellOutputItem.stdout(value);
    return new notebooks_1.NotebookCellOutput([item], {});
}
const cellOutputMappers = new Map();
cellOutputMappers.set('display_data', translateDisplayDataOutput);
cellOutputMappers.set('execute_result', translateDisplayDataOutput);
cellOutputMappers.set('update_display_data', translateDisplayDataOutput);
cellOutputMappers.set('error', translateErrorOutput);
cellOutputMappers.set('stream', translateStreamOutput);
function jupyterCellOutputToCellOutput(output) {
    const fn = cellOutputMappers.get(output.output_type);
    let result;
    if (fn) {
        result = fn(output);
    }
    else {
        result = translateDisplayDataOutput(output);
    }
    return result;
}
const textDecoder = new TextDecoder();
function splitMultilineString(source) {
    if (Array.isArray(source)) {
        return source;
    }
    const str = source.toString();
    if (str.length > 0) {
        // Each line should be a separate entry, but end with a \n if not last entry
        const arr = str.split('\n');
        return arr
            .map((s, i) => {
            if (i < arr.length - 1) {
                return `${s}\n`;
            }
            return s;
        })
            .filter(s => s.length > 0); // Skip last one if empty (it's the only one that could be length 0)
    }
    return [];
}
function translateCellErrorOutput(output) {
    // it should have at least one output item
    const firstItem = output.items[0];
    // Bug in VS Code.
    if (!firstItem.data) {
        return {
            output_type: 'error',
            ename: '',
            evalue: '',
            traceback: []
        };
    }
    const originalError = output.metadata?.originalError;
    const value = JSON.parse(textDecoder.decode(firstItem.data));
    return {
        output_type: 'error',
        ename: value.name,
        evalue: value.message,
        // VS Code needs an `Error` object which requires a `stack` property as a string.
        // Its possible the format could change when converting from `traceback` to `string` and back again to `string`
        // When .NET stores errors in output (with their .NET kernel),
        // stack is empty, hence store the message instead of stack (so that somethign gets displayed in ipynb).
        traceback: originalError?.traceback || splitMultilineString(value.stack || value.message || '')
    };
}
function convertStreamOutput(output) {
    const outputs = [];
    output.items
        .filter((opit) => opit.mime === CellOutputMimeTypes.stderr || opit.mime === CellOutputMimeTypes.stdout)
        .map((opit) => textDecoder.decode(opit.data))
        .forEach(value => {
        // Ensure each line is a separate entry in an array (ending with \n).
        const lines = value.split('\n');
        // If the last item in `outputs` is not empty and the first item in `lines` is not empty, then concate them.
        // As they are part of the same line.
        if (outputs.length && lines.length && lines[0].length > 0) {
            outputs[outputs.length - 1] = `${outputs[outputs.length - 1]}${lines.shift()}`;
        }
        for (const line of lines) {
            outputs.push(line);
        }
    });
    for (let index = 0; index < (outputs.length - 1); index++) {
        outputs[index] = `${outputs[index]}\n`;
    }
    // Skip last one if empty (it's the only one that could be length 0)
    if (outputs.length && outputs[outputs.length - 1].length === 0) {
        outputs.pop();
    }
    const streamType = getOutputStreamType(output) || 'stdout';
    return {
        output_type: 'stream',
        name: streamType,
        text: outputs
    };
}
function getOutputStreamType(output) {
    if (output.items.length > 0) {
        return output.items[0].mime === CellOutputMimeTypes.stderr ? 'stderr' : 'stdout';
    }
    return;
}
function convertOutputMimeToJupyterOutput(mime, value) {
    if (!value) {
        return '';
    }
    try {
        if (mime === CellOutputMimeTypes.error) {
            const stringValue = textDecoder.decode(value);
            return JSON.parse(stringValue);
        }
        else if (mime.startsWith('text/') || textMimeTypes.includes(mime)) {
            const stringValue = textDecoder.decode(value);
            return splitMultilineString(stringValue);
        }
        else if (mime.startsWith('image/') && mime !== 'image/svg+xml') {
            // Images in Jupyter are stored in base64 encoded format.
            // VS Code expects bytes when rendering images.
            if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') {
                return Buffer.from(value).toString('base64');
            }
            else {
                return btoa(value.reduce((s, b) => s + String.fromCharCode(b), ''));
            }
        }
        else if (mime.toLowerCase().includes('json')) {
            const stringValue = textDecoder.decode(value);
            return stringValue.length > 0 ? JSON.parse(stringValue) : stringValue;
        }
        else if (mime === 'image/svg+xml') {
            return splitMultilineString(textDecoder.decode(value));
        }
        else {
            return textDecoder.decode(value);
        }
    }
    catch (ex) {
        return '';
    }
}
function translateCellDisplayOutput(output) {
    const customMetadata = output.metadata;
    let result;
    // Possible some other extension added some output (do best effort to translate & save in ipynb).
    // In which case metadata might not contain `outputType`.
    const outputType = customMetadata?.outputType;
    switch (outputType) {
        case 'error': {
            result = translateCellErrorOutput(output);
            break;
        }
        case 'stream': {
            result = convertStreamOutput(output);
            break;
        }
        case 'display_data': {
            result = {
                output_type: 'display_data',
                data: output.items.reduce((prev, curr) => {
                    prev[curr.mime] = convertOutputMimeToJupyterOutput(curr.mime, curr.data);
                    return prev;
                }, {}),
                metadata: customMetadata?.metadata || {} // This can never be undefined.
            };
            break;
        }
        case 'execute_result': {
            result = {
                output_type: 'execute_result',
                data: output.items.reduce((prev, curr) => {
                    prev[curr.mime] = convertOutputMimeToJupyterOutput(curr.mime, curr.data);
                    return prev;
                }, {}),
                metadata: customMetadata?.metadata || {}, // This can never be undefined.
                execution_count: typeof customMetadata?.executionCount === 'number' ? customMetadata?.executionCount : null // This can never be undefined, only a number or `null`.
            };
            break;
        }
        case 'update_display_data': {
            result = {
                output_type: 'update_display_data',
                data: output.items.reduce((prev, curr) => {
                    prev[curr.mime] = convertOutputMimeToJupyterOutput(curr.mime, curr.data);
                    return prev;
                }, {}),
                metadata: customMetadata?.metadata || {} // This can never be undefined.
            };
            break;
        }
        default: {
            const isError = output.items.length === 1 && output.items.every((item) => item.mime === CellOutputMimeTypes.error);
            const isStream = output.items.every((item) => item.mime === CellOutputMimeTypes.stderr || item.mime === CellOutputMimeTypes.stdout);
            if (isError) {
                return translateCellErrorOutput(output);
            }
            // In the case of .NET & other kernels, we need to ensure we save ipynb correctly.
            // Hence if we have stream output, save the output as Jupyter `stream` else `display_data`
            // Unless we already know its an unknown output type.
            const outputType = customMetadata?.outputType || (isStream ? 'stream' : 'display_data');
            let unknownOutput;
            if (outputType === 'stream') {
                // If saving as `stream` ensure the mandatory properties are set.
                unknownOutput = convertStreamOutput(output);
            }
            else if (outputType === 'display_data') {
                // If saving as `display_data` ensure the mandatory properties are set.
                const displayData = {
                    data: {},
                    metadata: {},
                    output_type: 'display_data'
                };
                unknownOutput = displayData;
            }
            else {
                unknownOutput = {
                    output_type: outputType
                };
            }
            if (customMetadata?.metadata) {
                unknownOutput.metadata = customMetadata.metadata;
            }
            if (output.items.length > 0) {
                unknownOutput.data = output.items.reduce((prev, curr) => {
                    prev[curr.mime] = convertOutputMimeToJupyterOutput(curr.mime, curr.data);
                    return prev;
                }, {});
            }
            result = unknownOutput;
            break;
        }
    }
    // Account for transient data as well
    // `transient.display_id` is used to update cell output in other cells, at least thats one use case we know of.
    if (result && customMetadata && customMetadata.transient) {
        result.transient = customMetadata.transient;
    }
    return result;
}
class ExtHostCell {
    get document() {
        return this.documentData.document;
    }
    constructor(index, kind, notebook, documentData, metadata, outputs, executionSummary) {
        this.documentData = documentData;
        this.index = index;
        this.kind = kind;
        this.metadata = metadata;
        this._outputs = outputs;
        this.executionSummary = executionSummary;
        this.notebook = notebook;
    }
    get apiCell() {
        if (!this._apiCell) {
            const that = this;
            const apiCell = {
                get index() { return that.notebook.getCellIndex(that); },
                notebook: that.notebook.document,
                kind: that.kind,
                document: that.document,
                get outputs() { return that._outputs.slice(0); },
                get metadata() { return that.metadata; },
                get executionSummary() { return that.executionSummary; }
            };
            this._apiCell = Object.freeze(apiCell);
        }
        return this._apiCell;
    }
    appendOutput(outputs) {
        this._outputs.push(...outputs);
    }
}
exports.ExtHostCell = ExtHostCell;
function generateCellFragment(index) {
    const hash = new hash_1.StringSHA1();
    hash.update(`index${index}`);
    return hash.digest().substring(0, 8);
}
class ExtHostNotebookDocumentData {
    static createJupyterNotebook(uri, contents, simulationWorkspace) {
        const notebook = JSON.parse(contents);
        const codeLanguageId = notebook.metadata?.language_info?.language ?? notebook.metadata?.language_info?.name ?? 'python';
        const notebookDocument = new ExtHostNotebookDocumentData(uri, 'jupyter-notebook', notebook.metadata, []);
        const cells = [];
        for (const [index, cell] of notebook.cells.entries()) {
            const content = cell.source.join('');
            if (cell.cell_type === 'code') {
                const doc = (0, textDocument_1.createTextDocumentData)(uri.with({ scheme: network_1.Schemas.vscodeNotebookCell, fragment: generateCellFragment(index) }), content, codeLanguageId);
                if (simulationWorkspace) {
                    simulationWorkspace.addDocument(doc);
                }
                const cellOutputs = Array.isArray(cell.outputs) ? cell.outputs : [];
                const outputs = cellOutputs.map(jupyterCellOutputToCellOutput);
                cells.push(new ExtHostCell(index, notebooks_1.NotebookCellKind.Code, notebookDocument, doc, cell.metadata, outputs, undefined));
            }
            else {
                const doc = (0, textDocument_1.createTextDocumentData)(uri.with({ scheme: network_1.Schemas.vscodeNotebookCell, fragment: generateCellFragment(index) }), content, 'markdown');
                if (simulationWorkspace) {
                    simulationWorkspace.addDocument(doc);
                }
                cells.push(new ExtHostCell(index, notebooks_1.NotebookCellKind.Markup, notebookDocument, doc, cell.metadata, [], undefined));
            }
        }
        notebookDocument.cells = cells;
        if (simulationWorkspace) {
            simulationWorkspace.addNotebookDocument(notebookDocument);
        }
        return notebookDocument;
    }
    static createGithubIssuesNotebook(uri, contents, simulationWorkspace) {
        const notebook = JSON.parse(contents);
        const notebookDocument = new ExtHostNotebookDocumentData(uri, 'github-issues', {}, []);
        const cells = [];
        for (const [index, cell] of notebook.entries()) {
            const doc = (0, textDocument_1.createTextDocumentData)(uri.with({ scheme: network_1.Schemas.vscodeNotebookCell, fragment: generateCellFragment(index) }), cell.value, cell.language);
            if (simulationWorkspace) {
                simulationWorkspace.addDocument(doc);
            }
            cells.push(new ExtHostCell(index, cell.kind, notebookDocument, doc, {}, [], undefined));
        }
        notebookDocument.cells = cells;
        if (simulationWorkspace) {
            simulationWorkspace.addNotebookDocument(notebookDocument);
        }
        return notebookDocument;
    }
    static fromNotebookData(uri, data, notebookType, simulationWorkspace) {
        const notebookDocument = new ExtHostNotebookDocumentData(uri, notebookType, data.metadata || {}, []);
        const cells = [];
        for (const [index, cell] of data.cells.entries()) {
            const doc = (0, textDocument_1.createTextDocumentData)(uri.with({ scheme: network_1.Schemas.vscodeNotebookCell, fragment: generateCellFragment(index) }), cell.value, cell.languageId);
            if (cell.outputs?.length) {
                throw new Error('Not implemented');
            }
            if (simulationWorkspace) {
                simulationWorkspace.addDocument(doc);
            }
            cells.push(new ExtHostCell(index, cell.kind, notebookDocument, doc, cell.metadata || {}, [], undefined));
        }
        notebookDocument.cells = cells;
        if (simulationWorkspace) {
            simulationWorkspace.addNotebookDocument(notebookDocument);
        }
        return notebookDocument;
    }
    static applyEdits(notebookDocument, edits, simulationWorkspace) {
        for (const edit of edits) {
            if (edit.newNotebookMetadata) {
                throw new Error('Not Supported');
            }
            if (edit.newCellMetadata) {
                throw new Error('Not Supported');
            }
            if (edit.newCells) {
                ExtHostNotebookDocumentData.replaceCells(notebookDocument, edit.range, edit.newCells, simulationWorkspace);
            }
            else {
                notebookDocument._cells.splice(edit.range.start, edit.range.end - edit.range.start);
            }
        }
    }
    static replaceCells(notebookDocument, range, cells, simulationWorkspace) {
        const uri = notebookDocument.uri;
        const docs = cells.map((cell, index) => {
            const doc = (0, textDocument_1.createTextDocumentData)(uri.with({ scheme: network_1.Schemas.vscodeNotebookCell, fragment: generateCellFragment(notebookDocument.cells.length + index + 1) }), cell.value, cell.languageId);
            if (simulationWorkspace) {
                simulationWorkspace.addDocument(doc);
            }
            if (cell.outputs?.length) {
                // throw new Error('Not implemented');
            }
            return doc;
        });
        const extCells = docs.map((doc, index) => new ExtHostCell(index, cells[index].kind, notebookDocument, doc, cells[index].metadata || {}, [], undefined));
        if (notebookDocument.cells.length) {
            notebookDocument.cells.splice(range.start, range.end > range.start ? range.end - range.start : 0, ...extCells);
        }
        else {
            notebookDocument.cells.push(...extCells);
        }
    }
    set cells(cells) {
        this._cells = cells;
    }
    get cells() {
        return this._cells;
    }
    constructor(uri, notebookType, metadata, cells) {
        this._cells = [];
        this._versionId = 0;
        this._isDirty = false;
        this._disposed = false;
        this.uri = uri;
        this._notebookType = notebookType;
        this._metadata = metadata;
        this._cells = cells;
    }
    get document() {
        if (!this._notebook) {
            const that = this;
            const apiObject = {
                get uri() { return that.uri; },
                get version() { return that._versionId; },
                get notebookType() { return that._notebookType; },
                get isDirty() { return that._isDirty; },
                get isUntitled() { return that.uri.scheme === 'untitled'; },
                get isClosed() { return that._disposed; },
                get metadata() { return that._metadata; },
                get cellCount() { return that._cells.length; },
                cellAt(index) {
                    return that._cells[index].apiCell;
                },
                getCells(range) {
                    const cells = range ? that._getCells(range) : that._cells;
                    return cells.map(cell => cell.apiCell);
                },
                save() {
                    return Promise.resolve(true);
                }
            };
            this._notebook = Object.freeze(apiObject);
        }
        return this._notebook;
    }
    get cellCount() {
        return this._cells.length;
    }
    cellAt(index) {
        return this._cells[index];
    }
    _getCells(range) {
        const result = [];
        for (let i = range.start; i < range.end; i++) {
            result.push(this._cells[i]);
        }
        return result;
    }
    getCellIndex(cell) {
        return this._cells.indexOf(cell);
    }
    getText() {
        return JSON.stringify({
            cells: this._cells.map(cell => ({
                cell_type: cell.kind === 2 ? 'code' : 'markdown',
                source: [cell.document.getText()],
                metadata: cell.metadata,
                outputs: (cell.apiCell.outputs || []).map(translateCellDisplayOutput),
            })),
            metadata: this._metadata,
        }, undefined, 4);
    }
    appendCellOutput(cellIndex, outputs) {
        this._cells[cellIndex].appendOutput(outputs);
    }
}
exports.ExtHostNotebookDocumentData = ExtHostNotebookDocumentData;
// export const _documents = new ResourceMap<ExtHostNotebookDocumentData>();
// export function addNotebookDocument(notebook: ExtHostNotebookDocumentData) {
// 	_documents.set(notebook.uri, notebook);
// }
// export function getNotebookDocuments(): vscode.NotebookDocument[] {
// 	return Array.from(_documents.values()).map(data => data.document);
// }
//# sourceMappingURL=notebookDocument.js.map