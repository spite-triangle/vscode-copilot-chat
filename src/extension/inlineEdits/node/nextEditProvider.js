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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NextEditFetchRequest = exports.NextEditProvider = void 0;
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const edit_1 = require("../../../platform/inlineEdits/common/dataTypes/edit");
const rootedLineEdit_1 = require("../../../platform/inlineEdits/common/dataTypes/rootedLineEdit");
const statelessNextEditProvider_1 = require("../../../platform/inlineEdits/common/statelessNextEditProvider");
const observable_1 = require("../../../platform/inlineEdits/common/utils/observable");
const logService_1 = require("../../../platform/log/common/logService");
const snippyService_1 = require("../../../platform/snippy/common/snippyService");
const nullExperimentationService_1 = require("../../../platform/telemetry/common/nullExperimentationService");
const errors = __importStar(require("../../../util/common/errors"));
const result_1 = require("../../../util/common/result");
const tracing_1 = require("../../../util/common/tracing");
const assert_1 = require("../../../util/vs/base/common/assert");
const async_1 = require("../../../util/vs/base/common/async");
const cache_1 = require("../../../util/vs/base/common/cache");
const errors_1 = require("../../../util/vs/base/common/errors");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const map_1 = require("../../../util/vs/base/common/map");
const observable_2 = require("../../../util/vs/base/common/observable");
const types_1 = require("../../../util/vs/base/common/types");
const uuid_1 = require("../../../util/vs/base/common/uuid");
const lineEdit_1 = require("../../../util/vs/editor/common/core/edits/lineEdit");
const stringEdit_1 = require("../../../util/vs/editor/common/core/edits/stringEdit");
const offsetRange_1 = require("../../../util/vs/editor/common/core/ranges/offsetRange");
const editRebase_1 = require("../common/editRebase");
const rejectionCollector_1 = require("../common/rejectionCollector");
const nextEditCache_1 = require("./nextEditCache");
const nextEditResult_1 = require("./nextEditResult");
let NextEditProvider = class NextEditProvider extends lifecycle_1.Disposable {
    get lastRejectionTime() {
        return this._lastRejectionTime;
    }
    get lastTriggerTime() {
        return this._lastTriggerTime;
    }
    constructor(_workspace, _statelessNextEditProvider, _historyContextProvider, _xtabHistoryTracker, _debugRecorder, _configService, _snippyService, _logService, _expService) {
        super();
        this._workspace = _workspace;
        this._statelessNextEditProvider = _statelessNextEditProvider;
        this._historyContextProvider = _historyContextProvider;
        this._xtabHistoryTracker = _xtabHistoryTracker;
        this._debugRecorder = _debugRecorder;
        this._configService = _configService;
        this._snippyService = _snippyService;
        this._logService = _logService;
        this._expService = _expService;
        this.ID = this._statelessNextEditProvider.ID;
        this._rejectionCollector = this._register(new rejectionCollector_1.RejectionCollector(this._workspace, s => this._logService.trace(s)));
        this._recentlyShownCache = new RecentlyShownCache();
        this._pendingStatelessNextEditRequest = null;
        this._lastShownTime = 0;
        this._lastRejectionTime = 0;
        this._lastTriggerTime = 0;
        this._shouldExpandEditWindow = false;
        this._tracer = (0, tracing_1.createTracer)(['NES', 'NextEditProvider'], (s) => this._logService.trace(s));
        this._nextEditCache = new nextEditCache_1.NextEditCache(this._workspace, this._logService);
        (0, observable_2.mapObservableArrayCached)(this, this._workspace.openDocuments, (doc, store) => {
            store.add((0, observable_2.runOnChange)(doc.value, (value) => {
                this._cancelPendingRequestDueToDocChange(doc.id, value);
            }));
        }).recomputeInitiallyAndOnChange(this._store);
    }
    _cancelPendingRequestDueToDocChange(docId, docValue) {
        const isAsyncCompletions = this._configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsAsyncCompletions, this._expService);
        if (isAsyncCompletions || this._pendingStatelessNextEditRequest === null) {
            return;
        }
        const activeDoc = this._pendingStatelessNextEditRequest.getActiveDocument();
        if (activeDoc.id === docId && activeDoc.documentAfterEdits.value !== docValue.value) {
            this._pendingStatelessNextEditRequest.cancellationTokenSource.cancel();
        }
    }
    async getNextEdit(docId, context, logContext, cancellationToken, telemetryBuilder) {
        this._lastTriggerTime = Date.now();
        const tracer = this._tracer.sub(context.requestUuid.substring(4, 8));
        const shouldExpandEditWindow = this._shouldExpandEditWindow;
        logContext.setStatelessNextEditProviderId(this._statelessNextEditProvider.ID);
        let result;
        try {
            result = await this._getNextEditCanThrow(docId, context, this._lastTriggerTime, shouldExpandEditWindow, tracer, logContext, cancellationToken, telemetryBuilder);
        }
        catch (error) {
            logContext.setError(error);
            telemetryBuilder.setNextEditProviderError(errors.toString(error));
            throw error;
        }
        finally {
            telemetryBuilder.markEndTime();
        }
        this._lastNextEditResult = result;
        return result;
    }
    async _getNextEditCanThrow(docId, context, triggerTime, shouldExpandEditWindow, parentTracer, logContext, cancellationToken, telemetryBuilder) {
        const tracer = parentTracer.sub('_getNextEdit');
        const doc = this._workspace.getDocument(docId);
        if (!doc) {
            tracer.throws(`Document "${docId.baseName}" not found`);
            throw new errors_1.BugIndicatingError(`Document "${docId.baseName}" not found`);
        }
        const documentAtInvocationTime = doc.value.get();
        const nesConfigs = this.determineNesConfigs(telemetryBuilder, logContext);
        const recentlyShownCachedEdit = this._recentlyShownCache.get(docId, documentAtInvocationTime);
        const cachedEdit = this._nextEditCache.lookupNextEdit(docId, documentAtInvocationTime, doc.selection.get(), nesConfigs);
        if (cachedEdit?.rejected) {
            tracer.trace('cached edit was previously rejected');
            telemetryBuilder.setStatus('previouslyRejectedCache');
            telemetryBuilder.setWasPreviouslyRejected();
            const nextEditResult = new nextEditResult_1.NextEditResult(logContext.requestId, cachedEdit.source, undefined);
            return nextEditResult;
        }
        let edit;
        let currentDocument;
        let throwingError;
        let req;
        let targetDocumentId = docId;
        let isRebasedCachedEdit = false;
        let isSubsequentCachedEdit = false;
        if (recentlyShownCachedEdit) {
            tracer.trace('using recently shown cached edit');
            edit = recentlyShownCachedEdit[0];
            req = recentlyShownCachedEdit[1];
            logContext.setIsCachedResult(req.log);
            currentDocument = documentAtInvocationTime;
            telemetryBuilder.setHeaderRequestId(req.headerRequestId);
            telemetryBuilder.setIsFromCache();
            // TODO
            // telemetryBuilder.setSubsequentEditOrder(cachedEdit.subsequentN);
            // back-date the recording bookmark of the cached edit to the bookmark of the original request.
            logContext.recordingBookmark = req.log.recordingBookmark;
        }
        else if (cachedEdit) {
            tracer.trace('using cached edit');
            edit = cachedEdit.rebasedEdit || cachedEdit.edit;
            isRebasedCachedEdit = !!cachedEdit.rebasedEdit;
            isSubsequentCachedEdit = cachedEdit.subsequentN !== undefined && cachedEdit.subsequentN > 0;
            req = cachedEdit.source;
            logContext.setIsCachedResult(cachedEdit.source.log);
            currentDocument = documentAtInvocationTime;
            telemetryBuilder.setHeaderRequestId(req.headerRequestId);
            telemetryBuilder.setIsFromCache();
            telemetryBuilder.setSubsequentEditOrder(cachedEdit.rebasedEditIndex ?? cachedEdit.subsequentN);
            // back-date the recording bookmark of the cached edit to the bookmark of the original request.
            logContext.recordingBookmark = req.log.recordingBookmark;
        }
        else {
            tracer.trace(`fetching next edit with shouldExpandEditWindow=${shouldExpandEditWindow}`);
            req = new NextEditFetchRequest(context.requestUuid, logContext, nesConfigs.debounceUseCoreRequestTime ? (context.requestIssuedDateTime ?? undefined) : undefined);
            telemetryBuilder.setHeaderRequestId(req.headerRequestId);
            const startVersion = doc.value.get();
            tracer.trace('awaiting firstEdit promise');
            const result = await this.fetchNextEdit(req, doc, nesConfigs, shouldExpandEditWindow, tracer, telemetryBuilder, cancellationToken);
            tracer.trace('resolved firstEdit promise');
            const latency = `First edit latency: ${Date.now() - this._lastTriggerTime} ms`;
            logContext.addLog(latency);
            tracer.trace(latency);
            if (result.isError()) {
                tracer.trace(`failed to fetch next edit ${result.err.kind}${result.err.message ? ` (${result.err.message})` : ''}`);
                telemetryBuilder.setStatus(`noEdit:${result.err.kind}`);
                if (result.err instanceof statelessNextEditProvider_1.NoNextEditReason.FetchFailure || result.err instanceof statelessNextEditProvider_1.NoNextEditReason.Unexpected) {
                    throwingError = result.err.error;
                }
            }
            else {
                targetDocumentId = result.val.docId ?? targetDocumentId;
                const targetDoc = targetDocumentId ? this._workspace.getDocument(targetDocumentId) : doc;
                currentDocument = targetDoc.value.get();
                const docDidChange = targetDocumentId === doc.id && startVersion.value !== currentDocument.value;
                if (docDidChange) {
                    tracer.trace('document changed while fetching next edit');
                    telemetryBuilder.setStatus('docChanged');
                    logContext.setIsSkipped();
                }
                else {
                    const suggestedNextEdit = result.val.rebasedEdit || result.val.edit;
                    if (!suggestedNextEdit) {
                        tracer.trace('empty edits');
                        telemetryBuilder.setStatus('emptyEdits');
                    }
                    else {
                        tracer.trace('fetch succeeded');
                        logContext.setResponseResults([suggestedNextEdit]); // TODO: other streamed edits?
                        edit = suggestedNextEdit;
                    }
                }
            }
        }
        if (throwingError) {
            tracer.throws('has throwing error', throwingError);
            throw throwingError;
        }
        const emptyResult = new nextEditResult_1.NextEditResult(logContext.requestId, req, undefined);
        if (!edit) {
            tracer.returns('had no edit');
            // telemetry builder status must've been set earlier
            return emptyResult;
        }
        if (cancellationToken.isCancellationRequested) {
            tracer.returns('cancelled');
            telemetryBuilder.setStatus(`noEdit:gotCancelled`);
            return emptyResult;
        }
        if (this._rejectionCollector.isRejected(targetDocumentId, edit) || currentDocument && this._nextEditCache.isRejectedNextEdit(targetDocumentId, currentDocument, edit, nesConfigs)) {
            tracer.returns('edit was previously rejected');
            telemetryBuilder.setStatus('previouslyRejected');
            telemetryBuilder.setWasPreviouslyRejected();
            return emptyResult;
        }
        logContext.setResult(rootedLineEdit_1.RootedLineEdit.fromEdit(new edit_1.RootedEdit(documentAtInvocationTime, new stringEdit_1.StringEdit([edit]))));
        (0, assert_1.assert)(currentDocument !== undefined, 'should be defined if edit is defined');
        telemetryBuilder.setStatus('notAccepted'); // Acceptance pending.
        const showRangePreference = this._statelessNextEditProvider.showNextEditPreference ?? "aroundEdit" /* ShowNextEditPreference.AroundEdit */;
        const nextEditResult = new nextEditResult_1.NextEditResult(logContext.requestId, req, { edit, showRangePreference, documentBeforeEdits: currentDocument, targetDocumentId });
        if (nesConfigs.isRecentlyShownCacheEnabled && !edit.isEmpty) {
            tracer.trace('edit is not neutral');
            this._recentlyShownCache.add(targetDocumentId, currentDocument, [edit, req]);
        }
        telemetryBuilder.setHasNextEdit(true);
        const delay = this.computeMinimumResponseDelay({ triggerTime, isRebasedCachedEdit, isSubsequentCachedEdit }, tracer);
        if (delay > 0) {
            await (0, async_1.timeout)(delay);
            if (cancellationToken.isCancellationRequested) {
                tracer.returns('cancelled');
                telemetryBuilder.setStatus(`noEdit:gotCancelled`);
                return emptyResult;
            }
        }
        tracer.returns('returning next edit result');
        return nextEditResult;
    }
    determineNesConfigs(telemetryBuilder, logContext) {
        const nesConfigs = {
            isAsyncCompletions: this._configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsAsyncCompletions, this._expService),
            isRevisedCacheStrategy: this._configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsRevisedCacheStrategy, this._expService),
            isCacheTracksRejections: this._configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsCacheTracksRejections, this._expService),
            isRecentlyShownCacheEnabled: this._configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsRecentlyShownCacheEnabled, this._expService),
            debounceUseCoreRequestTime: this._configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsDebounceUseCoreRequestTime, this._expService),
        };
        telemetryBuilder.setNESConfigs({ ...nesConfigs });
        logContext.addCodeblockToLog(JSON.stringify(nesConfigs, null, '\t'));
        return nesConfigs;
    }
    _processDoc(doc) {
        const documentLinesBeforeEdit = doc.lastEdit.base.getLines();
        const recentEdits = doc.lastEdits;
        const recentEdit = rootedLineEdit_1.RootedLineEdit.fromEdit(new edit_1.RootedEdit(doc.lastEdit.base, doc.lastEdits.compose())).removeCommonSuffixPrefixLines().edit;
        const documentBeforeEdits = doc.lastEdit.base;
        const lastSelectionInAfterEdits = doc.lastSelection;
        const workspaceRoot = this._workspace.getWorkspaceRoot(doc.docId);
        const nextEditDoc = new statelessNextEditProvider_1.StatelessNextEditDocument(doc.docId, workspaceRoot, doc.languageId, documentLinesBeforeEdit, recentEdit, documentBeforeEdits, recentEdits, lastSelectionInAfterEdits);
        return {
            recentEdit: doc.lastEdit,
            nextEditDoc,
            documentAfterEdits: nextEditDoc.documentAfterEdits,
        };
    }
    async fetchNextEdit(req, doc, nesConfigs, shouldExpandEditWindow, parentTracer, telemetryBuilder, cancellationToken) {
        const curDocId = doc.id;
        const tracer = parentTracer.sub('fetchNextEdit');
        const historyContext = this._historyContextProvider.getHistoryContext(curDocId);
        if (!historyContext) {
            return result_1.Result.error(new statelessNextEditProvider_1.NoNextEditReason.Unexpected(new Error('DocumentMissingInHistoryContext')));
        }
        const documentAtInvocationTime = doc.value.get();
        const selectionAtInvocationTime = doc.selection.get();
        const logContext = req.log;
        logContext.setRecentEdit(historyContext);
        const pendingRequestStillCurrent = documentAtInvocationTime.value === this._pendingStatelessNextEditRequest?.documentBeforeEdits.value;
        const existingNextEditRequest = (pendingRequestStillCurrent || nesConfigs.isAsyncCompletions) && !this._pendingStatelessNextEditRequest?.cancellationTokenSource.token.isCancellationRequested
            && this._pendingStatelessNextEditRequest || undefined;
        if (existingNextEditRequest) {
            // Nice! No need to make another request, we can reuse the result from a pending request.
            const nextEditResult = await this._joinNextEditRequest(existingNextEditRequest, telemetryBuilder, logContext, cancellationToken);
            if (pendingRequestStillCurrent) {
                telemetryBuilder.setStatelessNextEditTelemetry(nextEditResult.telemetry);
                return nextEditResult.nextEdit.isError() ? nextEditResult.nextEdit : existingNextEditRequest.firstEdit.p;
            }
            else {
                // Needs rebasing.
                const cacheResult = await existingNextEditRequest.firstEdit.p;
                if (cacheResult.isOk() && cacheResult.val.edit) {
                    const rebasedCachedEdit = this._nextEditCache.tryRebaseCacheEntry(cacheResult.val, documentAtInvocationTime, selectionAtInvocationTime, nesConfigs);
                    if (rebasedCachedEdit) {
                        telemetryBuilder.setStatelessNextEditTelemetry(nextEditResult.telemetry);
                        return result_1.Result.ok(rebasedCachedEdit);
                    }
                }
                if (cancellationToken.isCancellationRequested) {
                    tracer.trace('document changed after rebase failed');
                    telemetryBuilder.setStatelessNextEditTelemetry(nextEditResult.telemetry);
                    return result_1.Result.error(new statelessNextEditProvider_1.NoNextEditReason.GotCancelled('afterFailedRebase'));
                }
                // Rebase failed (or result had error). Check if there is a new pending request. Otherwise continue with a new request below.
                const pendingRequestStillCurrent = documentAtInvocationTime.value === this._pendingStatelessNextEditRequest?.documentBeforeEdits.value;
                const existingNextEditRequest2 = pendingRequestStillCurrent && !this._pendingStatelessNextEditRequest?.cancellationTokenSource.token.isCancellationRequested
                    && this._pendingStatelessNextEditRequest || undefined;
                if (existingNextEditRequest2) {
                    tracer.trace('reusing 2nd existing next edit request after rebase failed');
                    const nextEditResult = await this._joinNextEditRequest(existingNextEditRequest2, telemetryBuilder, logContext, cancellationToken);
                    telemetryBuilder.setStatelessNextEditTelemetry(nextEditResult.telemetry);
                    return nextEditResult.nextEdit.isError() ? nextEditResult.nextEdit : existingNextEditRequest2.firstEdit.p;
                }
                tracer.trace('creating new next edit request after rebase failed');
            }
        }
        const res = await this._executeNewNextEditRequest(req, doc, historyContext, nesConfigs, shouldExpandEditWindow, tracer, telemetryBuilder, cancellationToken);
        const nextEditRequest = res.nextEditRequest;
        const nextEditResult = res.nextEditResult;
        telemetryBuilder.setStatelessNextEditTelemetry(nextEditResult.telemetry);
        return nextEditResult.nextEdit.isError() ? nextEditResult.nextEdit : nextEditRequest.firstEdit.p;
    }
    async _joinNextEditRequest(nextEditRequest, telemetryBuilder, logContext, cancellationToken) {
        // TODO: Will the telemetry look alright in this case?
        telemetryBuilder.setHeaderRequestId(nextEditRequest.id);
        telemetryBuilder.setIsFromCache();
        telemetryBuilder.setRequest(nextEditRequest);
        logContext.setRequestInput(nextEditRequest);
        logContext.setIsCachedResult(nextEditRequest.logContext);
        const disp = this._hookupCancellation(nextEditRequest, cancellationToken);
        try {
            return await nextEditRequest.result;
        }
        finally {
            disp.dispose();
        }
    }
    async _executeNewNextEditRequest(req, doc, historyContext, nesConfigs, shouldExpandEditWindow, parentTracer, telemetryBuilder, cancellationToken) {
        const curDocId = doc.id;
        const tracer = parentTracer.sub('_executeNewNextEditRequest');
        const recording = this._debugRecorder?.getRecentLog();
        const logContext = req.log;
        const activeDocAndIdx = assertDefined(historyContext.getDocumentAndIdx(curDocId));
        const activeDocSelection = doc.selection.get()[0];
        const projectedDocuments = historyContext.documents.map(doc => this._processDoc(doc));
        const xtabEditHistory = this._xtabHistoryTracker.getHistory();
        function convertLineEditToEdit(nextLineEdit, docId) {
            const doc = projectedDocuments.find(d => d.nextEditDoc.id === docId);
            const rootedLineEdit = new rootedLineEdit_1.RootedLineEdit(doc.documentAfterEdits, nextLineEdit);
            const suggestedEdit = rootedLineEdit.toEdit();
            return suggestedEdit;
        }
        const firstEdit = new async_1.DeferredPromise();
        const nLinesEditWindow = (shouldExpandEditWindow
            ? this._configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsAutoExpandEditWindowLines, this._expService)
            : undefined);
        const nextEditRequest = new statelessNextEditProvider_1.StatelessNextEditRequest(req.headerRequestId, req.opportunityId, doc.value.get(), projectedDocuments.map(d => d.nextEditDoc), activeDocAndIdx.idx, xtabEditHistory, firstEdit, nLinesEditWindow, logContext, req.log.recordingBookmark, recording, req.providerRequestStartDateTime);
        let nextEditResult;
        if (this._pendingStatelessNextEditRequest) {
            this._pendingStatelessNextEditRequest.cancellationTokenSource.cancel();
            this._pendingStatelessNextEditRequest = null;
        }
        this._pendingStatelessNextEditRequest = nextEditRequest;
        const removeFromPending = () => {
            if (this._pendingStatelessNextEditRequest === nextEditRequest) {
                this._pendingStatelessNextEditRequest = null;
            }
        };
        telemetryBuilder.setRequest(nextEditRequest);
        telemetryBuilder.setStatus('requested');
        logContext.setRequestInput(nextEditRequest);
        // A note on cancellation:
        //
        // We don't cancel when the cancellation token is signalled, because we have our own
        // separate cancellation logic which ends up cancelling based on documents changing.
        //
        // But we do cancel requests which didn't start yet if no-one really needs their result
        //
        const disp = this._hookupCancellation(nextEditRequest, cancellationToken, nesConfigs.isAsyncCompletions ? (0, observable_1.autorunWithChanges)(this, {
            value: doc.value,
        }, data => {
            data.value.changes.forEach(edit => {
                if (nextEditRequest.intermediateUserEdit && !edit.isEmpty()) {
                    nextEditRequest.intermediateUserEdit = nextEditRequest.intermediateUserEdit.compose(edit);
                    if (!(0, editRebase_1.checkEditConsistency)(nextEditRequest.documentBeforeEdits.value, nextEditRequest.intermediateUserEdit, data.value.value.value, tracer)) {
                        nextEditRequest.intermediateUserEdit = undefined;
                    }
                }
            });
        }) : undefined);
        const createPushEdit = () => {
            let ithEdit = -1;
            const statePerDoc = new cache_1.CachedFunction((id) => {
                const doc = projectedDocuments.find(d => d.nextEditDoc.id === id);
                if (!doc) {
                    throw new errors_1.BugIndicatingError();
                }
                return {
                    docContents: doc.documentAfterEdits,
                    editsSoFar: stringEdit_1.StringEdit.empty,
                    nextEdits: [],
                    docId: id,
                };
            });
            const pushEdit = (result) => {
                const myTracer = tracer.sub('pushEdit');
                ++ithEdit;
                myTracer.trace(`processing edit #${ithEdit} (starts at 0)`);
                if (result.isError()) { // either error or stream of edits ended
                    // if there was a request made, and it ended without any edits, reset shouldExpandEditWindow
                    if (ithEdit === 0 && result.err instanceof statelessNextEditProvider_1.NoNextEditReason.NoSuggestions) {
                        myTracer.trace('resetting shouldExpandEditWindow to false due to NoSuggestions');
                        this._shouldExpandEditWindow = false;
                    }
                    if (statePerDoc.get(curDocId).nextEdits.length) {
                        myTracer.returns(`${statePerDoc.get(curDocId).nextEdits.length} edits returned`);
                    }
                    else {
                        myTracer.returns(`no edit, reason: ${result.err.kind}`);
                        if (result.err instanceof statelessNextEditProvider_1.NoNextEditReason.NoSuggestions) {
                            const { documentBeforeEdits, window } = result.err;
                            let reducedWindow = window;
                            if (activeDocSelection && window) {
                                const cursorOffset = activeDocSelection.endExclusive;
                                const t = documentBeforeEdits.getTransformer();
                                const cursorPosition = t.getPosition(cursorOffset);
                                const lineOffset = t.getOffset(cursorPosition.with(undefined, 1));
                                const lineEndOffset = t.getOffset(cursorPosition.with(undefined, t.getLineLength(cursorPosition.lineNumber) + 1));
                                const reducedOffset = t.getOffset(t.getPosition(window.start).delta(1));
                                const reducedEndPosition = t.getPosition(window.endExclusive).delta(-2);
                                const reducedEndOffset = t.getOffset(reducedEndPosition.column > 1 ? reducedEndPosition.with(undefined, t.getLineLength(reducedEndPosition.lineNumber) + 1) : reducedEndPosition);
                                reducedWindow = new offsetRange_1.OffsetRange(Math.min(reducedOffset, lineOffset), Math.max(reducedEndOffset, lineEndOffset));
                            }
                            this._nextEditCache.setNoNextEdit(curDocId, documentBeforeEdits, reducedWindow, req, nesConfigs);
                        }
                    }
                    {
                        disp.dispose();
                        removeFromPending();
                    }
                    if (!firstEdit.isSettled) {
                        firstEdit.complete(result);
                    }
                    return;
                }
                // reset shouldExpandEditWindow to false when we get any edit
                myTracer.trace('resetting shouldExpandEditWindow to false due to receiving an edit');
                this._shouldExpandEditWindow = false;
                const targetDocState = statePerDoc.get(result.val.targetDocument ?? curDocId);
                const singleLineEdit = result.val.edit;
                const lineEdit = new lineEdit_1.LineEdit([singleLineEdit]);
                const edit = convertLineEditToEdit(lineEdit, targetDocState.docId);
                const rebasedEdit = edit.tryRebase(targetDocState.editsSoFar);
                if (rebasedEdit === undefined) {
                    myTracer.trace(`edit ${ithEdit} is undefined after rebasing`);
                    if (!firstEdit.isSettled) {
                        firstEdit.complete(result_1.Result.error(new statelessNextEditProvider_1.NoNextEditReason.Uncategorized(new Error('Rebased edit is undefined'))));
                    }
                    return;
                }
                targetDocState.editsSoFar = targetDocState.editsSoFar.compose(rebasedEdit);
                let cachedEdit;
                if (rebasedEdit.replacements.length === 0) {
                    myTracer.trace(`WARNING: ${ithEdit} has no edits`);
                }
                else if (rebasedEdit.replacements.length > 1) {
                    myTracer.trace(`WARNING: ${ithEdit} has ${rebasedEdit.replacements.length} edits, but expected only 1`);
                }
                else {
                    // populate the cache
                    const nextEdit = rebasedEdit.replacements[0];
                    targetDocState.nextEdits.push(nextEdit);
                    cachedEdit = this._nextEditCache.setKthNextEdit(targetDocState.docId, targetDocState.docContents, ithEdit === 0 ? result.val.window : undefined, nextEdit, ithEdit, ithEdit === 0 ? targetDocState.nextEdits : undefined, ithEdit === 0 ? nextEditRequest.intermediateUserEdit : undefined, req);
                    myTracer.trace(`populated cache for ${ithEdit}`);
                }
                if (!firstEdit.isSettled) {
                    myTracer.trace('resolving firstEdit promise');
                    logContext.setResult(new rootedLineEdit_1.RootedLineEdit(targetDocState.docContents, lineEdit)); // this's correct without rebasing because this's the first edit
                    firstEdit.complete(cachedEdit ? result_1.Result.ok(cachedEdit) : result_1.Result.error(new statelessNextEditProvider_1.NoNextEditReason.Unexpected(new Error('No cached edit'))));
                }
                targetDocState.docContents = rebasedEdit.applyOnText(targetDocState.docContents);
            };
            return pushEdit;
        };
        const pushEdit = createPushEdit();
        try {
            nextEditResult = await this._statelessNextEditProvider.provideNextEdit(nextEditRequest, pushEdit, logContext, nextEditRequest.cancellationTokenSource.token);
            nextEditRequest.setResult(nextEditResult);
        }
        catch (err) {
            nextEditRequest.setResultError(err);
            throw err;
        }
        finally {
            if (!nextEditResult || nextEditResult.nextEdit.isError()) {
                // when streaming, we need to keep the response going unless UI cancels it
                // if we remove it from pending here, when UI cancels, we cannot cancel it because we think that the request has finished
                disp.dispose();
                removeFromPending();
            }
        }
        return { nextEditRequest, nextEditResult };
    }
    _hookupCancellation(nextEditRequest, cancellationToken, attachedDisposable) {
        const disposables = new lifecycle_1.DisposableStore();
        let dependantRemoved = false;
        const removeDependant = () => {
            if (!dependantRemoved) {
                dependantRemoved = true;
                nextEditRequest.liveDependentants--;
            }
        };
        const cancellationTimer = disposables.add(new async_1.TimeoutTimer());
        disposables.add(cancellationToken.onCancellationRequested(() => {
            removeDependant();
            if (nextEditRequest.liveDependentants > 0) {
                // there are others depending on this request
                return;
            }
            if (!nextEditRequest.fetchIssued) {
                // fetch not issued => cancel!
                nextEditRequest.cancellationTokenSource.cancel();
                attachedDisposable?.dispose();
                return;
            }
            cancellationTimer.setIfNotSet(() => {
                if (nextEditRequest.liveDependentants > 0) {
                    // there are others depending on this request
                    return;
                }
                nextEditRequest.cancellationTokenSource.cancel();
                attachedDisposable?.dispose();
            }, 1000); // This needs to be longer than the pause between two requests from Core otherwise we cancel running requests too early.
        }));
        disposables.add((0, lifecycle_1.toDisposable)(() => {
            removeDependant();
            if (nextEditRequest.liveDependentants === 0) {
                attachedDisposable?.dispose();
            }
        }));
        nextEditRequest.liveDependentants++;
        return disposables;
    }
    computeMinimumResponseDelay({ triggerTime, isRebasedCachedEdit, isSubsequentCachedEdit }, tracer) {
        const cacheDelay = this._configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsCacheDelay, this._expService);
        const rebasedCacheDelay = this._configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsRebasedCacheDelay, this._expService);
        const subsequentCacheDelay = this._configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsSubsequentCacheDelay, this._expService);
        let minimumResponseDelay = cacheDelay;
        if (isRebasedCachedEdit && rebasedCacheDelay !== undefined) {
            minimumResponseDelay = rebasedCacheDelay;
        }
        else if (isSubsequentCachedEdit && subsequentCacheDelay !== undefined) {
            minimumResponseDelay = subsequentCacheDelay;
        }
        const nextEditProviderCallLatency = Date.now() - triggerTime;
        // if the provider call took longer than the minimum delay, we don't need to delay further
        const delay = Math.max(0, minimumResponseDelay - nextEditProviderCallLatency);
        tracer.trace(`[minimumDelay] expected delay: ${minimumResponseDelay}ms, effective delay: ${delay}. isRebasedCachedEdit: ${isRebasedCachedEdit} (rebasedCacheDelay: ${rebasedCacheDelay}), isSubsequentCachedEdit: ${isSubsequentCachedEdit} (subsequentCacheDelay: ${subsequentCacheDelay})`);
        return delay;
    }
    handleShown(suggestion) {
        this._lastShownTime = Date.now();
    }
    handleAcceptance(docId, suggestion) {
        this.runSnippy(docId, suggestion);
        this._statelessNextEditProvider.handleAcceptance?.();
        const tracer = this._tracer.subNoEntry(suggestion.source.opportunityId.substring(4, 8)).subNoEntry('handleAcceptance');
        if (suggestion === this._lastNextEditResult) {
            tracer.trace('setting shouldExpandEditWindow to true due to acceptance of last suggestion');
            this._shouldExpandEditWindow = true;
        }
        else {
            tracer.trace('NOT setting shouldExpandEditWindow to true because suggestion is not the last suggestion');
        }
    }
    handleRejection(docId, suggestion) {
        (0, types_1.assertType)(suggestion.result, '@ulugbekna: undefined edit cannot be rejected?');
        const shownDuration = Date.now() - this._lastShownTime;
        if (shownDuration > 1000 && suggestion.result) {
            // we can argue that the user had the time to review this
            // so it wasn't an accidental rejection
            this._recentlyShownCache.remove(suggestion.result.edit);
            this._rejectionCollector.reject(docId, suggestion.result.edit);
            if (this._configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsCacheTracksRejections, this._expService)) {
                this._nextEditCache.rejectedNextEdit(suggestion.source.headerRequestId);
            }
        }
        this._lastRejectionTime = Date.now();
        this._statelessNextEditProvider.handleRejection?.();
    }
    handleIgnored(docId, suggestion, supersededBy) { }
    async runSnippy(docId, suggestion) {
        if (suggestion.result === undefined) {
            return;
        }
        this._snippyService.handlePostInsertion(docId.toUri(), suggestion.result.documentBeforeEdits, suggestion.result.edit);
    }
    clearCache() {
        this._nextEditCache.clear();
        this._recentlyShownCache.clear();
        this._rejectionCollector.clear();
    }
};
exports.NextEditProvider = NextEditProvider;
exports.NextEditProvider = NextEditProvider = __decorate([
    __param(5, configurationService_1.IConfigurationService),
    __param(6, snippyService_1.ISnippyService),
    __param(7, logService_1.ILogService),
    __param(8, nullExperimentationService_1.IExperimentationService)
], NextEditProvider);
function assertDefined(value) {
    if (!value) {
        throw new errors_1.BugIndicatingError('expected value to be defined, but it was not');
    }
    return value;
}
class NextEditFetchRequest {
    constructor(opportunityId, log, providerRequestStartDateTime) {
        this.opportunityId = opportunityId;
        this.log = log;
        this.providerRequestStartDateTime = providerRequestStartDateTime;
        this.headerRequestId = (0, uuid_1.generateUuid)();
    }
}
exports.NextEditFetchRequest = NextEditFetchRequest;
class RecentlyShownCache {
    constructor() {
        this._cache = new map_1.LRUCache(10);
    }
    add(docId, documentBeforeEdits, edit) {
        const key = this._key(docId, documentBeforeEdits);
        this._cache.set(key, edit);
    }
    get(docId, documentContent) {
        const key = this._key(docId, documentContent);
        return this._cache.get(key);
    }
    remove(edit) {
        for (const entry of this._cache) {
            if (entry[1][0] === edit) {
                this._cache.delete(entry[0]);
                break;
            }
        }
    }
    clear() {
        this._cache.clear();
    }
    _key(docId, documentContent) {
        return docId.uri + ';' + documentContent.value;
    }
}
//# sourceMappingURL=nextEditProvider.js.map