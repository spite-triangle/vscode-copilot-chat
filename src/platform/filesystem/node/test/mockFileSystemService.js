"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockFileSystemService = void 0;
const fileTypes_1 = require("../../common/fileTypes");
class MockFileSystemService {
    constructor() {
        this.mockDirs = new Map();
        this.mockFiles = new Map();
        this.mockErrors = new Map();
        this.mockMtimes = new Map();
        this.statCalls = 0;
    }
    mockDirectory(uri, entries) {
        const uriString = typeof uri === 'string' ? uri : uri.toString();
        this.mockDirs.set(uriString, entries);
    }
    mockFile(uri, contents, mtime) {
        const uriString = typeof uri === 'string' ? uri : uri.toString();
        this.mockFiles.set(uriString, contents);
        if (mtime !== undefined) {
            this.mockMtimes.set(uriString, mtime);
        }
    }
    mockError(uri, error) {
        const uriString = typeof uri === 'string' ? uri : uri.toString();
        this.mockErrors.set(uriString, error);
    }
    getStatCallCount() {
        return this.statCalls;
    }
    resetStatCallCount() {
        this.statCalls = 0;
    }
    async readDirectory(uri) {
        const uriString = uri.toString();
        if (this.mockErrors.has(uriString)) {
            throw this.mockErrors.get(uriString);
        }
        return this.mockDirs.get(uriString) || [];
    }
    async readFile(uri) {
        const uriString = uri.toString();
        if (this.mockErrors.has(uriString)) {
            throw this.mockErrors.get(uriString);
        }
        const contents = this.mockFiles.get(uriString);
        if (contents === undefined) {
            throw new Error('ENOENT');
        }
        return new TextEncoder().encode(contents);
    }
    async stat(uri) {
        this.statCalls++; // Track stat calls to verify caching
        const uriString = uri.toString();
        if (this.mockErrors.has(uriString)) {
            throw this.mockErrors.get(uriString);
        }
        if (this.mockFiles.has(uriString)) {
            const contents = this.mockFiles.get(uriString);
            const mtime = this.mockMtimes.get(uriString) ?? Date.now();
            return { type: fileTypes_1.FileType.File, ctime: Date.now() - 1000, mtime, size: contents.length };
        }
        throw new Error('ENOENT');
    }
    // Required interface methods
    isWritableFileSystem() { return true; }
    createFileSystemWatcher() { throw new Error('not implemented'); }
    createDirectory(uri) {
        throw new Error('Method not implemented.');
    }
    writeFile(uri, content) {
        throw new Error('Method not implemented.');
    }
    delete(uri, options) {
        throw new Error('Method not implemented.');
    }
    rename(oldURI, newURI, options) {
        throw new Error('Method not implemented.');
    }
    copy(source, destination, options) {
        throw new Error('Method not implemented.');
    }
}
exports.MockFileSystemService = MockFileSystemService;
//# sourceMappingURL=mockFileSystemService.js.map