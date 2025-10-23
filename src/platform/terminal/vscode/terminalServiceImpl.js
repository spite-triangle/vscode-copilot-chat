"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerminalServiceImpl = void 0;
const vscode_1 = require("vscode");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const terminalBufferListener_1 = require("./terminalBufferListener");
class TerminalServiceImpl extends lifecycle_1.Disposable {
    constructor() {
        super();
        for (const l of (0, terminalBufferListener_1.installTerminalBufferListeners)()) {
            this._register(l);
        }
    }
    get terminals() {
        return vscode_1.window.terminals;
    }
    get onDidChangeTerminalShellIntegration() {
        return vscode_1.window.onDidChangeTerminalShellIntegration;
    }
    get onDidEndTerminalShellExecution() {
        return vscode_1.window.onDidEndTerminalShellExecution;
    }
    get onDidCloseTerminal() {
        return vscode_1.window.onDidCloseTerminal;
    }
    get onDidWriteTerminalData() {
        return vscode_1.window.onDidWriteTerminalData;
    }
    createTerminal(name, shellPath, shellArgs) {
        const terminal = vscode_1.window.createTerminal(name, shellPath, shellArgs);
        return terminal;
    }
    getBufferForTerminal(terminal, maxChars) {
        return (0, terminalBufferListener_1.getBufferForTerminal)(terminal, maxChars);
    }
    async getBufferWithPid(pid, maxChars) {
        let terminal;
        for (const t of this.terminals) {
            const tPid = await t.processId;
            if (tPid === pid) {
                terminal = t;
                break;
            }
        }
        if (terminal) {
            return this.getBufferForTerminal(terminal, maxChars);
        }
        return '';
    }
    getLastCommandForTerminal(terminal) {
        return (0, terminalBufferListener_1.getLastCommandForTerminal)(terminal);
    }
    get terminalBuffer() {
        return (0, terminalBufferListener_1.getActiveTerminalBuffer)();
    }
    get terminalLastCommand() {
        return (0, terminalBufferListener_1.getActiveTerminalLastCommand)();
    }
    get terminalSelection() {
        return (0, terminalBufferListener_1.getActiveTerminalSelection)();
    }
    get terminalShellType() {
        return (0, terminalBufferListener_1.getActiveTerminalShellType)();
    }
}
exports.TerminalServiceImpl = TerminalServiceImpl;
//# sourceMappingURL=terminalServiceImpl.js.map