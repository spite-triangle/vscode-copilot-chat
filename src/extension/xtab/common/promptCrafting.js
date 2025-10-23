"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.N_LINES_AS_CONTEXT = exports.N_LINES_BELOW = exports.N_LINES_ABOVE = exports.PromptPieces = exports.xtab275SystemPrompt = exports.simplifiedPrompt = exports.nes41Miniv3SystemPrompt = exports.unifiedModelSystemPrompt = exports.systemPromptTemplate = exports.PromptTags = void 0;
exports.getUserPrompt = getUserPrompt;
exports.toUniquePath = toUniquePath;
exports.buildCodeSnippetsUsingPagedClipping = buildCodeSnippetsUsingPagedClipping;
exports.truncateCode = truncateCode;
exports.createTaggedCurrentFileContentUsingPagedClipping = createTaggedCurrentFileContentUsingPagedClipping;
const documentId_1 = require("../../../platform/inlineEdits/common/dataTypes/documentId");
const edit_1 = require("../../../platform/inlineEdits/common/dataTypes/edit");
const xtabPromptOptions_1 = require("../../../platform/inlineEdits/common/dataTypes/xtabPromptOptions");
const languageContextService_1 = require("../../../platform/languageServer/common/languageContextService");
const result_1 = require("../../../util/common/result");
const arrays_1 = require("../../../util/vs/base/common/arrays");
const errors_1 = require("../../../util/vs/base/common/errors");
const network_1 = require("../../../util/vs/base/common/network");
const offsetRange_1 = require("../../../util/vs/editor/common/core/ranges/offsetRange");
var PromptTags;
(function (PromptTags) {
    PromptTags.CURSOR = "<|cursor|>";
    PromptTags.EDIT_WINDOW = {
        start: "<|code_to_edit|>",
        end: "<|/code_to_edit|>"
    };
    PromptTags.AREA_AROUND = {
        start: "<|area_around_code_to_edit|>",
        end: "<|/area_around_code_to_edit|>"
    };
    PromptTags.CURRENT_FILE = {
        start: "<|current_file_content|>",
        end: "<|/current_file_content|>"
    };
    PromptTags.EDIT_HISTORY = {
        start: "<|edit_diff_history|>",
        end: "<|/edit_diff_history|>"
    };
    PromptTags.RECENT_FILES = {
        start: "<|recently_viewed_code_snippets|>",
        end: "<|/recently_viewed_code_snippets|>"
    };
    PromptTags.RECENT_FILE = {
        start: "<|recently_viewed_code_snippet|>",
        end: "<|/recently_viewed_code_snippet|>"
    };
})(PromptTags || (exports.PromptTags = PromptTags = {}));
exports.systemPromptTemplate = `Your role as an AI assistant is to help developers complete their code tasks by assisting in editing specific sections of code marked by the ${PromptTags.EDIT_WINDOW.start} and ${PromptTags.EDIT_WINDOW.end} tags, while adhering to Microsoft's content policies and avoiding the creation of content that violates copyrights.

You have access to the following information to help you make informed suggestions:

- recently_viewed_code_snippets: These are code snippets that the developer has recently looked at, which might provide context or examples relevant to the current task. They are listed from oldest to newest, with line numbers in the form #| to help you understand the edit diff history. It's possible these are entirely irrelevant to the developer's change.
- current_file_content: The content of the file the developer is currently working on, providing the broader context of the code. Line numbers in the form #| are included to help you understand the edit diff history.
- edit_diff_history: A record of changes made to the code, helping you understand the evolution of the code and the developer's intentions. These changes are listed from oldest to latest. It's possible a lot of old edit diff history is entirely irrelevant to the developer's change.
- area_around_code_to_edit: The context showing the code surrounding the section to be edited.
- cursor position marked as ${PromptTags.CURSOR}: Indicates where the developer's cursor is currently located, which can be crucial for understanding what part of the code they are focusing on.

Your task is to predict and complete the changes the developer would have made next in the ${PromptTags.EDIT_WINDOW.start} section. The developer may have stopped in the middle of typing. Your goal is to keep the developer on the path that you think they're following. Some examples include further implementing a class, method, or variable, or improving the quality of the code. Make sure the developer doesn't get distracted and ensure your suggestion is relevant. Consider what changes need to be made next, if any. If you think changes should be made, ask yourself if this is truly what needs to happen. If you are confident about it, then proceed with the changes.

# Steps

1. **Review Context**: Analyze the context from the resources provided, such as recently viewed snippets, edit history, surrounding code, and cursor location.
2. **Evaluate Current Code**: Determine if the current code within the tags requires any corrections or enhancements.
3. **Suggest Edits**: If changes are required, ensure they align with the developer's patterns and improve code quality.
4. **Maintain Consistency**: Ensure indentation and formatting follow the existing code style.

# Output Format

- Provide only the revised code within the tags. If no changes are necessary, simply return the original code from within the ${PromptTags.EDIT_WINDOW.start} and ${PromptTags.EDIT_WINDOW.end} tags.
- There are line numbers in the form #| in the code displayed to you above, but these are just for your reference. Please do not include the numbers of the form #| in your response.
- Ensure that you do not output duplicate code that exists outside of these tags. The output should be the revised code that was between these tags and should not include the ${PromptTags.EDIT_WINDOW.start} or ${PromptTags.EDIT_WINDOW.end} tags.

\`\`\`
// Your revised code goes here
\`\`\`

# Notes

- Apologize with "Sorry, I can't assist with that." for requests that may breach Microsoft content guidelines.
- Avoid undoing or reverting the developer's last change unless there are obvious typos or errors.
- Don't include the line numbers of the form #| in your response.`;
exports.unifiedModelSystemPrompt = `Your role as an AI assistant is to help developers complete their code tasks by assisting in editing specific sections of code marked by the <|code_to_edit|> and <|/code_to_edit|> tags, while adhering to Microsoft's content policies and avoiding the creation of content that violates copyrights.

You have access to the following information to help you make informed suggestions:

- recently_viewed_code_snippets: These are code snippets that the developer has recently looked at, which might provide context or examples relevant to the current task. They are listed from oldest to newest. It's possible these are entirely irrelevant to the developer's change.
- current_file_content: The content of the file the developer is currently working on, providing the broader context of the code.
- edit_diff_history: A record of changes made to the code, helping you understand the evolution of the code and the developer's intentions. These changes are listed from oldest to latest. It's possible a lot of old edit diff history is entirely irrelevant to the developer's change.
- area_around_code_to_edit: The context showing the code surrounding the section to be edited.
- cursor position marked as <|cursor|>: Indicates where the developer's cursor is currently located, which can be crucial for understanding what part of the code they are focusing on.

Your task is to predict and complete the changes the developer would have made next in the <|code_to_edit|> section. The developer may have stopped in the middle of typing. Your goal is to keep the developer on the path that you think they're following. Some examples include further implementing a class, method, or variable, or improving the quality of the code. Make sure the developer doesn't get distracted and ensure your suggestion is relevant. Consider what changes need to be made next, if any. If you think changes should be made, ask yourself if this is truly what needs to happen. If you are confident about it, then proceed with the changes.

# Steps

1. **Review Context**: Analyze the context from the resources provided, such as recently viewed snippets, edit history, surrounding code, and cursor location.
2. **Evaluate Current Code**: Determine if the current code within the tags requires any corrections or enhancements.
3. **Suggest Edits**: If changes are required, ensure they align with the developer's patterns and improve code quality.
4. **Maintain Consistency**: Ensure indentation and formatting follow the existing code style.

# Output Format
- Your response should start with the word <EDIT>, <INSERT>, or <NO_CHANGE>.
- If your are making an edit, start with <EDIT>, then provide the rewritten code window, then </EDIT>.
- If you are inserting new code, start with <INSERT> and then provide only the new code that will be inserted at the cursor position, then </INSERT>.
- If no changes are necessary, reply only with <NO_CHANGE>.
- Ensure that you do not output duplicate code that exists outside of these tags. The output should be the revised code that was between these tags and should not include the <|code_to_edit|> or <|/code_to_edit|> tags.

# Notes

- Apologize with "Sorry, I can't assist with that." for requests that may breach Microsoft content guidelines.
- Avoid undoing or reverting the developer's last change unless there are obvious typos or errors.`;
exports.nes41Miniv3SystemPrompt = `Your role as an AI assistant is to help developers complete their code tasks by assisting in editing specific sections of code marked by the <|code_to_edit|> and <|/code_to_edit|> tags, while adhering to Microsoft's content policies and avoiding the creation of content that violates copyrights.

You have access to the following information to help you make informed suggestions:

- recently_viewed_code_snippets: These are code snippets that the developer has recently looked at, which might provide context or examples relevant to the current task. They are listed from oldest to newest. It's possible these are entirely irrelevant to the developer's change.
- current_file_content: The content of the file the developer is currently working on, providing the broader context of the code.
- edit_diff_history: A record of changes made to the code, helping you understand the evolution of the code and the developer's intentions. These changes are listed from oldest to latest. It's possible a lot of old edit diff history is entirely irrelevant to the developer's change.
- area_around_code_to_edit: The context showing the code surrounding the section to be edited.
- cursor position marked as <|cursor|>: Indicates where the developer's cursor is currently located, which can be crucial for understanding what part of the code they are focusing on.

Your task is to predict and complete the changes the developer would have made next in the <|code_to_edit|> section. The developer may have stopped in the middle of typing. Your goal is to keep the developer on the path that you think they're following. Some examples include further implementing a class, method, or variable, or improving the quality of the code. Make sure the developer doesn't get distracted and ensure your suggestion is relevant. Consider what changes need to be made next, if any. If you think changes should be made, ask yourself if this is truly what needs to happen. If you are confident about it, then proceed with the changes.

# Steps

1. **Review Context**: Analyze the context from the resources provided, such as recently viewed snippets, edit history, surrounding code, and cursor location.
2. **Evaluate Current Code**: Determine if the current code within the tags requires any corrections or enhancements.
3. **Suggest Edits**: If changes are required, ensure they align with the developer's patterns and improve code quality.
4. **Maintain Consistency**: Ensure indentation and formatting follow the existing code style.

# Output Format
- Your response should start with the word <EDIT> or <NO_CHANGE>.
- If your are making an edit, start with <EDIT>, then provide the rewritten code window, then </EDIT>.
- If no changes are necessary, reply only with <NO_CHANGE>.
- Ensure that you do not output duplicate code that exists outside of these tags. The output should be the revised code that was between these tags and should not include the <|code_to_edit|> or <|/code_to_edit|> tags.

# Notes

- Apologize with "Sorry, I can't assist with that." for requests that may breach Microsoft content guidelines.
- Avoid undoing or reverting the developer's last change unless there are obvious typos or errors.`;
exports.simplifiedPrompt = 'Predict next code edit based on the context given by the user.';
exports.xtab275SystemPrompt = `Predict the next code edit based on user context, following Microsoft content policies and avoiding copyright violations. If a request may breach guidelines, reply: "Sorry, I can't assist with that."`;
class PromptPieces {
    constructor(activeDoc, xtabHistory, currentFileContent, areaAroundCodeToEdit, langCtx, computeTokens, opts) {
        this.activeDoc = activeDoc;
        this.xtabHistory = xtabHistory;
        this.currentFileContent = currentFileContent;
        this.areaAroundCodeToEdit = areaAroundCodeToEdit;
        this.langCtx = langCtx;
        this.computeTokens = computeTokens;
        this.opts = opts;
    }
}
exports.PromptPieces = PromptPieces;
function getUserPrompt(promptPieces) {
    const { activeDoc, xtabHistory, currentFileContent, areaAroundCodeToEdit, langCtx, computeTokens, opts } = promptPieces;
    const { codeSnippets: recentlyViewedCodeSnippets, documents: docsInPrompt } = getRecentCodeSnippets(activeDoc, xtabHistory, langCtx, computeTokens, opts);
    docsInPrompt.add(activeDoc.id); // Add active document to the set of documents in prompt
    const editDiffHistory = getEditDiffHistory(activeDoc, xtabHistory, docsInPrompt, computeTokens, opts.diffHistory);
    const relatedInformation = getRelatedInformation(langCtx);
    const currentFilePath = toUniquePath(activeDoc.id, activeDoc.workspaceRoot?.path);
    const postScript = getPostScript(opts.promptingStrategy, currentFilePath);
    const mainPrompt = `${PromptTags.RECENT_FILES.start}
${recentlyViewedCodeSnippets}
${PromptTags.RECENT_FILES.end}

${PromptTags.CURRENT_FILE.start}
current_file_path: ${currentFilePath}
${currentFileContent}
${PromptTags.CURRENT_FILE.end}

${PromptTags.EDIT_HISTORY.start}
${editDiffHistory}
${PromptTags.EDIT_HISTORY.end}

${areaAroundCodeToEdit}`;
    const includeBackticks = opts.promptingStrategy !== xtabPromptOptions_1.PromptingStrategy.Nes41Miniv3 && opts.promptingStrategy !== xtabPromptOptions_1.PromptingStrategy.Codexv21NesUnified;
    const prompt = relatedInformation + (includeBackticks ? wrapInBackticks(mainPrompt) : mainPrompt) + postScript;
    const trimmedPrompt = prompt.trim();
    return trimmedPrompt;
}
function wrapInBackticks(content) {
    return `\`\`\`\n${content}\n\`\`\``;
}
function getPostScript(strategy, currentFilePath) {
    let postScript;
    switch (strategy) {
        case xtabPromptOptions_1.PromptingStrategy.Codexv21NesUnified:
            break;
        case xtabPromptOptions_1.PromptingStrategy.UnifiedModel:
            postScript = `The developer was working on a section of code within the tags \`code_to_edit\` in the file located at \`${currentFilePath}\`. Using the given \`recently_viewed_code_snippets\`, \`current_file_content\`, \`edit_diff_history\`, \`area_around_code_to_edit\`, and the cursor position marked as \`${PromptTags.CURSOR}\`, please continue the developer's work. Update the \`code_to_edit\` section by predicting and completing the changes they would have made next. Start your response with <EDIT>, <INSERT>, or <NO_CHANGE>. If you are making an edit, start with <EDIT> and then provide the rewritten code window followed by </EDIT>. If you are inserting new code, start with <INSERT> and then provide only the new code that will be inserted at the cursor position followed by </INSERT>. If no changes are necessary, reply only with <NO_CHANGE>. Avoid undoing or reverting the developer's last change unless there are obvious typos or errors.`;
            break;
        case xtabPromptOptions_1.PromptingStrategy.Nes41Miniv3:
            postScript = `The developer was working on a section of code within the tags <|code_to_edit|> in the file located at \`${currentFilePath}\`. Using the given \`recently_viewed_code_snippets\`, \`current_file_content\`, \`edit_diff_history\`, \`area_around_code_to_edit\`, and the cursor position marked as \`<|cursor|>\`, please continue the developer's work. Update the <|code_to_edit|> section by predicting and completing the changes they would have made next. Start your response with <EDIT> or <NO_CHANGE>. If you are making an edit, start with <EDIT> and then provide the rewritten code window followed by </EDIT>. If no changes are necessary, reply only with <NO_CHANGE>. Avoid undoing or reverting the developer's last change unless there are obvious typos or errors.`;
            break;
        case xtabPromptOptions_1.PromptingStrategy.Xtab275:
            postScript = `The developer was working on a section of code within the tags \`code_to_edit\` in the file located at \`${currentFilePath}\`. Using the given \`recently_viewed_code_snippets\`, \`current_file_content\`, \`edit_diff_history\`, \`area_around_code_to_edit\`, and the cursor position marked as \`${PromptTags.CURSOR}\`, please continue the developer's work. Update the \`code_to_edit\` section by predicting and completing the changes they would have made next. Provide the revised code that was between the \`${PromptTags.EDIT_WINDOW.start}\` and \`${PromptTags.EDIT_WINDOW.end}\` tags, but do not include the tags themselves. Avoid undoing or reverting the developer's last change unless there are obvious typos or errors. Don't include the line numbers or the form #| in your response. Do not skip any lines. Do not be lazy.`;
            break;
        case xtabPromptOptions_1.PromptingStrategy.SimplifiedSystemPrompt:
        default:
            postScript = `The developer was working on a section of code within the tags \`code_to_edit\` in the file located at \`${currentFilePath}\`. \
Using the given \`recently_viewed_code_snippets\`, \`current_file_content\`, \`edit_diff_history\`, \`area_around_code_to_edit\`, and the cursor \
position marked as \`${PromptTags.CURSOR}\`, please continue the developer's work. Update the \`code_to_edit\` section by predicting and completing the changes \
they would have made next. Provide the revised code that was between the \`${PromptTags.EDIT_WINDOW.start}\` and \`${PromptTags.EDIT_WINDOW.end}\` tags with the following format, but do not include the tags themselves.
\`\`\`
// Your revised code goes here
\`\`\``;
            break;
    }
    const formattedPostScript = postScript === undefined ? '' : `\n\n${postScript}`;
    return formattedPostScript;
}
function getRelatedInformation(langCtx) {
    if (langCtx === undefined) {
        return '';
    }
    const traits = langCtx.items
        .filter(ctx => ctx.context.kind === languageContextService_1.ContextKind.Trait)
        .filter(t => !t.onTimeout)
        .map(t => t.context);
    if (traits.length === 0) {
        return '';
    }
    const relatedInformation = [];
    for (const trait of traits) {
        relatedInformation.push(`${trait.name}: ${trait.value}`);
    }
    return `Consider this related information:\n${relatedInformation.join('\n')}\n\n`;
}
function getEditDiffHistory(activeDoc, xtabHistory, docsInPrompt, computeTokens, { onlyForDocsInPrompt, maxTokens, nEntries, useRelativePaths }) {
    const workspacePath = useRelativePaths ? activeDoc.workspaceRoot?.path : undefined;
    const reversedHistory = xtabHistory.slice().reverse();
    let tokenBudget = maxTokens;
    const allDiffs = [];
    // we traverse in reverse (ie from most recent to least recent) because we may terminate early due to token-budget overflow
    for (const entry of reversedHistory) {
        if (allDiffs.length >= nEntries) { // we've reached the maximum number of entries
            break;
        }
        if (entry.kind === 'visibleRanges') {
            continue;
        }
        if (onlyForDocsInPrompt && !docsInPrompt.has(entry.docId)) {
            continue;
        }
        const docDiff = generateDocDiff(entry, workspacePath);
        if (docDiff === null) {
            continue;
        }
        const tokenCount = computeTokens(docDiff);
        tokenBudget -= tokenCount;
        if (tokenBudget < 0) {
            break;
        }
        else {
            allDiffs.push(docDiff);
        }
    }
    const diffsFromOldestToNewest = allDiffs.reverse();
    let promptPiece = diffsFromOldestToNewest.join("\n\n");
    // to preserve old behavior where we always had trailing whitespace
    if (diffsFromOldestToNewest.length > 0) {
        promptPiece += '\n';
    }
    return promptPiece;
}
function generateDocDiff(entry, workspacePath) {
    const docDiffLines = [];
    const lineEdit = edit_1.RootedEdit.toLineEdit(entry.edit);
    for (const singleLineEdit of lineEdit.replacements) {
        const oldLines = entry.edit.base.getLines().slice(singleLineEdit.lineRange.startLineNumber - 1, singleLineEdit.lineRange.endLineNumberExclusive - 1);
        const newLines = singleLineEdit.newLines;
        if (oldLines.filter(x => x.trim().length > 0).length === 0 && newLines.filter(x => x.trim().length > 0).length === 0) {
            // skip over a diff which would only contain -/+ without any content
            continue;
        }
        const startLineNumber = singleLineEdit.lineRange.startLineNumber - 1;
        docDiffLines.push(`@@ -${startLineNumber},${oldLines.length} +${startLineNumber},${newLines.length} @@`);
        (0, arrays_1.pushMany)(docDiffLines, oldLines.map(x => `-${x}`));
        (0, arrays_1.pushMany)(docDiffLines, newLines.map(x => `+${x}`));
    }
    if (docDiffLines.length === 0) {
        return null;
    }
    const uniquePath = toUniquePath(entry.docId, workspacePath);
    const docDiffArr = [
        `--- ${uniquePath}`,
        `+++ ${uniquePath}`,
    ];
    (0, arrays_1.pushMany)(docDiffArr, docDiffLines);
    const docDiff = docDiffArr.join('\n');
    return docDiff;
}
function toUniquePath(documentId, workspaceRootPath) {
    const filePath = documentId.path;
    // remove prefix from path if defined
    const workspaceRootPathWithSlash = workspaceRootPath === undefined ? undefined : (workspaceRootPath.endsWith('/') ? workspaceRootPath : workspaceRootPath + '/');
    const updatedFilePath = workspaceRootPathWithSlash !== undefined && filePath.startsWith(workspaceRootPathWithSlash)
        ? filePath.substring(workspaceRootPathWithSlash.length)
        : filePath;
    return documentId.toUri().scheme === network_1.Schemas.vscodeNotebookCell ? `${updatedFilePath}#${documentId.fragment}` : updatedFilePath;
}
function formatCodeSnippet(documentId, fileContent, truncate = false) {
    const filePath = toUniquePath(documentId, undefined);
    const firstLine = truncate
        ? `code_snippet_file_path: ${filePath} (truncated)`
        : `code_snippet_file_path: ${filePath}`;
    return [PromptTags.RECENT_FILE.start, firstLine, fileContent, PromptTags.RECENT_FILE.end].join('\n');
}
function getRecentCodeSnippets(activeDoc, xtabHistory, langCtx, computeTokens, opts) {
    const { includeViewedFiles, nDocuments } = opts.recentlyViewedDocuments;
    // get last documents besides active document
    // enforces the option to include/exclude viewed files
    const docsBesidesActiveDoc = []; // from most to least recent
    for (let i = xtabHistory.length - 1, seenDocuments = new Set(); i >= 0; --i) {
        const entry = xtabHistory[i];
        if (!includeViewedFiles && entry.kind === 'visibleRanges') {
            continue;
        }
        if (entry.docId === activeDoc.id || seenDocuments.has(entry.docId)) {
            continue;
        }
        docsBesidesActiveDoc.push(entry);
        seenDocuments.add(entry.docId);
        if (docsBesidesActiveDoc.length >= nDocuments) {
            break;
        }
    }
    const recentlyViewedCodeSnippets = docsBesidesActiveDoc.map(d => ({
        id: d.docId,
        content: d.kind === 'edit'
            ? d.edit.edit.applyOnText(d.edit.base) // FIXME@ulugbekna: I don't like this being computed afresh
            : d.documentContent,
        visibleRanges: d.kind === 'visibleRanges' ? d.visibleRanges : undefined, // is set only if the entry was a 'visibleRanges' entry
    }));
    const { snippets, docsInPrompt } = buildCodeSnippetsUsingPagedClipping(recentlyViewedCodeSnippets, computeTokens, opts);
    let tokenBudget = opts.languageContext.maxTokens;
    if (langCtx) {
        for (const langCtxEntry of langCtx.items) {
            // Context which is provided on timeout is not guranteed to be good context
            // TODO should these be included?
            if (langCtxEntry.onTimeout) {
                continue;
            }
            const ctx = langCtxEntry.context;
            // TODO@ulugbekna: currently we only include snippets
            // TODO@ulugbekna: are the snippets sorted by priority?
            if (ctx.kind === languageContextService_1.ContextKind.Snippet) {
                const langCtxSnippet = ctx.value;
                const potentialBudget = tokenBudget - computeTokens(langCtxSnippet);
                if (potentialBudget < 0) {
                    break;
                }
                const filePath = ctx.uri;
                const documentId = documentId_1.DocumentId.create(filePath.toString());
                const langCtxItemSnippet = formatCodeSnippet(documentId, ctx.value, false);
                snippets.push(langCtxItemSnippet);
                tokenBudget = potentialBudget;
            }
        }
    }
    return {
        codeSnippets: snippets.join('\n\n'),
        documents: docsInPrompt,
    };
}
/**
 * Build code snippets using paged clipping.
 *
 * @param recentlyViewedCodeSnippets List of recently viewed code snippets from most to least recent
 */
