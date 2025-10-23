"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlternativeTextNotebookContentProvider = void 0;
exports.generateCellTextMarker = generateCellTextMarker;
exports.lineMightHaveCellMarker = lineMightHaveCellMarker;
exports.getBlockComment = getBlockComment;
exports.getLineCommentStart = getLineCommentStart;
const languages_1 = require("../../../util/common/languages");
const types_1 = require("../../../util/common/types");
const vscodeTypes_1 = require("../../../vscodeTypes");
const alternativeContentProvider_1 = require("./alternativeContentProvider");
const alternativeNotebookDocument_1 = require("./alternativeNotebookDocument");
const helpers_1 = require("./helpers");
const arraysFind_1 = require("../../../util/vs/base/common/arraysFind");
function generateCellTextMarker(cell, lineComment) {
    const cellIdStr = cell.id ? `[id=${cell.id}] ` : '';
    return `${lineComment}%% vscode.cell ${cellIdStr}[language=${cell.language}]`;
}
function lineMightHaveCellMarker(line) {
    return line.toLowerCase().includes('vscode.cell');
}
class AlternativeTextDocument extends alternativeNotebookDocument_1.AlternativeNotebookDocument {
    constructor(text, cellOffsetMap, notebook) {
        super(text, notebook);
        this.cellOffsetMap = cellOffsetMap;
    }
    fromCellPosition(cell, position) {
        const cellSummary = (0, helpers_1.summarize)(cell);
        const lineCommentStart = getLineCommentStart(this.notebook);
        const cellMarker = generateCellTextMarker(cellSummary, lineCommentStart);
        const eolLength = cell.document.eol === vscodeTypes_1.EndOfLine.LF ? 1 : 2;
        const blockComment = getBlockComment(this.notebook);
        const alternativeContentText = this.getText();
        const offsetInCell = cell.document.offsetAt(position);
        const markdownOffset = cell.kind === vscodeTypes_1.NotebookCellKind.Markup ? blockComment[0].length + eolLength : 0;
        const offset = alternativeContentText.indexOf(cellMarker) + cellMarker.length + eolLength + markdownOffset + offsetInCell;
        return this.positionAt(offset);
    }
    toCellPosition(position) {
        const offset = this.offsetAt(position);
        const cell = (0, arraysFind_1.findLast)(this.cellOffsetMap, (cell) => cell.sourceOffset <= offset);
        if (!cell) {
            return undefined;
        }
        const cellPosition = cell.cell.document.positionAt(offset - cell.sourceOffset);
        return { cell: cell.cell, position: cellPosition };
    }
}
class AlternativeTextNotebookContentProvider extends alternativeContentProvider_1.BaseAlternativeNotebookContentProvider {
    constructor() {
        super('text');
    }
    stripCellMarkers(text) {
        const lines = text.split(helpers_1.EOL);
        if (lines.length && lineMightHaveCellMarker(lines[0])) {
            lines.shift();
            return lines.join(helpers_1.EOL);
        }
        else {
            return text;
        }
    }
    getSummaryOfStructure(notebook, cellsToInclude, existingCodeMarker) {
        const blockComment = getBlockComment(notebook);
        const lineCommentStart = getLineCommentStart(notebook);
        const existingCodeMarkerWithComment = `${lineCommentStart} ${existingCodeMarker}`;
        const lines = [];
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
                lines.push(generateAlternativeCellTextContent(cellSummary, lineCommentStart, blockComment).content);
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
        let inMarkdownCell = false;
        let isInTripleQuotes = false;
        let pendingTripleQuotes = false;
        let emittedStart = false;
        let cellIndex = -1;
        const lineCommentStart = getLineCommentStart(isNotebook ? notebookOrUri : undefined);
        const blockComment = getBlockComment(isNotebook ? notebookOrUri : undefined);
        const defaultLanguage = isNotebook ? (0, languages_1.getLanguage)((0, helpers_1.getDefaultLanguage)(notebookOrUri)).languageId : undefined;
        const cellIdsSeen = new Set();
        for await (const lineOfText of inputStream) {
            if (token.isCancellationRequested) {
                break;
            }
            const line = lineOfText.value;
            // Check for new cell delimiter
            // Sometimes LLM returns cells without the `vscode.cell` marker such as .
            const isLineCommentForEmptyCellWithoutCellMarker = line.startsWith(`${lineCommentStart}%% [`) && line.trimEnd().endsWith(']');
            const isLineCommentWithCellMarker = line.startsWith(`${lineCommentStart}%% vscode.cell`);
            // Attempt to extract only if we think we have a cell marker, else we end up doing this for every single line and thats expensive.
            const cellParts = (isLineCommentWithCellMarker || isLineCommentForEmptyCellWithoutCellMarker) ? extractCellParts(line, defaultLanguage) : undefined;
            if ((isLineCommentWithCellMarker || isLineCommentForEmptyCellWithoutCellMarker) && cellParts?.language) {
                if (pendingTripleQuotes) {
                    pendingTripleQuotes = false;
                }
                const lineOfCellText = { index: -1, uri: undefined, language: undefined, kind: vscodeTypes_1.NotebookCellKind.Code, emitted: false, type: 'start' };
                lineOfCellText.index = cellIndex += 1;
                lineOfCellText.emitted = false;
                // LLM returns duplicate cell with the same id.
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
                const cell = cellIdMap.get(cellParts.id);
                lineOfCellText.id = cellParts.id;
                lineOfCellText.language = cellParts.language;
                lineOfCellText.uri = cell?.document.uri;
                lineOfCellText.kind = cell?.kind || (lineOfCellText.language === 'markdown' ? vscodeTypes_1.NotebookCellKind.Markup : vscodeTypes_1.NotebookCellKind.Code);
                inMarkdownCell = lineOfCellText.language === 'markdown';
                isInTripleQuotes = false;
                if (emittedStart) {
                    yield { index: cellIndex - 1, type: 'end' };
                }
                emittedStart = true;
                yield lineOfCellText;
                continue;
            }
            if (!emittedStart) {
                continue;
            }
            if (inMarkdownCell) {
                if (!isInTripleQuotes) {
                    // Look for the opening triple quotes
                    if (line === blockComment[0]) {
                        isInTripleQuotes = true;
                    }
                    else {
                        // lineEmitted = true;
                        yield { index: cellIndex, line, type: 'line' };
                    }
                }
                else {
                    // We are in triple quotes
                    if (line === blockComment[1]) {
                        // Closing triple quotes found
                        isInTripleQuotes = false;
                        pendingTripleQuotes = true;
                    }
                    else {
                        yield { index: cellIndex, line, type: 'line' };
                    }
                }
            }
            else {
                // Non-markdown cell or default
                yield { index: cellIndex, line, type: 'line' };
            }
        }
        if (emittedStart) {
            yield { index: cellIndex, type: 'end' };
        }
    }
    getAlternativeDocument(notebook, excludeMarkdownCells) {
        const cells = notebook.getCells().filter(cell => excludeMarkdownCells ? cell.kind !== vscodeTypes_1.NotebookCellKind.Markup : true).map(cell => (0, helpers_1.summarize)(cell));
        const blockComment = getBlockComment(notebook);
        const lineCommentStart = getLineCommentStart(notebook);
        const cellContent = cells.map(cell => ({ ...generateAlternativeCellTextContent(cell, lineCommentStart, blockComment), cell: notebook.cellAt(cell.index) }));
        const content = cellContent.map(cell => cell.content).join(helpers_1.EOL);
        const cellOffsetMap = cellContent.map(cellContent => {
            const offset = content.indexOf(cellContent.content);
            const sourceOffset = offset + cellContent.prefix.length;
            return { offset, sourceOffset, cell: notebook.cellAt(cellContent.cell.index) };
        });
        return new AlternativeTextDocument(content, cellOffsetMap, notebook);
    }
}
exports.AlternativeTextNotebookContentProvider = AlternativeTextNotebookContentProvider;
function generateAlternativeCellTextContent(cell, lineCommentStart, blockComment) {
    const cellMarker = generateCellTextMarker(cell, lineCommentStart);
    const src = cell.source.join(helpers_1.EOL);
    const prefix = cell.language === 'markdown' ? `${cellMarker}${helpers_1.EOL}${blockComment[0]}${helpers_1.EOL}` : `${cellMarker}${helpers_1.EOL}`;
    const content = cell.language === 'markdown'
        ? `${prefix}${src}${helpers_1.EOL}${blockComment[1]}`
        : `${prefix}${src}`;
    return { content, prefix };
}
function getBlockComment(notebook) {
    if (!notebook) {
        return ['"""', '"""'];
    }
    const language = (0, languages_1.getLanguage)((0, helpers_1.getDefaultLanguage)(notebook));
    return language.blockComment ?? ['```', '```'];
}
function getLineCommentStart(notebook) {
    if (!notebook) {
        return '#';
    }
    const language = (0, languages_1.getLanguage)((0, helpers_1.getDefaultLanguage)(notebook));
    return language.lineComment.start || '#';
}
function extractCellParts(line, defaultLanguage) {
    const idMatch = line.match(/\[id=(.+?)\]/);
    const languageMatch = line.match(/\[language=(.+?)\]/);
    if (!languageMatch) {
        if (lineMightHaveCellMarker(line) && typeof defaultLanguage === 'string') {
            // If we have a cell marker but no language, we assume the default language.
            return { id: idMatch ? idMatch[1].trim() : '', language: defaultLanguage };
        }
        return;
    }
    return { id: idMatch ? idMatch[1].trim() : '', language: languageMatch[1].trim() };
}
//# sourceMappingURL=alternativeContentProvider.text.js.map