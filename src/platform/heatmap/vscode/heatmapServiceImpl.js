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
exports.HeatmapServiceImpl = void 0;
const vscode = __importStar(require("vscode"));
const async_1 = require("../../../util/vs/base/common/async");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const map_1 = require("../../../util/vs/base/common/map");
const network_1 = require("../../../util/vs/base/common/network");
const resources_1 = require("../../../util/vs/base/common/resources");
const fileSystemService_1 = require("../../filesystem/common/fileSystemService");
const gitExtensionService_1 = require("../../git/common/gitExtensionService");
const ignoreService_1 = require("../../ignore/common/ignoreService");
const heatmapService_1 = require("../common/heatmapService");
let HeatmapServiceImpl = class HeatmapServiceImpl {
    constructor(_ignoreService, _gitExtensionService, fileSystemService) {
        this._ignoreService = _ignoreService;
        this._gitExtensionService = _gitExtensionService;
        this._store = new lifecycle_1.DisposableStore();
        this._entries = new map_1.LRUCache(30);
        this._store.add(vscode.commands.registerCommand('github.copilot.chat.clearTemporalContext', () => {
            this._entries.clear();
            vscode.window.showInformationMessage('Temporal Context Cleared', { modal: true });
        }));
        const watcher = fileSystemService.createFileSystemWatcher('**/*');
        this._store.add(watcher);
        this._store.add(watcher.onDidDelete(e => {
            for (const [doc] of Array.from(this._entries)) {
                if ((0, resources_1.isEqual)(doc.uri, e)) {
                    this._entries.delete(doc);
                }
            }
        }));
        this._store.add(vscode.workspace.onDidOpenTextDocument(e => {
            for (const [key, value] of Array.from(this._entries)) {
                if (key.isClosed && key.uri.toString() === e.uri.toString()) {
                    // document is being re-opened, remove the old key/reference
                    // but keep the previous points
                    this._entries.delete(key);
                    this._entries.set(e, value);
                }
            }
        }));
        this._store.add(vscode.workspace.onDidCloseTextDocument(e => {
            if (vscode.workspace.fs.isWritableFileSystem(e.uri.scheme) === undefined) {
                // REMOVED closed documents that are not backed by a file system
                this._entries.delete(e);
            }
        }));
        this._store.add(vscode.workspace.onDidChangeTextDocument(e => {
            if (e.contentChanges.length === 0) {
                // nothing to adjust
                return;
            }
            const offsets = this._entries.get(e.document);
            if (!offsets) {
                // nothing to adjust
                return;
            }
            for (const change of e.contentChanges) {
                const delta = change.text.length - change.rangeLength;
                for (let i = 0; i < offsets.length; i++) {
                    const point = offsets[i];
                    if (point.offset > change.rangeOffset) {
                        offsets[i] = point.adjust(delta);
                    }
                }
            }
        }));
        const ignoredLanguages = [
            'markdown',
            'plaintext',
            { scheme: 'git' }, // has a fs but we don't want it
            { pattern: '**/settings.json' },
            { pattern: '**/keybindings.json' },
            { pattern: '**/.vscode/**' },
            { pattern: '**/*.prompt.md' }
        ];
        const updatePositions = async (textEditor, ranges) => {
            // IGNORE selected documents
            if (vscode.languages.match(ignoredLanguages, textEditor.document)) {
                return;
            }
            // IGNORE document without file system provider unless they are allow listed
            if (vscode.workspace.fs.isWritableFileSystem(textEditor.document.uri.scheme) === undefined) {
                return;
            }
            const document = textEditor.document;
            let collection = this._entries.get(document);
            if (!collection) {
                collection = [];
                this._entries.set(document, collection);
            }
            for (const range of ranges) {
                collection.push(new heatmapService_1.SelectionPoint(document.offsetAt(range.start), Date.now()));
                if (!range.isEmpty) {
                    collection.push(new heatmapService_1.SelectionPoint(document.offsetAt(range.end), Date.now()));
                }
            }
            if (collection.length > 100) {
                collection.splice(0, 33); // remove old entries
            }
        };
        const timeout = this._store.add(new lifecycle_1.MutableDisposable());
        this._store.add(vscode.window.onDidChangeTextEditorVisibleRanges(_e => {
            timeout.value = (0, async_1.disposableTimeout)(() => {
                if (vscode.window.activeTextEditor) {
                    updatePositions(vscode.window.activeTextEditor, vscode.window.activeTextEditor.visibleRanges);
                }
            }, 3000);
        }));
        this._store.add(vscode.window.onDidChangeTextEditorSelection(e => {
            updatePositions(e.textEditor, e.selections);
        }));
        this._store.add(vscode.window.onDidChangeActiveTextEditor(e => {
            if (e) {
                updatePositions(e, e.selections);
            }
        }));
    }
    dispose() {
        this._store.dispose();
        this._entries.clear();
    }
    async getEntries() {
        const result = new Map();
        // check with copilot ignore
        for (const [key, value] of this._entries.entries()) {
            if (await this._ignoreService.isCopilotIgnored(key.uri)) {
                continue;
            }
            result.set(key, value);
        }
        // check with .gitignore
        const gitApi = this._gitExtensionService.getExtensionApi();
        if (gitApi) {
            const repos = new map_1.ResourceMap();
            for (const [doc] of result) {
                if (doc.uri.scheme !== network_1.Schemas.file) {
                    continue;
                }
                const repo = gitApi.getRepository(doc.uri);
                if (!repo) {
                    continue;
                }
                let item = repos.get(repo.rootUri);
                if (!item) {
                    item = { repo, docs: [] };
                    repos.set(repo.rootUri, item);
                }
                item.docs.push(doc);
            }
            for (const { repo, docs } of repos.values()) {
                const ignored = await repo.checkIgnore(docs.map(d => d.uri.fsPath));
                for (const doc of docs) {
                    if (ignored.has(doc.uri.path)) {
                        result.delete(doc);
                    }
                }
            }
        }
        return result;
    }
};
exports.HeatmapServiceImpl = HeatmapServiceImpl;
exports.HeatmapServiceImpl = HeatmapServiceImpl = __decorate([
    __param(0, ignoreService_1.IIgnoreService),
    __param(1, gitExtensionService_1.IGitExtensionService),
    __param(2, fileSystemService_1.IFileSystemService)
], HeatmapServiceImpl);
//# sourceMappingURL=heatmapServiceImpl.js.map