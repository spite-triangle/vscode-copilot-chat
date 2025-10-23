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
const assert = __importStar(require("assert"));
const vscode = __importStar(require("vscode"));
const lifecycle_1 = require("../../../../util/vs/base/common/lifecycle");
const path = __importStar(require("../../../../util/vs/base/common/path"));
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const gitExtensionService_1 = require("../../../git/common/gitExtensionService");
const nullGitExtensionService_1 = require("../../../git/common/nullGitExtensionService");
const services_1 = require("../../../test/node/services");
const heatmapServiceImpl_1 = require("../../vscode/heatmapServiceImpl");
const fileSystemService_1 = require("../../../filesystem/common/fileSystemService");
const descriptors_1 = require("../../../../util/vs/platform/instantiation/common/descriptors");
const fileSystemServiceImpl_1 = require("../../../filesystem/node/fileSystemServiceImpl");
suite('HeatmapServiceImpl', () => {
    const scheme = 'heat-test';
    const uri1 = vscode.Uri.from({ scheme, path: '/test1.ts' });
    const uri2 = vscode.Uri.from({ scheme, path: '/test2.ts' });
    const uri3 = vscode.Uri.from({ scheme, path: '/test3.ts' });
    const store = new lifecycle_1.DisposableStore();
    const fs = new lifecycle_1.MutableDisposable();
    let instaService;
    setup(function () {
        const services = (0, services_1.createPlatformServices)();
        services.define(gitExtensionService_1.IGitExtensionService, new nullGitExtensionService_1.NullGitExtensionService());
        services.define(fileSystemService_1.IFileSystemService, new descriptors_1.SyncDescriptor(fileSystemServiceImpl_1.NodeFileSystemService));
        const accessor = services.createTestingAccessor();
        const memFs = new MemFS();
        fs.value = vscode.workspace.registerFileSystemProvider(scheme, memFs);
        memFs.writeFile(uri1, Buffer.from('Hello\nWorld'), { create: true, overwrite: true });
        memFs.writeFile(uri2, Buffer.from('Sample Text'), { create: true, overwrite: true });
        memFs.writeFile(uri3, Buffer.from('abc'.repeat(100)), { create: true, overwrite: true });
        instaService = accessor.get(instantiation_1.IInstantiationService);
        store.add(instaService);
    });
    teardown(async function () {
        store.clear();
        fs.clear();
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    });
    async function select(editor, selection) {
        if (editor.selection.isEqual(selection)) {
            return;
        }
        const update = new Promise((resolve) => vscode.window.onDidChangeTextEditorSelection(e => {
            if (e.textEditor === editor) {
                resolve();
            }
        }));
        editor.selection = selection;
        await update;
    }
    function assertOffsets(entries, doc, expected) {
        assert.deepStrictEqual(entries.get(doc)?.map(a => a.offset), expected);
    }
    test('basic', async function () {
        const service = instaService.createInstance(heatmapServiceImpl_1.HeatmapServiceImpl);
        const entries = await service.getEntries();
        assert.strictEqual(entries.size, 0);
        service.dispose();
    });
    test('selection', async function () {
        const doc = await vscode.workspace.openTextDocument(uri1);
        const edit = await vscode.window.showTextDocument(doc);
        const service = instaService.createInstance(heatmapServiceImpl_1.HeatmapServiceImpl);
        await select(edit, new vscode.Selection(1, 0, 1, 0));
        const entries = await service.getEntries();
        assert.strictEqual(entries.size, 1);
        assert.ok(entries.has(doc));
        assert.deepStrictEqual(entries.get(doc)?.map(a => a.offset), [6]);
        service.dispose();
    });
    test('selection contains start and end', async function () {
        const doc = await vscode.workspace.openTextDocument(uri1);
        const edit = await vscode.window.showTextDocument(doc);
        const service = instaService.createInstance(heatmapServiceImpl_1.HeatmapServiceImpl);
        await select(edit, new vscode.Selection(1, 0, 1, 4));
        const entries = await service.getEntries();
        assert.strictEqual(entries.size, 1);
        assert.ok(entries.has(doc));
        assert.deepStrictEqual(entries.get(doc)?.map(a => a.offset), [6, 10]);
        service.dispose();
    });
    test('entries are grouped by document', async function () {
        const doc1 = await vscode.workspace.openTextDocument(uri1);
        const editor1 = await vscode.window.showTextDocument(doc1, vscode.ViewColumn.One);
        const doc2 = await vscode.workspace.openTextDocument(uri2);
        const editor2 = await vscode.window.showTextDocument(doc2, vscode.ViewColumn.Two);
        const service = instaService.createInstance(heatmapServiceImpl_1.HeatmapServiceImpl);
        await select(editor1, new vscode.Selection(1, 0, 1, 0));
        await select(editor2, new vscode.Selection(1, 4, 1, 5));
        const entries = await service.getEntries();
        assert.strictEqual(entries.size, 2);
        assert.ok(entries.has(doc1));
        assert.ok(entries.has(doc2));
        service.dispose();
    });
    test('selection is capped', async function () {
        const doc = await vscode.workspace.openTextDocument(uri3);
        const editor = await vscode.window.showTextDocument(doc);
        const service = instaService.createInstance(heatmapServiceImpl_1.HeatmapServiceImpl);
        for (let i = 0; i < 101; i++) {
            await select(editor, new vscode.Selection(0, 1 + i, 0, 1 + i));
        }
        const entries = await service.getEntries();
        assert.strictEqual(entries.size, 1);
        assert.strictEqual(entries.get(doc).length, 68);
        service.dispose();
    });
    test('edits', async function () {
        const service = instaService.createInstance(heatmapServiceImpl_1.HeatmapServiceImpl);
        const doc = await vscode.workspace.openTextDocument(uri1);
        const editor = await vscode.window.showTextDocument(doc);
        await select(editor, new vscode.Selection(1, 0, 1, 0));
        const entries = await service.getEntries();
        assert.strictEqual(entries.size, 1);
        assertOffsets(entries, doc, [0, 6]);
        await editor.edit(builder => {
            builder.insert(new vscode.Position(0, 0), 'foo');
        });
        const entries2 = await service.getEntries();
        assert.strictEqual(entries2.size, 1);
        assertOffsets(entries2, doc, [0, 9]);
        await editor.edit(builder => {
            builder.insert(new vscode.Position(1, 4), 'bar');
        });
        const entries3 = await service.getEntries();
        assert.strictEqual(entries3.size, 1);
        assertOffsets(entries3, doc, [0, 9]);
        await select(editor, new vscode.Selection(0, 0, 0, 2));
        assertOffsets(entries3, doc, [0, 9, 0, 2]);
        service.dispose();
    });
});
//#region --- MEM_FS
class File {
    constructor(name) {
        this.type = vscode.FileType.File;
        this.ctime = Date.now();
        this.mtime = Date.now();
        this.size = 0;
        this.name = name;
    }
}
class Directory {
    constructor(name) {
        this.type = vscode.FileType.Directory;
        this.ctime = Date.now();
        this.mtime = Date.now();
        this.size = 0;
        this.name = name;
        this.entries = new Map();
    }
}
class MemFS {
    constructor() {
        this.root = new Directory('');
        // --- manage file events
        this._emitter = new vscode.EventEmitter();
        this._bufferedEvents = [];
        this.onDidChangeFile = this._emitter.event;
    }
    // --- manage file metadata
    stat(uri) {
        return this._lookup(uri, false);
    }
    readDirectory(uri) {
        const entry = this._lookupAsDirectory(uri, false);
        const result = [];
        for (const [name, child] of entry.entries) {
            result.push([name, child.type]);
        }
        return result;
    }
    // --- manage file contents
    readFile(uri) {
        const data = this._lookupAsFile(uri, false).data;
        if (data) {
            return data;
        }
        throw vscode.FileSystemError.FileNotFound();
    }
    writeFile(uri, content, options) {
        const basename = path.posix.basename(uri.path);
        const parent = this._lookupParentDirectory(uri);
        let entry = parent.entries.get(basename);
        if (entry instanceof Directory) {
            throw vscode.FileSystemError.FileIsADirectory(uri);
        }
        if (!entry && !options.create) {
            throw vscode.FileSystemError.FileNotFound(uri);
        }
        if (entry && options.create && !options.overwrite) {
            throw vscode.FileSystemError.FileExists(uri);
        }
        if (!entry) {
            entry = new File(basename);
            parent.entries.set(basename, entry);
            this._fireSoon({ type: vscode.FileChangeType.Created, uri });
        }
        entry.mtime = Date.now();
        entry.size = content.byteLength;
        entry.data = content;
        this._fireSoon({ type: vscode.FileChangeType.Changed, uri });
    }
    // --- manage files/folders
    rename(oldUri, newUri, options) {
        if (!options.overwrite && this._lookup(newUri, true)) {
            throw vscode.FileSystemError.FileExists(newUri);
        }
        const entry = this._lookup(oldUri, false);
        const oldParent = this._lookupParentDirectory(oldUri);
        const newParent = this._lookupParentDirectory(newUri);
        const newName = path.posix.basename(newUri.path);
        oldParent.entries.delete(entry.name);
        entry.name = newName;
        newParent.entries.set(newName, entry);
        this._fireSoon({ type: vscode.FileChangeType.Deleted, uri: oldUri }, { type: vscode.FileChangeType.Created, uri: newUri });
    }
    delete(uri) {
        const dirname = uri.with({ path: path.posix.dirname(uri.path) });
        const basename = path.posix.basename(uri.path);
        const parent = this._lookupAsDirectory(dirname, false);
        if (!parent.entries.has(basename)) {
            throw vscode.FileSystemError.FileNotFound(uri);
        }
        parent.entries.delete(basename);
        parent.mtime = Date.now();
        parent.size -= 1;
        this._fireSoon({ type: vscode.FileChangeType.Changed, uri: dirname }, { uri, type: vscode.FileChangeType.Deleted });
    }
    createDirectory(uri) {
        const basename = path.posix.basename(uri.path);
        const dirname = uri.with({ path: path.posix.dirname(uri.path) });
        const parent = this._lookupAsDirectory(dirname, false);
        const entry = new Directory(basename);
        parent.entries.set(entry.name, entry);
        parent.mtime = Date.now();
        parent.size += 1;
        this._fireSoon({ type: vscode.FileChangeType.Changed, uri: dirname }, { type: vscode.FileChangeType.Created, uri });
    }
    _lookup(uri, silent) {
        const parts = uri.path.split('/');
        let entry = this.root;
        for (const part of parts) {
            if (!part) {
                continue;
            }
            let child;
            if (entry instanceof Directory) {
                child = entry.entries.get(part);
            }
            if (!child) {
                if (!silent) {
                    throw vscode.FileSystemError.FileNotFound(uri);
                }
                else {
                    return undefined;
                }
            }
            entry = child;
        }
        return entry;
    }
    _lookupAsDirectory(uri, silent) {
        const entry = this._lookup(uri, silent);
        if (entry instanceof Directory) {
            return entry;
        }
        throw vscode.FileSystemError.FileNotADirectory(uri);
    }
    _lookupAsFile(uri, silent) {
        const entry = this._lookup(uri, silent);
        if (entry instanceof File) {
            return entry;
        }
        throw vscode.FileSystemError.FileIsADirectory(uri);
    }
    _lookupParentDirectory(uri) {
        const dirname = uri.with({ path: path.posix.dirname(uri.path) });
        return this._lookupAsDirectory(dirname, false);
    }
    watch(_resource) {
        // ignore, fires for all changes...
        return new vscode.Disposable(() => { });
    }
    _fireSoon(...events) {
        this._bufferedEvents.push(...events);
        if (this._fireSoonHandle) {
            clearTimeout(this._fireSoonHandle);
        }
        this._fireSoonHandle = setTimeout(() => {
            this._emitter.fire(this._bufferedEvents);
            this._bufferedEvents.length = 0;
        }, 5);
    }
}
//# sourceMappingURL=heatmapServiceImpl.test.js.map