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
exports.InlineEditRequestLogContext = void 0;
const yaml = __importStar(require("yaml"));
const errors = __importStar(require("../../../util/common/errors"));
const errors_1 = require("../../../util/vs/base/common/errors");
const fetchCancellationError_1 = require("./dataTypes/fetchCancellationError");
const languageContext_1 = require("./dataTypes/languageContext");
const stringifyChatMessages_1 = require("./utils/stringifyChatMessages");
const utils_1 = require("./utils/utils");
class InlineEditRequestLogContext {
    static { this._id = 0; }
    get includeInLogTree() {
        return this._isVisible;
    }
    constructor(filePath, version, _context) {
        this.filePath = filePath;
        this.version = version;
        this._context = _context;
        this.requestId = InlineEditRequestLogContext._id++;
        this.time = (0, utils_1.now)();
        /** Tweaks visibility of this log element in the log tree */
        this._isVisible = false;
        this.recordingBookmark = undefined;
        this._statelessNextEditProviderId = undefined;
        this._nextEditRequest = undefined;
        this._resultEdit = undefined;
        this._diagnosticsResultEdit = undefined;
        this._logContextOfCachedEdit = undefined;
        this._prompt = undefined;
        this.error = undefined;
        /**
         * Model Response
         */
        this.response = undefined;
        this.fullResponsePromise = undefined;
        this.fullResponse = undefined;
        this.providerStartTime = undefined;
        this.providerEndTime = undefined;
        this.fetchStartTime = undefined;
        this.fetchEndTime = undefined;
        /**
         * Each of edit suggestions from model
         */
        this._responseResults = undefined;
        this._recentEdit = undefined;
        this._logs = [];
        this._isAccepted = undefined;
    }
    toLogDocument() {
        const lines = [];
        lines.push('# ' + this.getMarkdownTitle() + ` (Request #${this.requestId})`);
        lines.push('💡 Tip: double-click anywhere to open this file as text to copy-paste content into an issue.\n');
        lines.push('<details><summary>Explanation for icons</summary>\n');
        lines.push(`- ${utils_1.Icon.lightbulbFull.svg} - model had suggestions\n`);
        lines.push(`- ${utils_1.Icon.circleSlash.svg} - model had NO suggestions\n`);
        lines.push(`- ${utils_1.Icon.database.svg} - response is from cache\n`);
        lines.push(`- ${utils_1.Icon.error.svg} - error happened\n`);
        lines.push(`- ${utils_1.Icon.skipped.svg} - fetching started but got cancelled\n`);
        lines.push('</details>\n');
        lines.push(`Inline Edit Provider: ${this._statelessNextEditProviderId ?? '<NOT-SET>'}\n`);
        lines.push(`Chat Endpoint`);
        lines.push('```');
        lines.push(`Model name: ${this._endpointInfo?.modelName ?? '<NOT-SET>'}`);
        lines.push(`URL: ${this._endpointInfo?.url ?? '<NOT-SET>'}`);
        lines.push('```');
        const isCachedStr = this._logContextOfCachedEdit ? `(cached #${this._logContextOfCachedEdit.requestId})` : '(not cached)';
        if (this._nextEditRequest) {
            lines.push(`## Latest user edits ${isCachedStr}`);
            lines.push("<details open><summary>Edit</summary>\n");
            lines.push(this._nextEditRequest.toMarkdown());
            lines.push("\n</details>\n");
        }
        if (this._diagnosticsResultEdit) {
            lines.push(`## Proposed diagnostics edits ${this._nesTypePicked === 'diagnostics' ? '(Picked)' : '(Not Picked)'}`);
            lines.push("<details open><summary>Edit</summary>\n");
            lines.push("``` patch");
            lines.push(this._diagnosticsResultEdit.toString());
            lines.push("```");
            lines.push("\n</details>\n");
        }
        if (this._resultEdit) {
            lines.push(`## Proposed next edits ${isCachedStr}`);
            lines.push("<details open><summary>Edit</summary>\n");
            lines.push("``` patch");
            lines.push(this._resultEdit.toString());
            lines.push("```");
            lines.push("\n</details>\n");
        }
        if (this.prompt) {
            lines.push(`## Prompt ${isCachedStr}`);
            lines.push("<details><summary>Click to view</summary>\n");
            const e = this.prompt;
            lines.push("````");
            lines.push(...e.split('\n'));
            lines.push("````");
            lines.push("\n</details>\n");
        }
        if (this.error) {
            lines.push(`## Error ${isCachedStr}`);
            lines.push("```");
            lines.push(errors.toString(errors.fromUnknown(this.error)));
            lines.push("```");
        }
        if (this.response) {
            lines.push(`## Response ${isCachedStr}`);
            lines.push("<details><summary>Click to view</summary>\n");
            lines.push("````");
            lines.push(this.response);
            lines.push("````");
            lines.push("\n</details>\n");
        }
        if (this._responseResults) {
            lines.push(`## Response Results ${isCachedStr}`);
            lines.push("<details><summary>Click to view</summary>\n");
            lines.push("```");
            lines.push(yaml.stringify(this._responseResults, null, '\t'));
            lines.push("```");
            lines.push("\n</details>\n");
        }
        if (this._isAccepted !== undefined) {
            lines.push(`## Accepted : ${this._isAccepted ? 'Yes' : 'No'}`);
        }
        if (this._logs.length > 0) {
            lines.push("## Logs");
            lines.push("<details open><summary>Logs</summary>\n");
            lines.push(...this._logs);
            lines.push("\n</details>\n");
        }
        return lines.join('\n');
    }
    toMinimalLog() {
        // Does not include the users files, but just the relevant edits
        const lines = [];
        if (this._nesTypePicked === 'diagnostics' && this._diagnosticsResultEdit) {
            lines.push(`## Result (Diagnostics):`);
            lines.push("``` patch");
            lines.push(this._diagnosticsResultEdit.toString());
            lines.push("```");
        }
        else if (this._nesTypePicked === 'llm' && this._resultEdit) {
            lines.push(`## Result:`);
            lines.push("``` patch");
            lines.push(this._resultEdit.toString());
            lines.push("```");
        }
        else {
            lines.push(`## Result: <NOT-SET>`);
        }
        if (this.error) {
            lines.push(`## Error:`);
            lines.push("```");
            lines.push(errors.toString(errors.fromUnknown(this.error)));
            lines.push("```");
        }
        lines.push(`### Info:`);
        lines.push(`**From cache:** ${this._logContextOfCachedEdit ? `YES (Request: ${this._logContextOfCachedEdit.requestId})` : 'NO'}`);
        if (this._context) {
            lines.push(`**Trigger Kind:** ${this._context.triggerKind === 0 ? 'Manual' : 'Automatic'}`);
            lines.push(`**Request UUID:** ${this._context.requestUuid}`);
        }
        return lines.join('\n');
    }
    setStatelessNextEditProviderId(id) {
        this._statelessNextEditProviderId = id;
    }
    setRequestInput(nextEditRequest) {
        this._isVisible = true;
        this._nextEditRequest = nextEditRequest;
    }
    setResult(resultEdit) {
        this._isVisible = true;
        this._resultEdit = resultEdit;
    }
    setDiagnosticsResult(resultEdit) {
        this._isVisible = true;
        this._diagnosticsResultEdit = resultEdit;
    }
    setPickedNESType(nesTypePicked) {
        this._nesTypePicked = nesTypePicked;
        return this;
    }
    setIsCachedResult(logContextOfCachedEdit) {
        this._logContextOfCachedEdit = logContextOfCachedEdit;
        { // inherit stateless provider state from cached log context
            this.recordingBookmark = logContextOfCachedEdit.recordingBookmark;
            if (logContextOfCachedEdit._nextEditRequest) {
                this._nextEditRequest = logContextOfCachedEdit._nextEditRequest;
            }
            if (logContextOfCachedEdit._resultEdit) {
                this.setResult(logContextOfCachedEdit._resultEdit);
            }
            if (logContextOfCachedEdit._diagnosticsResultEdit) {
                this.setDiagnosticsResult(logContextOfCachedEdit._diagnosticsResultEdit);
            }
            if (logContextOfCachedEdit._endpointInfo) {
                this.setEndpointInfo(logContextOfCachedEdit._endpointInfo.url, logContextOfCachedEdit._endpointInfo.modelName);
            }
            if (logContextOfCachedEdit.prompt) {
                this.setPrompt(logContextOfCachedEdit.prompt);
            }
            if (logContextOfCachedEdit.response) {
                this.setResponse(logContextOfCachedEdit.response);
            }
            if (logContextOfCachedEdit.responseResults) {
                this.setResponseResults(logContextOfCachedEdit.responseResults);
            }
            if (logContextOfCachedEdit.fullResponsePromise) {
                this.setFullResponse(logContextOfCachedEdit.fullResponsePromise);
            }
            if (logContextOfCachedEdit.error) {
                this.setError(logContextOfCachedEdit.error);
            }
        }
        this._isVisible = true;
        this._icon = utils_1.Icon.database;
    }
    setEndpointInfo(url, modelName) {
        this._endpointInfo = { url, modelName };
    }
    get prompt() {
        return this._prompt;
    }
    setPrompt(prompt) {
        this._isVisible = true;
        if (typeof prompt === 'string') {
            this._prompt = prompt;
        }
        else {
            this._prompt = (0, stringifyChatMessages_1.stringifyChatMessages)(prompt);
        }
    }
    getIcon() {
        return this._icon?.themeIcon;
    }
    setIsSkipped() {
        this._isVisible = false;
        this._icon = utils_1.Icon.skipped;
    }
    markAsNoSuggestions() {
        this._isVisible = true;
        this._icon = utils_1.Icon.circleSlash;
    }
    setError(e) {
        this._isVisible = true;
        this.error = e;
        if (this.error instanceof fetchCancellationError_1.FetchCancellationError) {
            this._icon = utils_1.Icon.skipped;
        }
        else if ((0, errors_1.isCancellationError)(this.error)) {
            this._isVisible = false;
        }
        else {
            this._icon = utils_1.Icon.error;
        }
    }
    setResponse(v) {
        this._isVisible = true;
        this.response = v;
    }
    setFullResponse(promise) {
        this.fullResponsePromise = promise;
        promise.then(response => this.fullResponse = response);
    }
    async allPromisesResolved() {
        await this.fullResponsePromise;
    }
    setProviderStartTime() {
        this.providerStartTime = Date.now();
    }
    setProviderEndTime() {
        this.providerEndTime = Date.now();
    }
    setFetchStartTime() {
        this.fetchStartTime = Date.now();
    }
    setFetchEndTime() {
        this.fetchEndTime = Date.now();
    }
    get responseResults() {
        return this._responseResults;
    }
    setResponseResults(v) {
        this._isVisible = true;
        this._responseResults = v;
        this._icon = utils_1.Icon.lightbulbFull;
    }
    getDebugName() {
        return `NES | ${basename(this.filePath)} (v${this.version})`;
    }
    getMarkdownTitle() {
        const icon = this._icon ? `${this._icon.svg} ` : '';
        return (icon) + this.getDebugName();
    }
    setRecentEdit(edit) {
        this._recentEdit = edit;
    }
    addLog(content) {
        this._logs.push(content.replace('\n', '\\n').replace('\t', '\\t').replace('`', '\`') + '\n');
    }
    setAccepted(isAccepted) {
        this._isAccepted = isAccepted;
    }
    addListToLog(list) {
        list.forEach(l => this.addLog(`- ${l}`));
    }
    addCodeblockToLog(code, language = '') {
        this._logs.push(`\`\`\`${language}\n${code}\n\`\`\`\n`);
    }
    setFileDiagnostics(fileDiagnostics) {
        this._fileDiagnostics = fileDiagnostics;
    }
    _getDiagnosticsForTrackedFiles() {
        if (!this._fileDiagnostics || !this._nextEditRequest?.documents) {
            return undefined;
        }
        const diagnosticsOfTrackedFiles = this._fileDiagnostics.filter(([uri]) => this._nextEditRequest.documents.some(doc => doc.id.toString() === uri.toString()));
        return (0, languageContext_1.serializeFileDiagnostics)(diagnosticsOfTrackedFiles);
    }
    setLanguageContext(langCtx) {
        this._languageContext = langCtx;
    }
    /**
     * Convert the current instance into a JSON format to enable serialization
     * @returns JSON representation of the current state
     */
    toJSON() {
        return {
            requestId: this.requestId,
            time: this.time,
            filePath: this.filePath,
            version: this.version,
            statelessNextEditProviderId: this._statelessNextEditProviderId,
            nextEditRequest: this._nextEditRequest?.serialize(),
            diagnosticsResultEdit: this._diagnosticsResultEdit?.toString(),
            resultEdit: this._resultEdit?.toString(),
            isCachedResult: !!this._logContextOfCachedEdit,
            prompt: this.prompt,
            error: String(this.error),
            response: this.fullResponse,
            responseResults: yaml.stringify(this._responseResults, null, '\t'),
            providerStartTime: this.providerStartTime,
            providerEndTime: this.providerEndTime,
            fetchStartTime: this.fetchStartTime,
            fetchEndTime: this.fetchEndTime,
            logs: this._logs,
            isAccepted: this._isAccepted,
            languageContext: this._languageContext ? (0, languageContext_1.serializeLanguageContext)(this._languageContext) : undefined,
            diagnostics: this._getDiagnosticsForTrackedFiles()
        };
    }
}
exports.InlineEditRequestLogContext = InlineEditRequestLogContext;
function basename(path) {
    const slash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
    if (slash === -1) {
        return path;
    }
    return path.slice(slash + 1);
}
//# sourceMappingURL=inlineEditLogContext.js.map