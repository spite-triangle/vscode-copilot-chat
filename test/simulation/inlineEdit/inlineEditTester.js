"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.InlineEditTester = exports.EditNotScoredError = void 0;
const promises_1 = require("fs/promises");
const path_1 = require("path");
const rendererVisualization_1 = require("../../../src/extension/inlineChat/node/rendererVisualization");
const observableWorkspaceRecordingReplayer_1 = require("../../../src/extension/inlineEdits/common/observableWorkspaceRecordingReplayer");
const createNextEditProvider_1 = require("../../../src/extension/inlineEdits/node/createNextEditProvider");
const debugRecorder_1 = require("../../../src/extension/inlineEdits/node/debugRecorder");
const nextEditProvider_1 = require("../../../src/extension/inlineEdits/node/nextEditProvider");
const nextEditProviderTelemetry_1 = require("../../../src/extension/inlineEdits/node/nextEditProviderTelemetry");
const serverPoweredInlineEditProvider_1 = require("../../../src/extension/inlineEdits/node/serverPoweredInlineEditProvider");
const configurationService_1 = require("../../../src/platform/configuration/common/configurationService");
const gitExtensionService_1 = require("../../../src/platform/git/common/gitExtensionService");
const edit_1 = require("../../../src/platform/inlineEdits/common/dataTypes/edit");
const editUtils_1 = require("../../../src/platform/inlineEdits/common/dataTypes/editUtils");
const inlineEditLogContext_1 = require("../../../src/platform/inlineEdits/common/inlineEditLogContext");
const observableGit_1 = require("../../../src/platform/inlineEdits/common/observableGit");
const nesHistoryContextProvider_1 = require("../../../src/platform/inlineEdits/common/workspaceEditTracker/nesHistoryContextProvider");
const nesXtabHistoryTracker_1 = require("../../../src/platform/inlineEdits/common/workspaceEditTracker/nesXtabHistoryTracker");
const notebookService_1 = require("../../../src/platform/notebook/common/notebookService");
const nullExperimentationService_1 = require("../../../src/platform/telemetry/common/nullExperimentationService");
const services_1 = require("../../../src/platform/test/node/services");
const async_1 = require("../../../src/util/common/async");
const languages_1 = require("../../../src/util/common/languages");
const cache_1 = require("../../../src/util/vs/base/common/cache");
const cancellation_1 = require("../../../src/util/vs/base/common/cancellation");
const errors_1 = require("../../../src/util/vs/base/common/errors");
const types_1 = require("../../../src/util/vs/base/common/types");
const uri_1 = require("../../../src/util/vs/base/common/uri");
const uuid_1 = require("../../../src/util/vs/base/common/uuid");
const stringEdit_1 = require("../../../src/util/vs/editor/common/core/edits/stringEdit");
const instantiation_1 = require("../../../src/util/vs/platform/instantiation/common/instantiation");
const stest_1 = require("../../base/stest");
const testExecutor_1 = require("../../testExecutor");
const util_1 = require("../../util");
const sharedTypes_1 = require("../shared/sharedTypes");
const testInformation_1 = require("../testInformation");
const inlineEditScoringService_1 = require("./inlineEditScoringService");
const spyingServerPoweredNesProvider_1 = require("./spyingServerPoweredNesProvider");
const workspaceService_1 = require("../../../src/platform/workspace/common/workspaceService");
class EditNotScoredError extends testExecutor_1.CriticalError {
    constructor(scoredEditsFilePath) {
        super(`Edit is not scored yet in \n${scoredEditsFilePath}\n! Please manually score it and run the test again.`);
    }
}
exports.EditNotScoredError = EditNotScoredError;
class InlineEditTester {
    constructor(_includeNextEditSelection = false) {
        this._includeNextEditSelection = _includeNextEditSelection;
        this._renameQueues = new cache_1.CachedFunction({ getCacheKey: JSON.stringify }, (arg) => new async_1.TaskQueue());
    }
    async runAndScoreTestFromRecording(collection, recording) {
        const { isScored, scoredEditsFilePath } = await this.runAndScoreFromRecording(collection, recording);
        if (!isScored) {
            throw new EditNotScoredError(scoredEditsFilePath);
        }
    }
    async runAndScoreFromRecording(collectionOrAccessor, recording) {
        const accessor = collectionOrAccessor instanceof services_1.TestingServiceCollection ? collectionOrAccessor.createTestingAccessor() : collectionOrAccessor;
        const recordingData = JSON.parse(recording.fileContents);
        const result = await this.runTestFromRecording(accessor, recordingData);
        const testInfo = accessor.get(testInformation_1.ITestInformation);
        const scoredEditsFilePath = await this._renameQueues.get([testInfo.testFileName, recording.filePath]).schedule(() => getScoredEditsFilePath(testInfo, recording.filePath));
        const score = await inlineEditScoringService_1.inlineEditScoringService.scoreEdit(scoredEditsFilePath, { kind: 'recording', recording: result.recordingData }, result.aiEditDocumentUri, result.aiEditDocumentValue, result.aiRootedEdit);
        if (!score) {
            return { result, scoredEditsFilePath, isScored: false };
        }
        else {
            const runtime = accessor.get(stest_1.ISimulationTestRuntime);
            runtime.setExplicitScore(score.getScoreValue());
            return { result, scoredEditsFilePath, isScored: true };
        }
    }
    async runTestFromRecording(accessor, recordingData) {
        const replayer = new observableWorkspaceRecordingReplayer_1.ObservableWorkspaceRecordingReplayer(recordingData, this._includeNextEditSelection);
        const obsGit = accessor.get(instantiation_1.IInstantiationService).createInstance(observableGit_1.ObservableGit);
        const historyContextProvider = new nesHistoryContextProvider_1.NesHistoryContextProvider(replayer.workspace, obsGit);
        const nesXtabHistoryTracker = new nesXtabHistoryTracker_1.NesXtabHistoryTracker(replayer.workspace);
        const debugRecorder = new debugRecorder_1.DebugRecorder(replayer.workspace);
        const { lastDocId } = replayer.replay();
        const expectedEdit = (0, editUtils_1.deserializeStringEdit)(recordingData.nextUserEdit?.edit ?? (0, editUtils_1.serializeStringEdit)(stringEdit_1.StringEdit.empty));
        const result = await this._runTest(accessor, lastDocId, replayer.workspace, historyContextProvider, nesXtabHistoryTracker, debugRecorder);
        const r = { ...result, nextUserEdit: expectedEdit, recordingData };
        return r;
    }
    async _runTest(accessor, docId, workspace, historyContextProvider, nesXtabHistoryTracker, debugRecorder) {
        const instaService = accessor.get(instantiation_1.IInstantiationService);
        const configService = accessor.get(configurationService_1.IConfigurationService);
        const expService = accessor.get(nullExperimentationService_1.IExperimentationService);
        const gitExtensionService = accessor.get(gitExtensionService_1.IGitExtensionService);
        const notebookService = accessor.get(notebookService_1.INotebookService);
        const workspaceService = accessor.get(workspaceService_1.IWorkspaceService);
        const history = historyContextProvider.getHistoryContext(docId);
        let i = 0;
        for (const e of history.documents) {
            i++;
            rendererVisualization_1.VisualizationTestRun.instance?.addData('recentEdit_' + i, () => ({
                ...{ $fileExtension: 'diff.w' },
                original: e.lastEdit.base.value,
                modified: e.lastEdit.getEditedState().value,
            }));
        }
        const stestRuntime = accessor.getIfExists(stest_1.ISimulationTestRuntime);
        if (stestRuntime) {
            const nesUserEditHistory = {
                edits: history.documents.map((doc) => ({
                    id: getUserFriendlyFilePath(doc.docId),
                    languageId: getLanguageIdFromDocumentId(doc.docId),
                    original: doc.lastEdit.base.value,
                    modified: doc.lastEdit.getEditedState().value,
                })),
                currentDocumentIndex: history.documents.length - 1,
            };
            stestRuntime.writeFile('nesUserEditHistory.json', JSON.stringify(nesUserEditHistory, null, 2), sharedTypes_1.NES_USER_EDITS_HISTORY_TAG);
        }
        const nextEditProviderId = configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsProviderId, expService);
        const statelessNextEditProvider = nextEditProviderId === serverPoweredInlineEditProvider_1.ServerPoweredInlineEditProvider.ID
            ? instaService.createInstance(spyingServerPoweredNesProvider_1.SpyingServerPoweredNesProvider)
            : (0, createNextEditProvider_1.createNextEditProvider)(nextEditProviderId, instaService);
        const nextEditProvider = instaService.createInstance(nextEditProvider_1.NextEditProvider, workspace, statelessNextEditProvider, historyContextProvider, nesXtabHistoryTracker, debugRecorder);
        const historyContext = historyContextProvider.getHistoryContext(docId);
        const activeDocument = historyContext.getMostRecentDocument(); // TODO
        const context = { triggerKind: 1, selectedCompletionInfo: undefined, requestUuid: (0, uuid_1.generateUuid)(), requestIssuedDateTime: Date.now(), earliestShownDateTime: Date.now() + 200 };
        const logContext = new inlineEditLogContext_1.InlineEditRequestLogContext(activeDocument.docId.toString(), 1, context);
        const telemetryBuilder = new nextEditProviderTelemetry_1.NextEditProviderTelemetryBuilder(gitExtensionService, notebookService, workspaceService, nextEditProvider.ID, workspace.getDocument(activeDocument.docId));
        let nextEditResult;
        try {
            nextEditResult = await nextEditProvider.getNextEdit(activeDocument.docId, context, logContext, cancellation_1.CancellationToken.None, telemetryBuilder.nesBuilder);
        }
        finally {
            nextEditProvider.dispose();
            telemetryBuilder.dispose();
        }
        const logDocument = logContext.toLogDocument();
        rendererVisualization_1.VisualizationTestRun.instance?.addData('prompt', () => logContext.prompt);
        rendererVisualization_1.VisualizationTestRun.instance?.addData('log', () => logDocument, 'log_copilotmd');
        rendererVisualization_1.VisualizationTestRun.instance?.reload();
        if (stestRuntime) {
            stestRuntime.writeFile('nesLogContext.json', JSON.stringify(logDocument, null, 2), sharedTypes_1.NES_LOG_CONTEXT_TAG);
        }
        const targetDocId = nextEditResult.result?.targetDocumentId;
        const targetDocument = targetDocId !== undefined ? (0, types_1.assertReturnsDefined)(historyContext.getDocument(targetDocId)) : activeDocument;
        const aiRootedEdit = new edit_1.RootedEdit(targetDocument.lastEdit.getEditedState(), nextEditResult.result?.edit.toEdit() ?? stringEdit_1.StringEdit.empty);
        if (!nextEditResult.result) {
            return {
                aiEditDocumentUri: targetDocument.docId,
                aiEditDocumentValue: aiRootedEdit.base
            };
        }
        if (stestRuntime) {
            const serializedNextEdit = {
                id: getUserFriendlyFilePath(targetDocument.docId),
                languageId: getLanguageIdFromDocumentId(targetDocument.docId),
                original: aiRootedEdit.base.value,
                modified: aiRootedEdit.getEditedState().value,
            };
            stestRuntime.writeFile('proposedNextEdit.json', JSON.stringify(serializedNextEdit, null, 2), sharedTypes_1.NEXT_EDIT_SUGGESTION_TAG);
        }
        rendererVisualization_1.VisualizationTestRun.instance?.addData('proposedNextEdit', () => ({
            ...{ $fileExtension: 'diff.w' },
            original: aiRootedEdit.base.value,
            modified: aiRootedEdit.getEditedState().value,
        }));
        return {
            aiRootedEdit,
            aiEdit: aiRootedEdit.edit,
            aiEditDocumentUri: targetDocument.docId,
            nextEdit: nextEditResult.result.edit,
            textAfterAiEdit: aiRootedEdit.getEditedState(),
            aiEditDocumentValue: aiRootedEdit.base,
        };
    }
}
exports.InlineEditTester = InlineEditTester;
function getLanguageIdFromDocumentId(docId) {
    return (0, languages_1.getLanguageForResource)(uri_1.URI.file(`/path/file.${docId.extension}`)).languageId;
}
function getUserFriendlyFilePath(docId) {
    return (0, path_1.basename)(docId.path);
}
async function getScoredEditsFilePath(test, recordingFilePath) {
    const paths = [];
    if (test.testFileName !== undefined) {
        const testDirName = (0, path_1.dirname)(test.testFileName);
        const filePath = (0, path_1.join)(testDirName, 'scores', sanitizeFileName(stripTestFlavor(test.fullTestName)) + '.scoredEdits.w.json');
        paths.push(filePath);
    }
    if (recordingFilePath !== undefined) {
        const path = recordingFilePath.replace('recording.w.json', 'scoredEdits.w.json');
        if (path === recordingFilePath) {
            throw new errors_1.BugIndicatingError();
        }
        paths.push(path);
    }
    for (let i = 0; i < paths.length; i++) {
        if (i === paths.length - 1) {
            return paths[i];
        }
        else {
            if (await (0, util_1.fileExists)(paths[i]) && !await (0, util_1.fileExists)(paths[i + 1])) {
                await (0, promises_1.rename)(paths[i], paths[i + 1]);
            }
        }
    }
    throw new errors_1.BugIndicatingError();
}
function sanitizeFileName(name) {
    return name.replace(/[^a-z0-9 \[\]-]/gi, '_');
}
/** This's used to make sure different flavors of a single test reuse the same scoring file. */
function stripTestFlavor(name) {
    return name.replace(/ \(\[([a-zA-Z0-9\-])+\]\)/, '');
}
//# sourceMappingURL=inlineEditTester.js.map