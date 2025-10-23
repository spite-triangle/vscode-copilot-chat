"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.CellIdPatternRe = exports.EOL = exports.LineOfText = void 0;
exports.summarize = summarize;
exports.notebookCellToCellData = notebookCellToCellData;
exports.getCellIdMap = getCellIdMap;
exports.normalizeCellId = normalizeCellId;
exports.getNotebookId = getNotebookId;
exports.getCellId = getCellId;
exports.getDefaultLanguage = getDefaultLanguage;
exports.requestHasNotebookRefs = requestHasNotebookRefs;
exports.parseAndCleanStack = parseAndCleanStack;
const types_1 = require("../../../util/common/types");
const hash_1 = require("../../../util/vs/base/common/hash");
const strings_1 = require("../../../util/vs/base/common/strings");
const uri_1 = require("../../../util/vs/base/common/uri");
const vscodeTypes_1 = require("../../../vscodeTypes");
class LineOfText {
    constructor(value) {
        this.__lineOfTextBrand = undefined;
        this.value = value.replace(/\r$/, '');
    }
}
exports.LineOfText = LineOfText;
/** End of Line for alternative Notebook contnt is always \n */
exports.EOL = '\n';
function summarize(cell) {
    const cellType = cell.kind === vscodeTypes_1.NotebookCellKind.Code ? 'code' : 'markdown';
    const id = getCellId(cell);
    const source = getCellCode(cell.document);
    return { cell_type: cellType, id, language: cell.document.languageId, source, index: cell.index };
}
function notebookCellToCellData(cell) {
    const cellData = new vscodeTypes_1.NotebookCellData(cell.kind, cell.document.getText(), cell.document.languageId);
    cellData.metadata = cell.metadata;
    cellData.executionSummary = cell.executionSummary;
    if (cell.outputs.length) {
        cellData.outputs = [...cell.outputs];
    }
    return cellData;
}
function getCellIdMap(notebook) {
    const cellIdMap = new Map();
    notebook.getCells().forEach(cell => {
        cellIdMap.set(getCellId(cell), cell);
    });
    return cellIdMap;
}
const cellIdCache = new WeakMap();
/** The length of the hash portion of cell IDs */
const CELL_ID_HASH_LENGTH = 8;
/** Use a unique enough cell id prefix so that we can easily identify cell ids*/
const CELL_ID_PREFIX = '#VSC-';
/** RegExp to match all Cell Ids */
exports.CellIdPatternRe = new RegExp(`(\\s+|^|\\b|\\W)(#VSC-[a-f0-9]{${CELL_ID_HASH_LENGTH}})\\b`, 'gi');
/**
 * Sometimes the model may return a cellId that is not in the expected format.
 * This function attempts to convert such cellIds to the expected format.
 */
function normalizeCellId(cellId) {
    if (cellId.startsWith(CELL_ID_PREFIX)) {
        return cellId;
    }
    if (cellId.startsWith('VSC-')) {
        return `#${cellId}`;
    }
    if (cellId.startsWith('#V-') && cellId.length === (CELL_ID_HASH_LENGTH + 3)) {
        return `${CELL_ID_PREFIX}${cellId.substring(3)}`;
    }
    if (cellId.toLowerCase().startsWith('vscode-') && cellId.length === (CELL_ID_HASH_LENGTH + 7)) {
        return `${CELL_ID_PREFIX}${cellId.substring(7)}`;
    }
    if (cellId.startsWith('-')) {
        return `#VSC${cellId}`;
    }
    // Possible case where the cellId is just a hash without the prefix
    return cellId.length === CELL_ID_HASH_LENGTH ? `${CELL_ID_PREFIX}${cellId}` : cellId;
}
const notebookIdCache = new WeakMap();
function getNotebookId(notebook) {
    let id = notebookIdCache.get(notebook);
    if (id) {
        return id;
    }
    const hash = new hash_1.StringSHA1();
    hash.update(notebook.uri.toString());
    id = hash.digest();
    notebookIdCache.set(notebook, id);
    return id;
}
/**
 * Given a Notebook cell returns a unique identifier for the cell.
 * The identifier is based on the cell's URI and is cached for performance.
 * This is useful for tracking cells across sessions or for referencing cells in a consistent manner.
 * The cell Id will have a specicial prefix as well do as to easily identify it as a cell Id.
 */
function getCellId(cell) {
    let oldId = cellIdCache.get(cell);
    if (oldId) {
        return oldId;
    }
    const hash = new hash_1.StringSHA1();
    hash.update(cell.document.uri.toString());
    oldId = `${CELL_ID_PREFIX}${hash.digest().substring(0, CELL_ID_HASH_LENGTH)}`;
    cellIdCache.set(cell, oldId);
    return oldId;
}
function getCellCode(document) {
    if (document.lineCount === 0) {
        return [];
    }
    return new Array(document.lineCount).fill('').map((_, i) => document.lineAt(i).text);
}
function getDefaultLanguage(notebook) {
    const codeCell = notebook.getCells().find(cell => cell.kind === vscodeTypes_1.NotebookCellKind.Code);
    if (codeCell) {
        return codeCell.document.languageId;
    }
    // Fallback for Jupyter Notebooks that do not have a code cell.
    if (notebook.notebookType === 'jupyter-notebook') {
        return notebook.metadata?.language_info?.name || notebook.metadata?.kernelspec?.language || 'python';
    }
}
const notebookTermsToLookFor = ['jupyter', 'notebook', 'cell.', 'cells.', ' cell ', 'cells', 'notebook cell'];
function requestHasNotebookRefs(request, notebookService, options) {
    const prompt = (request.prompt || '').toLowerCase();
    if (options?.checkPromptAsWell && notebookTermsToLookFor.some(term => prompt.includes(term))) {
        return true;
    }
    return request.references.some(ref => {
        if ((0, types_1.isLocation)(ref.value)) {
            return notebookService.hasSupportedNotebooks(ref.value.uri);
        }
        if ((0, uri_1.isUriComponents)(ref.value)) {
            return notebookService.hasSupportedNotebooks(uri_1.URI.revive(ref.value));
        }
        if ((0, types_1.isUri)(ref.value)) {
            return notebookService.hasSupportedNotebooks(ref.value);
        }
        return false;
    });
}
function parseAndCleanStack(jsonString) {
    try {
        // Parse the JSON string
        const parsed = JSON.parse(jsonString);
        return (0, strings_1.removeAnsiEscapeCodes)(parsed?.stack || parsed.message || '') || parsed.message || parsed.name || jsonString;
    }
    catch {
        return jsonString; // Return the original string if parsing fails
    }
}
//# sourceMappingURL=helpers.js.map