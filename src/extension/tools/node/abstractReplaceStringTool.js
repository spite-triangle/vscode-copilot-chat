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
exports.AbstractReplaceStringTool = void 0;
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const editSurvivalTrackerService_1 = require("../../../platform/editSurvivalTracking/common/editSurvivalTrackerService");
const notebookDocumentSnapshot_1 = require("../../../platform/editing/common/notebookDocumentSnapshot");
const textDocumentSnapshot_1 = require("../../../platform/editing/common/textDocumentSnapshot");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const fileSystemService_1 = require("../../../platform/filesystem/common/fileSystemService");
const languageDiagnosticsService_1 = require("../../../platform/languages/common/languageDiagnosticsService");
const alternativeContent_1 = require("../../../platform/notebook/common/alternativeContent");
const alternativeContentEditGenerator_1 = require("../../../platform/notebook/common/alternativeContentEditGenerator");
const notebookService_1 = require("../../../platform/notebook/common/notebookService");
const promptPathRepresentationService_1 = require("../../../platform/prompts/common/promptPathRepresentationService");
const nullExperimentationService_1 = require("../../../platform/telemetry/common/nullExperimentationService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const chatResponseStreamImpl_1 = require("../../../util/common/chatResponseStreamImpl");
const markdown_1 = require("../../../util/common/markdown");
const async_1 = require("../../../util/vs/base/common/async");
const iterator_1 = require("../../../util/vs/base/common/iterator");
const map_1 = require("../../../util/vs/base/common/map");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const codeMapper_1 = require("../../prompts/node/codeMapper/codeMapper");
const editToolLearningService_1 = require("../common/editToolLearningService");
const toolNames_1 = require("../common/toolNames");
const toolsService_1 = require("../common/toolsService");
const parser_1 = require("./applyPatch/parser");
const editFileHealing_1 = require("./editFileHealing");
const editFileToolResult_1 = require("./editFileToolResult");
const editFileToolUtils_1 = require("./editFileToolUtils");
const editNotebookTool_1 = require("./editNotebookTool");
const toolUtils_1 = require("./toolUtils");
let AbstractReplaceStringTool = class AbstractReplaceStringTool {
    constructor(promptPathRepresentationService, instantiationService, workspaceService, toolsService, notebookService, fileSystemService, alternativeNotebookContent, alternativeNotebookEditGenerator, _editSurvivalTrackerService, languageDiagnosticsService, telemetryService, endpointProvider, experimentationService, configurationService, editToolLearningService) {
        this.promptPathRepresentationService = promptPathRepresentationService;
        this.instantiationService = instantiationService;
        this.workspaceService = workspaceService;
        this.toolsService = toolsService;
        this.notebookService = notebookService;
        this.fileSystemService = fileSystemService;
        this.alternativeNotebookContent = alternativeNotebookContent;
        this.alternativeNotebookEditGenerator = alternativeNotebookEditGenerator;
        this._editSurvivalTrackerService = _editSurvivalTrackerService;
        this.languageDiagnosticsService = languageDiagnosticsService;
        this.telemetryService = telemetryService;
        this.endpointProvider = endpointProvider;
        this.experimentationService = experimentationService;
        this.configurationService = configurationService;
        this.editToolLearningService = editToolLearningService;
    }
    async prepareEditsForFile(options, input, token) {
        const uri = (0, toolUtils_1.resolveToolInputPath)(input.filePath, this.promptPathRepresentationService);
        try {
            await this.instantiationService.invokeFunction(accessor => (0, toolUtils_1.assertFileNotContentExcluded)(accessor, uri));
        }
        catch (error) {
            this.sendReplaceTelemetry('invalidFile', options, input, undefined, undefined, undefined);
            throw error;
        }
        // Validate parameters
        if (!input.filePath || input.oldString === undefined || input.newString === undefined || !this._promptContext) {
            this.sendReplaceTelemetry('invalidStrings', options, input, undefined, undefined, undefined);
            throw new Error('Invalid input');
        }
        // Sometimes the model replaces an empty string in a new file to create it. Allow that pattern.
        const exists = await this.instantiationService.invokeFunction(editFileToolUtils_1.canExistingFileBeEdited, uri);
        if (!exists) {
            return {
                uri,
                didHeal: false,
                document: undefined,
                generatedEdit: input.oldString
                    ? { success: false, errorMessage: `File does not exist: ${input.filePath}. Use the ${toolNames_1.ToolName.CreateFile} tool to create it, or correct your filepath.` }
                    : { success: true, textEdits: [vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(0, 0), input.newString)] },
                input,
            };
        }
        const isNotebook = this.notebookService.hasSupportedNotebooks(uri);
        const document = isNotebook ?
            await this.workspaceService.openNotebookDocumentAndSnapshot(uri, this.alternativeNotebookContent.getFormat(this._promptContext?.request?.model)) :
            await this.workspaceService.openTextDocumentAndSnapshot(uri);
        const didHealRef = { didHeal: false };
        try {
            if (input.oldString === input.newString) {
                throw new editFileToolUtils_1.NoChangeError('Input and output are identical', input.filePath);
            }
            const { updatedFile, edits } = await this.generateEdit(uri, document, options, input, didHealRef, token);
            let notebookEdits;
            if (document instanceof notebookDocumentSnapshot_1.NotebookDocumentSnapshot) {
                const telemetryOptions = {
                    model: options.model ? this.endpointProvider.getChatEndpoint(options.model).then(m => m.name) : undefined,
                    requestId: this._promptContext.requestId,
                    source: alternativeContentEditGenerator_1.NotebookEditGenrationSource.stringReplace,
                };
                notebookEdits = await iterator_1.Iterable.asyncToArray((0, codeMapper_1.processFullRewriteNotebookEdits)(document.document, updatedFile, this.alternativeNotebookEditGenerator, telemetryOptions, token));
                (0, editNotebookTool_1.sendEditNotebookTelemetry)(this.telemetryService, this.endpointProvider, 'stringReplace', document.uri, this._promptContext.requestId, options.model ?? this._promptContext.request?.model);
            }
            void this.sendReplaceTelemetry('success', options, input, document.getText(), isNotebook, didHealRef.didHeal);
            return { document, uri, input, didHeal: didHealRef.didHeal, generatedEdit: { success: true, textEdits: edits, notebookEdits } };
        }
        catch (error) {
            // Enhanced error message with more helpful details
            let errorMessage = 'String replacement failed: ';
            let outcome;
            if (error instanceof editFileToolUtils_1.NoMatchError) {
                outcome = input.oldString.match(/Lines \d+-\d+ omitted/) ?
                    'oldStringHasOmittedLines' :
                    input.oldString.includes('{…}') ?
                        'oldStringHasSummarizationMarker' :
                        input.oldString.includes('/*...*/') ?
                            'oldStringHasSummarizationMarkerSemanticSearch' :
                            error.kindForTelemetry;
                errorMessage += `${error.message}`;
            }
            else if (error instanceof editFileToolUtils_1.EditError) {
                outcome = error.kindForTelemetry;
                errorMessage += error.message;
            }
            else {
                outcome = 'other';
                errorMessage += `${error.message}`;
            }
            void this.sendReplaceTelemetry(outcome, options, input, document.getText(), isNotebook, didHealRef.didHeal);
            return { document, uri, input, didHeal: didHealRef.didHeal, generatedEdit: { success: false, errorMessage } };
        }
    }
    async applyAllEdits(options, edits, token) {
        if (!this._promptContext?.stream) {
            throw new Error('no prompt context found');
        }
        const fileResults = [];
        const existingDiagnosticMap = new map_1.ResourceMap();
        for (const { document, uri, generatedEdit } of edits) {
            if (document && !existingDiagnosticMap.has(document.uri)) {
                existingDiagnosticMap.set(document.uri, this.languageDiagnosticsService.getDiagnostics(document.uri));
            }
            const existingDiagnostics = document ? existingDiagnosticMap.get(document.uri) : [];
            const isNotebook = this.notebookService.hasSupportedNotebooks(uri);
            if (!generatedEdit.success) {
                fileResults.push({ operation: parser_1.ActionType.UPDATE, uri, isNotebook, existingDiagnostics, error: generatedEdit.errorMessage });
                continue;
            }
            let editSurvivalTracker;
            let responseStream = this._promptContext.stream;
            if (document && document instanceof textDocumentSnapshot_1.TextDocumentSnapshot) { // Only for existing text documents
                const tracker = editSurvivalTracker = this._editSurvivalTrackerService.initialize(document.document);
                responseStream = chatResponseStreamImpl_1.ChatResponseStreamImpl.spy(this._promptContext.stream, (part) => {
                    if (part instanceof vscodeTypes_1.ChatResponseTextEditPart) {
                        tracker.collectAIEdits(part.edits);
                    }
                });
            }
            this._promptContext.stream.markdown('\n```\n');
            this._promptContext.stream.codeblockUri(uri, true);
            if (generatedEdit.notebookEdits) {
                const uriToEdit = document?.uri ?? uri;
                this._promptContext.stream.notebookEdit(uriToEdit, []);
                for (const edit of generatedEdit.notebookEdits) {
                    if (edit instanceof Array) {
                        this._promptContext.stream.textEdit(edit[0], edit[1]);
                    }
                    else {
                        this._promptContext.stream.notebookEdit(uriToEdit, edit);
                    }
                }
                this._promptContext.stream.notebookEdit(uriToEdit, true);
            }
            else {
                for (const edit of generatedEdit.textEdits) {
                    responseStream.textEdit(uri, edit);
                }
                responseStream.textEdit(uri, true);
                (0, async_1.timeout)(2000).then(() => {
                    // The tool can't wait for edits to be applied, so just wait before starting the survival tracker.
                    // TODO@roblourens see if this improves the survival metric, find a better fix.
                    editSurvivalTracker?.startReporter(res => {
                        /* __GDPR__
                            "codeMapper.trackEditSurvival" : {
                                "owner": "aeschli",
                                "comment": "Tracks how much percent of the AI edits survived after 5 minutes of accepting",
                                "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The id of the current request turn." },
                                "requestSource": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The source from where the request was made" },
                                "mapper": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The code mapper used: One of 'fast', 'fast-lora', 'full' and 'patch'" },
                                "survivalRateFourGram": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The rate between 0 and 1 of how much of the AI edit is still present in the document." },
                                "survivalRateNoRevert": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The rate between 0 and 1 of how much of the ranges the AI touched ended up being reverted." },
                                "didBranchChange": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Indicates if the branch changed in the meantime. If the branch changed (value is 1), this event should probably be ignored." },
                                "timeDelayMs": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The time delay between the user accepting the edit and measuring the survival rate." }
                            }
                        */
                        res.telemetryService.sendMSFTTelemetryEvent('codeMapper.trackEditSurvival', { requestId: this._promptContext?.requestId, requestSource: 'agent', mapper: 'stringReplaceTool' }, {
                            survivalRateFourGram: res.fourGram,
                            survivalRateNoRevert: res.noRevert,
                            timeDelayMs: res.timeDelayMs,
                            didBranchChange: res.didBranchChange ? 1 : 0,
                        });
                        res.telemetryService.sendGHTelemetryEvent('replaceString/trackEditSurvival', {
                            headerRequestId: this._promptContext?.requestId,
                            requestSource: 'agent',
                            mapper: 'stringReplaceTool'
                        }, {
                            survivalRateFourGram: res.fourGram,
                            survivalRateNoRevert: res.noRevert,
                            timeDelayMs: res.timeDelayMs,
                            didBranchChange: res.didBranchChange ? 1 : 0,
                        });
                    });
                });
                fileResults.push({ operation: parser_1.ActionType.UPDATE, uri, isNotebook, existingDiagnostics });
            }
            this._promptContext.stream.markdown('\n```\n');
        }
        return new vscodeTypes_1.LanguageModelToolResult([
            new vscodeTypes_1.LanguageModelPromptTsxPart(await (0, promptRenderer_1.renderPromptElementJSON)(this.instantiationService, editFileToolResult_1.EditFileResult, { files: fileResults, diagnosticsTimeout: 2000, toolName: this.toolName(), requestId: options.chatRequestId, model: options.model }, 
            // If we are not called with tokenization options, have _some_ fake tokenizer
            // otherwise we end up returning the entire document
            options.tokenizationOptions ?? {
                tokenBudget: 5000,
                countTokens: (t) => Promise.resolve(t.length * 3 / 4)
            }, token))
        ]);
    }
    async generateEdit(uri, document, options, input, didHealRef, token) {
        const filePath = this.promptPathRepresentationService.getFilePath(document.uri);
        const eol = document instanceof textDocumentSnapshot_1.TextDocumentSnapshot && document.eol === vscodeTypes_1.EndOfLine.CRLF ? '\r\n' : '\n';
        const oldString = (0, markdown_1.removeLeadingFilepathComment)(input.oldString, document.languageId, filePath).replace(/\r?\n/g, eol);
        const newString = (0, markdown_1.removeLeadingFilepathComment)(input.newString, document.languageId, filePath).replace(/\r?\n/g, eol);
        // Apply the edit using the improved applyEdit function that uses VS Code APIs
        let updatedFile;
        let edits = [];
        try {
            const result = await (0, editFileToolUtils_1.applyEdit)(uri, oldString, newString, this.workspaceService, this.notebookService, this.alternativeNotebookContent, this._promptContext?.request?.model);
            updatedFile = result.updatedFile;
            edits = result.edits;
            this.recordEditSuccess(options, true);
        }
        catch (e) {
            if (!(e instanceof editFileToolUtils_1.NoMatchError)) {
                throw e;
            }
            this.recordEditSuccess(options, false);
            if (this.experimentationService.getTreatmentVariable('copilotchat.disableReplaceStringHealing') === true) {
                throw e; // failsafe for next release.
            }
            didHealRef.didHeal = true;
            let healed;
            try {
                healed = await (0, editFileHealing_1.healReplaceStringParams)(options.model, document.getText(), {
                    explanation: options.input.explanation,
                    filePath: filePath,
                    oldString,
                    newString,
                }, eol, await this.endpointProvider.getChatEndpoint("gpt-4o-mini" /* CHAT_MODEL.GPT4OMINI */), token);
                if (healed.params.oldString === healed.params.newString) {
                    throw new editFileToolUtils_1.NoChangeError('change was identical after healing', document.uri.fsPath);
                }
            }
            catch (e2) {
                this.sendHealingTelemetry(options, String(e2), undefined);
                throw e; // original error
            }
            try {
                const result = await (0, editFileToolUtils_1.applyEdit)(uri, healed.params.oldString, healed.params.newString, this.workspaceService, this.notebookService, this.alternativeNotebookContent, this._promptContext?.request?.model);
                updatedFile = result.updatedFile;
                edits = result.edits;
            }
            catch (e2) {
                this.sendHealingTelemetry(options, undefined, String(e2));
                throw e; // original error
            }
        }
        return { edits, updatedFile };
    }
    async sendReplaceTelemetry(outcome, options, input, file, isNotebookDocument, didHeal) {
        const model = await this.modelForTelemetry(options);
        const isNotebook = isNotebookDocument ? 1 : (isNotebookDocument === false ? 0 : -1);
        const isMulti = this.toolName() === toolNames_1.ToolName.MultiReplaceString ? 1 : 0;
        /* __GDPR__
            "replaceStringToolInvoked" : {
                "owner": "roblourens",
                "comment": "The replace_string tool was invoked",
                "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The id of the current request turn." },
                "interactionId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The id of the current interaction." },
                "outcome": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the invocation was successful, or a failure reason" },
                "model": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The model that invoked the tool" },
                "isNotebook": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Whether the document is a notebook, 1 = yes, 0 = no, other = unknown." },
                "didHeal": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Whether the document is a notebook, 1 = yes, 0 = no, other = unknown." },
                "isMulti": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Whether the document is a multi-replace operation, 1 = yes, 0 = no." }
            }
        */
        this.telemetryService.sendMSFTTelemetryEvent('replaceStringToolInvoked', {
            requestId: options.chatRequestId,
            interactionId: options.chatRequestId,
            outcome,
            model
        }, { isNotebook, didHeal: didHeal === undefined ? -1 : (didHeal ? 1 : 0), isMulti });
        this.telemetryService.sendEnhancedGHTelemetryEvent('replaceStringTool', (0, telemetry_1.multiplexProperties)({
            headerRequestId: options.chatRequestId,
            baseModel: model,
            messageText: file,
            completionTextJson: JSON.stringify(input),
            postProcessingOutcome: outcome,
        }), { isNotebook });
    }
    async sendHealingTelemetry(options, healError, applicationError) {
        /* __GDPR__
            "replaceStringHealingStat" : {
                "owner": "roblourens",
                "comment": "The replace_string tool was invoked",
                "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The id of the current request turn." },
                "interactionId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The id of the current interaction." },
                "model": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The model that invoked the tool" },
                "outcome": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the invocation was successful, or a failure reason" },
                "healError": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Any error that happened during healing" },
                "applicationError": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Any error that happened after application" },
                "success": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Whether the document is a notebook, 1 = yes, 0 = no, other = unknown." }
            }
        */
        this.telemetryService.sendMSFTTelemetryEvent('replaceStringHealingStat', {
            requestId: options.chatRequestId,
            interactionId: options.chatRequestId,
            model: await this.modelForTelemetry(options),
            healError,
            applicationError,
        }, { success: healError === undefined && applicationError === undefined ? 1 : 0 });
    }
    async modelForTelemetry(options) {
        return options.model && (await this.endpointProvider.getChatEndpoint(options.model)).model;
    }
    async recordEditSuccess(options, success) {
        if (options.model) {
            this.editToolLearningService.didMakeEdit(options.model, this.toolName(), success);
        }
    }
    async resolveInput(input, promptContext) {
        this._promptContext = promptContext; // TODO@joyceerhl @roblourens HACK: Avoid types in the input being serialized and not deserialized when they go through invokeTool
        return input;
    }
    prepareInvocation(options, token) {
        return this.instantiationService.invokeFunction(editFileToolUtils_1.createEditConfirmation, this.urisForInput(options.input), () => '```json\n' + JSON.stringify(options.input, null, 2) + '\n```');
    }
};
exports.AbstractReplaceStringTool = AbstractReplaceStringTool;
exports.AbstractReplaceStringTool = AbstractReplaceStringTool = __decorate([
    __param(0, promptPathRepresentationService_1.IPromptPathRepresentationService),
    __param(1, instantiation_1.IInstantiationService),
    __param(2, workspaceService_1.IWorkspaceService),
    __param(3, toolsService_1.IToolsService),
    __param(4, notebookService_1.INotebookService),
    __param(5, fileSystemService_1.IFileSystemService),
    __param(6, alternativeContent_1.IAlternativeNotebookContentService),
    __param(7, alternativeContentEditGenerator_1.IAlternativeNotebookContentEditGenerator),
    __param(8, editSurvivalTrackerService_1.IEditSurvivalTrackerService),
    __param(9, languageDiagnosticsService_1.ILanguageDiagnosticsService),
    __param(10, telemetry_1.ITelemetryService),
    __param(11, endpointProvider_1.IEndpointProvider),
    __param(12, nullExperimentationService_1.IExperimentationService),
    __param(13, configurationService_1.IConfigurationService),
    __param(14, editToolLearningService_1.IEditToolLearningService)
], AbstractReplaceStringTool);
//# sourceMappingURL=abstractReplaceStringTool.js.map