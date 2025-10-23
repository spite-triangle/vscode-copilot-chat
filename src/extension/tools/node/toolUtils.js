"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkCancellation = checkCancellation;
exports.toolTSX = toolTSX;
exports.formatUriForFileWidget = formatUriForFileWidget;
exports.inputGlobToPattern = inputGlobToPattern;
exports.resolveToolInputPath = resolveToolInputPath;
exports.isFileOkForTool = isFileOkForTool;
exports.assertFileOkForTool = assertFileOkForTool;
exports.assertFileNotContentExcluded = assertFileNotContentExcluded;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const customInstructionsService_1 = require("../../../platform/customInstructions/common/customInstructionsService");
const fileTypes_1 = require("../../../platform/filesystem/common/fileTypes");
const ignoreService_1 = require("../../../platform/ignore/common/ignoreService");
const promptPathRepresentationService_1 = require("../../../platform/prompts/common/promptPathRepresentationService");
const tabsAndEditorsService_1 = require("../../../platform/tabs/common/tabsAndEditorsService");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const errors_1 = require("../../../util/vs/base/common/errors");
const network_1 = require("../../../util/vs/base/common/network");
const path_1 = require("../../../util/vs/base/common/path");
const resources_1 = require("../../../util/vs/base/common/resources");
const uri_1 = require("../../../util/vs/base/common/uri");
const vscodeTypes_1 = require("../../../vscodeTypes");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
function checkCancellation(token) {
    if (token.isCancellationRequested) {
        throw new errors_1.CancellationError();
    }
}
async function toolTSX(insta, options, piece, token) {
    return new vscodeTypes_1.LanguageModelToolResult([
        new vscodeTypes_1.LanguageModelPromptTsxPart(await (0, promptRenderer_1.renderPromptElementJSON)(insta, class extends prompt_tsx_1.PromptElement {
            render() {
                return piece;
            }
        }, {}, options.tokenizationOptions, token))
    ]);
}
function formatUriForFileWidget(uriOrLocation) {
    const uri = uri_1.URI.isUri(uriOrLocation) ? uriOrLocation : uriOrLocation.uri;
    const rangePart = uri_1.URI.isUri(uriOrLocation) ?
        '' :
        `#${uriOrLocation.range.start.line + 1}-${uriOrLocation.range.end.line + 1}`;
    // Empty link text -> rendered as file widget
    return `[](${uri.toString()}${rangePart})`;
}
function inputGlobToPattern(query, workspaceService) {
    let pattern = query;
    if ((0, path_1.isAbsolute)(query)) {
        try {
            const relative = workspaceService.asRelativePath(query);
            if (relative !== query) {
                const workspaceFolder = workspaceService.getWorkspaceFolder(uri_1.URI.file(query));
                if (workspaceFolder) {
                    pattern = new fileTypes_1.RelativePattern(workspaceFolder, relative);
                }
            }
        }
        catch (e) {
            // ignore
        }
    }
    const patterns = [pattern];
    if (typeof pattern === 'string' && !pattern.endsWith('/**')) {
        patterns.push(pattern + '/**');
    }
    else if (typeof pattern !== 'string' && !pattern.pattern.endsWith('/**')) {
        patterns.push(new fileTypes_1.RelativePattern(pattern.baseUri, pattern.pattern + '/**'));
    }
    return patterns;
}
function resolveToolInputPath(path, promptPathRepresentationService) {
    const uri = promptPathRepresentationService.resolveFilePath(path);
    if (!uri) {
        throw new Error(`Invalid input path: ${path}. Be sure to use an absolute path.`);
    }
    return uri;
}
async function isFileOkForTool(accessor, uri) {
    try {
        await assertFileOkForTool(accessor, uri);
        return true;
    }
    catch {
        return false;
    }
}
async function assertFileOkForTool(accessor, uri) {
    const workspaceService = accessor.get(workspaceService_1.IWorkspaceService);
    const tabsAndEditorsService = accessor.get(tabsAndEditorsService_1.ITabsAndEditorsService);
    const promptPathRepresentationService = accessor.get(promptPathRepresentationService_1.IPromptPathRepresentationService);
    const customInstructionsService = accessor.get(customInstructionsService_1.ICustomInstructionsService);
    await assertFileNotContentExcluded(accessor, uri);
    if (!workspaceService.getWorkspaceFolder((0, resources_1.normalizePath)(uri)) && !customInstructionsService.isExternalInstructionsFile(uri) && uri.scheme !== network_1.Schemas.untitled) {
        const fileOpenInSomeTab = tabsAndEditorsService.tabs.some(tab => (0, resources_1.isEqual)(tab.uri, uri));
        if (!fileOpenInSomeTab) {
            throw new Error(`File ${promptPathRepresentationService.getFilePath(uri)} is outside of the workspace, and not open in an editor, and can't be read`);
        }
    }
}
async function assertFileNotContentExcluded(accessor, uri) {
    const ignoreService = accessor.get(ignoreService_1.IIgnoreService);
    const promptPathRepresentationService = accessor.get(promptPathRepresentationService_1.IPromptPathRepresentationService);
    if (await ignoreService.isCopilotIgnored(uri)) {
        throw new Error(`File ${promptPathRepresentationService.getFilePath(uri)} is configured to be ignored by Copilot`);
    }
}
//# sourceMappingURL=toolUtils.js.map