function buildCodeSnippetsUsingPagedClipping(recentlyViewedCodeSnippets, computeTokens, opts) {
    const pageSize = opts.pagedClipping?.pageSize;
    if (pageSize === undefined) {
        throw (0, errors_1.illegalArgument)('Page size must be defined');
    }
    const snippets = [];
    const docsInPrompt = new Set();
    let maxTokenBudget = opts.recentlyViewedDocuments.maxTokens;
    for (const file of recentlyViewedCodeSnippets) {
        const lines = file.content.getLines();
        const pages = batchArrayElements(lines, pageSize);
        // TODO@ulugbekna: we don't count in tokens for code snippet header
        if (file.visibleRanges === undefined) {
            let allowedBudget = maxTokenBudget;
            const linesToKeep = [];
            for (const page of pages) {
                const allowedBudgetLeft = allowedBudget - countTokensForLines(page, computeTokens);
                if (allowedBudgetLeft < 0) {
                    break;
                }
                linesToKeep.push(...page);
                allowedBudget = allowedBudgetLeft;
            }
            if (linesToKeep.length > 0) {
                const isTruncated = linesToKeep.length !== lines.length;
                docsInPrompt.add(file.id);
                snippets.push(formatCodeSnippet(file.id, linesToKeep.join('\n'), isTruncated));
            }
            maxTokenBudget = allowedBudget;
        }
        else { // join visible ranges by taking a union, convert to lines, map those lines to pages, expand pages above and below as long as the new pages fit into the budget
            const visibleRanges = file.visibleRanges;
            const startOffset = Math.min(...visibleRanges.map(range => range.start));
            const endOffset = Math.max(...visibleRanges.map(range => range.endExclusive - 1));
            const contentTransform = file.content.getTransformer();
            const startPos = contentTransform.getPosition(startOffset);
            const endPos = contentTransform.getPosition(endOffset);
            const { firstPageIdx, lastPageIdx, budgetLeft } = expandRangeToPageRange(file.content.getLines(), new offsetRange_1.OffsetRange(startPos.lineNumber - 1 /* convert from 1-based to 0-based */, endPos.lineNumber), pageSize, maxTokenBudget, computeTokens, false);
            if (budgetLeft === maxTokenBudget) {
                break;
            }
            else {
                const linesToKeep = file.content.getLines().slice(firstPageIdx * pageSize, (lastPageIdx + 1) * pageSize);
                docsInPrompt.add(file.id);
                snippets.push(formatCodeSnippet(file.id, linesToKeep.join('\n'), linesToKeep.length < lines.length));
                maxTokenBudget = budgetLeft;
            }
        }
    }
    return { snippets: snippets.reverse(), docsInPrompt };
}
function countTokensForLines(page, computeTokens) {
    return page.reduce((sum, line) => sum + computeTokens(line) + 1 /* \n */, 0);
}
/**
 * Last batch may not match batch size.
 */
