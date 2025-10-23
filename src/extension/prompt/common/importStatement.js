"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.isImportStatement = isImportStatement;
function isImportStatement(line, languageId) {
    switch (languageId) {
        case 'java':
            return !!line.match(/^\s*import\s/);
        case 'typescript':
        case 'typescriptreact':
        case 'javascript':
        case 'javascriptreact':
            return !!line.match(/^\s*import[\s{*]|^\s*[var|const|let].*=\s*require\(/);
        case 'php':
            return !!line.match(/^\s*use/);
        case 'rust':
            return !!line.match(/^\s*use\s+[\w:{}, ]+\s*(as\s+\w+)?;/);
        case 'python':
            return !!line.match(/^\s*from\s+[\w.]+\s+import\s+[\w, *]+$/)
                || !!line.match(/^\s*import\s+[\w, ]+$/);
        default:
            return false;
    }
}
//# sourceMappingURL=importStatement.js.map