"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadFile = loadFile;
exports.inlineEditsFixture = inlineEditsFixture;
const fs_1 = require("fs");
const posix_1 = require("path/posix");
const stestUtil_1 = require("../stestUtil");
/**
 * This function allows [tools](https://github.com/microsoft/vscode-ts-file-path-support/tree/main) to inline/extract the file content.
 */
function loadFile(data) {
    let fileName = undefined;
    let filePath = undefined;
    let pathWithinFixturesDir = undefined;
    let fileContents;
    if ('fileContents' in data) {
        fileName = data.fileName;
        fileContents = data.fileContents;
    }
    else {
        if (typeof data.filePath === 'string') {
            filePath = data.filePath;
            filePath = filePath;
        }
        else {
            filePath = data.filePath.fullPath;
            pathWithinFixturesDir = data.filePath.pathWithinFixturesDir;
        }
        fileContents = (0, fs_1.readFileSync)(filePath, 'utf8');
    }
    return { fileContents, fileName, filePath, pathWithinFixturesDir };
}
function inlineEditsFixture(pathWithinFixturesDir) {
    const fullPath = (0, posix_1.join)((0, stestUtil_1.getFixturesDir)(), 'inlineEdits', pathWithinFixturesDir);
    return {
        fullPath,
        pathWithinFixturesDir,
    };
}
//# sourceMappingURL=fileLoading.js.map