"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEditsFromRealDiff = createEditsFromRealDiff;
exports.createEditsFromPseudoDiff = createEditsFromPseudoDiff;
const editGeneration_1 = require("./editGeneration");
const indentationGuesser_1 = require("./indentationGuesser");
function createEditsFromRealDiff(code, diff, reporter) {
    const edits = [];
    let diffLineIndex = findChuck(diff);
    if (diffLineIndex === -1) {
        reporter?.warning('No chunk header found in the diff.');
        diffLineIndex = 0;
    }
    function handleLineContentMismatch(diffLine, code, originalLineIndex) {
        for (let i = originalLineIndex; i < code.length; i++) {
            if (code[i] === diffLine) {
                reporter?.recovery(originalLineIndex, i);
                originalLineIndex = i;
                return true;
            }
        }
        for (let i = originalLineIndex - 1; i >= 0; i--) {
            if (code[i] === diffLine) {
                reporter?.recovery(originalLineIndex, i);
                originalLineIndex = i;
                return true;
            }
        }
        reporter?.warning(`Diff line does not match original content: Not found,`);
        return false;
    }
    let originalLineIndex = 0;
    while (diffLineIndex < diff.length && originalLineIndex <= code.length) {
        const diffLine = diff[diffLineIndex];
        if (diffLine.length === 0) {
            break;
        }
        const firstChar = diffLine.charCodeAt(0);
        switch (firstChar) {
            case 64 /* CharCode.AtSign */: {
                const match = /^@@ -(\d+),?\d* \+(\d+),?\d* @@/.exec(diffLine);
                if (match) {
                    const originalLineHint = parseInt(match[1]);
                    originalLineIndex = originalLineHint - 1;
                }
                else {
                    reporter?.warning(`Invalid chunk header found in the diff: ${diffLine}`);
                }
                break;
            }
            case 43 /* CharCode.Plus */: {
                const noEOL = isNextLineNoEOLMarker(diff, diffLineIndex);
                edits.push(new editGeneration_1.LinesEdit(originalLineIndex, originalLineIndex, [diffLine.substring(1)], '', noEOL ? '' : '\n'));
                break;
            }
            case 45 /* CharCode.Dash */:
                if (diffLine.substring(1) !== code[originalLineIndex]) {
                    if (!handleLineContentMismatch(diffLine.substring(1), code, originalLineIndex)) {
                        break; // don't do the delete
                    }
                }
                edits.push(new editGeneration_1.LinesEdit(originalLineIndex, originalLineIndex + 1, []));
                originalLineIndex++;
                break;
            case 92 /* CharCode.Backslash */: {
                // ignore, already handled for insert, and not relevant for delete
                break;
            }
            default: {
                if (diffLine.substring(1) === code[originalLineIndex] || diffLine === code[originalLineIndex]) {
                    originalLineIndex++;
                }
                else {
                    if (handleLineContentMismatch(diffLine.substring(1), code, originalLineIndex)) {
                        originalLineIndex++;
                    }
                }
                break;
            }
        }
        diffLineIndex++;
    }
    return edits;
}
function isNextLineNoEOLMarker(diff, i) {
    return i + 1 < diff.length && diff[i + 1].charCodeAt(0) === 92 /* CharCode.Backslash */;
}
function findChuck(diff) {
    for (let i = 0; i < diff.length; i++) {
        if (diff[i].startsWith('@@')) {
            return i;
        }
    }
    return -1;
}
var Match;
(function (Match) {
    Match[Match["No"] = 0] = "No";
    Match[Match["Yes"] = 1] = "Yes";
    Match[Match["Similar"] = 2] = "Similar";
})(Match || (Match = {}));
function createEditsFromPseudoDiff(code, diff, reporter) {
    const diffLineInfos = getLineInfos(diff);
    const codeIndentInfo = (0, indentationGuesser_1.guessIndentation)(code, 4, false);
    const diffTabSize = getTabSize(diffLineInfos);
    let indentDiff;
    function compareLine(diffLineInfo, codeLine) {
        const diffLine = diffLineInfo.content;
        const codeIndentLength = getIndentLength(codeLine);
        let i = diffLineInfo.indentLength, k = codeIndentLength;
        let charactersMatched = 0;
        // ignore the leading indentation
        while (i < diffLine.length && k < codeLine.length) {
            if (diffLine.charCodeAt(i) !== codeLine.charCodeAt(k)) {
                break;
            }
            i++;
            k++;
            charactersMatched++;
        }
        if (i < diffLine.length || k < codeLine.length) {
            return (((codeLine.length - codeIndentLength) * 3 / 4 < charactersMatched) && ((diffLine.length - diffLineInfo.indentLength) * 3 / 4 < charactersMatched)) ? Match.Similar : Match.No;
        }
        if (indentDiff === undefined) {
            const diffIndent = (0, indentationGuesser_1.computeIndentLevel2)(diffLine, diffTabSize);
            if (diffIndent >= 0) {
                const codeIndent = (0, indentationGuesser_1.computeIndentLevel2)(codeLine, codeIndentInfo.tabSize);
                indentDiff = codeIndent - diffIndent;
            }
        }
        return Match.Yes;
    }
    function handleLineContentMismatch(diffLineInfo, code, originalLineIndex) {
        for (let i = originalLineIndex; i < code.length; i++) {
            if (compareLine(diffLineInfo, code[i]) === Match.Yes) {
                reporter?.recovery(originalLineIndex, i);
                return i;
            }
        }
        reporter?.warning("Unable to find a matching line for the diff line: " + diffLineInfo.content);
        return -1;
    }
    function findFirstOccurrenceOfLine(diffLineInfo, code) {
        for (let i = 0; i < code.length; i++) {
            if (compareLine(diffLineInfo, code[i]) === Match.Yes) {
                return i;
            }
        }
        return 0;
    }
    const edits = [];
    let diffLineIndex = 0;
    let originalLineIndex = 0;
    if (diffLineInfos.length > 0) {
        originalLineIndex = findFirstOccurrenceOfLine(diffLineInfos[0], code);
    }
    while (diffLineIndex < diffLineInfos.length && originalLineIndex < code.length) {
        const diffLineInfo = diffLineInfos[diffLineIndex];
        switch (diffLineInfo.op) {
            case Op.Insert: {
                const codeLineContent = adjustIndenation(diffLineInfo, diffTabSize, indentDiff ?? 0, codeIndentInfo);
                edits.push(new editGeneration_1.LinesEdit(originalLineIndex, originalLineIndex, [codeLineContent]));
                break;
            }
            case Op.Delete: {
                const codeLine = code[originalLineIndex];
                const match = compareLine(diffLineInfo, codeLine);
                if (match === Match.No) {
                    const line = handleLineContentMismatch(diffLineInfo, code, originalLineIndex);
                    if (line !== -1) {
                        originalLineIndex = line;
                    }
                    else {
                        break; // do not delete
                    }
                }
                const nextDiffLine = diffLineInfos[diffLineIndex + 1];
                if (nextDiffLine?.op === Op.Insert) {
                    if (nextDiffLine.indentLength === diffLineInfo.indentLength) {
                        // special handling of the case where an insert follows the remove and they use the same indentation
                        const newContent = getIndent(codeLine) + nextDiffLine.content.substring(nextDiffLine.indentLength);
                        edits.push(new editGeneration_1.LinesEdit(originalLineIndex, originalLineIndex + 1, [newContent]));
                        diffLineIndex++;
                        originalLineIndex++;
                        break;
                    }
                }
                edits.push(new editGeneration_1.LinesEdit(originalLineIndex, originalLineIndex + 1, []));
                originalLineIndex++;
                break;
            }
            default: {
                const match = compareLine(diffLineInfo, code[originalLineIndex]);
                if (match === Match.No) {
                    const line = handleLineContentMismatch(diffLineInfo, code, originalLineIndex);
                    if (line !== -1) {
                        originalLineIndex = line;
                    }
                    else {
                        break; // do not increase originalLineIndex
                    }
                }
                else if (match === Match.Similar) {
                    const codeLineContent = adjustIndenation(diffLineInfo, diffTabSize, indentDiff ?? 0, codeIndentInfo);
                    edits.push(new editGeneration_1.LinesEdit(originalLineIndex, originalLineIndex + 1, [codeLineContent]));
                }
                originalLineIndex++;
                break;
            }
        }
        diffLineIndex++;
    }
    if (originalLineIndex === code.length && diffLineIndex < diffLineInfos.length) {
        // there are still some lines to add
        for (; diffLineIndex < diffLineInfos.length; diffLineIndex++) {
            const diffLineInfo = diffLineInfos[diffLineIndex];
            if (diffLineInfo.op === Op.Insert) {
                const codeLineContent = adjustIndenation(diffLineInfo, diffTabSize, indentDiff ?? 0, codeIndentInfo);
                edits.push(new editGeneration_1.LinesEdit(originalLineIndex, originalLineIndex, [codeLineContent], '\n', ''));
            }
        }
    }
    return edits;
}
function isWhiteSpace(charCode) {
    return charCode === 32 /* CharCode.Space */ || charCode === 9 /* CharCode.Tab */;
}
function isPlusOrMinus(charCode) {
    return charCode === 45 /* CharCode.Dash */ || charCode === 43 /* CharCode.Plus */;
}
function getIndentLength(line) {
    let i = 0;
    while (i < line.length && isWhiteSpace(line.charCodeAt(i))) {
        i++;
    }
    return i;
}
function getIndent(line) {
    let i = 0;
    while (i < line.length && isWhiteSpace(line.charCodeAt(i))) {
        i++;
    }
    return line.substring(0, i);
}
function adjustIndenation(diffLineInfo, diffLineTabSize, indentDifference, codeIndentInfo) {
    if (indentDifference === 0 && ((!codeIndentInfo.insertSpaces && diffLineInfo.indentKind === IndentKind.Tabs) || (codeIndentInfo.insertSpaces && diffLineInfo.indentKind === IndentKind.Spaces))) {
        return diffLineInfo.content;
    }
    const diffIndent = (0, indentationGuesser_1.computeIndentLevel2)(diffLineInfo.content, diffLineTabSize);
    const newIndentation = codeIndentInfo.insertSpaces ? ' '.repeat(codeIndentInfo.tabSize * (diffIndent + indentDifference)) : '\t'.repeat(diffIndent + indentDifference);
    return newIndentation + diffLineInfo.content.substring(diffLineInfo.indentLength);
}
var Op;
(function (Op) {
    Op[Op["Equal"] = 0] = "Equal";
    Op[Op["Insert"] = 1] = "Insert";
    Op[Op["Delete"] = -1] = "Delete";
})(Op || (Op = {}));
var IndentKind;
(function (IndentKind) {
    IndentKind[IndentKind["undefined"] = 0] = "undefined";
    IndentKind[IndentKind["Tabs"] = 1] = "Tabs";
    IndentKind[IndentKind["Spaces"] = 2] = "Spaces";
    IndentKind[IndentKind["Mixed"] = 3] = "Mixed";
})(IndentKind || (IndentKind = {}));
function udpateIndentInfo(lineInfo) {
    let indentKind = IndentKind.undefined;
    let indentLength = 0;
    const line = lineInfo.content;
    if (line.length > 0) {
        const indentChar = line.charCodeAt(0);
        if (isWhiteSpace(indentChar)) {
            indentLength++;
            indentKind = indentChar === 32 /* CharCode.Space */ ? IndentKind.Spaces : IndentKind.Tabs;
            while (indentLength < line.length) {
                const charCode = line.charCodeAt(indentLength);
                if (!isWhiteSpace(charCode)) {
                    break;
                }
                indentLength++;
                if (charCode !== indentChar) {
                    indentKind = IndentKind.Mixed;
                }
            }
        }
    }
    lineInfo.indentKind = indentKind;
    lineInfo.indentLength = indentLength;
}
function getLineInfos(diffLines) {
    const result = [];
    for (let i = 0; i < diffLines.length; i++) {
        const line = diffLines[i];
        const lineInfo = {
            content: line,
            op: Op.Equal,
            indentKind: IndentKind.undefined,
            indentLength: 0
        };
        if (line.length > 0) {
            if (isPlusOrMinus(line.charCodeAt(0))) {
                lineInfo.op = line.charCodeAt(0) === 45 /* CharCode.Dash */ ? Op.Delete : Op.Insert;
                if (line.length > 1 && line.charCodeAt(1) === 32 /* CharCode.Space */) {
                    lineInfo.content = line.substring(1);
                    // replace the + or - with a space if the remaining indentation is odd
                    if (getIndentLength(lineInfo.content) % 2 === 1) {
                        lineInfo.content = ' ' + lineInfo.content;
                    }
                }
                else {
                    lineInfo.content = line.substring(1);
                }
            }
            udpateIndentInfo(lineInfo);
        }
        result.push(lineInfo);
    }
    sanitizeLineInfos(result);
    return result;
}
function sanitizeLineInfos(lineInfos) {
    let min = Number.MAX_VALUE;
    for (const lineInfo of lineInfos) {
        if (lineInfo.indentKind !== IndentKind.Spaces || lineInfo.indentLength === 0) {
            return;
        }
        if (lineInfo.indentLength < min) {
            min = lineInfo.indentLength;
        }
    }
    if (min > 0) {
        for (const lineInfo of lineInfos) {
            lineInfo.indentLength -= min;
            lineInfo.content = lineInfo.content.substring(min);
        }
    }
}
function getTabSize(lineInfos) {
    return 4;
}
//# sourceMappingURL=editFromDiffGeneration.js.map