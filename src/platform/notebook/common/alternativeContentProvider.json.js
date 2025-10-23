"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlternativeJsonNotebookContentProvider = void 0;
exports.isJsonContent = isJsonContent;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const jsonc_parser_1 = require("jsonc-parser");
const async_1 = require("../../../util/vs/base/common/async");
const uri_1 = require("../../../util/vs/base/common/uri");
const vscodeTypes_1 = require("../../../vscodeTypes");
const alternativeContentProvider_1 = require("./alternativeContentProvider");
const alternativeNotebookDocument_1 = require("./alternativeNotebookDocument");
const helpers_1 = require("./helpers");
const IndentSize = 4;
function isJsonContent(text) {
    if (text.startsWith('{') || text.trim().startsWith('{')) {
        return true;
    }
    if ((text.includes('{') || text.includes('}')) && text.includes('"source":') && text.includes('"cell_type":')) {
        return true;
    }
    return false;
}
class AlternativeJsonDocument extends alternativeNotebookDocument_1.AlternativeNotebookDocument {
    fromCellPosition(cell, position) {
        const cellId = (0, helpers_1.getCellId)(cell);
        const alternativeContentText = this.getText();
        const sourcePrefix = `                `; // we know we're indented by 4 spaces and source is 3 levels deep
        const cellMarker = `"id": "${cellId}",`;
        const positionOfSource = alternativeContentText.indexOf(`"source": [`, alternativeContentText.indexOf(cellMarker));
        // Assume the text in the line is `print("Hello World")`
        // & the position is the white space before `World`
        // Position = line = n, character = 12
        // In Json this would be `            "print(\"Hello World\")"`
        // That would be translated as character position in translated = `            "print(\"Hello`.length;
        const firstLineIndexOfCellSource = this.positionAt(positionOfSource).line + 1;
        const leadingCharacters = cell.document.getText(new vscodeTypes_1.Range(position.line, 0, position.line, position.character));
        // -1 to exclude to trailing `"`
        const characterPositionInAltContent = `${sourcePrefix}${JSON.stringify(leadingCharacters).slice(0, -1)}`;
        const linePositionInAltContent = position.line + firstLineIndexOfCellSource;
        // -1 to exclude to trailing `"`
        return new vscodeTypes_1.Position(linePositionInAltContent, characterPositionInAltContent.length);
    }
    toCellPosition(position) {
        throw new Error('Method not implemented.');
    }
}
class AlternativeJsonNotebookContentProvider extends alternativeContentProvider_1.BaseAlternativeNotebookContentProvider {
    constructor() {
        super('json');
    }
    stripCellMarkers(text) {
        return text;
    }
    parseAlternateContent(notebookOrUri, inputStream, token) {
        return this.parseAlternateContentImpl(notebookOrUri, inputStream, token);
    }
    getAlternativeDocument(notebook, excludeMarkdownCells) {
        const cells = notebook.getCells().filter(cell => excludeMarkdownCells ? cell.kind !== vscodeTypes_1.NotebookCellKind.Markup : true).map(cell => {
            const summary = (0, helpers_1.summarize)(cell);
            const source = getCellCode(cell.document);
            return {
                cell_type: summary.cell_type,
                id: summary.id,
                metadata: {
                    language: summary.language
                },
                source,
            };
        });
        const json = { cells };
        const text = JSON.stringify(json, undefined, IndentSize);
        return new AlternativeJsonDocument(text, notebook);
    }
    getSummaryOfStructure(notebook, cellsToInclude, existingCodeMarker) {
        const lines = ['{', '    "cells: ['];
        const existingCodeMarkerWithComment = `// ${existingCodeMarker}`;
        notebook.getCells().forEach((cell) => {
            if (cellsToInclude.includes(cell)) {
                const cellSummary = (0, helpers_1.summarize)(cell);
                if (cellSummary.source.length && cellSummary.source[0].trim().length) {
                    cellSummary.source = [cellSummary.source[0], existingCodeMarkerWithComment];
                }
                else if (cellSummary.source.length && cellSummary.source.some(line => line.trim().length)) {
                    cellSummary.source = [existingCodeMarkerWithComment, cellSummary.source.filter(line => line.trim().length)[0], existingCodeMarkerWithComment];
                }
                else {
                    cellSummary.source = [existingCodeMarkerWithComment];
                }
                const summary = JSON.stringify(cellSummary, undefined, IndentSize).split(/\r?\n/).map(line => `    ${line}`);
                lines.push(...summary);
                lines.push(',');
            }
            else if (!lines.length || lines[lines.length - 1] !== existingCodeMarkerWithComment) {
                lines.push(existingCodeMarkerWithComment);
            }
        });
        lines.push(`    ]`);
        lines.push(`}`);
        return lines.join(helpers_1.EOL);
    }
    parseAlternateContentImpl(notebookOrUri, inputStream, token) {
        return new async_1.AsyncIterableObject(async (emitter) => {
            const cellIdMap = uri_1.URI.isUri(notebookOrUri) ? new Map() : (0, helpers_1.getCellIdMap)(notebookOrUri);
            const cellIdsSeen = new Set();
            let jsonText = '';
            let lastSeenOffset = -1;
            const cellInfo = {
                index: -1,
                startOffset: -1,
                endOffset: -1,
                kind: vscodeTypes_1.NotebookCellKind.Code,
                source: [],
            };
            const defaultLanguage = uri_1.URI.isUri(notebookOrUri) ? 'python' : (0, helpers_1.getDefaultLanguage)(notebookOrUri);
            const emitCell = (endOffset) => {
                // LLM can return duplicate cell with the same id.
                cellInfo.language = cellInfo.language || defaultLanguage;
                if (cellInfo.id && cellIdMap.get(cellInfo.id)?.document.languageId === cellInfo.language) {
                    if (cellIdsSeen.has(cellInfo.id)) {
                        cellInfo.id = '';
                    }
                    else {
                        cellIdsSeen.add(cellInfo.id);
                    }
                }
                else {
                    // Possible duplicate cell with the same id but different language.
                    // In such cases, treat them as new cells.
                    cellInfo.id = '';
                }
                const cell = cellIdMap.get(cellInfo.id);
                cellInfo.uri = cell?.document.uri;
                cellInfo.kind = cell?.kind || (cellInfo.language === 'markdown' ? vscodeTypes_1.NotebookCellKind.Markup : vscodeTypes_1.NotebookCellKind.Code);
                emitter.emitOne({ index: cellInfo.index, type: 'start', kind: cellInfo.kind, language: cellInfo.language, uri: cellInfo.uri, id: cellInfo.id });
                cellInfo.source.forEach(cellLine => emitter.emitOne({ index: cellInfo.index, type: 'line', line: cellLine }));
                emitter.emitOne({ index: cellInfo.index, type: 'end' });
            };
            let finalOffset = 0;
            for await (const lineOfText of inputStream) {
                if (token.isCancellationRequested) {
                    break;
                }
                const line = lineOfText.value;
                jsonText += line;
                (0, jsonc_parser_1.visit)(jsonText, {
                    onObjectEnd(offset, _length, _startLine, _startCharacter) {
                        finalOffset = offset;
                    },
                    onLiteralValue: (value, offset, _length, _startLine, _startCharacter, pathSupplier) => {
                        if (lastSeenOffset >= offset) {
                            return;
                        }
                        const segments = pathSupplier();
                        if (segments.length < 2) {
                            return;
                        }
                        if (segments.shift() !== 'cells') {
                            return;
                        }
                        const cellIndex = segments.shift();
                        if (typeof cellIndex !== 'number') {
                            return;
                        }
                        const property = segments.shift();
                        lastSeenOffset = offset;
                        if (cellInfo.index !== -1 && cellInfo.index !== cellIndex) {
                            emitCell(offset);
                            cellInfo.startOffset = offset;
                            cellInfo.id = undefined;
                            cellInfo.kind = vscodeTypes_1.NotebookCellKind.Code;
                            cellInfo.source = [];
                            cellInfo.uri = undefined;
                            cellInfo.language = undefined;
                        }
                        cellInfo.index = cellIndex;
                        if (property === 'cell_type') {
                            cellInfo.kind = value === 'code' ? vscodeTypes_1.NotebookCellKind.Code : vscodeTypes_1.NotebookCellKind.Markup;
                            if (cellInfo.kind === vscodeTypes_1.NotebookCellKind.Markup) {
                                cellInfo.language = 'markdown';
                            }
                        }
                        else if (property === 'id') {
                            // This is for scenarios when LLM sends the id as part of the cell instead of metdata.
                            cellInfo.id = value;
                        }
                        else if (property === 'metadata' && segments[0] === 'id') {
                            cellInfo.id = value;
                        }
                        else if (property === 'metadata' && segments[0] === 'language') {
                            cellInfo.language = value;
                            if (cellInfo.language === 'markdown') {
                                cellInfo.kind = vscodeTypes_1.NotebookCellKind.Markup;
                            }
                        }
                        else if (property === 'source' && segments.length && typeof segments[0] === 'number') {
                            if (segments[0] === 0) {
                                cellInfo.startOffset = offset;
                            }
                            let code = typeof value === 'string' ? value : `${value || ''}`;
                            // Generally code in jupyter cells always end with `\n` when persisted in JSON file.
                            // However we do not want to deal with the \n as we're only interested in the lines of code.
                            // This is because we're going to edit a line at a time, new line means we have two lines to edit, but thats not possible.
                            // A line cannot contain new line in editor (then its just two lines in editor).
                            if (code.endsWith('\n')) {
                                code = code.substr(0, code.length - 1);
                            }
                            cellInfo.source.push(code);
                        }
                    }
                });
            }
            if (cellInfo.index !== -1) {
                emitCell(finalOffset);
            }
        });
    }
}
exports.AlternativeJsonNotebookContentProvider = AlternativeJsonNotebookContentProvider;
function getCellCode(document) {
    if (document.lineCount === 0) {
        return [];
    }
    if (document.lineCount === 1) {
        return [document.lineAt(0).text];
    }
    const lineCount = document.lineCount;
    return new Array(lineCount).fill('').map((_, i) => document.lineAt(i).text);
}
//# sourceMappingURL=alternativeContentProvider.json.js.map