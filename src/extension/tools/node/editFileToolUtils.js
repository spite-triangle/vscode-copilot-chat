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
exports.ContentFormatError = exports.NoChangeError = exports.MultipleMatchesError = exports.NoMatchError = exports.EditError = void 0;
exports.findAndReplaceOne = findAndReplaceOne;
exports.applyEdit = applyEdit;
exports.createEditConfirmation = createEditConfirmation;
exports.canExistingFileBeEdited = canExistingFileBeEdited;
const l10n_1 = require("@vscode/l10n");
const promises_1 = require("fs/promises");
const os_1 = require("os");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const customInstructionsService_1 = require("../../../platform/customInstructions/common/customInstructionsService");
const offsetLineColumnConverter_1 = require("../../../platform/editing/common/offsetLineColumnConverter");
const textDocumentSnapshot_1 = require("../../../platform/editing/common/textDocumentSnapshot");
const fileSystemService_1 = require("../../../platform/filesystem/common/fileSystemService");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const glob = __importStar(require("../../../util/vs/base/common/glob"));
const map_1 = require("../../../util/vs/base/common/map");
const network_1 = require("../../../util/vs/base/common/network");
const platform_1 = require("../../../util/vs/base/common/platform");
const resources_1 = require("../../../util/vs/base/common/resources");
const uri_1 = require("../../../util/vs/base/common/uri");
const position_1 = require("../../../util/vs/editor/common/core/position");
const vscodeTypes_1 = require("../../../vscodeTypes");
/**
 * Base class for edit errors
 */
class EditError extends Error {
    constructor(message, kindForTelemetry) {
        super(message);
        this.kindForTelemetry = kindForTelemetry;
    }
}
exports.EditError = EditError;
/**
 * Error thrown when no match is found for a string replacement
 */
class NoMatchError extends EditError {
    constructor(message, file) {
        super(message, 'noMatchFound');
        this.file = file;
    }
}
exports.NoMatchError = NoMatchError;
/**
 * Error thrown when multiple matches are found for a string replacement
 */
class MultipleMatchesError extends EditError {
    constructor(message, file) {
        super(message, 'multipleMatchesFound');
        this.file = file;
    }
}
exports.MultipleMatchesError = MultipleMatchesError;
/**
 * Error thrown when the edit would result in no changes
 */
class NoChangeError extends EditError {
    constructor(message, file) {
        super(message, 'noChange');
        this.file = file;
    }
}
exports.NoChangeError = NoChangeError;
/**
 * Error thrown when there are issues with the content format
 */
class ContentFormatError extends EditError {
    constructor(message, file) {
        super(message, 'contentFormatError');
        this.file = file;
    }
}
exports.ContentFormatError = ContentFormatError;
/**
 * Escapes special regex characters in a string.
 */
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
/**
 * Calculates the similarity ratio between two strings using Levenshtein distance.
 * Returns a value between 0 (completely different) and 1 (identical).
 */
