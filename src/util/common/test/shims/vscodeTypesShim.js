"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const cancellation_1 = require("../../../vs/base/common/cancellation");
const event_1 = require("../../../vs/base/common/event");
const uri_1 = require("../../../vs/base/common/uri");
const diagnostic_1 = require("../../../vs/workbench/api/common/extHostTypes/diagnostic");
const location_1 = require("../../../vs/workbench/api/common/extHostTypes/location");
const markdownString_1 = require("../../../vs/workbench/api/common/extHostTypes/markdownString");
const notebooks_1 = require("../../../vs/workbench/api/common/extHostTypes/notebooks");
const position_1 = require("../../../vs/workbench/api/common/extHostTypes/position");
const range_1 = require("../../../vs/workbench/api/common/extHostTypes/range");
const selection_1 = require("../../../vs/workbench/api/common/extHostTypes/selection");
const snippetString_1 = require("../../../vs/workbench/api/common/extHostTypes/snippetString");
const snippetTextEdit_1 = require("../../../vs/workbench/api/common/extHostTypes/snippetTextEdit");
const symbolInformation_1 = require("../../../vs/workbench/api/common/extHostTypes/symbolInformation");
const textEdit_1 = require("../../../vs/workbench/api/common/extHostTypes/textEdit");
const chatTypes_1 = require("./chatTypes");
const editing_1 = require("./editing");
const enums_1 = require("./enums");
const l10n_1 = require("./l10n");
const newSymbolName_1 = require("./newSymbolName");
const terminal_1 = require("./terminal");
const shim = {
    Position: position_1.Position,
    Range: range_1.Range,
    Selection: selection_1.Selection,
    EventEmitter: event_1.Emitter,
    CancellationTokenSource: cancellation_1.CancellationTokenSource,
    Diagnostic: diagnostic_1.Diagnostic,
    Location: location_1.Location,
    DiagnosticRelatedInformation: diagnostic_1.DiagnosticRelatedInformation,
    TextEdit: textEdit_1.TextEdit,
    WorkspaceEdit: editing_1.WorkspaceEdit,
    Uri: uri_1.URI,
    MarkdownString: markdownString_1.MarkdownString,
    DiagnosticSeverity: enums_1.DiagnosticSeverity,
    TextEditorCursorStyle: enums_1.TextEditorCursorStyle,
    TextEditorLineNumbersStyle: enums_1.TextEditorLineNumbersStyle,
    TextEditorRevealType: enums_1.TextEditorRevealType,
    EndOfLine: textEdit_1.EndOfLine,
    l10n: {
        t: l10n_1.t
    },
    ExtensionMode: enums_1.ExtensionMode,
    ChatVariableLevel: enums_1.ChatVariableLevel,
    ChatResponseClearToPreviousToolInvocationReason: chatTypes_1.ChatResponseClearToPreviousToolInvocationReason,
    ChatResponseMarkdownPart: chatTypes_1.ChatResponseMarkdownPart,
    ChatResponseFileTreePart: chatTypes_1.ChatResponseFileTreePart,
    ChatResponseAnchorPart: chatTypes_1.ChatResponseAnchorPart,
    ChatResponseMovePart: chatTypes_1.ChatResponseMovePart,
    ChatResponseExtensionsPart: chatTypes_1.ChatResponseExtensionsPart,
    ChatResponseProgressPart: chatTypes_1.ChatResponseProgressPart,
    ChatResponseProgressPart2: chatTypes_1.ChatResponseProgressPart2,
    ChatResponseWarningPart: chatTypes_1.ChatResponseWarningPart,
    ChatResponseReferencePart: chatTypes_1.ChatResponseReferencePart,
    ChatResponseReferencePart2: chatTypes_1.ChatResponseReferencePart2,
    ChatResponseCodeCitationPart: chatTypes_1.ChatResponseCodeCitationPart,
    ChatResponseCommandButtonPart: chatTypes_1.ChatResponseCommandButtonPart,
    ChatResponseMarkdownWithVulnerabilitiesPart: chatTypes_1.ChatResponseMarkdownWithVulnerabilitiesPart,
    ChatResponseCodeblockUriPart: chatTypes_1.ChatResponseCodeblockUriPart,
    ChatResponseTextEditPart: chatTypes_1.ChatResponseTextEditPart,
    ChatResponseNotebookEditPart: chatTypes_1.ChatResponseNotebookEditPart,
    ChatResponseConfirmationPart: chatTypes_1.ChatResponseConfirmationPart,
    ChatPrepareToolInvocationPart: chatTypes_1.ChatPrepareToolInvocationPart,
    ChatRequestTurn: chatTypes_1.ChatRequestTurn,
    ChatResponseTurn: chatTypes_1.ChatResponseTurn,
    ChatRequestEditorData: chatTypes_1.ChatRequestEditorData,
    ChatRequestNotebookData: chatTypes_1.ChatRequestNotebookData,
    NewSymbolName: newSymbolName_1.NewSymbolName,
    NewSymbolNameTag: newSymbolName_1.NewSymbolNameTag,
    NewSymbolNameTriggerKind: newSymbolName_1.NewSymbolNameTriggerKind,
    ChatLocation: enums_1.ChatLocation,
    SymbolInformation: symbolInformation_1.SymbolInformation,
    LanguageModelToolResult: chatTypes_1.LanguageModelToolResult,
    ExtendedLanguageModelToolResult: chatTypes_1.LanguageModelToolResult,
    LanguageModelToolResult2: chatTypes_1.LanguageModelToolResult2,
    LanguageModelPromptTsxPart: chatTypes_1.LanguageModelPromptTsxPart,
    LanguageModelTextPart: chatTypes_1.LanguageModelTextPart,
    LanguageModelDataPart: chatTypes_1.LanguageModelDataPart,
    LanguageModelToolExtensionSource: chatTypes_1.LanguageModelToolExtensionSource,
    LanguageModelToolMCPSource: chatTypes_1.LanguageModelToolMCPSource,
    ChatImageMimeType: chatTypes_1.ChatImageMimeType,
    ChatReferenceBinaryData: chatTypes_1.ChatReferenceBinaryData,
    ChatReferenceDiagnostic: chatTypes_1.ChatReferenceDiagnostic,
    TextSearchMatch2: chatTypes_1.TextSearchMatch2,
    AISearchKeyword: chatTypes_1.AISearchKeyword,
    ExcludeSettingOptions: chatTypes_1.ExcludeSettingOptions,
    NotebookCellKind: notebooks_1.NotebookCellKind,
    NotebookRange: notebooks_1.NotebookRange,
    NotebookEdit: notebooks_1.NotebookEdit,
    NotebookCellData: notebooks_1.NotebookCellData,
    NotebookData: notebooks_1.NotebookData,
    ChatErrorLevel: chatTypes_1.ChatErrorLevel,
    TerminalShellExecutionCommandLineConfidence: terminal_1.TerminalShellExecutionCommandLineConfidence,
    ChatRequestEditedFileEventKind: chatTypes_1.ChatRequestEditedFileEventKind,
    ChatResponsePullRequestPart: chatTypes_1.ChatResponsePullRequestPart,
    LanguageModelTextPart2: chatTypes_1.LanguageModelTextPart2,
    LanguageModelDataPart2: chatTypes_1.LanguageModelDataPart2,
    LanguageModelPartAudience: chatTypes_1.LanguageModelPartAudience,
    ChatResponseThinkingProgressPart: chatTypes_1.ChatResponseThinkingProgressPart,
    LanguageModelToolCallPart: chatTypes_1.LanguageModelToolCallPart,
    LanguageModelToolResultPart: chatTypes_1.LanguageModelToolResultPart,
    LanguageModelToolResultPart2: chatTypes_1.LanguageModelToolResultPart2,
    LanguageModelChatMessageRole: chatTypes_1.LanguageModelChatMessageRole,
    TextEditorSelectionChangeKind: editing_1.TextEditorSelectionChangeKind,
    TextDocumentChangeReason: editing_1.TextDocumentChangeReason,
    ChatToolInvocationPart: chatTypes_1.ChatToolInvocationPart,
    ChatResponseTurn2: chatTypes_1.ChatResponseTurn2,
    ChatRequestTurn2: chatTypes_1.ChatRequestTurn,
    LanguageModelError: chatTypes_1.LanguageModelError, // Some difference in the definition of Error is breaking this
    SymbolKind: // Some difference in the definition of Error is breaking this
    symbolInformation_1.SymbolKind,
    SnippetString: snippetString_1.SnippetString,
    SnippetTextEdit: snippetTextEdit_1.SnippetTextEdit,
    FileType: enums_1.FileType
};
module.exports = shim;
//# sourceMappingURL=vscodeTypesShim.js.map