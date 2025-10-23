"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlternativeXmlNotebookContentProvider = void 0;
exports.isXmlContent = isXmlContent;
const languages_1 = require("../../../util/common/languages");
const types_1 = require("../../../util/common/types");
const vscodeTypes_1 = require("../../../vscodeTypes");
const alternativeContentProvider_1 = require("./alternativeContentProvider");
const alternativeNotebookDocument_1 = require("./alternativeNotebookDocument");
const helpers_1 = require("./helpers");
const arraysFind_1 = require("../../../util/vs/base/common/arraysFind");
const StartDelimter = `<VSCode.Cell `;
const StartEmptyCellDelimter = `<VSCode.Cell>`;
const EndDelimter = `</VSCode.Cell>`;
function generatePartialStartDelimiterWithId(id) {
    return `${StartDelimter}id="${id}" `;
}
function generateCellMarker(cell) {
    return `${generatePartialStartDelimiterWithId(cell.id)}language="${cell.language}">`;
}
function isXmlContent(text) {
    return text.includes(StartDelimter) || text.includes(EndDelimter) || text.includes(StartEmptyCellDelimter);
}
class AlternativeXmlDocument extends alternativeNotebookDocument_1.AlternativeNotebookDocument {
    constructor(text, cellOffsetMap, notebook) {
        super(text, notebook);
        this.cellOffsetMap = cellOffsetMap;
    }
    fromCellPosition(cell, position) {
        const cellSummary = (0, helpers_1.summarize)(cell);
        const cellMarker = generateCellMarker(cellSummary);
        const eolLength = cell.document.eol === vscodeTypes_1.EndOfLine.LF ? 1 : 2;
        const alternativeContentText = this.getText();
        const offsetInCell = cell.document.offsetAt(position);
        const offset = alternativeContentText.indexOf(cellMarker) + cellMarker.length + eolLength + offsetInCell;
        return this.positionAt(offset);
    }
    toCellPosition(position) {
        const offset = this.offsetAt(position);
        const cell = (0, arraysFind_1.findLast)(this.cellOffsetMap, (cell) => cell.offset <= offset);
        if (!cell) {
            return undefined;
        }
        const cellPosition = cell.cell.document.positionAt(offset - cell.offset);
        return { cell: cell.cell, position: cellPosition };
    }
}
class AlternativeXmlNotebookContentProvider extends alternativeContentProvider_1.BaseAlternativeNotebookContentProvider {
    constructor() {
        super('xml');
    }
    stripCellMarkers(text) {
        const lines = text.split(helpers_1.EOL);
        if (lines.length && (lines[0].startsWith(StartDelimter) || lines[0].startsWith(StartEmptyCellDelimter))) {
            lines.shift();
        }
        if (lines.length && lines[lines.length - 1].trim().endsWith(EndDelimter)) {
            lines[lines.length - 1] = lines[lines.length - 1].substring(0, lines[lines.length - 1].lastIndexOf(EndDelimter));
        }
        return lines.join(helpers_1.EOL);
    }
    getSummaryOfStructure(notebook, cellsToInclude, existingCodeMarker) {
        const lines = [];
        const existingCodeMarkerWithComment = `// ${existingCodeMarker}`;
        notebook.getCells().forEach((cell) => {
            if (cellsToInclude.includes(cell)) {
                const cellSummary = (0, helpers_1.summarize)(cell);
                lines.push(generateCellMarker(cellSummary));
                if (cellSummary.source.length && cellSummary.source[0].trim().length) {
                    lines.push(cellSummary.source[0]);
                    lines.push(existingCodeMarkerWithComment);
                }
                else if (cellSummary.source.length && cellSummary.source.some(line => line.trim().length)) {
                    cellSummary.source = [existingCodeMarkerWithComment, cellSummary.source.filter(line => line.trim().length)[0], existingCodeMarkerWithComment];
                }
                else {
                    lines.push(existingCodeMarkerWithComment);
                }
                lines.push(EndDelimter);
            }
            else if (!lines.length || lines[lines.length - 1] !== existingCodeMarkerWithComment) {
                lines.push(existingCodeMarkerWithComment);
            }
        });
        return lines.join(helpers_1.EOL);
    }
    async *parseAlternateContent(notebookOrUri, inputStream, token) {
        const isNotebook = !(0, types_1.isUri)(notebookOrUri);
        const cellIdMap = isNotebook ? (0, helpers_1.getCellIdMap)(notebookOrUri) : new Map();
        let index = -1;
        let endDelimiterSeen = false;
        const cellIdsSeen = new Set();
        let previousLineEndedWithEndCellMarker = false;
        let previousLine = undefined;
        const defaultLanguage = isNotebook ? (0, languages_1.getLanguage)((0, helpers_1.getDefaultLanguage)(notebookOrUri)).languageId : undefined;
        for await (const lineOfText of inputStream) {
            if (token.isCancellationRequested) {
                break;
            }
            const line = lineOfText.value;
            if ((line.startsWith(StartDelimter) || line.startsWith(StartEmptyCellDelimter)) && (index < 0 || (endDelimiterSeen || (previousLineEndedWithEndCellMarker && previousLine)))) {
                if (!endDelimiterSeen && previousLineEndedWithEndCellMarker && previousLine) {
                    // Last line didn't finish, emit that, but strip the end delimiter.
                    previousLine.line = previousLine.line.substring(0, previousLine.line.lastIndexOf(EndDelimter));
                    yield previousLine;
                    yield { type: 'end', index: previousLine.index };
                }
                previousLineEndedWithEndCellMarker = false;
                previousLine = undefined;
                index += 1;
                endDelimiterSeen = false;
                const lineOfCellText = { type: 'start', index, uri: undefined, language: undefined, kind: vscodeTypes_1.NotebookCellKind.Code };
                const cellParts = extractCellParts(line, defaultLanguage);
                // LLM returns duplicate cell with the same id.
                // We need tests for this.
                // this is a work around to treat subsequent cells as new cells.
                if (cellParts.id && cellIdMap.get(cellParts.id)?.document.languageId === cellParts.language) {
                    if (cellIdsSeen.has(cellParts.id)) {
                        cellParts.id = '';
                    }
                    else {
                        cellIdsSeen.add(cellParts.id);
                    }
                }
                else {
                    // Possible duplicate cell with the same id but different language.
                    // In such cases, treat them as new cells.
                    cellParts.id = '';
                }
                const cell = cellIdMap.get(cellParts.id)?.document.languageId === cellParts.language ? cellIdMap.get(cellParts.id) : undefined;
                lineOfCellText.id = cellParts.id;
                lineOfCellText.language = cellParts.language;
                lineOfCellText.uri = cell?.document.uri;
                lineOfCellText.kind = cell?.kind || (lineOfCellText.language === 'markdown' ? vscodeTypes_1.NotebookCellKind.Markup : vscodeTypes_1.NotebookCellKind.Code);
                yield lineOfCellText;
            }
            else if (line.startsWith(EndDelimter)) {
                if (previousLineEndedWithEndCellMarker && previousLine) {
                    // The last line somehow ends with the cell marker (must have been added by the user),
                    // yield the previous line.
                    yield previousLine;
                }
                endDelimiterSeen = true;
                previousLineEndedWithEndCellMarker = false;
                previousLine = undefined;
                yield { type: 'end', index };
            }
            else if (index >= 0) {
                if (previousLineEndedWithEndCellMarker && previousLine) {
                    // Some how we have two subsequent lines that end with the cell marker,
                    // Weird, shoudl not happen, if it does, yield the previous line.
                    yield previousLine;
                    previousLine = undefined;
                }
                previousLineEndedWithEndCellMarker = line.endsWith(EndDelimter);
                if (previousLineEndedWithEndCellMarker) {
                    previousLine = { type: 'line', index, line };
                }
                else {
                    yield { type: 'line', index, line };
                }
            }
        }
    }
    getAlternativeDocument(notebook, excludeMarkdownCells) {
        const cells = notebook.getCells().filter(cell => excludeMarkdownCells ? cell.kind !== vscodeTypes_1.NotebookCellKind.Markup : true).map(cell => (0, helpers_1.summarize)(cell));
        const cellContent = cells.map(cell => {
            const cellMarker = generateCellMarker(cell);
            const prefix = `${cellMarker}${helpers_1.EOL}`;
            return { content: `${prefix}${cell.source.join(helpers_1.EOL)}${helpers_1.EOL}${EndDelimter}`, prefix, cell: notebook.cellAt(cell.index) };
        });
        const content = cellContent.map(cell => cell.content).join(helpers_1.EOL);
        const cellOffsetMap = cellContent.map(cellContent => ({ offset: content.indexOf(cellContent.content) + cellContent.prefix.length, cell: cellContent.cell }));
        return new AlternativeXmlDocument(content, cellOffsetMap, notebook);
    }
}
exports.AlternativeXmlNotebookContentProvider = AlternativeXmlNotebookContentProvider;
function extractCellParts(line, defaultLanguage) {
    const idMatch = line.match(/id="([^"]+)"/);
    const languageMatch = line.match(/language="([^"]+)"/);
    if (!languageMatch) {
        if (isXmlContent(line) && typeof defaultLanguage === 'string') {
            // If we have a cell marker but no language, we assume the default language.
            return { id: idMatch ? idMatch[1].trim() : '', language: defaultLanguage };
        }
        throw new Error(`Invalid cell part in ${line}`);
    }
    // New cells will not have an id.
    return { id: idMatch ? idMatch[1].trim() : '', language: languageMatch[1].trim() };
}
//# sourceMappingURL=alternativeContentProvider.xml.js.map