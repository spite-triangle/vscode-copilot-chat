"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatelessNextEditTelemetryBuilder = exports.StatelessNextEditResult = exports.NoNextEditReason = exports.FilteredOutReason = exports.StatelessNextEditDocument = exports.StatelessNextEditRequest = void 0;
const result_1 = require("../../../util/common/result");
const assert_1 = require("../../../util/vs/base/common/assert");
const async_1 = require("../../../util/vs/base/common/async");
const cancellation_1 = require("../../../util/vs/base/common/cancellation");
const stringEdit_1 = require("../../../util/vs/editor/common/core/edits/stringEdit");
const abstractText_1 = require("../../../util/vs/editor/common/core/text/abstractText");
const workspaceLog_1 = require("../../workspaceRecorder/common/workspaceLog");
const stringifyChatMessages_1 = require("./utils/stringifyChatMessages");
class StatelessNextEditRequest {
    static { this.ID = 0; }
    get result() {
        return this._result.p;
    }
    constructor(id, opportunityId, documentBeforeEdits, documents, activeDocumentIdx, xtabEditHistory, firstEdit, expandedEditWindowNLines, logContext, recordingBookmark, recording, providerRequestStartDateTime) {
        this.id = id;
        this.opportunityId = opportunityId;
        this.documentBeforeEdits = documentBeforeEdits;
        this.documents = documents;
        this.activeDocumentIdx = activeDocumentIdx;
        this.xtabEditHistory = xtabEditHistory;
        this.firstEdit = firstEdit;
        this.expandedEditWindowNLines = expandedEditWindowNLines;
        this.logContext = logContext;
        this.recordingBookmark = recordingBookmark;
        this.recording = recording;
        this.providerRequestStartDateTime = providerRequestStartDateTime;
        this.seqid = String(++StatelessNextEditRequest.ID);
        this.cancellationTokenSource = new cancellation_1.CancellationTokenSource();
        this.liveDependentants = 0; // number of invocations which haven't been canceled and depend on this request
        this.fetchIssued = false;
        this.intermediateUserEdit = stringEdit_1.StringEdit.empty;
        this._result = new async_1.DeferredPromise();
        (0, assert_1.assert)(documents.length > 0);
        (0, assert_1.assert)(activeDocumentIdx >= 0 && activeDocumentIdx < documents.length);
    }
    setResult(nextEditResult) {
        this._result.complete(nextEditResult);
    }
    setResultError(err) {
        this._result.error(err);
    }
    hasDocument(docId) {
        return this.documents.find(d => d.id === docId) !== undefined;
    }
    getActiveDocument() {
        return this.documents[this.activeDocumentIdx];
    }
    serialize() {
        return {
            id: this.id,
            documents: this.documents.map(d => d.serialize()),
            activeDocumentIdx: this.activeDocumentIdx,
            recording: this.recording,
        };
    }
    toString() {
        return this.toMarkdown();
    }
    toMarkdown() {
        const docs = this.documents.map((d, idx) => ` * [${idx + 1}/${this.documents.length}] ${idx === this.activeDocumentIdx ? '(active document) ' : ''}` + d.toMarkdown()).join('\n\n');
        return `### StatelessNextEditRequest\n\n${docs}`;
    }
}
exports.StatelessNextEditRequest = StatelessNextEditRequest;
class StatelessNextEditDocument {
    /**
     * NOTE: if you add new public fields to this class, please also update {@link ISerializedNextEditDocument} and {@link serialize()} methods,
     * which are used to send this to http-server-powered NES provider.
     */
    constructor(id, workspaceRoot, languageId, documentLinesBeforeEdit, recentEdit, documentBeforeEdits, recentEdits, lastSelectionInAfterEdit = undefined) {
        this.id = id;
        this.workspaceRoot = workspaceRoot;
        this.languageId = languageId;
        this.documentLinesBeforeEdit = documentLinesBeforeEdit;
        this.recentEdit = recentEdit;
        this.documentBeforeEdits = documentBeforeEdits;
        this.recentEdits = recentEdits;
        this.lastSelectionInAfterEdit = lastSelectionInAfterEdit;
        this.documentAfterEdits = new abstractText_1.StringText(this.recentEdits.apply(this.documentBeforeEdits.value));
        this.documentAfterEditsLines = this.documentAfterEdits.getLines();
    }
    serialize() {
        return {
            id: this.id.uri,
            workspaceRoot: this.workspaceRoot?.toString(),
            languageId: this.languageId,
            documentLinesBeforeEdit: this.documentLinesBeforeEdit,
            recentEdit: this.recentEdit.serialize(),
            documentBeforeEdits: this.documentBeforeEdits.value,
            recentEdits: this.recentEdits.serialize(),
            lastSelectionInAfterEdit: this.lastSelectionInAfterEdit === undefined ? undefined : (0, workspaceLog_1.serializeOffsetRange)(this.lastSelectionInAfterEdit),
        };
    }
    toString() {
        return this.toMarkdown();
    }
    toMarkdown() {
        const lines = [];
        lines.push(`StatelessNextEditDocument: **${this.id.uri}**\n`);
        lines.push('```patch');
        lines.push(this.recentEdit.humanReadablePatch(this.documentLinesBeforeEdit));
        lines.push('```');
        lines.push('');
        return lines.join('\n');
    }
}
exports.StatelessNextEditDocument = StatelessNextEditDocument;
var FilteredOutReason;
(function (FilteredOutReason) {
    FilteredOutReason["LowLogProbSuggestions"] = "lowLogProbSuggestions";
    FilteredOutReason["EnforcingNextEditOptions"] = "enforcingNextEditOptions";
    FilteredOutReason["PromptTooLarge"] = "promptTooLarge";
    FilteredOutReason["Uncategorized"] = "uncategorized";
})(FilteredOutReason || (exports.FilteredOutReason = FilteredOutReason = {}));
var NoNextEditReason;
(function (NoNextEditReason) {
    class ActiveDocumentHasNoEdits {
        constructor() {
            this.kind = 'activeDocumentHasNoEdits';
        }
    }
    NoNextEditReason.ActiveDocumentHasNoEdits = ActiveDocumentHasNoEdits;
    class NoSuggestions {
        constructor(documentBeforeEdits, window) {
            this.documentBeforeEdits = documentBeforeEdits;
            this.window = window;
            this.kind = 'noSuggestions';
        }
    }
    NoNextEditReason.NoSuggestions = NoSuggestions;
    class GotCancelled {
        constructor(message) {
            this.message = message;
            this.kind = 'gotCancelled';
        }
    }
    NoNextEditReason.GotCancelled = GotCancelled;
    class FetchFailure {
        constructor(error) {
            this.error = error;
            this.kind = 'fetchFailure';
        }
    }
    NoNextEditReason.FetchFailure = FetchFailure;
    class FilteredOut {
        constructor(message) {
            this.message = message;
            this.kind = 'filteredOut';
        }
    }
    NoNextEditReason.FilteredOut = FilteredOut;
    class PromptTooLarge {
        constructor(message) {
            this.message = message;
            this.kind = 'promptTooLarge';
        }
    }
    NoNextEditReason.PromptTooLarge = PromptTooLarge;
    class Uncategorized {
        constructor(error) {
            this.error = error;
            this.kind = 'uncategorized';
        }
    }
    NoNextEditReason.Uncategorized = Uncategorized;
    class Unexpected {
        constructor(error) {
            this.error = error;
            this.kind = 'unexpected';
        }
    }
    NoNextEditReason.Unexpected = Unexpected;
})(NoNextEditReason || (exports.NoNextEditReason = NoNextEditReason = {}));
class StatelessNextEditResult {
    static noEdit(reason, telemetryBuilder) {
        const result = result_1.Result.error(reason);
        const telemetry = telemetryBuilder.build(result);
        return new StatelessNextEditResult(result, telemetry);
    }
    static streaming(telemetryBuilder) {
        const result = result_1.Result.ok(undefined);
        const telemetry = telemetryBuilder.build(result);
        return new StatelessNextEditResult(result, telemetry);
    }
    constructor(nextEdit, telemetry) {
        this.nextEdit = nextEdit;
        this.telemetry = telemetry;
    }
}
exports.StatelessNextEditResult = StatelessNextEditResult;
class StatelessNextEditTelemetryBuilder {
    /**
     * It takes a request to automatically capture some properties from the request.
     */
    constructor(request) {
        this.startTime = Date.now();
        this.requestUuid = request.id;
    }
    build(result) {
        const endTime = Date.now();
        const timeSpent = endTime - this.startTime;
        const prompt = this._prompt ? JSON.stringify(this._prompt.map(({ role, content }) => ({ role, content }))) : undefined;
        const promptText = this._prompt ? (0, stringifyChatMessages_1.stringifyChatMessages)(this._prompt) : undefined;
        const promptLineCount = promptText?.split('\n').length;
        const promptCharCount = promptText?.length;
        const noNextEditReasonKind = result.isOk() ? undefined : result.err.kind;
        let noNextEditReasonMessage;
        if (result.isError()) {
            if (result.err instanceof NoNextEditReason.ActiveDocumentHasNoEdits || result.err instanceof NoNextEditReason.NoSuggestions) {
                // ignore
            }
            else if (result.err instanceof NoNextEditReason.GotCancelled || result.err instanceof NoNextEditReason.FilteredOut || result.err instanceof NoNextEditReason.PromptTooLarge) {
                noNextEditReasonMessage = result.err.message;
            }
            else if (result.err instanceof NoNextEditReason.FetchFailure || result.err instanceof NoNextEditReason.Uncategorized || result.err instanceof NoNextEditReason.Unexpected) {
                noNextEditReasonMessage = result.err.error.stack ? result.err.error.stack : result.err.error.message;
            }
            else {
                (0, assert_1.assertNever)(result.err);
            }
        }
        return {
            hadStatelessNextEditProviderCall: true,
            noNextEditReasonKind,
            noNextEditReasonMessage,
            statelessNextEditProviderDuration: timeSpent,
            logProbThreshold: this._logProbThreshold,
            nLinesOfCurrentFileInPrompt: this._nLinesOfCurrentFileInPrompt,
            modelName: this._modelName,
            prompt,
            promptLineCount,
            promptCharCount,
            isCursorAtEndOfLine: this._isCursorAtLineEnd,
            debounceTime: this._debounceTime,
            artificialDelay: this._artificialDelay,
            fetchStartedAt: this._fetchStartedAt,
            hadLowLogProbSuggestion: this._hadLowLogProbSuggestion,
            response: this._response,
            nEditsSuggested: this._nEditsSuggested,
            nextEditLogprob: this._nextEditLogProb,
            lineDistanceToMostRecentEdit: this._lineDistanceToMostRecentEdit,
        };
    }
    setLogProbThreshold(logProbThreshold) {
        this._logProbThreshold = logProbThreshold;
        return this;
    }
    setHadLowLogProbSuggestion(hadLowLogProbSuggestions) {
        this._hadLowLogProbSuggestion = hadLowLogProbSuggestions;
        return this;
    }
    setNLinesOfCurrentFileInPrompt(nLines) {
        this._nLinesOfCurrentFileInPrompt = nLines;
        return this;
    }
    setModelName(modelName) {
        this._modelName = modelName;
        return this;
    }
    setPrompt(prompt) {
        this._prompt = prompt;
        return this;
    }
    setIsCursorAtLineEnd(isCursorAtLineEnd) {
        this._isCursorAtLineEnd = isCursorAtLineEnd;
        return this;
    }
    setDebounceTime(debounceTime) {
        this._debounceTime = debounceTime;
        return this;
    }
    setArtificialDelay(artificialDelay) {
        this._artificialDelay = artificialDelay;
        return this;
    }
    setFetchStartedAt() {
        this._fetchStartedAt = Date.now();
        return this;
    }
    get fetchStartedAt() {
        return this._fetchStartedAt;
    }
    setResponse(response) {
        this._response = response.then(({ response, ttft }) => {
            const fetchTime = Date.now() - this._fetchStartedAt;
            const fetchResult = response.type;
            return {
                ttft,
                response,
                fetchTime,
                fetchResult,
            };
        });
        return this;
    }
    setNextEditLogProb(logProb) {
        this._nextEditLogProb = logProb;
        return this;
    }
    setNEditsSuggested(nEditsSuggested) {
        this._nEditsSuggested = nEditsSuggested;
        return this;
    }
    setLineDistanceToMostRecentEdit(distanceToMostRecentEdit) {
        this._lineDistanceToMostRecentEdit = distanceToMostRecentEdit;
        return this;
    }
}
exports.StatelessNextEditTelemetryBuilder = StatelessNextEditTelemetryBuilder;
//# sourceMappingURL=statelessNextEditProvider.js.map