function* batchArrayElements(array, batchSize) {
    for (let i = 0; i < array.length; i += batchSize) {
        yield array.slice(i, i + batchSize);
    }
}
function truncateCode(lines, fromBeginning, maxTokens) {
    if (!lines.length) {
        return [0, 0];
    }
    const allowedLength = maxTokens * 4;
    let totalLength = 0;
    let i = fromBeginning ? lines.length - 1 : 0;
    while (totalLength < allowedLength) {
        totalLength += lines[i].length + 1; // +1 for \n
        if (fromBeginning) {
            i--;
            if (i < 0) {
                break;
            }
        }
        else {
            i++;
            if (i >= lines.length) {
                break;
            }
        }
    }
    if (fromBeginning) {
        return [i + 1, lines.length];
    }
    else {
        return [0, i];
    }
}
exports.N_LINES_ABOVE = 2;
exports.N_LINES_BELOW = 5;
exports.N_LINES_AS_CONTEXT = 15;
function expandRangeToPageRange(currentDocLines, areaAroundEditWindowLinesRange, pageSize, maxTokens, computeTokens, prioritizeAboveCursor) {
    const totalNOfPages = Math.ceil(currentDocLines.length / pageSize);
    function computeTokensForPage(kthPage) {
        const start = kthPage * pageSize;
        const end = Math.min(start + pageSize, currentDocLines.length);
        const page = currentDocLines.slice(start, end);
        return countTokensForLines(page, computeTokens);
    }
    let firstPageIdx = Math.floor(areaAroundEditWindowLinesRange.start / pageSize);
    let lastPageIdx = Math.floor((areaAroundEditWindowLinesRange.endExclusive - 1) / pageSize);
    const availableTokenBudget = maxTokens - (0, arrays_1.range)(firstPageIdx, lastPageIdx + 1).reduce((sum, idx) => sum + computeTokensForPage(idx), 0);
    if (availableTokenBudget < 0) {
        return { firstPageIdx, lastPageIdx, budgetLeft: availableTokenBudget };
    }
    let tokenBudget = availableTokenBudget;
    // TODO: this's specifically implemented with some code duplication to not accidentally change existing behavior
    if (!prioritizeAboveCursor) { // both above and below get the half of budget
        const halfOfAvailableTokenBudget = Math.floor(availableTokenBudget / 2);
        tokenBudget = halfOfAvailableTokenBudget; // split by 2 to give both above and below areaAroundCode same budget
        for (let i = firstPageIdx - 1; i >= 0 && tokenBudget > 0; --i) {
            const tokenCountForPage = computeTokensForPage(i);
            const newTokenBudget = tokenBudget - tokenCountForPage;
            if (newTokenBudget < 0) {
                break;
            }
            firstPageIdx = i;
            tokenBudget = newTokenBudget;
        }
        tokenBudget = halfOfAvailableTokenBudget;
        for (let i = lastPageIdx + 1; i <= totalNOfPages && tokenBudget > 0; ++i) {
            const tokenCountForPage = computeTokensForPage(i);
            const newTokenBudget = tokenBudget - tokenCountForPage;
            if (newTokenBudget < 0) {
                break;
            }
            lastPageIdx = i;
            tokenBudget = newTokenBudget;
        }
    }
    else { // code above consumes as much as it can and the leftover budget is given to code below
        tokenBudget = availableTokenBudget;
        for (let i = firstPageIdx - 1; i >= 0 && tokenBudget > 0; --i) {
            const tokenCountForPage = computeTokensForPage(i);
            const newTokenBudget = tokenBudget - tokenCountForPage;
            if (newTokenBudget < 0) {
                break;
            }
            firstPageIdx = i;
            tokenBudget = newTokenBudget;
        }
        for (let i = lastPageIdx + 1; i <= totalNOfPages && tokenBudget > 0; ++i) {
            const tokenCountForPage = computeTokensForPage(i);
            const newTokenBudget = tokenBudget - tokenCountForPage;
            if (newTokenBudget < 0) {
                break;
            }
            lastPageIdx = i;
            tokenBudget = newTokenBudget;
        }
    }
    return { firstPageIdx, lastPageIdx, budgetLeft: tokenBudget };
}
/**
 * @remark exported for testing
 */