function calculateSimilarity(str1, str2) {
    if (str1 === str2) {
        return 1.0;
    }
    if (str1.length === 0) {
        return 0.0;
    }
    if (str2.length === 0) {
        return 0.0;
    }
    // Calculate Levenshtein distance
    const matrix = [];
    for (let i = 0; i <= str1.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= str2.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= str1.length; i++) {
        for (let j = 1; j <= str2.length; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(matrix[i - 1][j] + 1, // deletion
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }
    const distance = matrix[str1.length][str2.length];
    const maxLength = Math.max(str1.length, str2.length);
    // Return similarity ratio (1 - normalized distance)
    return 1 - distance / maxLength;
}
/**
 * Enhanced version of findAndReplaceOne with more robust matching strategies
 * and better error information.
 *
 * @param text The source text to search in
 * @param oldStr The string to find and replace
 * @param newStr The replacement string
 * @returns An object with the new text, match type, and additional match information
 */
function findAndReplaceOne(text, oldStr, newStr, eol) {
    // Strategy 1: Try exact match first (fastest)
    const exactResult = tryExactMatch(text, oldStr, newStr);
    if (exactResult.type !== 'none') {
        return exactResult;
    }
    // Strategy 2: Try whitespace-flexible matching
    const whitespaceResult = tryWhitespaceFlexibleMatch(text, oldStr, newStr, eol);
    if (whitespaceResult.type !== 'none') {
        return whitespaceResult;
    }
    // Strategy 3: Try line-by-line fuzzy matching
    const fuzzyResult = tryFuzzyMatch(text, oldStr, newStr, eol);
    if (fuzzyResult.type !== 'none') {
        return fuzzyResult;
    }
    // Strategy 4: Try similarity-based matching as last resort
    const similarityResult = trySimilarityMatch(text, oldStr, newStr, eol);
    if (similarityResult.type !== 'none') {
        return similarityResult;
    }
    // No matches found with any strategy
    return {
        text,
        type: 'none',
        editPosition: [],
        suggestion: `Try making your search string more specific or checking for whitespace/formatting differences.`
    };
}
/**
 * Tries to find an exact match of oldStr in text.
 */
function tryExactMatch(text, oldStr, newStr) {
    const matchPositions = [];
    for (let searchIdx = 0;;) {
        const idx = text.indexOf(oldStr, searchIdx);
        if (idx === -1) {
            break;
        }
        matchPositions.push(idx);
        searchIdx = idx + oldStr.length;
    }
    if (matchPositions.length === 0) {
        return { text, editPosition: [], type: 'none' };
    }
    // Check for multiple exact occurrences.
    if (matchPositions.length > 1) {
        return {
            text,
            type: 'multiple',
            editPosition: matchPositions.map(idx => [idx, idx + oldStr.length]),
            strategy: 'exact',
            matchPositions,
            suggestion: "Multiple exact matches found. Make your search string more specific."
        };
    }
    // Exactly one exact match found.
    const firstExactIdx = matchPositions[0];
    const replaced = text.slice(0, firstExactIdx) + newStr + text.slice(firstExactIdx + oldStr.length);
    return {
        text: replaced,
        type: 'exact',
        editPosition: [[firstExactIdx, firstExactIdx + oldStr.length]],
    };
}
/**
 * Tries to match using flexible whitespace handling.
 */
function tryWhitespaceFlexibleMatch(text, oldStr, newStr, eol) {
    const haystack = text.split(eol).map(line => line.trim());
    const needle = oldStr.trim().split(eol).map(line => line.trim());
    needle.push(''); // trailing newline to match until the end of a line
    const convert = new offsetLineColumnConverter_1.OffsetLineColumnConverter(text);
    const matchedLines = [];
    for (let i = 0; i <= haystack.length - needle.length; i++) {
        if (haystack.slice(i, i + needle.length).join('\n') === needle.join('\n')) {
            matchedLines.push(i);
            i += needle.length - 1;
        }
    }
    if (matchedLines.length === 0) {
        return {
            text,
            editPosition: [],
            type: 'none',
            suggestion: 'No whitespace-flexible match found.'
        };
    }
    const positions = matchedLines.map(match => convert.positionToOffset(new position_1.Position(match + 1, 1)));
    if (matchedLines.length > 1) {
        return {
            text,
            type: 'multiple',
            editPosition: [],
            matchPositions: positions,
            suggestion: "Multiple matches found with flexible whitespace. Make your search string more unique.",
            strategy: 'whitespace',
        };
    }
    // Exactly one whitespace-flexible match found
    const startIdx = positions[0];
    const endIdx = convert.positionToOffset(new position_1.Position(matchedLines[0] + 1 + needle.length, 1));
    const replaced = text.slice(0, startIdx) + newStr + eol + text.slice(endIdx);
    return {
        text: replaced,
        editPosition: [[startIdx, endIdx]],
        type: 'whitespace',
    };
}
/**
 * Tries to match using the traditional fuzzy approach with line-by-line matching.
 */
function tryFuzzyMatch(text, oldStr, newStr, eol) {
    // Handle trailing newlines
    const hasTrailingLF = oldStr.endsWith(eol);
    if (hasTrailingLF) {
        oldStr = oldStr.slice(0, -eol.length);
    }
    // Build a regex pattern where each line is matched exactly
    // but allows for trailing spaces/tabs and flexible newline formats
    const lines = oldStr.split(eol);
    const pattern = lines
        .map((line, i) => {
        const escaped = escapeRegex(line);
        return i < lines.length - 1 || hasTrailingLF
            ? `${escaped}[ \\t]*\\r?\\n`
            : `${escaped}[ \\t]*`;
    })
        .join('');
    const regex = new RegExp(pattern, 'g');
    const matches = Array.from(text.matchAll(regex));
    if (matches.length === 0) {
        return {
            text,
            editPosition: [],
            type: 'none',
            suggestion: 'No fuzzy match found.'
        };
    }
    if (matches.length > 1) {
        return {
            text,
            type: 'multiple',
            editPosition: [],
            suggestion: "Multiple fuzzy matches found. Try including more context in your search string.",
            strategy: 'fuzzy',
            matchPositions: matches.map(match => match.index || 0),
        };
    }
    // Exactly one fuzzy match found
    const match = matches[0];
    const startIdx = match.index || 0;
    const endIdx = startIdx + match[0].length;
    const replaced = text.slice(0, startIdx) + newStr + text.slice(endIdx);
    return {
        text: replaced,
        type: 'fuzzy',
        editPosition: [[startIdx, endIdx]],
    };
}
/**
 * Tries to match based on overall string similarity as a last resort.
 * Only works for relatively small strings to avoid performance issues.
 */
function trySimilarityMatch(text, oldStr, newStr, eol, threshold = 0.95) {
    // Skip similarity matching for very large strings or too many lines
    if (oldStr.length > 1000 || oldStr.split(eol).length > 20) {
        return { text, editPosition: [], type: 'none' };
    }
    const lines = text.split(eol);
    const oldLines = oldStr.split(eol);
    // Don't try similarity matching for very large files
    if (lines.length > 1000) {
        return { text, editPosition: [], type: 'none' };
    }
    let bestMatch = { startLine: -1, startOffset: 0, oldLength: 0, similarity: 0 };
    let startOffset = 0;
    // Sliding window approach to find the best matching section
    for (let i = 0; i <= lines.length - oldLines.length; i++) {
        let totalSimilarity = 0;
        let oldLength = 0;
        // Calculate similarity for each line in the window
        for (let j = 0; j < oldLines.length; j++) {
            const similarity = calculateSimilarity(oldLines[j], lines[i + j]);
            totalSimilarity += similarity;
            oldLength += lines[i + j].length;
        }
        const avgSimilarity = totalSimilarity / oldLines.length;
        if (avgSimilarity > threshold && avgSimilarity > bestMatch.similarity) {
            bestMatch = { startLine: i, startOffset, similarity: avgSimilarity, oldLength: oldLength + (oldLines.length - 1) * eol.length };
        }
        startOffset += lines[i].length + eol.length;
    }
    if (bestMatch.startLine === -1) {
        return { text, editPosition: [], type: 'none' };
    }
    // Replace the matched section
    const newLines = [
        ...lines.slice(0, bestMatch.startLine),
        ...newStr.split(eol),
        ...lines.slice(bestMatch.startLine + oldLines.length)
    ];
    return {
        text: newLines.join(eol),
        type: 'similarity',
        editPosition: [[bestMatch.startOffset, bestMatch.startOffset + bestMatch.oldLength]],
        similarity: bestMatch.similarity,
        suggestion: `Used similarity matching (${(bestMatch.similarity * 100).toFixed(1)}% similar). Verify the replacement.`
    };
}
// Function to generate a simple patch
function getPatch({ fileContents, oldStr, newStr }) {
    // Simplified patch generation - in a real implementation this would generate proper diff hunks
    return [{
            oldStart: 1,
            oldLines: (oldStr.match(/\n/g) || []).length + 1,
            newStart: 1,
            newLines: (newStr.match(/\n/g) || []).length + 1,
            lines: []
        }];
}
// Apply string edit function
async function applyEdit(uri, old_string, new_string, workspaceService, notebookService, alternativeNotebookContent, languageModel) {
    let originalFile;
    let updatedFile;
    const edits = [];
    const filePath = uri.toString();
    try {
        // Use VS Code workspace API to get the document content
        const document = notebookService.hasSupportedNotebooks(uri) ?
            await workspaceService.openNotebookDocumentAndSnapshot(uri, alternativeNotebookContent.getFormat(languageModel)) :
            await workspaceService.openTextDocumentAndSnapshot(uri);
        originalFile = document.getText();
        const eol = document instanceof textDocumentSnapshot_1.TextDocumentSnapshot && document.eol === vscodeTypes_1.EndOfLine.CRLF ? '\r\n' : '\n';
        old_string = old_string.replace(/\r?\n/g, eol);
        new_string = new_string.replace(/\r?\n/g, eol);
        if (old_string === '') {
            if (originalFile !== '') {
                // If the file already exists and we're creating a new file with empty old_string
                throw new ContentFormatError('File already exists. Please provide a non-empty old_string for replacement.', filePath);
            }
            // Create new file case
            updatedFile = new_string;
            edits.push(vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(0, 0), new_string));
        }
        else {
            // Edit existing file case
            if (new_string === '') {
                // For empty new string, handle special deletion case
                const result = findAndReplaceOne(originalFile, old_string, new_string, eol);
                if (result.type === 'none') {
                    // Try with newline appended if the original doesn't end with newline
                    if (!old_string.endsWith(eol) && originalFile.includes(old_string + eol)) {
                        updatedFile = originalFile.replace(old_string + eol, new_string);
                        if (result.editPosition.length) {
                            const [start, end] = result.editPosition[0];
                            const range = new vscodeTypes_1.Range(document.positionAt(start), document.positionAt(end));
                            edits.push(vscodeTypes_1.TextEdit.delete(range));
                        }
                    }
                    else {
                        const suggestion = result?.suggestion || 'The string to replace must match exactly.';
                        throw new NoMatchError(`Could not find matching text to replace. ${suggestion}`, filePath);
                    }
                }
                else if (result.type === 'multiple') {
                    const suggestion = result?.suggestion || 'Please provide a more specific string.';
                    throw new MultipleMatchesError(`Multiple matches found for the text to replace. ${suggestion}`, filePath);
                }
                else {
                    updatedFile = result.text;
                    if (result.editPosition.length) {
                        const [start, end] = result.editPosition[0];
                        const range = new vscodeTypes_1.Range(document.positionAt(start), document.positionAt(end));
                        edits.push(vscodeTypes_1.TextEdit.delete(range));
                    }
                }
            }
            else {
                // Normal replacement case using the enhanced matcher
                const result = findAndReplaceOne(originalFile, old_string, new_string, eol);
                if (result.type === 'none') {
                    const suggestion = result?.suggestion || 'The string to replace must match exactly or be a valid fuzzy match.';
                    throw new NoMatchError(`Could not find matching text to replace. ${suggestion}`, filePath);
                }
                else if (result.type === 'multiple') {
                    const suggestion = result?.suggestion || 'Please provide a more specific string.';
                    throw new MultipleMatchesError(`Multiple matches found for the text to replace. ${suggestion}`, filePath);
                }
                else {
                    updatedFile = result.text;
                    if (result.editPosition.length) {
                        const [start, end] = result.editPosition[0];
                        const range = new vscodeTypes_1.Range(document.positionAt(start), document.positionAt(end));
                        edits.push(vscodeTypes_1.TextEdit.replace(range, new_string));
                    }
                    // If we used similarity matching, add a warning
                    if (result.type === 'similarity' && result?.similarity) {
                        console.warn(`Used similarity matching with ${(result.similarity * 100).toFixed(1)}% confidence. Verify the result is correct.`);
                    }
                }
            }
            if (updatedFile === originalFile) {
                throw new NoChangeError('Original and edited file match exactly. Failed to apply edit. Use the ${ToolName.ReadFile} tool to re-read the file and and determine the correct edit.', filePath);
            }
        }
        // Generate a simple patch
        const patch = getPatch({
            fileContents: originalFile,
            oldStr: originalFile,
            newStr: updatedFile,
        });
        return { patch, updatedFile, edits };
    }
    catch (error) {
        // If the file doesn't exist and we're creating a new file with empty oldString
        if (old_string === '' && error.code === 'ENOENT') {
            originalFile = '';
            updatedFile = new_string;
            const patch = getPatch({
                fileContents: originalFile,
                oldStr: originalFile,
                newStr: updatedFile,
            });
            edits.push(vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(0, 0), new_string));
            return { patch, updatedFile, edits };
        }
        if (error instanceof EditError) {
            throw error;
        }
        else {
            throw new EditError(`Failed to edit file: ${error.message}`, 'unknownError');
        }
    }
}
const ALWAYS_CHECKED_EDIT_PATTERNS = {
    '**/.vscode/*.json': false,
};
// Path prefixes under which confirmation is unconditionally required
const platformConfirmationRequiredPaths = (platform_1.isWindows
    ? [process.env.APPDATA + '/**', process.env.LOCALAPPDATA + '/**', (0, os_1.homedir)() + '/.*', (0, os_1.homedir)() + '/.*/**']
    : [(0, os_1.homedir)() + '/.*', (0, os_1.homedir)() + '/.*/**']).map(p => glob.parse(p));
