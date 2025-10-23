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
exports.DiagnosticToolOutput = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const languageDiagnosticsService_1 = require("../../../platform/languages/common/languageDiagnosticsService");
const logService_1 = require("../../../platform/log/common/logService");
const promptPathRepresentationService_1 = require("../../../platform/prompts/common/promptPathRepresentationService");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const languages_1 = require("../../../util/common/languages");
const types_1 = require("../../../util/common/types");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const uri_1 = require("../../../util/vs/base/common/uri");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const fixSelection_1 = require("../../context/node/resolvers/fixSelection");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const tag_1 = require("../../prompts/node/base/tag");
const diagnosticsContext_1 = require("../../prompts/node/inline/diagnosticsContext");
const toolNames_1 = require("../common/toolNames");
const toolsRegistry_1 = require("../common/toolsRegistry");
const toolUtils_1 = require("./toolUtils");
const arrays_1 = require("../../../util/vs/base/common/arrays");
let GetErrorsTool = class GetErrorsTool extends lifecycle_1.Disposable {
    static { this.toolName = toolNames_1.ToolName.GetErrors; }
    constructor(instantiationService, languageDiagnosticsService, workspaceService, promptPathRepresentationService, logService) {
        super();
        this.instantiationService = instantiationService;
        this.languageDiagnosticsService = languageDiagnosticsService;
        this.workspaceService = workspaceService;
        this.promptPathRepresentationService = promptPathRepresentationService;
        this.logService = logService;
    }
    async invoke(options, token) {
        const getAll = () => this.languageDiagnosticsService.getAllDiagnostics()
            .map(d => ({ uri: d[0], diagnostics: d[1].filter(e => e.severity <= vscodeTypes_1.DiagnosticSeverity.Warning) }))
            // filter any documents w/o warnings or errors
            .filter(d => d.diagnostics.length > 0);
        const getSome = (filePaths) => filePaths.map((filePath, i) => {
            const uri = (0, toolUtils_1.resolveToolInputPath)(filePath, this.promptPathRepresentationService);
            const range = options.input.ranges?.[i];
            if (!uri) {
                throw new Error(`Invalid input path ${filePath}`);
            }
            let diagnostics = range
                ? (0, fixSelection_1.findDiagnosticForSelectionAndPrompt)(this.languageDiagnosticsService, uri, new vscodeTypes_1.Range(...range), undefined)
                : this.languageDiagnosticsService.getDiagnostics(uri);
            diagnostics = diagnostics.filter(d => d.severity <= vscodeTypes_1.DiagnosticSeverity.Warning);
            return {
                diagnostics,
                uri,
            };
        });
        const ds = options.input.filePaths?.length ? getSome(options.input.filePaths) : getAll();
        const diagnostics = (0, arrays_1.coalesce)(await Promise.all(ds.map((async ({ uri, diagnostics }) => {
            try {
                const document = await this.workspaceService.openTextDocumentAndSnapshot(uri);
                (0, toolUtils_1.checkCancellation)(token);
                return {
                    uri,
                    diagnostics,
                    context: { document, language: (0, languages_1.getLanguage)(document) }
                };
            }
            catch (e) {
                this.logService.error(e, 'get_errors failed to open doc with diagnostics');
                return undefined;
            }
        }))));
        (0, toolUtils_1.checkCancellation)(token);
        const result = new vscodeTypes_1.ExtendedLanguageModelToolResult([
            new vscodeTypes_1.LanguageModelPromptTsxPart(await (0, promptRenderer_1.renderPromptElementJSON)(this.instantiationService, DiagnosticToolOutput, { diagnosticsGroups: diagnostics, maxDiagnostics: 50 }, options.tokenizationOptions, token))
        ]);
        const numDiagnostics = diagnostics.reduce((acc, { diagnostics }) => acc + diagnostics.length, 0);
        const formattedURIs = this.formatURIs(diagnostics.map(d => d.uri));
        if (options.input.filePaths?.length) {
            result.toolResultMessage = numDiagnostics === 0 ?
                new vscodeTypes_1.MarkdownString(l10n.t `Checked ${formattedURIs}, no problems found`) :
                numDiagnostics === 1 ?
                    new vscodeTypes_1.MarkdownString(l10n.t `Checked ${formattedURIs}, 1 problem found`) :
                    new vscodeTypes_1.MarkdownString(l10n.t `Checked ${formattedURIs}, ${numDiagnostics} problems found`);
        }
        else {
            result.toolResultMessage = numDiagnostics === 0 ?
                new vscodeTypes_1.MarkdownString(l10n.t `Checked workspace, no problems found`) :
                numDiagnostics === 1 ?
                    new vscodeTypes_1.MarkdownString(l10n.t `Checked workspace, 1 problem found in ${formattedURIs}`) :
                    new vscodeTypes_1.MarkdownString(l10n.t `Checked workspace, ${numDiagnostics} problems found in ${formattedURIs}`);
        }
        return result;
    }
    prepareInvocation(options, token) {
        if (!options.input.filePaths?.length) {
            // When no file paths provided, check all files with diagnostics
            return {
                invocationMessage: new vscodeTypes_1.MarkdownString(l10n.t `Checking workspace for problems`),
            };
        }
        else {
            const uris = options.input.filePaths.map(filePath => (0, toolUtils_1.resolveToolInputPath)(filePath, this.promptPathRepresentationService));
            if (uris.some(uri => uri === undefined)) {
                throw new Error('Invalid file path provided');
            }
            return {
                invocationMessage: new vscodeTypes_1.MarkdownString(l10n.t `Checking ${this.formatURIs(uris)}`),
            };
        }
    }
    formatURIs(uris) {
        return uris.map(toolUtils_1.formatUriForFileWidget).join(', ');
    }
    async provideInput(promptContext) {
        const seen = new Set();
        const filePaths = [];
        const ranges = [];
        function addPath(path, range) {
            if (!seen.has(path)) {
                seen.add(path);
                filePaths.push(path);
                ranges.push(range && [range.start.line, range.start.character, range.end.line, range.end.character]);
            }
        }
        for (const ref of promptContext.chatVariables) {
            if (uri_1.URI.isUri(ref.value)) {
                addPath(this.promptPathRepresentationService.getFilePath(ref.value), undefined);
            }
            else if ((0, types_1.isLocation)(ref.value)) {
                addPath(this.promptPathRepresentationService.getFilePath(ref.value.uri), ref.value.range);
            }
        }
        if (promptContext.workingSet) {
            for (const file of promptContext.workingSet) {
                addPath(this.promptPathRepresentationService.getFilePath(file.document.uri), file.range);
            }
        }
        if (!filePaths.length) {
            for (const [uri, diags] of this.languageDiagnosticsService.getAllDiagnostics()) {
                const path = this.promptPathRepresentationService.getFilePath(uri);
                if (diags.length) {
                    let range = diags[0].range;
                    for (let i = 1; i < diags.length; i++) {
                        range = range.union(diags[i].range);
                    }
                    addPath(path, range);
                }
            }
        }
        return {
            filePaths,
            ranges
        };
    }
};
GetErrorsTool = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, languageDiagnosticsService_1.ILanguageDiagnosticsService),
    __param(2, workspaceService_1.IWorkspaceService),
    __param(3, promptPathRepresentationService_1.IPromptPathRepresentationService),
    __param(4, logService_1.ILogService)
], GetErrorsTool);
toolsRegistry_1.ToolRegistry.registerTool(GetErrorsTool);
let DiagnosticToolOutput = class DiagnosticToolOutput extends prompt_tsx_1.PromptElement {
    constructor(props, promptPathRepresentationService) {
        super(props);
        this.promptPathRepresentationService = promptPathRepresentationService;
    }
    render() {
        if (!this.props.diagnosticsGroups.length) {
            return vscpp(vscppf, null, "No errors found.");
        }
        let diagnosticsGroups = this.props.diagnosticsGroups;
        let limitMsg;
        if (typeof this.props.maxDiagnostics === 'number') {
            let remaining = this.props.maxDiagnostics;
            diagnosticsGroups = this.props.diagnosticsGroups.map(group => {
                if (remaining <= 0) {
                    return { ...group, diagnostics: [] };
                }
                const take = Math.min(group.diagnostics.length, remaining);
                remaining -= take;
                return { ...group, diagnostics: group.diagnostics.slice(0, take) };
            });
            const totalDiagnostics = this.props.diagnosticsGroups.reduce((acc, group) => acc + group.diagnostics.length, 0);
            limitMsg = totalDiagnostics > this.props.maxDiagnostics
                ? vscpp(vscppf, null,
                    "Showing first ",
                    this.props.maxDiagnostics,
                    " results out of ",
                    totalDiagnostics,
                    vscpp("br", null))
                : undefined;
        }
        return vscpp(vscppf, null,
            limitMsg,
            diagnosticsGroups.map(d => vscpp(tag_1.Tag, { name: 'errors', attrs: { path: this.promptPathRepresentationService.getFilePath(d.uri) } }, d.diagnostics.length
                ? vscpp(diagnosticsContext_1.Diagnostics, { documentContext: d.context, diagnostics: d.diagnostics, includeRelatedInfos: false })
                : 'No errors found')));
    }
};
exports.DiagnosticToolOutput = DiagnosticToolOutput;
exports.DiagnosticToolOutput = DiagnosticToolOutput = __decorate([
    __param(1, promptPathRepresentationService_1.IPromptPathRepresentationService)
], DiagnosticToolOutput);
//# sourceMappingURL=getErrorsTool.js.map