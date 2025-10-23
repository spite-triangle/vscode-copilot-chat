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
var XtabProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.XtabProvider = void 0;
exports.findMergeConflictMarkersRange = findMergeConflictMarkersRange;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const chatMLFetcher_1 = require("../../../platform/chat/common/chatMLFetcher");
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const globalStringUtils_1 = require("../../../platform/chat/common/globalStringUtils");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const diffService_1 = require("../../../platform/diff/common/diffService");
const proxyXtabEndpoint_1 = require("../../../platform/endpoint/node/proxyXtabEndpoint");
const ignoreService_1 = require("../../../platform/ignore/common/ignoreService");
const xtabPromptOptions = __importStar(require("../../../platform/inlineEdits/common/dataTypes/xtabPromptOptions"));
const responseProcessor_1 = require("../../../platform/inlineEdits/common/responseProcessor");
const statelessNextEditProvider_1 = require("../../../platform/inlineEdits/common/statelessNextEditProvider");
const statelessNextEditProviders_1 = require("../../../platform/inlineEdits/common/statelessNextEditProviders");
const languageContextProviderService_1 = require("../../../platform/languageContextProvider/common/languageContextProviderService");
const languageDiagnosticsService_1 = require("../../../platform/languages/common/languageDiagnosticsService");
const languageContextService_1 = require("../../../platform/languageServer/common/languageContextService");
const logService_1 = require("../../../platform/log/common/logService");
const simulationTestContext_1 = require("../../../platform/simulationTestContext/common/simulationTestContext");
const nullExperimentationService_1 = require("../../../platform/telemetry/common/nullExperimentationService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const async_1 = require("../../../util/common/async");
const errors = __importStar(require("../../../util/common/errors"));
const result_1 = require("../../../util/common/result");
const tracing_1 = require("../../../util/common/tracing");
const async_2 = require("../../../util/vs/base/common/async");
const stopwatch_1 = require("../../../util/vs/base/common/stopwatch");
const lineEdit_1 = require("../../../util/vs/editor/common/core/edits/lineEdit");
const stringEdit_1 = require("../../../util/vs/editor/common/core/edits/stringEdit");
const position_1 = require("../../../util/vs/editor/common/core/position");
const range_1 = require("../../../util/vs/editor/common/core/range");
const lineRange_1 = require("../../../util/vs/editor/common/core/ranges/lineRange");
const offsetRange_1 = require("../../../util/vs/editor/common/core/ranges/offsetRange");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const delayer_1 = require("../../inlineEdits/common/delayer");
const ghNearbyNesProvider_1 = require("../../inlineEdits/common/ghNearbyNesProvider");
const nearbyCursorInlineEditProvider_1 = require("../../inlineEdits/common/nearbyCursorInlineEditProvider");
const importFiltering_1 = require("../../inlineEdits/node/importFiltering");
const promptCrafting_1 = require("../common/promptCrafting");
const xtabEndpoint_1 = require("./xtabEndpoint");
const xtabUtils_1 = require("./xtabUtils");
var ResponseTags;
(function (ResponseTags) {
    ResponseTags.NO_CHANGE = {
        start: '<NO_CHANGE>'
    };
    ResponseTags.EDIT = {
        start: '<EDIT>',
        end: '</EDIT>'
    };
    ResponseTags.INSERT = {
        start: '<INSERT>',
        end: '</INSERT>'
    };
})(ResponseTags || (ResponseTags = {}));
let XtabProvider = class XtabProvider {
    static { XtabProvider_1 = this; }
    static { this.ID = configurationService_1.XTabProviderId; }
    constructor(simulationCtx, instaService, workspaceService, diffService, configService, expService, logService, langCtxService, langDiagService, ignoreService, telemetryService) {
        this.simulationCtx = simulationCtx;
        this.instaService = instaService;
        this.workspaceService = workspaceService;
        this.diffService = diffService;
        this.configService = configService;
        this.expService = expService;
        this.logService = logService;
        this.langCtxService = langCtxService;
        this.langDiagService = langDiagService;
        this.ignoreService = ignoreService;
        this.telemetryService = telemetryService;
        this.ID = XtabProvider_1.ID;
        this.dependsOnSelection = true;
        this.showNextEditPreference = "always" /* ShowNextEditPreference.Always */;
        this.forceUseDefaultModel = false;
        this.delayer = new delayer_1.Delayer(this.configService, this.expService);
        this.tracer = (0, tracing_1.createTracer)(['NES', 'XtabProvider'], (s) => this.logService.trace(s));
    }
    handleAcceptance() {
        this.delayer.handleAcceptance();
    }
    handleRejection() {
        this.delayer.handleRejection();
    }
    provideNextEdit(request, pushEdit, logContext, cancellationToken) {
        const filteringPushEdit = (result) => {
            if (result.isError()) {
                pushEdit(result);
                return;
            }
            const { edit } = result.val;
            const filteredEdits = this.filterEdit(request.getActiveDocument(), [edit]);
            if (filteredEdits.length === 0) { // do not invoke pushEdit
                return;
            }
            pushEdit(result);
        };
        return this._provideNextEdit(request, filteringPushEdit, logContext, cancellationToken);
    }
    filterEdit(activeDoc, edits) {
        const filters = [
            (edits) => importFiltering_1.IgnoreImportChangesAspect.filterEdit(activeDoc, edits),
            (edits) => statelessNextEditProviders_1.IgnoreEmptyLineAndLeadingTrailingWhitespaceChanges.filterEdit(activeDoc, edits),
        ];
        if (!this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.InlineEditsAllowWhitespaceOnlyChanges, this.expService)) {
            filters.push((edits) => statelessNextEditProviders_1.IgnoreWhitespaceOnlyChanges.filterEdit(activeDoc, edits));
        }
        if (this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsUndoInsertionFilteringEnabled, this.expService)) {
            filters.push((edits) => (0, ghNearbyNesProvider_1.editWouldDeleteWhatWasJustInserted)(activeDoc, new lineEdit_1.LineEdit(edits)) ? [] : edits);
        }
        return filters.reduce((acc, filter) => filter(acc), edits);
    }
    async _provideNextEdit(request, pushEdit, logContext, cancellationToken) {
        const telemetry = new statelessNextEditProvider_1.StatelessNextEditTelemetryBuilder(request);
        logContext.setProviderStartTime();
        try {
            if (request.xtabEditHistory.length === 0) {
                return statelessNextEditProvider_1.StatelessNextEditResult.noEdit(new statelessNextEditProvider_1.NoNextEditReason.ActiveDocumentHasNoEdits(), telemetry);
            }
            const delaySession = this.delayer.createDelaySession(request.providerRequestStartDateTime);
            const nextEditResult = await this.doGetNextEdit(request, pushEdit, delaySession, logContext, cancellationToken, telemetry, 0 /* RetryState.NotRetrying */);
            if (nextEditResult.isError() && nextEditResult.err instanceof statelessNextEditProvider_1.NoNextEditReason.GotCancelled) {
                logContext.setIsSkipped();
            }
            if (nextEditResult.isOk()) {
                await this.enforceArtificialDelay(delaySession, telemetry);
            }
            return new statelessNextEditProvider_1.StatelessNextEditResult(nextEditResult, telemetry.build(nextEditResult));
        }
        catch (err) {
            return statelessNextEditProvider_1.StatelessNextEditResult.noEdit(new statelessNextEditProvider_1.NoNextEditReason.Unexpected(errors.fromUnknown(err)), telemetry);
        }
        finally {
            logContext.setProviderEndTime();
        }
    }
    async doGetNextEdit(request, pushEdit, delaySession, logContext, cancellationToken, telemetryBuilder, retryState) {
        return this.doGetNextEditWithSelection(request, (0, nearbyCursorInlineEditProvider_1.getOrDeduceSelectionFromLastEdit)(request.getActiveDocument()), pushEdit, delaySession, logContext, cancellationToken, telemetryBuilder, retryState);
    }
    async doGetNextEditWithSelection(request, selection, pushEdit, delaySession, logContext, cancellationToken, telemetryBuilder, retryState) {
        const tracer = this.tracer.sub('doGetNextEditWithSelection');
        const activeDocument = request.getActiveDocument();
        if (selection === null) {
            return result_1.Result.error(new statelessNextEditProvider_1.NoNextEditReason.Uncategorized(new Error('NoSelection')));
        }
        const promptOptions = this.determineModelConfiguration(activeDocument);
        const endpoint = this.getEndpoint(promptOptions.modelName);
        logContext.setEndpointInfo(typeof endpoint.urlOrRequestMetadata === 'string' ? endpoint.urlOrRequestMetadata : JSON.stringify(endpoint.urlOrRequestMetadata.type), endpoint.model);
        telemetryBuilder.setModelName(endpoint.model);
        const computeTokens = (s) => Math.floor(s.length / 4);
        const cursorPosition = new position_1.Position(selection.endLineNumber, selection.endColumn);
        const cursorOffset = activeDocument.documentAfterEdits.getTransformer().getOffset(cursorPosition);
        const currentFileContent = activeDocument.documentAfterEdits;
        const currentFileContentLines = currentFileContent.getLines();
        const cursorLineIdx = cursorPosition.lineNumber - 1 /* to convert to 0-based */;
        const cursorLine = currentFileContentLines[cursorLineIdx];
        const isCursorAtEndOfLine = cursorPosition.column === cursorLine.trimEnd().length;
        if (isCursorAtEndOfLine) {
            delaySession.setExtraDebounce(this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsExtraDebounceEndOfLine, this.expService));
        }
        telemetryBuilder.setIsCursorAtLineEnd(isCursorAtEndOfLine);
        const areaAroundEditWindowLinesRange = this.computeAreaAroundEditWindowLinesRange(currentFileContentLines, cursorLineIdx);
        const maxMergeConflictLines = this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabMaxMergeConflictLines, this.expService);
        const editWindowLinesRange = this.computeEditWindowLinesRange(currentFileContentLines, cursorLineIdx, request, maxMergeConflictLines, retryState);
        const cursorOriginalLinesOffset = Math.max(0, cursorLineIdx - editWindowLinesRange.start);
        const editWindowLastLineLength = activeDocument.documentAfterEdits.getTransformer().getLineLength(editWindowLinesRange.endExclusive);
        const editWindow = activeDocument.documentAfterEdits.getTransformer().getOffsetRange(new range_1.Range(editWindowLinesRange.start + 1, 1, editWindowLinesRange.endExclusive, editWindowLastLineLength + 1));
        const editWindowLines = currentFileContentLines.slice(editWindowLinesRange.start, editWindowLinesRange.endExclusive);
        // Expected: editWindow.substring(activeDocument.documentAfterEdits.value) === editWindowLines.join('\n')
        const doesIncludeCursorTag = editWindowLines.some(line => line.includes(promptCrafting_1.PromptTags.CURSOR));
        const shouldRemoveCursorTagFromResponse = !doesIncludeCursorTag; // we'd like to remove the tag only if the original edit-window didn't include the tag
        const addCursorTagEdit = stringEdit_1.StringEdit.single(stringEdit_1.StringReplacement.insert(cursorOffset, promptCrafting_1.PromptTags.CURSOR));
        const contentWithCursor = addCursorTagEdit.applyOnText(currentFileContent);
        const contentWithCursorLines = contentWithCursor.getLines();
        const editWindowWithCursorLines = contentWithCursorLines.slice(editWindowLinesRange.start, editWindowLinesRange.endExclusive);
        const areaAroundCodeToEdit = [
            promptCrafting_1.PromptTags.AREA_AROUND.start,
            ...contentWithCursorLines.slice(areaAroundEditWindowLinesRange.start, editWindowLinesRange.start),
            promptCrafting_1.PromptTags.EDIT_WINDOW.start,
            ...editWindowWithCursorLines,
            promptCrafting_1.PromptTags.EDIT_WINDOW.end,
            ...contentWithCursorLines.slice(editWindowLinesRange.endExclusive, areaAroundEditWindowLinesRange.endExclusive),
            promptCrafting_1.PromptTags.AREA_AROUND.end
        ].join('\n');
        const areaAroundCodeToEditForCurrentFile = promptOptions.currentFile.includeTags
            ? areaAroundCodeToEdit
            : [
                ...contentWithCursorLines.slice(areaAroundEditWindowLinesRange.start, editWindowLinesRange.start),
                ...editWindowLines,
                ...contentWithCursorLines.slice(editWindowLinesRange.endExclusive, areaAroundEditWindowLinesRange.endExclusive),
            ].join('\n');
        const taggedCurrentFileContentResult = (0, promptCrafting_1.createTaggedCurrentFileContentUsingPagedClipping)(currentFileContentLines, areaAroundCodeToEditForCurrentFile, areaAroundEditWindowLinesRange, computeTokens, promptOptions.pagedClipping.pageSize, promptOptions.currentFile);
        if (taggedCurrentFileContentResult.isError()) {
            return result_1.Result.error(new statelessNextEditProvider_1.NoNextEditReason.PromptTooLarge('currentFile'));
        }
        const { taggedCurrentFileContent, nLines: nLinesCurrentFile } = taggedCurrentFileContentResult.val;
        telemetryBuilder.setNLinesOfCurrentFileInPrompt(nLinesCurrentFile);
        const recordingEnabled = this.configService.getConfig(configurationService_1.ConfigKey.Internal.InlineEditsLogContextRecorderEnabled);
        let langCtx;
        if (promptOptions.languageContext.enabled || recordingEnabled) {
            const langCtxPromise = this.getLanguageContext(request, delaySession, activeDocument, cursorPosition, logContext, cancellationToken);
            if (promptOptions.languageContext.enabled) {
                langCtx = await langCtxPromise;
            }
            if (recordingEnabled) {
                logContext.setFileDiagnostics(this.langDiagService.getAllDiagnostics());
                langCtxPromise.then(langCtxs => {
                    if (langCtxs) {
                        logContext.setLanguageContext(langCtxs);
                    }
                });
            }
        }
        const promptPieces = new promptCrafting_1.PromptPieces(activeDocument, request.xtabEditHistory, taggedCurrentFileContent, areaAroundCodeToEdit, langCtx, computeTokens, promptOptions);
        const userPrompt = (0, promptCrafting_1.getUserPrompt)(promptPieces);
        const prediction = this.getPredictedOutput(editWindowLines, promptOptions.promptingStrategy);
        const messages = [
            {
                role: prompt_tsx_1.Raw.ChatRole.System,
                content: (0, globalStringUtils_1.toTextParts)(this.pickSystemPrompt(promptOptions.promptingStrategy))
            },
            { role: prompt_tsx_1.Raw.ChatRole.User, content: (0, globalStringUtils_1.toTextParts)(userPrompt) }
        ];
        logContext.setPrompt(messages);
        telemetryBuilder.setPrompt(messages);
        const HARD_CHAR_LIMIT = 30000 * 4; // 30K tokens, assuming 4 chars per token -- we use approximation here because counting tokens exactly is time-consuming
        const promptCharCount = messages.reduce((total, msg) => total + msg.content.reduce((subtotal, part) => subtotal + part.text.length, 0), 0);
        if (promptCharCount > HARD_CHAR_LIMIT) {
            return result_1.Result.error(new statelessNextEditProvider_1.NoNextEditReason.PromptTooLarge('final'));
        }
        await this.debounce(delaySession, telemetryBuilder);
        if (cancellationToken.isCancellationRequested) {
            return result_1.Result.error(new statelessNextEditProvider_1.NoNextEditReason.GotCancelled('afterDebounce'));
        }
        request.fetchIssued = true;
        const cursorLineOffset = cursorPosition.column;
        this.streamEdits(request, pushEdit, endpoint, messages, editWindow, editWindowLines, cursorOriginalLinesOffset, cursorLineOffset, editWindowLinesRange, prediction, {
            shouldRemoveCursorTagFromResponse,
            promptingStrategy: promptOptions.promptingStrategy,
            retryState,
        }, delaySession, tracer, telemetryBuilder, logContext, cancellationToken);
        return result_1.Result.ok(undefined);
    }
    async getLanguageContext(request, delaySession, activeDocument, cursorPosition, logContext, cancellationToken) {
        try {
            const textDoc = this.workspaceService.textDocuments.find(doc => doc.uri.toString() === activeDocument.id.uri);
            if (textDoc === undefined) {
                return undefined;
            }
            const providers = this.langCtxService.getContextProviders(textDoc);
            if (providers.length < 1) {
                return undefined;
            }
            const debounceTime = delaySession.getDebounceTime();
            const cursorPositionVscode = new vscodeTypes_1.Position(cursorPosition.lineNumber - 1, cursorPosition.column - 1);
            const ctxRequest = {
                opportunityId: request.opportunityId,
                completionId: request.id,
                documentContext: {
                    uri: textDoc.uri.toString(),
                    languageId: textDoc.languageId,
                    version: textDoc.version,
                    offset: textDoc.offsetAt(cursorPositionVscode)
                },
                activeExperiments: new Map(),
                timeBudget: debounceTime,
                timeoutEnd: Date.now() + debounceTime,
                source: 'nes',
            };
            const isSnippetIgnored = async (item) => {
                const uris = [item.uri, ...(item.additionalUris ?? [])];
                const isIgnored = await (0, async_1.raceFilter)(uris.map(uri => this.ignoreService.isCopilotIgnored(uri)), r => r);
                return !!isIgnored;
            };
            const langCtxItems = [];
            const getContextPromise = async () => {
                const ctxIter = this.langCtxService.getContextItems(textDoc, ctxRequest, cancellationToken);
                for await (const item of ctxIter) {
                    if (item.kind === languageContextService_1.ContextKind.Snippet && await isSnippetIgnored(item)) {
                        // If the snippet is ignored, we don't want to include it in the context
                        continue;
                    }
                    langCtxItems.push({ context: item, timeStamp: Date.now(), onTimeout: false });
                }
            };
            const start = Date.now();
            await (0, async_2.raceTimeout)(getContextPromise(), debounceTime);
            const end = Date.now();
            const langCtxOnTimeout = this.langCtxService.getContextItemsOnTimeout(textDoc, ctxRequest);
            for (const item of langCtxOnTimeout) {
                if (item.kind === languageContextService_1.ContextKind.Snippet && await isSnippetIgnored(item)) {
                    // If the snippet is ignored, we don't want to include it in the context
                    continue;
                }
                langCtxItems.push({ context: item, timeStamp: end, onTimeout: true });
            }
            return { start, end, items: langCtxItems };
        }
        catch (error) {
            logContext.setError(errors.fromUnknown(error));
            this.tracer.trace(`Failed to fetch language context: ${error}`);
            return undefined;
        }
    }
    async streamEdits(request, pushEdit, endpoint, messages, editWindow, editWindowLines, cursorOriginalLinesOffset, cursorLineOffset, // cursor offset within the line it's in; 1-based
    editWindowLineRange, prediction, opts, delaySession, parentTracer, telemetryBuilder, logContext, cancellationToken) {
        const tracer = parentTracer.sub('streamEdits');
        const useFetcher = this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.NextEditSuggestionsFetcher, this.expService) || undefined;
        const fetchStreamSource = new chatMLFetcher_1.FetchStreamSource();
        const fetchRequestStopWatch = new stopwatch_1.StopWatch();
        let responseSoFar = '';
        let chatResponseFailure;
        let ttft;
        const firstTokenReceived = new async_2.DeferredPromise();
        telemetryBuilder.setFetchStartedAt();
        logContext.setFetchStartTime();
        // we must not await this promise because we want to stream edits as they come in
        const fetchResultPromise = endpoint.makeChatRequest2({
            debugName: XtabProvider_1.ID,
            messages,
            finishedCb: async (text, _, delta) => {
                if (!firstTokenReceived.isSettled) {
                    firstTokenReceived.complete();
                }
                if (ttft === undefined) {
                    ttft = fetchRequestStopWatch.elapsed();
                    logContext.addLog(`TTFT ${ttft} ms`);
                }
                fetchStreamSource.update(text, delta);
                responseSoFar = text;
                logContext.setResponse(responseSoFar);
                return undefined;
            },
            location: commonTypes_1.ChatLocation.Other,
            source: undefined,
            requestOptions: {
                temperature: 0,
                stream: true,
                prediction,
            },
            userInitiatedRequest: undefined,
            telemetryProperties: {
                requestId: request.id,
            },
            useFetcher,
        }, cancellationToken);
        telemetryBuilder.setResponse(fetchResultPromise.then((response) => ({ response, ttft })));
        logContext.setFullResponse(fetchResultPromise.then((response) => response.type === commonTypes_1.ChatFetchResponseType.Success ? response.value : undefined));
        const fetchRes = await Promise.race([firstTokenReceived.p, fetchResultPromise]);
        if (fetchRes && fetchRes.type !== commonTypes_1.ChatFetchResponseType.Success) {
            if (fetchRes.type === commonTypes_1.ChatFetchResponseType.NotFound &&
                !this.forceUseDefaultModel // if we haven't already forced using the default model; otherwise, this could cause an infinite loop
            ) {
                this.forceUseDefaultModel = true;
                return this.doGetNextEdit(request, pushEdit, delaySession, logContext, cancellationToken, telemetryBuilder, opts.retryState); // use the same retry state
            }
            pushEdit(result_1.Result.error(XtabProvider_1.mapChatFetcherErrorToNoNextEditReason(fetchRes)));
            return;
        }
        fetchResultPromise
            .then((response) => {
            // this's a way to signal the edit-pushing code to know if the request failed and
            // 	it shouldn't push edits constructed from an erroneous response
            chatResponseFailure = response.type !== commonTypes_1.ChatFetchResponseType.Success ? response : undefined;
        })
            .catch((err) => {
            // in principle this shouldn't happen because ChatMLFetcher's fetchOne should not throw
            logContext.setError(errors.fromUnknown(err));
            logContext.addLog(`ChatMLFetcher fetch call threw -- this's UNEXPECTED!`);
            // Properly handle the error by pushing it as a result
            pushEdit(result_1.Result.error(new statelessNextEditProvider_1.NoNextEditReason.Unexpected(errors.fromUnknown(err))));
        }).finally(() => {
            logContext.setFetchEndTime();
            if (!firstTokenReceived.isSettled) {
                firstTokenReceived.complete();
            }
            fetchStreamSource.resolve();
            logContext.setResponse(responseSoFar);
        });
        const llmLinesStream = (0, xtabUtils_1.toLines)(fetchStreamSource.stream);
        // logging of times
        // removal of cursor tag if option is set
        const linesStream = (() => {
            let i = 0;
            return llmLinesStream.map((v) => {
                const trace = `Line ${i++} emitted with latency ${fetchRequestStopWatch.elapsed()} ms`;
                logContext.addLog(trace);
                tracer.trace(trace);
                return opts.shouldRemoveCursorTagFromResponse
                    ? v.replaceAll(promptCrafting_1.PromptTags.CURSOR, '')
                    : v;
            });
        })();
        let cleanedLinesStream;
        if (opts.promptingStrategy === xtabPromptOptions.PromptingStrategy.Xtab275) {
            cleanedLinesStream = linesStream;
        }
        else if (opts.promptingStrategy === xtabPromptOptions.PromptingStrategy.UnifiedModel ||
            opts.promptingStrategy === xtabPromptOptions.PromptingStrategy.Codexv21NesUnified ||
            opts.promptingStrategy === xtabPromptOptions.PromptingStrategy.Nes41Miniv3) {
            const linesIter = linesStream[Symbol.asyncIterator]();
            const firstLine = await linesIter.next();
            if (chatResponseFailure !== undefined) { // handle fetch failure
                pushEdit(result_1.Result.error(new statelessNextEditProvider_1.NoNextEditReason.Unexpected(errors.fromUnknown(chatResponseFailure))));
                return;
            }
            if (firstLine.done) { // no lines in response -- unexpected case but take as no suggestions
                pushEdit(result_1.Result.error(new statelessNextEditProvider_1.NoNextEditReason.NoSuggestions(request.documentBeforeEdits, editWindow)));
                return;
            }
            const trimmedLines = firstLine.value.trim();
            if (trimmedLines === ResponseTags.NO_CHANGE.start) {
                this.pushNoSuggestionsOrRetry(request, editWindow, pushEdit, delaySession, logContext, cancellationToken, telemetryBuilder, opts.retryState);
                return;
            }
            if (trimmedLines === ResponseTags.INSERT.start) {
                const lineWithCursorContinued = await linesIter.next();
                if (lineWithCursorContinued.done || lineWithCursorContinued.value.includes(ResponseTags.INSERT.end)) {
                    pushEdit(result_1.Result.error(new statelessNextEditProvider_1.NoNextEditReason.NoSuggestions(request.documentBeforeEdits, editWindow)));
                    return;
                }
                const edit = new lineEdit_1.LineReplacement(new lineRange_1.LineRange(editWindowLineRange.start + cursorOriginalLinesOffset + 1 /* 0-based to 1-based */, editWindowLineRange.start + cursorOriginalLinesOffset + 2), [editWindowLines[cursorOriginalLinesOffset].slice(0, cursorLineOffset - 1) + lineWithCursorContinued.value + editWindowLines[cursorOriginalLinesOffset].slice(cursorLineOffset - 1)]);
                pushEdit(result_1.Result.ok({ edit, window: editWindow }));
                const lines = [];
                let v = await linesIter.next();
                while (!v.done) {
                    if (v.value.includes(ResponseTags.INSERT.end)) {
                        break;
                    }
                    else {
                        lines.push(v.value);
                    }
                    v = await linesIter.next();
                }
                const line = editWindowLineRange.start + cursorOriginalLinesOffset + 2;
                pushEdit(result_1.Result.ok({
                    edit: new lineEdit_1.LineReplacement(new lineRange_1.LineRange(line, line), lines),
                    window: editWindow
                }));
                pushEdit(result_1.Result.error(new statelessNextEditProvider_1.NoNextEditReason.NoSuggestions(request.documentBeforeEdits, editWindow)));
                return;
            }
            if (trimmedLines === ResponseTags.EDIT.start) {
                cleanedLinesStream = new async_2.AsyncIterableObject(async (emitter) => {
                    let v = await linesIter.next();
                    while (!v.done) {
                        if (v.value.includes(ResponseTags.EDIT.end)) {
                            return;
                        }
                        emitter.emitOne(v.value);
                        v = await linesIter.next();
                    }
                });
            }
            else {
                pushEdit(result_1.Result.error(new statelessNextEditProvider_1.NoNextEditReason.Unexpected(new Error(`unexpected tag ${trimmedLines}`))));
                return;
            }
        }
        else {
            cleanedLinesStream = (0, xtabUtils_1.linesWithBackticksRemoved)(linesStream);
        }
        const diffOptions = {
            emitFastCursorLineChange: this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabProviderEmitFastCursorLineChange, this.expService),
            nLinesToConverge: this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabNNonSignificantLinesToConverge, this.expService),
            nSignificantLinesToConverge: this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabNSignificantLinesToConverge, this.expService),
        };
        (async () => {
            let i = 0;
            let hasBeenDelayed = false;
            try {
                for await (const edit of responseProcessor_1.ResponseProcessor.diff(editWindowLines, cleanedLinesStream, cursorOriginalLinesOffset, diffOptions)) {
                    const singleLineEdits = [];
                    if (edit.lineRange.startLineNumber === edit.lineRange.endLineNumberExclusive || // we don't want to run diff on insertion
                        edit.newLines.length === 0 || // we don't want to run diff on deletion
                        edit.lineRange.endLineNumberExclusive - edit.lineRange.startLineNumber === 1 && edit.newLines.length === 1 // we want to run diff on single line edits
                    ) {
                        const singleLineEdit = new lineEdit_1.LineReplacement(new lineRange_1.LineRange(edit.lineRange.startLineNumber + editWindowLineRange.start, edit.lineRange.endLineNumberExclusive + editWindowLineRange.start), edit.newLines);
                        singleLineEdits.push(singleLineEdit);
                    }
                    else {
                        const affectedOriginalLines = editWindowLines.slice(edit.lineRange.startLineNumber - 1, edit.lineRange.endLineNumberExclusive - 1).join('\n');
                        const diffResult = await this.diffService.computeDiff(affectedOriginalLines, edit.newLines.join('\n'), {
                            ignoreTrimWhitespace: false,
                            maxComputationTimeMs: 0,
                            computeMoves: false
                        });
                        const translateByNLines = editWindowLineRange.start + edit.lineRange.startLineNumber;
                        for (const change of diffResult.changes) {
                            const singleLineEdit = new lineEdit_1.LineReplacement(new lineRange_1.LineRange(translateByNLines + change.original.startLineNumber - 1, translateByNLines + change.original.endLineNumberExclusive - 1), edit.newLines.slice(change.modified.startLineNumber - 1, change.modified.endLineNumberExclusive - 1));
                            singleLineEdits.push(singleLineEdit);
                        }
                    }
                    if (chatResponseFailure) { // do not emit edits if chat response failed
                        break;
                    }
                    logContext.setResponse(responseSoFar);
                    for (const singleLineEdit of singleLineEdits) {
                        this.trace(`pushing edit #${i}:\n${singleLineEdit.toString()}`, logContext, tracer);
                        if (!hasBeenDelayed) { // delay only the first one
                            hasBeenDelayed = true;
                            await this.enforceArtificialDelay(delaySession, telemetryBuilder);
                        }
                        pushEdit(result_1.Result.ok({ edit: singleLineEdit, window: editWindow }));
                        i++;
                    }
                }
                if (chatResponseFailure) {
                    pushEdit(result_1.Result.error(XtabProvider_1.mapChatFetcherErrorToNoNextEditReason(chatResponseFailure)));
                    return;
                }
                const hadEdits = i > 0;
                if (hadEdits) {
                    pushEdit(result_1.Result.error(new statelessNextEditProvider_1.NoNextEditReason.NoSuggestions(request.documentBeforeEdits, editWindow)));
                }
                else {
                    this.pushNoSuggestionsOrRetry(request, editWindow, pushEdit, delaySession, logContext, cancellationToken, telemetryBuilder, opts.retryState);
                }
            }
            catch (err) {
                logContext.setError(err);
                // Properly handle the error by pushing it as a result
                pushEdit(result_1.Result.error(new statelessNextEditProvider_1.NoNextEditReason.Unexpected(errors.fromUnknown(err))));
            }
        })();
    }
    pushNoSuggestionsOrRetry(request, editWindow, pushEdit, delaySession, logContext, cancellationToken, telemetryBuilder, retryState) {
        const allowRetryWithExpandedWindow = this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabProviderRetryWithNMoreLinesBelow, this.expService);
        // if allowed to retry and not retrying already, flip the retry state and try again
        if (allowRetryWithExpandedWindow && retryState === 0 /* RetryState.NotRetrying */ && request.expandedEditWindowNLines === undefined) {
            this.doGetNextEdit(request, pushEdit, delaySession, logContext, cancellationToken, telemetryBuilder, 1 /* RetryState.RetryingWithExpandedWindow */);
            return;
        }
        pushEdit(result_1.Result.error(new statelessNextEditProvider_1.NoNextEditReason.NoSuggestions(request.documentBeforeEdits, editWindow)));
        return;
    }
    computeAreaAroundEditWindowLinesRange(currentDocLines, cursorLine) {
        const areaAroundStart = Math.max(0, cursorLine - promptCrafting_1.N_LINES_AS_CONTEXT);
        const areaAroundEndExcl = Math.min(currentDocLines.length, cursorLine + promptCrafting_1.N_LINES_AS_CONTEXT + 1);
        return new offsetRange_1.OffsetRange(areaAroundStart, areaAroundEndExcl);
    }
    computeEditWindowLinesRange(currentDocLines, cursorLine, request, maxMergeConflictLines, retryState) {
        let nLinesAbove;
        {
            const useVaryingLinesAbove = this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabProviderUseVaryingLinesAbove, this.expService);
            if (useVaryingLinesAbove) {
                nLinesAbove = 0; // default
                for (let i = 0; i < 8; ++i) {
                    const lineIdx = cursorLine - i;
                    if (lineIdx < 0) {
                        break;
                    }
                    if (currentDocLines[lineIdx].trim() !== '') {
                        nLinesAbove = i;
                        break;
                    }
                }
            }
            else {
                nLinesAbove = (this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabProviderNLinesAbove, this.expService)
                    ?? promptCrafting_1.N_LINES_ABOVE);
            }
        }
        let nLinesBelow;
        if (request.expandedEditWindowNLines !== undefined) {
            this.tracer.trace(`Using expanded nLinesBelow: ${request.expandedEditWindowNLines}`);
            nLinesBelow = request.expandedEditWindowNLines;
        }
        else {
            const overriddenNLinesBelow = this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabProviderNLinesBelow, this.expService);
            if (overriddenNLinesBelow !== undefined) {
                this.tracer.trace(`Using overridden nLinesBelow: ${overriddenNLinesBelow}`);
                nLinesBelow = overriddenNLinesBelow;
            }
            else {
                this.tracer.trace(`Using default nLinesBelow: ${promptCrafting_1.N_LINES_BELOW}`);
                nLinesBelow = promptCrafting_1.N_LINES_BELOW; // default
            }
        }
        if (retryState === 1 /* RetryState.RetryingWithExpandedWindow */) {
            nLinesBelow += this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabProviderRetryWithNMoreLinesBelow, this.expService) ?? 0;
        }
        let codeToEditStart = Math.max(0, cursorLine - nLinesAbove);
        let codeToEditEndExcl = Math.min(currentDocLines.length, cursorLine + nLinesBelow + 1);
        if (maxMergeConflictLines) {
            const tentativeEditWindow = new offsetRange_1.OffsetRange(codeToEditStart, codeToEditEndExcl);
            const mergeConflictRange = findMergeConflictMarkersRange(currentDocLines, tentativeEditWindow, maxMergeConflictLines);
            if (mergeConflictRange) {
                const onlyMergeConflictLines = this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabOnlyMergeConflictLines, this.expService);
                if (onlyMergeConflictLines) {
                    this.tracer.trace(`Expanding edit window to include ONLY merge conflict markers: ${mergeConflictRange.toString()}`);
                    codeToEditStart = mergeConflictRange.start;
                    codeToEditEndExcl = mergeConflictRange.endExclusive;
                }
                else {
                    this.tracer.trace(`Expanding edit window to include merge conflict markers: ${mergeConflictRange.toString()}; edit window range [${codeToEditStart}, ${codeToEditEndExcl})`);
                    codeToEditEndExcl = Math.max(codeToEditEndExcl, mergeConflictRange.endExclusive);
                }
            }
        }
        return new offsetRange_1.OffsetRange(codeToEditStart, codeToEditEndExcl);
    }
    static mapChatFetcherErrorToNoNextEditReason(fetchError) {
        switch (fetchError.type) {
            case commonTypes_1.ChatFetchResponseType.Canceled:
                return new statelessNextEditProvider_1.NoNextEditReason.GotCancelled('afterFetchCall');
            case commonTypes_1.ChatFetchResponseType.OffTopic:
            case commonTypes_1.ChatFetchResponseType.Filtered:
            case commonTypes_1.ChatFetchResponseType.PromptFiltered:
            case commonTypes_1.ChatFetchResponseType.Length:
            case commonTypes_1.ChatFetchResponseType.RateLimited:
            case commonTypes_1.ChatFetchResponseType.QuotaExceeded:
            case commonTypes_1.ChatFetchResponseType.ExtensionBlocked:
            case commonTypes_1.ChatFetchResponseType.AgentUnauthorized:
            case commonTypes_1.ChatFetchResponseType.AgentFailedDependency:
            case commonTypes_1.ChatFetchResponseType.InvalidStatefulMarker:
                return new statelessNextEditProvider_1.NoNextEditReason.Uncategorized(errors.fromUnknown(fetchError));
            case commonTypes_1.ChatFetchResponseType.BadRequest:
            case commonTypes_1.ChatFetchResponseType.NotFound:
            case commonTypes_1.ChatFetchResponseType.Failed:
            case commonTypes_1.ChatFetchResponseType.NetworkError:
            case commonTypes_1.ChatFetchResponseType.Unknown:
                return new statelessNextEditProvider_1.NoNextEditReason.FetchFailure(errors.fromUnknown(fetchError));
        }
    }
    determineModelConfiguration(activeDocument) {
        if (this.forceUseDefaultModel) {
            return {
                modelName: undefined,
                ...xtabPromptOptions.DEFAULT_OPTIONS,
            };
        }
        const promptingStrategy = this.determinePromptingStrategy();
        const sourcedModelConfig = {
            modelName: this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabProviderModelName, this.expService),
            promptingStrategy,
            currentFile: {
                maxTokens: this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabCurrentFileMaxTokens, this.expService),
                includeTags: promptingStrategy !== xtabPromptOptions.PromptingStrategy.UnifiedModel /* unified model doesn't use tags in current file */ && this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabIncludeTagsInCurrentFile, this.expService),
                prioritizeAboveCursor: this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabPrioritizeAboveCursor, this.expService)
            },
            pagedClipping: {
                pageSize: this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabPageSize, this.expService)
            },
            recentlyViewedDocuments: {
                nDocuments: this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabNRecentlyViewedDocuments, this.expService),
                maxTokens: this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabRecentlyViewedDocumentsMaxTokens, this.expService),
                includeViewedFiles: this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabIncludeViewedFiles, this.expService),
            },
            languageContext: this.determineLanguageContextOptions(activeDocument.languageId, {
                enabled: this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabLanguageContextEnabled, this.expService),
                enabledLanguages: this.configService.getConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabLanguageContextEnabledLanguages),
                maxTokens: this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabLanguageContextMaxTokens, this.expService),
            }),
            diffHistory: {
                nEntries: this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabDiffNEntries, this.expService),
                maxTokens: this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabDiffMaxTokens, this.expService),
                onlyForDocsInPrompt: this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabDiffOnlyForDocsInPrompt, this.expService),
                useRelativePaths: this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabDiffUseRelativePaths, this.expService),
            }
        };
        const localOverridingModelConfig = this.configService.getConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabProviderModelConfiguration);
        if (localOverridingModelConfig) {
            return XtabProvider_1.overrideModelConfig(sourcedModelConfig, localOverridingModelConfig);
        }
        const expBasedModelConfig = this.overrideByStringModelConfig(sourcedModelConfig, configurationService_1.ConfigKey.Internal.InlineEditsXtabProviderModelConfigurationString);
        if (expBasedModelConfig) {
            return expBasedModelConfig;
        }
        const defaultModelConfig = this.overrideByStringModelConfig(sourcedModelConfig, configurationService_1.ConfigKey.Internal.InlineEditsXtabProviderDefaultModelConfigurationString);
        if (defaultModelConfig) {
            return defaultModelConfig;
        }
        return sourcedModelConfig;
    }
    overrideByStringModelConfig(originalModelConfig, configKey) {
        const configString = this.configService.getExperimentBasedConfig(configKey, this.expService);
        if (configString === undefined) {
            return undefined;
        }
        let parsedConfig;
        try {
            parsedConfig = JSON.parse(configString);
        }
        catch (e) {
            /* __GDPR__
                "incorrectNesModelConfig" : {
                    "owner": "ulugbekna",
                    "comment": "Capture if model configuration string is invalid JSON.",
                    "configName": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Name of the configuration that failed to parse." },
                    "errorMessage": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Error message from JSON.parse." },
                    "configValue": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The invalid JSON string." }
                }
            */
            this.telemetryService.sendMSFTTelemetryEvent('incorrectNesModelConfig', { configName: configKey.id, errorMessage: errors.toString(errors.fromUnknown(e)), configValue: configString });
        }
        if (parsedConfig) {
            return XtabProvider_1.overrideModelConfig(originalModelConfig, parsedConfig);
        }
        return undefined;
    }
    static overrideModelConfig(modelConfig, overridingConfig) {
        return {
            ...modelConfig,
            modelName: overridingConfig.modelName,
            promptingStrategy: overridingConfig.promptingStrategy,
            currentFile: {
                ...modelConfig.currentFile,
                includeTags: overridingConfig.includeTagsInCurrentFile,
            },
        };
    }
    determinePromptingStrategy() {
        const isXtabUnifiedModel = this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabUseUnifiedModel, this.expService);
        const isCodexV21NesUnified = this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabCodexV21NesUnified, this.expService);
        const useSimplifiedPrompt = this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabProviderUseSimplifiedPrompt, this.expService);
        const useXtab275Prompting = this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabProviderUseXtab275Prompting, this.expService);
        const useNes41Miniv3Prompting = this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabUseNes41Miniv3Prompting, this.expService);
        if (isXtabUnifiedModel) {
            return xtabPromptOptions.PromptingStrategy.UnifiedModel;
        }
        else if (isCodexV21NesUnified) {
            return xtabPromptOptions.PromptingStrategy.Codexv21NesUnified;
        }
        else if (useSimplifiedPrompt) {
            return xtabPromptOptions.PromptingStrategy.SimplifiedSystemPrompt;
        }
        else if (useXtab275Prompting) {
            return xtabPromptOptions.PromptingStrategy.Xtab275;
        }
        else if (useNes41Miniv3Prompting) {
            return xtabPromptOptions.PromptingStrategy.Nes41Miniv3;
        }
        else {
            return undefined;
        }
    }
    pickSystemPrompt(promptingStrategy) {
        switch (promptingStrategy) {
            case xtabPromptOptions.PromptingStrategy.UnifiedModel:
                return promptCrafting_1.unifiedModelSystemPrompt;
            case xtabPromptOptions.PromptingStrategy.Codexv21NesUnified:
            case xtabPromptOptions.PromptingStrategy.SimplifiedSystemPrompt:
                return promptCrafting_1.simplifiedPrompt;
            case xtabPromptOptions.PromptingStrategy.Xtab275:
                return promptCrafting_1.xtab275SystemPrompt;
            case xtabPromptOptions.PromptingStrategy.Nes41Miniv3:
                return promptCrafting_1.nes41Miniv3SystemPrompt;
            default:
                return promptCrafting_1.systemPromptTemplate;
        }
    }
    determineLanguageContextOptions(languageId, { enabled, enabledLanguages, maxTokens }) {
        // Some languages are
        if (languageId in enabledLanguages) {
            return { enabled: enabledLanguages[languageId], maxTokens };
        }
        return { enabled, maxTokens };
    }
    getEndpoint(configuredModelName) {
        const url = this.configService.getConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabProviderUrl);
        const apiKey = this.configService.getConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabProviderApiKey);
        const hasOverriddenUrlAndApiKey = url !== undefined && apiKey !== undefined;
        if (hasOverriddenUrlAndApiKey) {
            return this.instaService.createInstance(xtabEndpoint_1.XtabEndpoint, url, apiKey, configuredModelName);
        }
        return (0, proxyXtabEndpoint_1.createProxyXtabEndpoint)(this.instaService, configuredModelName);
    }
    getPredictedOutput(editWindowLines, promptingStrategy) {
        return this.configService.getConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabProviderUsePrediction)
            ? {
                type: 'content',
                content: XtabProvider_1.getPredictionContents(editWindowLines, promptingStrategy)
            }
            : undefined;
    }
    static getPredictionContents(editWindowLines, promptingStrategy) {
        if (promptingStrategy === xtabPromptOptions.PromptingStrategy.UnifiedModel ||
            promptingStrategy === xtabPromptOptions.PromptingStrategy.Codexv21NesUnified ||
            promptingStrategy === xtabPromptOptions.PromptingStrategy.Nes41Miniv3) {
            return ['<EDIT>', ...editWindowLines, '</EDIT>'].join('\n');
        }
        else if (promptingStrategy === xtabPromptOptions.PromptingStrategy.Xtab275) {
            return editWindowLines.join('\n');
        }
        else {
            return ['```', ...editWindowLines, '```'].join('\n');
        }
    }
    async debounce(delaySession, telemetry) {
        if (this.simulationCtx.isInSimulationTests) {
            return;
        }
        const debounceTime = delaySession.getDebounceTime();
        this.tracer.trace(`Debouncing for ${debounceTime} ms`);
        telemetry.setDebounceTime(debounceTime);
        await (0, async_2.timeout)(debounceTime);
    }
    async enforceArtificialDelay(delaySession, telemetry) {
        if (this.simulationCtx.isInSimulationTests) {
            return;
        }
        const artificialDelay = delaySession.getArtificialDelay();
        this.tracer.trace(`Enforcing artificial delay of ${artificialDelay} ms`);
        telemetry.setArtificialDelay(artificialDelay);
        if (artificialDelay > 0) {
            await (0, async_2.timeout)(artificialDelay);
        }
    }
    trace(msg, logContext, tracer) {
        tracer.trace(msg);
        logContext.addLog(msg);
    }
};
exports.XtabProvider = XtabProvider;
exports.XtabProvider = XtabProvider = XtabProvider_1 = __decorate([
    __param(0, simulationTestContext_1.ISimulationTestContext),
    __param(1, instantiation_1.IInstantiationService),
    __param(2, workspaceService_1.IWorkspaceService),
    __param(3, diffService_1.IDiffService),
    __param(4, configurationService_1.IConfigurationService),
    __param(5, nullExperimentationService_1.IExperimentationService),
    __param(6, logService_1.ILogService),
    __param(7, languageContextProviderService_1.ILanguageContextProviderService),
    __param(8, languageDiagnosticsService_1.ILanguageDiagnosticsService),
    __param(9, ignoreService_1.IIgnoreService),
    __param(10, telemetry_1.ITelemetryService)
], XtabProvider);
/**
 * Finds the range of lines containing merge conflict markers within a specified edit window.
 *
 * @param lines - Array of strings representing the lines of text to search through
 * @param editWindowRange - The range within which to search for merge conflict markers
 * @param maxMergeConflictLines - Maximum number of lines to search for conflict markers
 * @returns An OffsetRange object representing the start and end of the conflict markers, or undefined if not found
 */
function findMergeConflictMarkersRange(lines, editWindowRange, maxMergeConflictLines) {
    for (let i = editWindowRange.start; i < Math.min(lines.length, editWindowRange.endExclusive); ++i) {
        if (!lines[i].startsWith('<<<<<<<')) {
            continue;
        }
        // found start of merge conflict markers -- now find the end
        for (let j = i + 1; j < lines.length && (j - i) < maxMergeConflictLines; ++j) {
            if (lines[j].startsWith('>>>>>>>')) {
                return new offsetRange_1.OffsetRange(i, j + 1 /* because endExclusive */);
            }
        }
    }
    return undefined;
}
//# sourceMappingURL=xtabProvider.js.map