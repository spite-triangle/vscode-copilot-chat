"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelemetrySender = exports.NextEditProviderTelemetryBuilder = exports.DiagnosticsTelemetryBuilder = exports.LlmNESTelemetryBuilder = void 0;
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const observable_1 = require("../../../platform/inlineEdits/common/utils/observable");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const notebooks_1 = require("../../../util/common/notebooks");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const network_1 = require("../../../util/vs/base/common/network");
const vscodeTypes_1 = require("../../../vscodeTypes");
class LlmNESTelemetryBuilder extends lifecycle_1.Disposable {
    build(includeAlternativeAction) {
        let documentsCount = undefined;
        let editsCount = undefined;
        let activeDocumentEditsCount = undefined;
        let activeDocumentLanguageId = undefined;
        let activeDocumentOriginalLineCount = undefined;
        let isNotebook = false;
        let notebookType = undefined;
        let activeDocumentRepository = undefined;
        let repositoryUrls = undefined;
        if (this._request) {
            const activeDoc = this._request.getActiveDocument();
            documentsCount = this._request.documents.length;
            editsCount = this._request.documents.reduce((acc, doc) => acc + doc.recentEdits.edits.length, 0);
            activeDocumentEditsCount = activeDoc.recentEdits.edits.length;
            activeDocumentLanguageId = activeDoc.languageId;
            activeDocumentOriginalLineCount = activeDoc.documentAfterEditsLines.length;
            isNotebook = activeDoc.id.toUri().scheme === network_1.Schemas.vscodeNotebookCell || this._notebookService?.hasSupportedNotebooks(activeDoc.id.toUri()) || false;
            notebookType = (0, notebooks_1.findNotebook)(activeDoc.id.toUri(), this._workspaceService.notebookDocuments)?.notebookType;
            const git = this._gitExtensionService.getExtensionApi();
            if (git) {
                const activeDocRepository = git.getRepository(vscodeTypes_1.Uri.parse(activeDoc.id.uri));
                if (activeDocRepository) {
                    const remoteName = activeDocRepository.state.HEAD?.upstream?.remote;
                    const remote = activeDocRepository.state.remotes.find(r => r.name === remoteName);
                    if (remote?.fetchUrl) {
                        activeDocumentRepository = remote.pushUrl || remote.fetchUrl;
                    }
                }
                const remoteUrlSet = new Set();
                const repositories = [...new Set(this._request.documents.map(doc => git.getRepository(vscodeTypes_1.Uri.parse(doc.id.uri))).filter(Boolean))];
                for (const repository of repositories) {
                    const remoteName = repository?.state.HEAD?.upstream?.remote;
                    const remote = repository?.state.remotes.find(r => r.name === remoteName);
                    if (remote?.fetchUrl) {
                        remoteUrlSet.add(remote.fetchUrl);
                    }
                    if (remote?.pushUrl) {
                        remoteUrlSet.add(remote.pushUrl);
                    }
                }
                repositoryUrls = [...remoteUrlSet];
            }
        }
        let alternativeAction;
        if (includeAlternativeAction) {
            const originalText = this._originalDoc.value;
            let recording;
            if (this._debugRecorder && this._requestBookmark) {
                const entries = this._debugRecorder.getRecentLog();
                const entriesSize = JSON.stringify(entries)?.length || 0;
                recording = {
                    entries: entriesSize > 200 * 1024 ? undefined : entries,
                    entriesSize: entriesSize,
                    requestTime: this._requestBookmark.timeMs,
                };
            }
            alternativeAction = {
                text: originalText.length > 200 * 1024 ? undefined : originalText,
                textLength: originalText.length,
                selection: this._originalSelection.map(range => ({
                    start: range.start,
                    endExclusive: range.endExclusive,
                })),
                edits: this._edits.map(edit => edit.edit.replacements.map(e => ({
                    time: edit.time.toISOString(),
                    start: e.replaceRange.start,
                    endExclusive: e.replaceRange.endExclusive,
                    newText: e.newText,
                }))).flat(),
                tags: [],
                recording,
            };
        }
        const fetchStartedAfterMs = this._statelessNextEditTelemetry?.fetchStartedAt === undefined ? undefined : this._statelessNextEditTelemetry.fetchStartedAt - this._startTime;
        return {
            providerId: this._providerId,
            headerRequestId: this._headerRequestId || '',
            nextEditProviderDuration: this._duration || 0,
            isFromCache: this._isFromCache,
            subsequentEditOrder: this._subsequentEditOrder,
            documentsCount,
            editsCount,
            activeDocumentEditsCount,
            activeDocumentLanguageId,
            activeDocumentOriginalLineCount,
            fetchStartedAfterMs,
            hasNextEdit: this._hasNextEdit,
            wasPreviouslyRejected: this._wasPreviouslyRejected,
            isNotebook: isNotebook,
            notebookType,
            status: this._status,
            nextEditProviderError: this._nextEditProviderError,
            alternativeAction,
            ...this._statelessNextEditTelemetry,
            activeDocumentRepository,
            repositoryUrls,
            nesConfigs: this._nesConfigs,
        };
    }
    constructor(_gitExtensionService, _notebookService, _workspaceService, _providerId, _doc, _debugRecorder, _requestBookmark) {
        super();
        this._gitExtensionService = _gitExtensionService;
        this._notebookService = _notebookService;
        this._workspaceService = _workspaceService;
        this._providerId = _providerId;
        this._doc = _doc;
        this._debugRecorder = _debugRecorder;
        this._requestBookmark = _requestBookmark;
        this._edits = [];
        this._isFromCache = false;
        this._hasNextEdit = false;
        this._wasPreviouslyRejected = false;
        this._status = 'new';
        this._startTime = Date.now();
        this._originalDoc = this._doc.value.get();
        this._originalSelection = this._doc.selection.get();
        this._store.add((0, observable_1.autorunWithChanges)(this, {
            value: this._doc.value,
        }, (data) => {
            const time = new Date();
            data.value.changes.forEach(change => {
                this._edits.push({
                    time,
                    edit: change,
                });
            });
        }));
    }
    setNESConfigs(nesConfigs) {
        this._nesConfigs = nesConfigs;
        return this;
    }
    setHeaderRequestId(uuid) {
        this._headerRequestId = uuid;
        return this;
    }
    setIsFromCache() {
        this._isFromCache = true;
        return this;
    }
    setSubsequentEditOrder(subsequentEditOrder) {
        this._subsequentEditOrder = subsequentEditOrder;
        return this;
    }
    setRequest(request) {
        this._request = request;
        return this;
    }
    setStatelessNextEditTelemetry(statelessNextEditTelemetry) {
        this._statelessNextEditTelemetry = statelessNextEditTelemetry;
        return this;
    }
    setHasNextEdit(hasNextEdit) {
        this._hasNextEdit = hasNextEdit;
        return this;
    }
    setWasPreviouslyRejected() {
        this._wasPreviouslyRejected = true;
        return this;
    }
    markEndTime() {
        this._duration = Date.now() - this._startTime;
        return this;
    }
    setStatus(status) {
        this._status = status;
        return this;
    }
    setNextEditProviderError(nextEditProviderError) {
        this._nextEditProviderError = nextEditProviderError;
        return this;
    }
}
exports.LlmNESTelemetryBuilder = LlmNESTelemetryBuilder;
class DiagnosticsTelemetryBuilder {
    constructor() {
        this._droppedReasons = [];
    }
    build() {
        const diagnosticDroppedReasons = this._droppedReasons.length > 0 ? JSON.stringify(this._droppedReasons) : undefined;
        return {
            diagnosticType: this._type,
            diagnosticDroppedReasons,
            diagnosticAlternativeImportsCount: this._diagnosticRunTelemetry?.alternativeImportsCount,
            diagnosticHasExistingSameFileImport: this._diagnosticRunTelemetry?.hasExistingSameFileImport,
            diagnosticIsLocalImport: this._diagnosticRunTelemetry?.isLocalImport,
            diagnosticDistanceToUnknownDiagnostic: this._diagnosticRunTelemetry?.distanceToUnknownDiagnostic,
            diagnosticDistanceToAlternativeDiagnostic: this._diagnosticRunTelemetry?.distanceToAlternativeDiagnostic,
            diagnosticHasAlternativeDiagnosticForSameRange: this._diagnosticRunTelemetry?.hasAlternativeDiagnosticForSameRange
        };
    }
    populate(telemetry) {
        this._droppedReasons.forEach(reason => telemetry.addDroppedReason(reason));
        if (this._type) {
            telemetry.setType(this._type);
        }
        if (this._diagnosticRunTelemetry) {
            telemetry.setDiagnosticRunTelemetry(this._diagnosticRunTelemetry);
        }
    }
    setType(type) {
        this._type = type;
        return this;
    }
    addDroppedReason(reason) {
        this._droppedReasons.push(reason);
        return this;
    }
    setDiagnosticRunTelemetry(diagnosticRun) {
        this._diagnosticRunTelemetry = diagnosticRun;
        return this;
    }
}
exports.DiagnosticsTelemetryBuilder = DiagnosticsTelemetryBuilder;
class NextEditProviderTelemetryBuilder extends lifecycle_1.Disposable {
    static { this.requestN = 0; }
    get isSent() {
        return this._isSent;
    }
    markAsSent() {
        this._isSent = true;
    }
    build(includeAlternativeAction) {
        const nesTelemetry = this._nesBuilder.build(includeAlternativeAction);
        const diagnosticsTelemetry = this._diagnosticsBuilder.build();
        return {
            ...nesTelemetry,
            ...diagnosticsTelemetry,
            opportunityId: this._opportunityId || '',
            requestN: this._requestN,
            isShown: this._isShown,
            acceptance: this._acceptance,
            disposalReason: this._disposalReason,
            supersededByOpportunityId: this._supersededByOpportunityId,
            pickedNES: this._nesTypePicked,
            hadLlmNES: this._hadLlmNES,
            isMultilineEdit: this._isMultilineEdit,
            isEolDifferent: this._isEolDifferent,
            isActiveDocument: this._isActiveDocument,
            isNextEditorVisible: this._isNextEditorVisible,
            isNextEditorRangeVisible: this._isNextEditorRangeVisible,
            isNESForAnotherDoc: this._isNESForAnotherDoc,
            notebookId: this._notebookId,
            notebookCellLines: this._notebookCellLines,
            notebookCellMarkerCount: this._notebookCellMarkerCount,
            notebookCellMarkerIndex: this._notebookCellMarkerIndex,
            hadDiagnosticsNES: this._hadDiagnosticsNES,
            configIsDiagnosticsNESEnabled: this._configIsDiagnosticsNESEnabled,
            isNaturalLanguageDominated: this._isNaturalLanguageDominated,
            postProcessingOutcome: this._postProcessingOutcome,
        };
    }
    get nesBuilder() {
        return this._nesBuilder;
    }
    get diagnosticsBuilder() {
        return this._diagnosticsBuilder;
    }
    constructor(gitExtensionService, notebookService, workspaceService, providerId, doc, debugRecorder, requestBookmark) {
        super();
        /**
         * Whether telemetry for this builder has been sent -- only for ordinary telemetry, not enhanced telemetry
         */
        this._isSent = false;
        this._isShown = false;
        this._acceptance = 'notAccepted';
        this._disposalReason = undefined;
        this._supersededByOpportunityId = undefined;
        this._notebookCellMarkerCount = 0;
        this._notebookCellMarkerIndex = -1;
        this._isNESForAnotherDoc = false;
        this._hadLlmNES = false;
        this._hadDiagnosticsNES = false;
        this._configIsDiagnosticsNESEnabled = false;
        this._isNaturalLanguageDominated = false;
        this._requestN = ++NextEditProviderTelemetryBuilder.requestN;
        this._nesBuilder = this._register(new LlmNESTelemetryBuilder(gitExtensionService, notebookService, workspaceService, providerId, doc, debugRecorder, requestBookmark));
        this._diagnosticsBuilder = new DiagnosticsTelemetryBuilder();
    }
    setOpportunityId(uuid) {
        this._opportunityId = uuid;
        return this;
    }
    setAsShown() {
        this._isShown = true;
        return this;
    }
    setAcceptance(acceptance) {
        this._acceptance = acceptance;
        return this;
    }
    setDisposalReason(disposalReason) {
        this._disposalReason = disposalReason;
        return this;
    }
    setSupersededBy(opportunityId) {
        this._supersededByOpportunityId = opportunityId;
        return this;
    }
    setPickedNESType(nesTypePicked) {
        this._nesTypePicked = nesTypePicked;
        return this;
    }
    setIsActiveDocument(isActive) {
        this._isActiveDocument = isActive;
        return this;
    }
    setNotebookCellMarkerCount(count) {
        this._notebookCellMarkerCount = count;
        return this;
    }
    setIsMultilineEdit(isMultiLine) {
        this._isMultilineEdit = isMultiLine;
        return this;
    }
    setIsEolDifferent(isEolDifferent) {
        this._isEolDifferent = isEolDifferent;
        return this;
    }
    setIsNextEditorVisible(isVisible) {
        this._isNextEditorVisible = isVisible;
        return this;
    }
    setIsNextEditorRangeVisible(isVisible) {
        this._isNextEditorRangeVisible = isVisible;
        return this;
    }
    setNotebookId(notebookId) {
        this._notebookId = notebookId;
        return this;
    }
    setNotebookCellLines(notebookCellLines) {
        this._notebookCellLines = notebookCellLines;
        return this;
    }
    setNotebookCellMarkerIndex(index) {
        this._notebookCellMarkerIndex = index;
        return this;
    }
    setIsNESForOtherEditor(isForAnotherDoc) {
        this._isNESForAnotherDoc = isForAnotherDoc;
        return this;
    }
    setHadLlmNES(boolean) {
        this._hadLlmNES = boolean;
        return this;
    }
    setHadDiagnosticsNES(boolean) {
        this._hadDiagnosticsNES = boolean;
        return this;
    }
    setStatus(status) {
        this._nesBuilder.setStatus(status);
        return this;
    }
    setConfigIsDiagnosticsNESEnabled(boolean) {
        this._configIsDiagnosticsNESEnabled = boolean;
        return this;
    }
    setIsNaturalLanguageDominated(isNaturalLanguageDominated) {
        this._isNaturalLanguageDominated = isNaturalLanguageDominated;
        return this;
    }
    setPostProcessingOutcome(suggestion) {
        const displayLocation = suggestion.displayLocation ? {
            label: suggestion.displayLocation.label,
            range: suggestion.displayLocation.range.toString()
        } : undefined;
        this._postProcessingOutcome = JSON.stringify({
            suggestedEdit: suggestion.edit.toString(),
            isInlineCompletion: suggestion.isInlineCompletion,
            displayLocation
        });
        return this;
    }
}
exports.NextEditProviderTelemetryBuilder = NextEditProviderTelemetryBuilder;
let TelemetrySender = class TelemetrySender {
    constructor(_telemetryService) {
        this._telemetryService = _telemetryService;
        this._map = new Map();
    }
    /**
     * Schedule sending telemetry for the next edit result in case it gets ignored by user (ie is not accepted or rejected, so gets replaced by another edit)
     */
    scheduleSendingEnhancedTelemetry(nextEditResult, builder) {
        const timeout = setTimeout(() => {
            let telemetry;
            this._map.delete(nextEditResult);
            try {
                telemetry = builder.build(true);
            }
            finally {
                builder.dispose();
            }
            this._doSendEnhancedTelemetry(telemetry);
        }, /* 2 minutes */ 2 * 60 * 1000);
        this._map.set(nextEditResult, { builder, timeout });
    }
    /**
     * Send telemetry for the next edit result in case it has already been rejected or contains no edits to be shown.
     */
    sendTelemetry(nextEditResult, builder) {
        if (nextEditResult) {
            const data = this._map.get(nextEditResult);
            if (data) {
                clearTimeout(data.timeout);
                this._map.delete(nextEditResult);
            }
        }
        const telemetry = builder.build(true);
        if (!builder.isSent) {
            this._doSendTelemetry(telemetry);
            builder.markAsSent();
        }
        this._doSendEnhancedTelemetry(telemetry);
    }
    sendTelemetryForBuilder(builder) {
        if (builder.isSent) {
            return;
        }
        const telemetry = builder.build(false); // disposal is done by enhanced telemetry sending in a setTimeout callback
        this._doSendTelemetry(telemetry);
        builder.markAsSent();
    }
    async _doSendTelemetry(telemetry) {
        const { opportunityId, headerRequestId, requestN, providerId, modelName, hadStatelessNextEditProviderCall, statelessNextEditProviderDuration, nextEditProviderDuration, isFromCache, subsequentEditOrder, activeDocumentLanguageId, activeDocumentOriginalLineCount, nLinesOfCurrentFileInPrompt, wasPreviouslyRejected, isShown, isNotebook, notebookType, isNESForAnotherDoc, isActiveDocument, isEolDifferent, isMultilineEdit, isNextEditorRangeVisible, isNextEditorVisible, acceptance, disposalReason, logProbThreshold, documentsCount, editsCount, activeDocumentEditsCount, promptLineCount, promptCharCount, hadLowLogProbSuggestion, nEditsSuggested, lineDistanceToMostRecentEdit, isCursorAtEndOfLine, debounceTime, artificialDelay, hasNextEdit, notebookCellMarkerCount, notebookCellMarkerIndex, notebookId, notebookCellLines, nextEditLogprob, supersededByOpportunityId, noNextEditReasonKind, noNextEditReasonMessage, fetchStartedAfterMs, response: responseWithStats, configIsDiagnosticsNESEnabled, isNaturalLanguageDominated, diagnosticType, diagnosticDroppedReasons, diagnosticHasExistingSameFileImport, diagnosticIsLocalImport, diagnosticAlternativeImportsCount, diagnosticDistanceToUnknownDiagnostic, diagnosticDistanceToAlternativeDiagnostic, diagnosticHasAlternativeDiagnosticForSameRange, hadDiagnosticsNES, hadLlmNES, pickedNES, } = telemetry;
        let usage;
        let ttft_;
        let fetchResult_;
        let fetchTime_;
        if (responseWithStats !== undefined) {
            const { response, ttft, fetchResult, fetchTime } = await responseWithStats;
            if (response.type === commonTypes_1.ChatFetchResponseType.Success) {
                usage = response.usage;
            }
            ttft_ = ttft;
            fetchResult_ = fetchResult;
            fetchTime_ = fetchTime;
        }
        /* __GDPR__
            "provideInlineEdit" : {
                "owner": "ulugbekna",
                "comment": "Telemetry for inline edit (NES) provided",
                "opportunityId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Unique identifier for an opportunity to show an NES." },
                "headerRequestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Unique identifier of the network request which is also included in the fetch request header." },
                "providerId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "NES provider identifier (StatelessNextEditProvider)" },
                "modelName": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Name of the model used to provide the NES" },
                "activeDocumentLanguageId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "LanguageId of the active document" },
                "acceptance": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "User acceptance of the edit" },
                "disposalReason": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Reason for disposal of NES" },
                "supersededByOpportunityId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "UUID of the opportunity that superseded this edit" },
                "endpoint": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Endpoint for the request" },
                "noNextEditReasonKind": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Reason kind for no next edit" },
                "noNextEditReasonMessage": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Reason message for no next edit" },
                "fetchResult": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Fetch result" },
                "fetchError": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Fetch error message" },
                "pickedNES": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the request had picked NES" },
                "nextEditProviderError": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Error message from next edit provider" },
                "diagnosticType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Type of diagnostics" },
                "diagnosticDroppedReasons": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Reasons for dropping diagnostics NES suggestions" },
                "requestN": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Request number", "isMeasurement": true },
                "hadStatelessNextEditProviderCall": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the request had a stateless next edit provider call", "isMeasurement": true },
                "statelessNextEditProviderDuration": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Duration of stateless next edit provider", "isMeasurement": true },
                "nextEditProviderDuration": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Duration of next edit provider", "isMeasurement": true },
                "isFromCache": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the edit was provided from cache", "isMeasurement": true },
                "subsequentEditOrder": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Order of the subsequent edit", "isMeasurement": true },
                "activeDocumentOriginalLineCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Number of lines in the active document before shortening", "isMeasurement": true },
                "activeDocumentNLinesInPrompt": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Number of lines in the active document included in prompt", "isMeasurement": true },
                "wasPreviouslyRejected": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the edit was previously rejected", "isMeasurement": true },
                "isShown": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the edit was shown", "isMeasurement": true },
                "isNotebook": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the document is a notebook", "isMeasurement": true },
                "isNESForAnotherDoc": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the NES if for another document", "isMeasurement": true },
                "isMultilineEdit": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the NES is for a multiline edit", "isMeasurement": true },
                "isEolDifferent": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the NES edit and original text have different end of lines", "isMeasurement": true },
                "isNextEditorVisible": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the next editor is visible", "isMeasurement": true },
                "isNextEditorRangeVisible": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the next editor range is visible", "isMeasurement": true },
                "notebookCellMarkerIndex": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Index of the notebook cell marker in the edit", "isMeasurement": true },
                "isActiveDocument": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the document is the active document", "isMeasurement": true },
                "hasNotebookCellMarker": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the edit has a notebook cell marker", "isMeasurement": true },
                "notebookCellMarkerCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Count of notebook cell markers in the edit", "isMeasurement": true },
                "notebookId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Id of notebook" },
                "notebookCellLines": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Line counts of notebook cells" },
                "notebookType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Type of notebook, if any" },
                "logProbThreshold": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Log probability threshold for the edit", "isMeasurement": true },
                "documentsCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Number of documents", "isMeasurement": true },
                "editsCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Number of edits", "isMeasurement": true },
                "activeDocumentEditsCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Number of edits in the active document", "isMeasurement": true },
                "promptLineCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Number of lines in the prompt", "isMeasurement": true },
                "promptCharCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Number of characters in the prompt", "isMeasurement": true },
                "hadLowLogProbSuggestion": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the suggestion had low log probability", "isMeasurement": true },
                "nEditsSuggested": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Number of edits suggested", "isMeasurement": true },
                "hasNextEdit": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether next edit provider returned an edit (if an edit was previously rejected, this field is false)", "isMeasurement": true },
                "nextEditLogprob": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Log probability of the next edit", "isMeasurement": true },
                "lineDistanceToMostRecentEdit": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Line distance to most recent edit", "isMeasurement": true },
                "isCursorAtEndOfLine": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the cursor is at the end of the line", "isMeasurement": true },
                "debounceTime": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Debounce time", "isMeasurement": true },
                "artificialDelay": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Artificial delay (aka backoff) on the response based on previous user acceptance/rejection in milliseconds", "isMeasurement": true },
                "fetchStartedAfterMs": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Time from inline edit provider invocation to fetch init", "isMeasurement": true },
                "ttft": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Time to first token", "isMeasurement": true },
                "fetchTime": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Time from fetch init to end of stream", "isMeasurement": true },
                "promptTokens": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Number of tokens in the prompt", "isMeasurement": true },
                "responseTokens": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Number of tokens in the response", "isMeasurement": true },
                "cachedTokens": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Number of cached tokens in the response", "isMeasurement": true },
                "acceptedPredictionTokens": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Number of tokens in the prediction that appeared in the completion", "isMeasurement": true },
                "rejectedPredictionTokens": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Number of tokens in the prediction that appeared in the completion", "isMeasurement": true },
                "hadDiagnosticsNES": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the request had diagnostics NES", "isMeasurement": true },
                "hadLlmNES": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the request had LLM NES", "isMeasurement": true },
                "configIsDiagnosticsNESEnabled": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether diagnostics NES is enabled", "isMeasurement": true },
                "isNaturalLanguageDominated": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the context is dominated by natural language", "isMeasurement": true },
                "diagnosticHasExistingSameFileImport": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the diagnostic has an existing same file import", "isMeasurement": true },
                "diagnosticIsLocalImport": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the diagnostic is a local import", "isMeasurement": true },
                "diagnosticAlternativeImportsCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Number of alternative imports for the diagnostic", "isMeasurement": true },
                "diagnosticDistanceToUnknownDiagnostic": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Distance to the unknown diagnostic", "isMeasurement": true },
                "diagnosticDistanceToAlternativeDiagnostic": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Distance to the alternative diagnostic", "isMeasurement": true },
                "diagnosticHasAlternativeDiagnosticForSameRange": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether there is an alternative diagnostic for the same range", "isMeasurement": true }
            }
        */
        this._sendTelemetryToBoth({
            opportunityId,
            headerRequestId,
            providerId,
            modelName,
            activeDocumentLanguageId,
            acceptance,
            disposalReason,
            supersededByOpportunityId,
            noNextEditReasonKind,
            noNextEditReasonMessage,
            fetchResult: fetchResult_,
            nextEditProviderError: telemetry.nextEditProviderError,
            diagnosticType,
            diagnosticDroppedReasons,
            pickedNES,
            notebookType,
            notebookId,
            notebookCellLines
        }, {
            requestN,
            hadStatelessNextEditProviderCall: this._boolToNum(hadStatelessNextEditProviderCall),
            statelessNextEditProviderDuration,
            nextEditProviderDuration,
            isFromCache: this._boolToNum(isFromCache),
            subsequentEditOrder,
            activeDocumentOriginalLineCount,
            activeDocumentNLinesInPrompt: nLinesOfCurrentFileInPrompt,
            wasPreviouslyRejected: this._boolToNum(wasPreviouslyRejected),
            isShown: this._boolToNum(isShown),
            isNotebook: this._boolToNum(isNotebook),
            isNESForAnotherDoc: this._boolToNum(isNESForAnotherDoc),
            isActiveDocument: this._boolToNum(isActiveDocument),
            isEolDifferent: this._boolToNum(isEolDifferent),
            isMultilineEdit: this._boolToNum(isMultilineEdit),
            isNextEditorRangeVisible: this._boolToNum(isNextEditorRangeVisible),
            isNextEditorVisible: this._boolToNum(isNextEditorVisible),
            hasNotebookCellMarker: notebookCellMarkerCount > 0 ? 1 : 0,
            notebookCellMarkerCount,
            notebookCellMarkerIndex,
            logProbThreshold,
            documentsCount,
            editsCount,
            activeDocumentEditsCount,
            promptLineCount,
            promptCharCount,
            hadLowLogProbSuggestion: this._boolToNum(hadLowLogProbSuggestion),
            nEditsSuggested,
            lineDistanceToMostRecentEdit,
            isCursorAtEndOfLine: this._boolToNum(isCursorAtEndOfLine),
            debounceTime,
            artificialDelay,
            fetchStartedAfterMs,
            ttft: ttft_,
            fetchTime: fetchTime_,
            promptTokens: usage?.prompt_tokens,
            responseTokens: usage?.completion_tokens,
            cachedTokens: usage?.prompt_tokens_details?.cached_tokens,
            acceptedPredictionTokens: usage?.completion_tokens_details?.accepted_prediction_tokens,
            rejectedPredictionTokens: usage?.completion_tokens_details?.rejected_prediction_tokens,
            hasNextEdit: this._boolToNum(hasNextEdit),
            nextEditLogprob,
            hadDiagnosticsNES: this._boolToNum(hadDiagnosticsNES),
            hadLlmNES: this._boolToNum(hadLlmNES),
            configIsDiagnosticsNESEnabled: this._boolToNum(configIsDiagnosticsNESEnabled),
            isNaturalLanguageDominated: this._boolToNum(isNaturalLanguageDominated),
            diagnosticHasExistingSameFileImport: this._boolToNum(diagnosticHasExistingSameFileImport),
            diagnosticIsLocalImport: this._boolToNum(diagnosticIsLocalImport),
            diagnosticAlternativeImportsCount: diagnosticAlternativeImportsCount,
            diagnosticDistanceToUnknownDiagnostic: diagnosticDistanceToUnknownDiagnostic,
            diagnosticDistanceToAlternativeDiagnostic: diagnosticDistanceToAlternativeDiagnostic,
            diagnosticHasAlternativeDiagnosticForSameRange: this._boolToNum(diagnosticHasAlternativeDiagnosticForSameRange)
        });
    }
    _sendTelemetryToBoth(properties, measurements) {
        this._telemetryService.sendMSFTTelemetryEvent('provideInlineEdit', properties, measurements);
        this._telemetryService.sendGHTelemetryEvent('copilot-nes/provideInlineEdit', properties, measurements);
    }
    async _doSendEnhancedTelemetry(telemetry) {
        const { opportunityId, headerRequestId, providerId, activeDocumentLanguageId, status: suggestionStatus, prompt, response, alternativeAction, postProcessingOutcome, activeDocumentRepository, repositoryUrls, } = telemetry;
        const modelResponse = response === undefined ? response : await response;
        this._telemetryService.sendEnhancedGHTelemetryEvent('copilot-nes/provideInlineEdit', (0, telemetry_1.multiplexProperties)({
            opportunityId,
            headerRequestId,
            providerId,
            activeDocumentLanguageId,
            suggestionStatus,
            prompt,
            modelResponse: modelResponse === undefined || modelResponse.response.type !== commonTypes_1.ChatFetchResponseType.Success ? undefined : modelResponse.response.value,
            alternativeAction: alternativeAction ? JSON.stringify(alternativeAction) : undefined,
            postProcessingOutcome,
            activeDocumentRepository,
            repositories: JSON.stringify(repositoryUrls),
        }));
    }
    /**
     * If `value` is undefined, return undefined, otherwise return 1 if `value` is true, 0 otherwise.
     */
    _boolToNum(value) {
        return value === undefined ? undefined : (value ? 1 : 0);
    }
    dispose() {
        for (const { timeout } of this._map.values()) {
            clearTimeout(timeout);
        }
        this._map.clear();
    }
};
exports.TelemetrySender = TelemetrySender;
exports.TelemetrySender = TelemetrySender = __decorate([
    __param(0, telemetry_1.ITelemetryService)
], TelemetrySender);
//# sourceMappingURL=nextEditProviderTelemetry.js.map