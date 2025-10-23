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
exports.githubReview = githubReview;
const copilot_api_1 = require("@vscode/copilot-api");
const readline = __importStar(require("readline"));
const textDocumentSnapshot_1 = require("../../../platform/editing/common/textDocumentSnapshot");
const gitService_1 = require("../../../platform/git/common/gitService");
const path = __importStar(require("../../../util/vs/base/common/path"));
const uuid_1 = require("../../../util/vs/base/common/uuid");
const vscodeTypes_1 = require("../../../vscodeTypes");
const testing = false;
async function githubReview(logService, gitExtensionService, authService, capiClientService, domainService, fetcherService, envService, ignoreService, workspaceService, group, progress, cancellationToken) {
    const git = gitExtensionService.getExtensionApi();
    if (!git) {
        return { type: 'success', comments: [] };
    }
    const changes = (typeof group === 'string'
        ? (await Promise.all(git.repositories.map(async (repository) => {
            const uris = new Set();
            if (group === 'all' || group === 'index') {
                repository.state.indexChanges.forEach(c => uris.add(c.uri));
            }
            if (group === 'all' || group === 'workingTree') {
                repository.state.workingTreeChanges.forEach(c => uris.add(c.uri));
                repository.state.untrackedChanges.forEach(c => uris.add(c.uri));
            }
            const changes = await Promise.all(Array.from(uris).map(async (uri) => {
                const document = await workspaceService.openTextDocument(uri).then(undefined, () => undefined);
                if (!document) {
                    return undefined; // Deleted files can be skipped.
                }
                const before = await (group === 'index' || group === 'all' ? repository.show('HEAD', uri.fsPath).catch(() => '') : repository.show('', uri.fsPath).catch(() => ''));
                const after = group === 'index' ? await (repository.show('', uri.fsPath).catch(() => '')) : document.getText();
                const relativePath = path.relative(repository.rootUri.fsPath, uri.fsPath);
                return {
                    repository,
                    uri,
                    relativePath: process.platform === 'win32' ? relativePath.replace(/\\/g, '/') : relativePath,
                    before,
                    after,
                    document,
                };
            }));
            return changes;
        }))).flat()
        : 'repositoryRoot' in group ? await Promise.all(group.patches.map(async (patch) => {
            const uri = vscodeTypes_1.Uri.parse(patch.fileUri);
            const document = await workspaceService.openTextDocument(uri).then(undefined, () => undefined);
            if (!document) {
                return undefined; // Deleted files can be skipped.
            }
            const after = document.getText();
            const before = reversePatch(after, patch.patch);
            const relativePath = path.relative(group.repositoryRoot, uri.fsPath);
            return {
                repository: git.getRepository(vscodeTypes_1.Uri.parse(group.repositoryRoot)),
                relativePath: process.platform === 'win32' ? relativePath.replace(/\\/g, '/') : relativePath,
                before,
                after,
                document,
            };
        }))
            : await (async () => {
                const { group: g, file } = group;
                const repository = git.getRepository(file);
                const document = await workspaceService.openTextDocument(file).then(undefined, () => undefined);
                if (!repository || !document) {
                    return [];
                }
                const before = await (g === 'index' ? repository.show('HEAD', file.fsPath).catch(() => '') : repository.show('', file.fsPath).catch(() => ''));
                const after = g === 'index' ? await (repository.show('', file.fsPath).catch(() => '')) : document.getText();
                const relativePath = path.relative(repository.rootUri.fsPath, file.fsPath);
                return [
                    {
                        repository,
                        relativePath: process.platform === 'win32' ? relativePath.replace(/\\/g, '/') : relativePath,
                        before,
                        after,
                        document,
                    }
                ];
            })()).filter((change) => !!change);
    if (!changes.length) {
        return { type: 'success', comments: [] };
    }
    const ignored = await Promise.all(changes.map(i => ignoreService.isCopilotIgnored(i.document.uri)));
    const filteredChanges = changes.filter((_, i) => !ignored[i]);
    if (filteredChanges.length === 0) {
        logService.info('All input documents are ignored. Skipping feedback generation.');
        return {
            type: 'error',
            severity: 'info',
            reason: vscodeTypes_1.l10n.t('All input documents are ignored by configuration. Check your .copilotignore file.')
        };
    }
    logService.debug(`[github review agent] files: ${filteredChanges.map(change => change.relativePath).join(', ')}`);
    const { requestId, rl } = !testing ? await fetchComments(logService, authService, capiClientService, fetcherService, envService, filteredChanges[0].repository, filteredChanges.map(change => ({ path: change.relativePath, content: change.before })), filteredChanges.map(change => ({ path: change.relativePath, content: change.after })), cancellationToken) : {
        requestId: 'test-request-id',
        rl: [
            'data: ...',
            'data: [DONE]',
        ]
    };
    if (!rl || cancellationToken.isCancellationRequested) {
        return { type: 'cancelled' };
    }
    logService.info(`[github review agent] request id: ${requestId}`);
    const request = {
        source: 'githubReviewAgent',
        promptCount: -1,
        messageId: requestId || (0, uuid_1.generateUuid)(),
        inputType: 'change',
        inputRanges: [],
    };
    const references = [];
    const comments = [];
    for await (const line of rl) {
        if (cancellationToken.isCancellationRequested) {
            return { type: 'cancelled' };
        }
        logService.debug(`[github review agent] response line: ${line}`);
        const refs = parseLine(line);
        references.push(...refs);
        for (const ghComment of refs.filter(ref => ref.type === 'github.generated-pull-request-comment')) {
            const change = filteredChanges.find(change => change.relativePath === ghComment.data.path);
            if (!change) {
                continue;
            }
            const comment = createReviewComment(ghComment, request, change.document, comments.length);
            comments.push(comment);
            progress.report([comment]);
        }
    }
    const excludedComments = references.filter((ref) => ref.type === 'github.excluded-pull-request-comment')
        .map(ghComment => {
        const change = filteredChanges.find(change => change.relativePath === ghComment.data.path);
        return { ghComment, change };
    }).filter((item) => !!item.change)
        .map(({ ghComment, change }, i) => createReviewComment(ghComment, request, change.document, comments.length + i));
    const unsupportedLanguages = !comments.length ? [...new Set(references.filter((ref) => ref.type === 'github.excluded-file' && ref.data.reason === 'file_type_not_supported')
            .map(ref => ref.data.language))] : [];
    return { type: 'success', comments, excludedComments, reason: unsupportedLanguages.length ? vscodeTypes_1.l10n.t('Some of the submitted languages are currently not supported: {0}', unsupportedLanguages.join(', ')) : undefined };
}
function createReviewComment(ghComment, request, document, index) {
    const fromLine = document.lineAt(ghComment.data.line - 1);
    const lastNonWhitespaceCharacterIndex = fromLine.text.trimEnd().length;
    const range = new vscodeTypes_1.Range(fromLine.lineNumber, fromLine.firstNonWhitespaceCharacterIndex, fromLine.lineNumber, lastNonWhitespaceCharacterIndex);
    const raw = ghComment.data.body;
    // Remove suggestion because that interfers with our own suggestion rendering later.
    const content = removeSuggestion(raw);
    const comment = {
        request,
        document: textDocumentSnapshot_1.TextDocumentSnapshot.create(document),
        uri: document.uri,
        languageId: document.languageId,
        range,
        body: new vscodeTypes_1.MarkdownString(content),
        kind: 'bug',
        severity: 'medium',
        originalIndex: index,
        actionCount: 0,
    };
    return comment;
}
const SUGGESTION_EXPRESSION = /```suggestion(\u0020*(\r\n|\n))((?<suggestion>[\s\S]*?)(\r\n|\n))?```/g;
function removeSuggestion(body) {
    return body.replaceAll(SUGGESTION_EXPRESSION, '');
}
function parseLine(line) {
    if (line === 'data: [DONE]') {
        return [];
    }
    if (line === '') {
        return [];
    }
    const parsedLine = JSON.parse(line.replace('data: ', ''));
    if (Array.isArray(parsedLine.copilot_references) && parsedLine.copilot_references.length > 0) {
        return parsedLine.copilot_references.filter((ref) => ref.type);
    }
    else {
        return [];
    }
}
async function fetchComments(logService, authService, capiClientService, fetcherService, envService, repository, baseFileContents, headFileContents, cancellationToken) {
    const codingGuidlines = repository ? await loadCodingGuidelines(logService, authService, capiClientService, repository) : [];
    const requestBody = {
        messages: [{
                role: 'user',
                // This is the minimum reference required to get the agent to generate comments.
                // NOTE: The shape of these references is under active development and is likely to change.
                copilot_references: [
                    {
                        type: 'github.pull_request',
                        id: '1',
                        data: {
                            type: 'pull-request',
                            headFileContents,
                            baseFileContents,
                            // TODO: Refer to the repository so custom coding guidelines can be selected
                        },
                    },
                    ...codingGuidlines,
                ],
            }]
    };
    const abort = fetcherService.makeAbortController();
    const disposable = cancellationToken.onCancellationRequested(() => abort.abort());
    let response;
    try {
        const copilotToken = await authService.getCopilotToken();
        response = await capiClientService.makeRequest({
            method: 'POST',
            headers: {
                Authorization: 'Bearer ' + copilotToken.token,
                'X-Copilot-Code-Review-Mode': 'ide',
            },
            body: JSON.stringify(requestBody),
            signal: abort.signal,
        }, { type: copilot_api_1.RequestType.CodeReviewAgent });
    }
    catch (err) {
        if (fetcherService.isAbortError(err)) {
            return {
                requestId: undefined,
                rl: undefined,
            };
        }
        throw err;
    }
    finally {
        disposable.dispose();
    }
    const requestId = response.headers.get('x-github-request-id') || undefined;
    if (!response.ok) {
        if (response.status === 402) {
            const err = new Error(`You have reached your Code Review quota limit.`);
            err.severity = 'info';
            throw err;
        }
        throw new Error(`Agent returned an unexpected HTTP ${response.status} error (request id ${requestId || 'unknown'}).`);
    }
    const responseBody = await response.body();
    if (!responseBody) {
        throw new Error(`Agent returned an unexpected response: got 200 OK, but response body was empty (request id ${requestId || 'unknown'}).`);
    }
    return {
        requestId,
        rl: readline.createInterface({ input: responseBody }),
    };
}
function reversePatch(after, diff) {
    const patch = parsePatch(diff.split(/\r?\n/));
    const patchedLines = reverseParsedPatch(after.split(/\r?\n/), patch);
    return patchedLines.join('\n');
}
function parsePatch(patchLines) {
    const changes = [];
    let beforeLineNumber = -1;
    for (const line of patchLines) {
        if (line.startsWith('@@')) {
            const match = /@@ -(\d+),\d+ \+\d+,\d+ @@/.exec(line);
            if (match) {
                beforeLineNumber = parseInt(match[1], 10);
            }
        }
        else if (beforeLineNumber !== -1) {
            if (line.startsWith('+')) {
                changes.push({ beforeLineNumber, content: line.slice(1), type: 'add' });
            }
            else if (line.startsWith('-')) {
                changes.push({ beforeLineNumber, content: line.slice(1), type: 'remove' });
                beforeLineNumber++;
            }
            else {
                beforeLineNumber++;
            }
        }
    }
    return changes;
}
function reverseParsedPatch(fileLines, patch) {
    for (const change of patch) {
        if (change.type === 'add') {
            fileLines.splice(change.beforeLineNumber - 1, 1);
        }
        else if (change.type === 'remove') {
            fileLines.splice(change.beforeLineNumber - 1, 0, change.content);
        }
    }
    return fileLines;
}
async function loadCodingGuidelines(logService, authService, capiClientService, repository) {
    const { state } = repository;
    const remote = state.HEAD?.upstream?.remote || state.HEAD?.remote;
    const pushUrl = remote && state.remotes.find(r => r.name === remote)?.pushUrl || state.remotes.find(r => r.pushUrl)?.pushUrl;
    if (!pushUrl) {
        return [];
    }
    const normalized = new URL((0, gitService_1.normalizeFetchUrl)(pushUrl));
    if (normalized.hostname !== 'github.com') {
        return [];
    }
    const pathSegments = normalized.pathname.split('/');
    const owner = pathSegments[1];
    const repo = pathSegments[2].endsWith('.git') ? pathSegments[2].substring(0, pathSegments[2].length - 4) : pathSegments[2];
    const ghToken = (await authService.getAnyGitHubSession())?.accessToken;
    if (!ghToken) {
        logService.info(`Failed to fetch coding guidelines for ${owner}/${repo}: Not signed in.`);
        return [];
    }
    const response = await capiClientService.makeRequest({
        headers: {
            'Authorization': `Bearer ${ghToken}`
        },
    }, { type: copilot_api_1.RequestType.CodingGuidelines, repoWithOwner: `${owner}/${repo}` });
    const requestId = response.headers.get('x-github-request-id') || undefined;
    logService.info(`[github review agent] coding guidelines request id: ${requestId}`);
    if (!response.ok) {
        if (response.status !== 404) { // 404: No coding guidelines or user not part of coding guidelines feature flag.
            logService.info(`Failed to fetch coding guidelines for ${owner}/${repo}: ${response.statusText}`);
        }
        return [];
    }
    const text = await response.text();
    logService.debug(`[github review agent] coding guidelines: ${text}`);
    const codingGuidelines = JSON.parse(text);
    const codingGuidelineRefs = codingGuidelines.map((input, index) => ({
        type: "github.coding_guideline",
        id: `${index + 2}`,
        data: {
            id: index + 2,
            type: "coding-guideline",
            name: input.name,
            description: input.description,
            filePatterns: input.filePatterns,
        },
    }));
    return codingGuidelineRefs;
}
//# sourceMappingURL=githubReviewAgent.js.map