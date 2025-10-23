"use strict";
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
exports.ExtendedLanguageModelToolResult = exports.LanguageModelToolResult = exports.ChatRequestNotebookData = exports.ChatRequestEditorData = exports.ChatLocation = exports.NewSymbolNameTriggerKind = exports.NewSymbolNameTag = exports.NewSymbolName = exports.ChatResponseTurn = exports.ChatRequestTurn = exports.ChatPrepareToolInvocationPart = exports.ChatResponseConfirmationPart = exports.ChatResponseNotebookEditPart = exports.ChatResponseTextEditPart = exports.ChatResponseCodeblockUriPart = exports.ChatResponseMarkdownWithVulnerabilitiesPart = exports.ChatResponsePullRequestPart = exports.ChatResponseExtensionsPart = exports.ChatResponseMovePart = exports.ChatResponseWarningPart = exports.ChatResponseCommandButtonPart = exports.ChatResponseCodeCitationPart = exports.ChatResponseReferencePart2 = exports.ChatResponseReferencePart = exports.ChatResponseProgressPart2 = exports.ChatResponseProgressPart = exports.ChatResponseAnchorPart = exports.ChatResponseFileTreePart = exports.ChatResponseThinkingProgressPart = exports.ChatResponseMarkdownPart = exports.ChatResponseClearToPreviousToolInvocationReason = exports.ChatVariableLevel = exports.DiagnosticRelatedInformation = exports.Location = exports.ExtensionMode = exports.DiagnosticSeverity = exports.EndOfLine = exports.TextEditorRevealType = exports.TextEditorLineNumbersStyle = exports.TextEditorCursorStyle = exports.MarkdownString = exports.Uri = exports.WorkspaceEdit = exports.TextEdit = exports.Diagnostic = exports.CancellationTokenSource = exports.EventEmitter = exports.Selection = exports.Range = exports.Position = void 0;
exports.l10n = exports.FileType = exports.SnippetTextEdit = exports.SnippetString = exports.SymbolKind = exports.LanguageModelError = exports.ChatRequestTurn2 = exports.ChatResponseTurn2 = exports.ChatToolInvocationPart = exports.TextDocumentChangeReason = exports.TextEditorSelectionChangeKind = exports.LanguageModelChatMessageRole = exports.LanguageModelToolResultPart2 = exports.LanguageModelToolResultPart = exports.LanguageModelToolCallPart = exports.ChatRequestEditedFileEventKind = exports.TerminalShellExecutionCommandLineConfidence = exports.ChatErrorLevel = exports.NotebookData = exports.NotebookCellData = exports.NotebookEdit = exports.NotebookRange = exports.NotebookCellKind = exports.ExcludeSettingOptions = exports.AISearchKeyword = exports.TextSearchMatch2 = exports.ChatReferenceDiagnostic = exports.ChatReferenceBinaryData = exports.ChatImageMimeType = exports.LanguageModelToolExtensionSource = exports.LanguageModelToolMCPSource = exports.LanguageModelPartAudience = exports.LanguageModelDataPart2 = exports.LanguageModelDataPart = exports.LanguageModelTextPart2 = exports.LanguageModelTextPart = exports.LanguageModelPromptTsxPart = exports.SymbolInformation = exports.LanguageModelToolResult2 = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const vscode = __importStar(require("vscode"));
exports.Position = vscode.Position;
exports.Range = vscode.Range;
exports.Selection = vscode.Selection;
exports.EventEmitter = vscode.EventEmitter;
exports.CancellationTokenSource = vscode.CancellationTokenSource;
exports.Diagnostic = vscode.Diagnostic;
exports.TextEdit = vscode.TextEdit;
exports.WorkspaceEdit = vscode.WorkspaceEdit;
exports.Uri = vscode.Uri;
exports.MarkdownString = vscode.MarkdownString;
exports.TextEditorCursorStyle = vscode.TextEditorCursorStyle;
exports.TextEditorLineNumbersStyle = vscode.TextEditorLineNumbersStyle;
exports.TextEditorRevealType = vscode.TextEditorRevealType;
exports.EndOfLine = vscode.EndOfLine;
exports.DiagnosticSeverity = vscode.DiagnosticSeverity;
exports.ExtensionMode = vscode.ExtensionMode;
exports.Location = vscode.Location;
exports.DiagnosticRelatedInformation = vscode.DiagnosticRelatedInformation;
exports.ChatVariableLevel = vscode.ChatVariableLevel;
exports.ChatResponseClearToPreviousToolInvocationReason = vscode.ChatResponseClearToPreviousToolInvocationReason;
exports.ChatResponseMarkdownPart = vscode.ChatResponseMarkdownPart;
exports.ChatResponseThinkingProgressPart = vscode.ChatResponseThinkingProgressPart;
exports.ChatResponseFileTreePart = vscode.ChatResponseFileTreePart;
exports.ChatResponseAnchorPart = vscode.ChatResponseAnchorPart;
exports.ChatResponseProgressPart = vscode.ChatResponseProgressPart;
exports.ChatResponseProgressPart2 = vscode.ChatResponseProgressPart2;
exports.ChatResponseReferencePart = vscode.ChatResponseReferencePart;
exports.ChatResponseReferencePart2 = vscode.ChatResponseReferencePart2;
exports.ChatResponseCodeCitationPart = vscode.ChatResponseCodeCitationPart;
exports.ChatResponseCommandButtonPart = vscode.ChatResponseCommandButtonPart;
exports.ChatResponseWarningPart = vscode.ChatResponseWarningPart;
exports.ChatResponseMovePart = vscode.ChatResponseMovePart;
exports.ChatResponseExtensionsPart = vscode.ChatResponseExtensionsPart;
exports.ChatResponsePullRequestPart = vscode.ChatResponsePullRequestPart;
exports.ChatResponseMarkdownWithVulnerabilitiesPart = vscode.ChatResponseMarkdownWithVulnerabilitiesPart;
exports.ChatResponseCodeblockUriPart = vscode.ChatResponseCodeblockUriPart;
exports.ChatResponseTextEditPart = vscode.ChatResponseTextEditPart;
exports.ChatResponseNotebookEditPart = vscode.ChatResponseNotebookEditPart;
exports.ChatResponseConfirmationPart = vscode.ChatResponseConfirmationPart;
exports.ChatPrepareToolInvocationPart = vscode.ChatPrepareToolInvocationPart;
exports.ChatRequestTurn = vscode.ChatRequestTurn;
exports.ChatResponseTurn = vscode.ChatResponseTurn;
exports.NewSymbolName = vscode.NewSymbolName;
exports.NewSymbolNameTag = vscode.NewSymbolNameTag;
exports.NewSymbolNameTriggerKind = vscode.NewSymbolNameTriggerKind;
exports.ChatLocation = vscode.ChatLocation;
exports.ChatRequestEditorData = vscode.ChatRequestEditorData;
exports.ChatRequestNotebookData = vscode.ChatRequestNotebookData;
exports.LanguageModelToolResult = vscode.LanguageModelToolResult;
exports.ExtendedLanguageModelToolResult = vscode.ExtendedLanguageModelToolResult;
exports.LanguageModelToolResult2 = vscode.LanguageModelToolResult2;
exports.SymbolInformation = vscode.SymbolInformation;
exports.LanguageModelPromptTsxPart = vscode.LanguageModelPromptTsxPart;
exports.LanguageModelTextPart = vscode.LanguageModelTextPart;
exports.LanguageModelTextPart2 = vscode.LanguageModelTextPart2;
exports.LanguageModelDataPart = vscode.LanguageModelDataPart;
exports.LanguageModelDataPart2 = vscode.LanguageModelDataPart2;
exports.LanguageModelPartAudience = vscode.LanguageModelPartAudience;
exports.LanguageModelToolMCPSource = vscode.LanguageModelToolMCPSource;
exports.LanguageModelToolExtensionSource = vscode.LanguageModelToolExtensionSource;
exports.ChatImageMimeType = vscode.ChatImageMimeType;
exports.ChatReferenceBinaryData = vscode.ChatReferenceBinaryData;
exports.ChatReferenceDiagnostic = vscode.ChatReferenceDiagnostic;
exports.TextSearchMatch2 = vscode.TextSearchMatch2;
exports.AISearchKeyword = vscode.AISearchKeyword;
exports.ExcludeSettingOptions = vscode.ExcludeSettingOptions;
exports.NotebookCellKind = vscode.NotebookCellKind;
exports.NotebookRange = vscode.NotebookRange;
exports.NotebookEdit = vscode.NotebookEdit;
exports.NotebookCellData = vscode.NotebookCellData;
exports.NotebookData = vscode.NotebookData;
exports.ChatErrorLevel = vscode.ChatErrorLevel;
exports.TerminalShellExecutionCommandLineConfidence = vscode.TerminalShellExecutionCommandLineConfidence;
exports.ChatRequestEditedFileEventKind = vscode.ChatRequestEditedFileEventKind;
exports.LanguageModelToolCallPart = vscode.LanguageModelToolCallPart;
exports.LanguageModelToolResultPart = vscode.LanguageModelToolResultPart;
exports.LanguageModelToolResultPart2 = vscode.LanguageModelToolResultPart2;
exports.LanguageModelChatMessageRole = vscode.LanguageModelChatMessageRole;
exports.TextEditorSelectionChangeKind = vscode.TextEditorSelectionChangeKind;
exports.TextDocumentChangeReason = vscode.TextDocumentChangeReason;
exports.ChatToolInvocationPart = vscode.ChatToolInvocationPart;
exports.ChatResponseTurn2 = vscode.ChatResponseTurn2;
exports.ChatRequestTurn2 = vscode.ChatRequestTurn2;
exports.LanguageModelError = vscode.LanguageModelError;
exports.SymbolKind = vscode.SymbolKind;
exports.SnippetString = vscode.SnippetString;
exports.SnippetTextEdit = vscode.SnippetTextEdit;
exports.FileType = vscode.FileType;
exports.l10n = {
    /**
     * @deprecated Only use this import in tests. For the actual extension,
     * use `import { l10n } from 'vscode'` or `import * as l10n from '@vscode/l10n'`.
     */
    t: vscode.l10n.t
};
//# sourceMappingURL=vscodeTypes.js.map