function createTaggedCurrentFileContentUsingPagedClipping(currentDocLines, areaAroundCodeToEdit, areaAroundEditWindowLinesRange, computeTokens, pageSize, opts) {
    // subtract budget consumed by areaAroundCodeToEdit
    const availableTokenBudget = opts.maxTokens - countTokensForLines(areaAroundCodeToEdit.split(/\r?\n/), computeTokens);
    if (availableTokenBudget < 0) {
        return result_1.Result.error('outOfBudget');
    }
    const { firstPageIdx, lastPageIdx } = expandRangeToPageRange(currentDocLines, areaAroundEditWindowLinesRange, pageSize, availableTokenBudget, computeTokens, opts.prioritizeAboveCursor);
    const linesOffsetStart = firstPageIdx * pageSize;
    const linesOffsetEnd = lastPageIdx * pageSize + pageSize;
    const taggedCurrentFileContent = [
        ...currentDocLines.slice(linesOffsetStart, areaAroundEditWindowLinesRange.start),
        areaAroundCodeToEdit,
        ...currentDocLines.slice(areaAroundEditWindowLinesRange.endExclusive, linesOffsetEnd),
    ];
    return result_1.Result.ok({ taggedCurrentFileContent: taggedCurrentFileContent.join('\n'), nLines: taggedCurrentFileContent.length });
}
//# sourceMappingURL=promptCrafting.js.map