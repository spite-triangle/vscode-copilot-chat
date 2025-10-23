"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.LanguageModelError = exports.ChatResponseTurn2 = exports.ChatToolInvocationPart = exports.LanguageModelChatMessageRole = exports.LanguageModelToolResultPart2 = exports.LanguageModelToolResultPart = exports.LanguageModelToolCallPart = exports.LanguageModelToolMCPSource = exports.LanguageModelToolExtensionSource = exports.ChatResponseClearToPreviousToolInvocationReason = exports.ChatRequestEditedFileEventKind = exports.ChatErrorLevel = exports.AISearchKeyword = exports.TextSearchMatch2 = exports.ExcludeSettingOptions = exports.LanguageModelPromptTsxPart = exports.ChatImageMimeType = exports.LanguageModelDataPart2 = exports.LanguageModelDataPart = exports.LanguageModelTextPart2 = exports.LanguageModelPartAudience = exports.LanguageModelTextPart = exports.LanguageModelToolResult2 = exports.LanguageModelToolResult = exports.ChatReferenceBinaryData = exports.ChatReferenceDiagnostic = exports.ChatRequestNotebookData = exports.ChatRequestEditorData = exports.ChatResponseTurn = exports.ChatRequestTurn = exports.ChatPrepareToolInvocationPart = exports.ChatResponseConfirmationPart = exports.ChatResponseNotebookEditPart = exports.ChatResponseTextEditPart = exports.ChatResponseMarkdownWithVulnerabilitiesPart = exports.ChatResponseCommandButtonPart = exports.ChatResponseCodeCitationPart = exports.ChatResponsePullRequestPart = exports.ChatResponseExtensionsPart = exports.ChatResponseMovePart = exports.ChatResponseReferencePart2 = exports.ChatResponseReferencePart = exports.ChatResponseWarningPart = exports.ChatResponseProgressPart2 = exports.ChatResponseThinkingProgressPart = exports.ChatResponseProgressPart = exports.ChatResponseAnchorPart = exports.ChatResponseFileTreePart = exports.ChatResponseCodeblockUriPart = exports.ChatResponseMarkdownPart = void 0;
const buffer_1 = require("../../../vs/base/common/buffer");
const markdownString_1 = require("../../../vs/workbench/api/common/extHostTypes/markdownString");
class ChatResponseMarkdownPart {
    constructor(value) {
        this.value = typeof value === 'string' ? new markdownString_1.MarkdownString(value) : value;
    }
}
exports.ChatResponseMarkdownPart = ChatResponseMarkdownPart;
class ChatResponseCodeblockUriPart {
    constructor(value) {
        this.value = value;
    }
}
exports.ChatResponseCodeblockUriPart = ChatResponseCodeblockUriPart;
class ChatResponseFileTreePart {
    constructor(value, baseUri) {
        this.value = value;
        this.baseUri = baseUri;
    }
}
exports.ChatResponseFileTreePart = ChatResponseFileTreePart;
class ChatResponseAnchorPart {
    constructor(value, title) {
        this.value = value;
        this.title = title;
    }
}
exports.ChatResponseAnchorPart = ChatResponseAnchorPart;
class ChatResponseProgressPart {
    constructor(value) {
        this.value = value;
    }
}
exports.ChatResponseProgressPart = ChatResponseProgressPart;
class ChatResponseThinkingProgressPart {
    constructor(value, id, metadata) {
        this.value = value;
        this.id = id;
        this.metadata = metadata;
    }
}
exports.ChatResponseThinkingProgressPart = ChatResponseThinkingProgressPart;
class ChatResponseProgressPart2 {
    constructor(value, task) {
        this.value = value;
        this.task = task;
    }
}
exports.ChatResponseProgressPart2 = ChatResponseProgressPart2;
class ChatResponseWarningPart {
    constructor(value) {
        this.value = typeof value === 'string' ? new markdownString_1.MarkdownString(value) : value;
    }
}
exports.ChatResponseWarningPart = ChatResponseWarningPart;
class ChatResponseReferencePart {
    constructor(value) {
        this.value = value;
    }
}
exports.ChatResponseReferencePart = ChatResponseReferencePart;
class ChatResponseReferencePart2 {
    constructor(value, iconPath, options) {
        this.value = value;
        this.iconPath = iconPath;
        this.options = options;
    }
}
exports.ChatResponseReferencePart2 = ChatResponseReferencePart2;
class ChatResponseMovePart {
    constructor(uri, range) {
        this.uri = uri;
        this.range = range;
    }
}
exports.ChatResponseMovePart = ChatResponseMovePart;
class ChatResponseExtensionsPart {
    constructor(extensions) {
        this.extensions = extensions;
    }
}
exports.ChatResponseExtensionsPart = ChatResponseExtensionsPart;
class ChatResponsePullRequestPart {
    constructor(uri, title, description, author, linkTag) {
        this.uri = uri;
        this.title = title;
        this.description = description;
        this.author = author;
        this.linkTag = linkTag;
    }
}
exports.ChatResponsePullRequestPart = ChatResponsePullRequestPart;
class ChatResponseCodeCitationPart {
    constructor(value, license, snippet) {
        this.value = value;
        this.license = license;
        this.snippet = snippet;
    }
}
exports.ChatResponseCodeCitationPart = ChatResponseCodeCitationPart;
class ChatResponseCommandButtonPart {
    constructor(value) {
        this.value = value;
    }
}
exports.ChatResponseCommandButtonPart = ChatResponseCommandButtonPart;
class ChatResponseMarkdownWithVulnerabilitiesPart {
    constructor(value, vulnerabilities) {
        this.value = typeof value === 'string' ? new markdownString_1.MarkdownString(value) : value;
        this.vulnerabilities = vulnerabilities;
    }
}
exports.ChatResponseMarkdownWithVulnerabilitiesPart = ChatResponseMarkdownWithVulnerabilitiesPart;
class ChatResponseTextEditPart {
    constructor(uri, editsOrDone) {
        this.uri = uri;
        if (editsOrDone === true) {
            this.isDone = true;
            this.edits = [];
        }
        else {
            this.edits = Array.isArray(editsOrDone) ? editsOrDone : [editsOrDone];
        }
    }
}
exports.ChatResponseTextEditPart = ChatResponseTextEditPart;
class ChatResponseNotebookEditPart {
    constructor(uri, editsOrDone) {
        this.uri = uri;
        if (editsOrDone === true) {
            this.isDone = true;
            this.edits = [];
        }
        else {
            this.edits = Array.isArray(editsOrDone) ? editsOrDone : [editsOrDone];
        }
    }
}
exports.ChatResponseNotebookEditPart = ChatResponseNotebookEditPart;
class ChatResponseConfirmationPart {
    constructor(title, message, data, buttons) {
        this.title = title;
        this.message = message;
        this.data = data;
        this.buttons = buttons;
    }
}
exports.ChatResponseConfirmationPart = ChatResponseConfirmationPart;
class ChatPrepareToolInvocationPart {
    /**
     * @param toolName The name of the tool being prepared for invocation.
     */
    constructor(toolName) {
        this.toolName = toolName;
    }
}
exports.ChatPrepareToolInvocationPart = ChatPrepareToolInvocationPart;
class ChatRequestTurn {
    constructor(prompt, command, references, participant, toolReferences) {
        this.prompt = prompt;
        this.command = command;
        this.references = references;
        this.participant = participant;
        this.toolReferences = toolReferences;
    }
}
exports.ChatRequestTurn = ChatRequestTurn;
class ChatResponseTurn {
    constructor(response, result, participant, command) {
        this.response = response;
        this.result = result;
        this.participant = participant;
        this.command = command;
    }
}
exports.ChatResponseTurn = ChatResponseTurn;
class ChatRequestEditorData {
    constructor(document, selection, wholeRange) {
        this.document = document;
        this.selection = selection;
        this.wholeRange = wholeRange;
    }
}
exports.ChatRequestEditorData = ChatRequestEditorData;
class ChatRequestNotebookData {
    constructor(cell) {
        this.cell = cell;
    }
}
exports.ChatRequestNotebookData = ChatRequestNotebookData;
class ChatReferenceDiagnostic {
    constructor(diagnostics) {
        this.diagnostics = diagnostics;
    }
}
exports.ChatReferenceDiagnostic = ChatReferenceDiagnostic;
class ChatReferenceBinaryData {
    constructor(mimeType, data) {
        this.mimeType = mimeType;
        this.data = data;
    }
}
exports.ChatReferenceBinaryData = ChatReferenceBinaryData;
class LanguageModelToolResult {
    constructor(content) {
        this.content = content;
    }
}
exports.LanguageModelToolResult = LanguageModelToolResult;
class LanguageModelToolResult2 {
    constructor(content) {
        this.content = content;
    }
}
exports.LanguageModelToolResult2 = LanguageModelToolResult2;
class LanguageModelTextPart {
    constructor(value) {
        this.value = value;
    }
}
exports.LanguageModelTextPart = LanguageModelTextPart;
var LanguageModelPartAudience;
(function (LanguageModelPartAudience) {
    LanguageModelPartAudience[LanguageModelPartAudience["Assistant"] = 0] = "Assistant";
    LanguageModelPartAudience[LanguageModelPartAudience["User"] = 1] = "User";
    LanguageModelPartAudience[LanguageModelPartAudience["Extension"] = 2] = "Extension";
})(LanguageModelPartAudience || (exports.LanguageModelPartAudience = LanguageModelPartAudience = {}));
class LanguageModelTextPart2 extends LanguageModelTextPart {
    constructor(value, audience) {
        super(value);
        this.audience = audience;
    }
}
exports.LanguageModelTextPart2 = LanguageModelTextPart2;
class LanguageModelDataPart {
    constructor(data, mimeType) {
        this.mimeType = mimeType;
        this.data = data;
    }
    static image(data, mimeType) {
        return new LanguageModelDataPart(data, mimeType);
    }
    static json(value) {
        const rawStr = JSON.stringify(value, undefined, '\t');
        return new LanguageModelDataPart(buffer_1.VSBuffer.fromString(rawStr).buffer, 'json');
    }
    static text(value) {
        return new LanguageModelDataPart(buffer_1.VSBuffer.fromString(value).buffer, 'text/plain');
    }
}
exports.LanguageModelDataPart = LanguageModelDataPart;
class LanguageModelDataPart2 extends LanguageModelDataPart {
    constructor(data, mimeType, audience) {
        super(data, mimeType);
        this.audience = audience;
    }
}
exports.LanguageModelDataPart2 = LanguageModelDataPart2;
var ChatImageMimeType;
(function (ChatImageMimeType) {
    ChatImageMimeType["PNG"] = "image/png";
    ChatImageMimeType["JPEG"] = "image/jpeg";
    ChatImageMimeType["GIF"] = "image/gif";
    ChatImageMimeType["WEBP"] = "image/webp";
    ChatImageMimeType["BMP"] = "image/bmp";
})(ChatImageMimeType || (exports.ChatImageMimeType = ChatImageMimeType = {}));
class LanguageModelPromptTsxPart {
    constructor(value) {
        this.value = value;
    }
}
exports.LanguageModelPromptTsxPart = LanguageModelPromptTsxPart;
var ExcludeSettingOptions;
(function (ExcludeSettingOptions) {
    ExcludeSettingOptions[ExcludeSettingOptions["None"] = 1] = "None";
    ExcludeSettingOptions[ExcludeSettingOptions["FilesExclude"] = 2] = "FilesExclude";
    ExcludeSettingOptions[ExcludeSettingOptions["SearchAndFilesExclude"] = 3] = "SearchAndFilesExclude";
})(ExcludeSettingOptions || (exports.ExcludeSettingOptions = ExcludeSettingOptions = {}));
class TextSearchMatch2 {
    constructor(uri, ranges, previewText) {
        this.uri = uri;
        this.ranges = ranges;
        this.previewText = previewText;
    }
}
exports.TextSearchMatch2 = TextSearchMatch2;
class AISearchKeyword {
    constructor(keyword) {
        this.keyword = keyword;
    }
}
exports.AISearchKeyword = AISearchKeyword;
var ChatErrorLevel;
(function (ChatErrorLevel) {
    ChatErrorLevel[ChatErrorLevel["Info"] = 0] = "Info";
    ChatErrorLevel[ChatErrorLevel["Warning"] = 1] = "Warning";
    ChatErrorLevel[ChatErrorLevel["Error"] = 2] = "Error";
})(ChatErrorLevel || (exports.ChatErrorLevel = ChatErrorLevel = {}));
var ChatRequestEditedFileEventKind;
(function (ChatRequestEditedFileEventKind) {
    ChatRequestEditedFileEventKind[ChatRequestEditedFileEventKind["Keep"] = 1] = "Keep";
    ChatRequestEditedFileEventKind[ChatRequestEditedFileEventKind["Undo"] = 2] = "Undo";
    ChatRequestEditedFileEventKind[ChatRequestEditedFileEventKind["UserModification"] = 3] = "UserModification";
})(ChatRequestEditedFileEventKind || (exports.ChatRequestEditedFileEventKind = ChatRequestEditedFileEventKind = {}));
var ChatResponseClearToPreviousToolInvocationReason;
(function (ChatResponseClearToPreviousToolInvocationReason) {
    ChatResponseClearToPreviousToolInvocationReason[ChatResponseClearToPreviousToolInvocationReason["NoReason"] = 0] = "NoReason";
    ChatResponseClearToPreviousToolInvocationReason[ChatResponseClearToPreviousToolInvocationReason["FilteredContentRetry"] = 1] = "FilteredContentRetry";
    ChatResponseClearToPreviousToolInvocationReason[ChatResponseClearToPreviousToolInvocationReason["CopyrightContentRetry"] = 2] = "CopyrightContentRetry";
})(ChatResponseClearToPreviousToolInvocationReason || (exports.ChatResponseClearToPreviousToolInvocationReason = ChatResponseClearToPreviousToolInvocationReason = {}));
class LanguageModelToolExtensionSource {
    constructor(id, label) {
        this.id = id;
        this.label = label;
    }
}
exports.LanguageModelToolExtensionSource = LanguageModelToolExtensionSource;
class LanguageModelToolMCPSource {
    constructor(label, name, instructions) {
        this.label = label;
        this.name = name;
        this.instructions = instructions;
    }
}
exports.LanguageModelToolMCPSource = LanguageModelToolMCPSource;
class LanguageModelToolCallPart {
    constructor(callId, name, input) {
        this.callId = callId;
        this.name = name;
        this.input = input;
    }
}
exports.LanguageModelToolCallPart = LanguageModelToolCallPart;
class LanguageModelToolResultPart {
    constructor(callId, content, isError) {
        this.callId = callId;
        this.content = content;
        this.isError = isError ?? false;
    }
}
exports.LanguageModelToolResultPart = LanguageModelToolResultPart;
class LanguageModelToolResultPart2 {
    constructor(callId, content, isError) {
        this.callId = callId;
        this.content = content;
        this.isError = isError ?? false;
    }
}
exports.LanguageModelToolResultPart2 = LanguageModelToolResultPart2;
var LanguageModelChatMessageRole;
(function (LanguageModelChatMessageRole) {
    LanguageModelChatMessageRole[LanguageModelChatMessageRole["User"] = 1] = "User";
    LanguageModelChatMessageRole[LanguageModelChatMessageRole["Assistant"] = 2] = "Assistant";
    LanguageModelChatMessageRole[LanguageModelChatMessageRole["System"] = 3] = "System";
})(LanguageModelChatMessageRole || (exports.LanguageModelChatMessageRole = LanguageModelChatMessageRole = {}));
class ChatToolInvocationPart {
    constructor(toolName, toolCallId, isError) {
        this.toolName = toolName;
        this.toolCallId = toolCallId;
        this.isError = isError;
    }
}
exports.ChatToolInvocationPart = ChatToolInvocationPart;
class ChatResponseTurn2 {
    constructor(response, result, participant, command) {
        this.response = response;
        this.result = result;
        this.participant = participant;
        this.command = command;
    }
}
exports.ChatResponseTurn2 = ChatResponseTurn2;
class LanguageModelError extends Error {
    static #name = 'LanguageModelError';
    static NotFound(message) {
        return new LanguageModelError(message, LanguageModelError.NotFound.name);
    }
    static NoPermissions(message) {
        return new LanguageModelError(message, LanguageModelError.NoPermissions.name);
    }
    static Blocked(message) {
        return new LanguageModelError(message, LanguageModelError.Blocked.name);
    }
    constructor(message, code, cause) {
        super(message, { cause });
        this.name = LanguageModelError.#name;
        this.code = code ?? '';
    }
}
exports.LanguageModelError = LanguageModelError;
//# sourceMappingURL=chatTypes.js.map