/**
 * Returns a function that returns whether a URI is approved for editing without
 * further user confirmation.
 */
function makeUriConfirmationChecker(configuration, workspaceService, customInstructionsService) {
    const patterns = configuration.getNonExtensionConfig('chat.tools.edits.autoApprove');
    const checks = new map_1.ResourceMap();
    const getPatterns = (wf) => {
        let arr = checks.get(wf);
        if (arr) {
            return arr;
        }
        const ignoreCasing = resources_1.extUriBiasedIgnorePathCase.ignorePathCasing(wf);
        arr = { patterns: [], ignoreCasing };
        for (const obj of [patterns, ALWAYS_CHECKED_EDIT_PATTERNS]) {
            if (obj) {
                for (const [pattern, isApproved] of Object.entries(obj)) {
                    arr.patterns.push({ pattern: glob.parse({ base: wf.fsPath, pattern: ignoreCasing ? pattern.toLowerCase() : pattern }), isApproved });
                }
            }
        }
        checks.set(wf, arr);
        return arr;
    };
    function checkUri(uri) {
        const workspaceFolder = workspaceService.getWorkspaceFolder(uri);
        if (!workspaceFolder && !customInstructionsService.isExternalInstructionsFile(uri) && uri.scheme !== network_1.Schemas.untitled) {
            return 4 /* ConfirmationCheckResult.OutsideWorkspace */;
        }
        let ok = true;
        let fsPath = uri.fsPath;
        if (platformConfirmationRequiredPaths.some(p => p(fsPath))) {
            return 3 /* ConfirmationCheckResult.SystemFile */;
        }
        const { patterns, ignoreCasing } = getPatterns(workspaceFolder || uri_1.URI.file('/'));
        if (ignoreCasing) {
            fsPath = fsPath.toLowerCase();
        }
        for (const { pattern, isApproved } of patterns) {
            if (isApproved !== ok && pattern(fsPath)) {
                ok = isApproved;
            }
        }
        return ok ? 0 /* ConfirmationCheckResult.NoConfirmation */ : 2 /* ConfirmationCheckResult.Sensitive */;
    }
    return async (uri) => {
        const toCheck = [(0, resources_1.normalizePath)(uri)];
        if (uri.scheme === network_1.Schemas.file) {
            try {
                const linked = await (0, promises_1.realpath)(uri.fsPath);
                if (linked !== uri.fsPath) {
                    toCheck.push(uri_1.URI.file(linked));
                }
            }
            catch (e) {
                if (e.code === 'EPERM') {
                    return 1 /* ConfirmationCheckResult.NoPermissions */;
                }
                // Usually EPERM or ENOENT on the linkedFile
            }
        }
        return Math.max(...toCheck.map(checkUri));
    };
}
async function createEditConfirmation(accessor, uris, asString) {
    const checker = makeUriConfirmationChecker(accessor.get(configurationService_1.IConfigurationService), accessor.get(workspaceService_1.IWorkspaceService), accessor.get(customInstructionsService_1.ICustomInstructionsService));
    const workspaceService = accessor.get(workspaceService_1.IWorkspaceService);
    const needsConfirmation = (await Promise.all(uris
        .map(async (uri) => ({ uri, reason: await checker(uri) })))).filter(r => r.reason !== 0 /* ConfirmationCheckResult.NoConfirmation */);
    if (!needsConfirmation.length) {
        return { presentation: 'hidden' };
    }
    const fileParts = needsConfirmation.map(({ uri }) => {
        const wf = workspaceService.getWorkspaceFolder(uri);
        return '`' + (wf ? (0, resources_1.relativePath)(wf, uri) : uri.fsPath) + '`';
    }).join(', ');
    let message;
    if (needsConfirmation.some(r => r.reason === 1 /* ConfirmationCheckResult.NoPermissions */)) {
        message = (0, l10n_1.t) `The model wants to edit files you don't have permission to modify (${fileParts}).`;
    }
    else if (needsConfirmation.some(r => r.reason === 2 /* ConfirmationCheckResult.Sensitive */)) {
        message = (0, l10n_1.t) `The model wants to edit sensitive files (${fileParts}).`;
    }
    else if (needsConfirmation.some(r => r.reason === 4 /* ConfirmationCheckResult.OutsideWorkspace */)) {
        message = (0, l10n_1.t) `The model wants to edit files outside of your workspace (${fileParts}).`;
    }
    else {
        message = (0, l10n_1.t) `The model wants to edit system files (${fileParts}).`;
    }
    return {
        confirmationMessages: {
            title: (0, l10n_1.t)('Allow edits to sensitive files?'),
            message: message + ' ' + (0, l10n_1.t) `Do you want to allow this?` + '\n\n' + asString(),
        }
    };
}
/** Returns whether the file can be edited. This is true if the file exists or it's opened (e.g. untitled files) */
function canExistingFileBeEdited(accessor, uri) {
    const workspace = accessor.get(workspaceService_1.IWorkspaceService);
    if (workspace.textDocuments.some(d => resources_1.extUriBiasedIgnorePathCase.isEqual(d.uri, uri))) {
        return Promise.resolve(true);
    }
    const fileSystemService = accessor.get(fileSystemService_1.IFileSystemService);
    return fileSystemService.stat(uri).then(() => true, () => false);
}
//# sourceMappingURL=editFileToolUtils.js.map