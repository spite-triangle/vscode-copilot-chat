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
exports.InlineEditTriggerer = exports.InlineEditModel = void 0;
const vscodeTypes_1 = require("../../../vscodeTypes");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const nesXtabHistoryTracker_1 = require("../../../platform/inlineEdits/common/workspaceEditTracker/nesXtabHistoryTracker");
const logService_1 = require("../../../platform/log/common/logService");
const nullExperimentationService_1 = require("../../../platform/telemetry/common/nullExperimentationService");
const tracing_1 = require("../../../util/common/tracing");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const observableInternal_1 = require("../../../util/vs/base/common/observableInternal");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const createNextEditProvider_1 = require("../node/createNextEditProvider");
const debugRecorder_1 = require("../node/debugRecorder");
const nextEditProvider_1 = require("../node/nextEditProvider");
const notebooks_1 = require("../../../util/common/notebooks");
const common_1 = require("../common/common");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const TRIGGER_INLINE_EDIT_AFTER_CHANGE_LIMIT = 10000; // 10 seconds
const TRIGGER_INLINE_EDIT_ON_SAME_LINE_COOLDOWN = 5000; // milliseconds
const TRIGGER_INLINE_EDIT_REJECTION_COOLDOWN = 5000; // 5s
let InlineEditModel = class InlineEditModel extends lifecycle_1.Disposable {
    constructor(_predictorId, workspace, historyContextProvider, diagnosticsBasedProvider, completionsProvider, _instantiationService, _configurationService, _expService) {
        super();
        this._predictorId = _predictorId;
        this.workspace = workspace;
        this.diagnosticsBasedProvider = diagnosticsBasedProvider;
        this.completionsProvider = completionsProvider;
        this._instantiationService = _instantiationService;
        this._configurationService = _configurationService;
        this._expService = _expService;
        this.debugRecorder = this._register(new debugRecorder_1.DebugRecorder(this.workspace));
        this.inlineEditsInlineCompletionsEnabled = this._configurationService.getConfigObservable(configurationService_1.ConfigKey.Internal.InlineEditsInlineCompletionsEnabled);
        this.onChange = (0, observableInternal_1.observableSignal)(this);
        this._predictor = (0, createNextEditProvider_1.createNextEditProvider)(this._predictorId, this._instantiationService);
        const xtabDiffNEntries = this._configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabDiffNEntries, this._expService);
        const xtabHistoryTracker = new nesXtabHistoryTracker_1.NesXtabHistoryTracker(this.workspace, xtabDiffNEntries);
        this.nextEditProvider = this._instantiationService.createInstance(nextEditProvider_1.NextEditProvider, this.workspace, this._predictor, historyContextProvider, xtabHistoryTracker, this.debugRecorder);
        if (this._predictor.dependsOnSelection) {
            this._register(this._instantiationService.createInstance(InlineEditTriggerer, this.workspace, this.nextEditProvider, this.onChange));
        }
    }
};
exports.InlineEditModel = InlineEditModel;
exports.InlineEditModel = InlineEditModel = __decorate([
    __param(5, instantiation_1.IInstantiationService),
    __param(6, configurationService_1.IConfigurationService),
    __param(7, nullExperimentationService_1.IExperimentationService)
], InlineEditModel);
class LastChange extends lifecycle_1.Disposable {
    get nConsequtiveSelectionChanges() {
        return this._nConsecutiveSelectionChanges;
    }
    incrementSelectionChangeEventCount() {
        this._nConsecutiveSelectionChanges++;
    }
    constructor(documentTrigger) {
        super();
        this.documentTrigger = documentTrigger;
        this.timeout = this._register(new lifecycle_1.MutableDisposable());
        this._nConsecutiveSelectionChanges = 0;
        this.lastEditedTimestamp = Date.now();
        this.lineNumberTriggers = new Map();
    }
}
let InlineEditTriggerer = class InlineEditTriggerer extends lifecycle_1.Disposable {
    constructor(workspace, nextEditProvider, onChange, _logService, _configurationService, _expService, _workspaceService) {
        super();
        this.workspace = workspace;
        this.nextEditProvider = nextEditProvider;
        this.onChange = onChange;
        this._logService = _logService;
        this._configurationService = _configurationService;
        this._expService = _expService;
        this._workspaceService = _workspaceService;
        this.docToLastChangeMap = this._register(new lifecycle_1.DisposableMap());
        this._tracer = (0, tracing_1.createTracer)(['NES', 'Triggerer'], (s) => this._logService.trace(s));
        this.registerListeners();
    }
    registerListeners() {
        this._registerDocumentChangeListener();
        this._registerSelectionChangeListener();
    }
    _shouldIgnoreDoc(doc) {
        return doc.uri.scheme === 'output'; // ignore output pane documents
    }
    _registerDocumentChangeListener() {
        this._register(this._workspaceService.onDidChangeTextDocument(e => {
            if (this._shouldIgnoreDoc(e.document)) {
                return;
            }
            const tracer = this._tracer.sub('onDidChangeTextDocument');
            if (e.reason === vscodeTypes_1.TextDocumentChangeReason.Undo || e.reason === vscodeTypes_1.TextDocumentChangeReason.Redo) { // ignore
                tracer.returns('undo/redo');
                return;
            }
            const doc = this.workspace.getDocumentByTextDocument(e.document);
            if (!doc) { // doc is likely copilot-ignored
                tracer.returns('ignored document');
                return;
            }
            this.docToLastChangeMap.set(doc.id, new LastChange(e.document));
            tracer.returns('setting last edited timestamp');
        }));
    }
    _registerSelectionChangeListener() {
        this._register(this._workspaceService.onDidChangeTextEditorSelection((e) => {
            if (this._shouldIgnoreDoc(e.textEditor.document)) {
                return;
            }
            const tracer = this._tracer.sub('onDidChangeTextEditorSelection');
            if (e.selections.length !== 1) { // ignore multi-selection case
                tracer.returns('multiple selections');
                return;
            }
            if (!e.selections[0].isEmpty) { // ignore non-empty selection
                tracer.returns('not empty selection');
                return;
            }
            const doc = this.workspace.getDocumentByTextDocument(e.textEditor.document);
            if (!doc) { // doc is likely copilot-ignored
                return;
            }
            const now = Date.now();
            const timeSince = (timestamp) => now - timestamp;
            if (timeSince(this.nextEditProvider.lastRejectionTime) < TRIGGER_INLINE_EDIT_REJECTION_COOLDOWN) {
                // the cursor has moved within 5s of the last rejection, don't auto-trigger until another doc modification
                this.docToLastChangeMap.deleteAndDispose(doc.id);
                tracer.returns('rejection cooldown');
                return;
            }
            const mostRecentChange = this.docToLastChangeMap.get(doc.id);
            if (!mostRecentChange) {
                tracer.returns('document not tracked - does not have recent changes');
                return;
            }
            const hasRecentEdit = timeSince(mostRecentChange.lastEditedTimestamp) < TRIGGER_INLINE_EDIT_AFTER_CHANGE_LIMIT;
            if (!hasRecentEdit) {
                tracer.returns('no recent edit');
                return;
            }
            const hasRecentTrigger = timeSince(this.nextEditProvider.lastTriggerTime) < TRIGGER_INLINE_EDIT_AFTER_CHANGE_LIMIT;
            if (!hasRecentTrigger) {
                // the provider was not triggered recently, so we might be observing a cursor change event following
                // a document edit caused outside of regular typing, otherwise the UI would have invoked us recently
                tracer.returns('no recent trigger');
                return;
            }
            const range = doc.toRange(e.textEditor.document, e.selections[0]);
            if (!range) {
                tracer.returns('no range');
                return;
            }
            const selectionLine = range.start.line;
            // If we're in a notebook cell,
            // Its possible user made changes in one cell and now is moving to another cell
            // In such cases we should account for the possibility of the user wanting to edit the new cell and trigger suggestions.
            if (!(0, notebooks_1.isNotebookCell)(e.textEditor.document.uri) || e.textEditor.document === mostRecentChange.documentTrigger) {
                const lastTriggerTimestampForLine = mostRecentChange.lineNumberTriggers.get(selectionLine);
                if (lastTriggerTimestampForLine !== undefined && timeSince(lastTriggerTimestampForLine) < TRIGGER_INLINE_EDIT_ON_SAME_LINE_COOLDOWN) {
                    tracer.returns('same line cooldown');
                    return;
                }
            }
            // TODO: Do not trigger if there is an existing valid request now running, ie don't use just last-trigger timestamp
            // cleanup old triggers if too many
            if (mostRecentChange.lineNumberTriggers.size > 100) {
                for (const [lineNumber, timestamp] of mostRecentChange.lineNumberTriggers.entries()) {
                    if (now - timestamp > TRIGGER_INLINE_EDIT_AFTER_CHANGE_LIMIT) {
                        mostRecentChange.lineNumberTriggers.delete(lineNumber);
                    }
                }
            }
            mostRecentChange.lineNumberTriggers.set(selectionLine, now);
            mostRecentChange.documentTrigger = e.textEditor.document;
            tracer.returns('triggering inline edit');
            const debounceOnSelectionChange = this._configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsDebounceOnSelectionChange, this._expService);
            if (debounceOnSelectionChange === undefined) {
                this._triggerInlineEdit();
            }
            else {
                // this's 2 because first change is caused by the edit, 2nd one is potentially user intentionally to the next edit location
                // further events would be multiple consecutive selection changes that we want to debounce
                const N_ALLOWED_IMMEDIATE_SELECTION_CHANGE_EVENTS = 2;
                if (mostRecentChange.nConsequtiveSelectionChanges < N_ALLOWED_IMMEDIATE_SELECTION_CHANGE_EVENTS) {
                    this._triggerInlineEdit();
                }
                else {
                    mostRecentChange.timeout.value = (0, common_1.createTimeout)(debounceOnSelectionChange, () => this._triggerInlineEdit());
                }
                mostRecentChange.incrementSelectionChangeEventCount();
            }
        }));
    }
    _triggerInlineEdit() {
        this.onChange.trigger(undefined);
    }
};
exports.InlineEditTriggerer = InlineEditTriggerer;
exports.InlineEditTriggerer = InlineEditTriggerer = __decorate([
    __param(3, logService_1.ILogService),
    __param(4, configurationService_1.IConfigurationService),
    __param(5, nullExperimentationService_1.IExperimentationService),
    __param(6, workspaceService_1.IWorkspaceService)
], InlineEditTriggerer);
//# sourceMappingURL=inlineEditModel.js.map