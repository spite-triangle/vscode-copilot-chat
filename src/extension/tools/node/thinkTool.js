"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vscodeTypes_1 = require("../../../vscodeTypes");
const toolNames_1 = require("../common/toolNames");
const toolsRegistry_1 = require("../common/toolsRegistry");
const toolUtils_1 = require("./toolUtils");
class ThinkTool {
    static { this.toolName = toolNames_1.ToolName.Think; }
    constructor() { }
    async invoke(options, token) {
        const thoughts = options.input.thoughts;
        if (!thoughts) {
            throw new Error('Invalid arguments');
        }
        (0, toolUtils_1.checkCancellation)(token);
        return new vscodeTypes_1.LanguageModelToolResult([
            new vscodeTypes_1.LanguageModelTextPart(thoughts)
        ]);
    }
    async prepareInvocation(options, token) {
        return {
            invocationMessage: 'Thinking'
        };
    }
}
toolsRegistry_1.ToolRegistry.registerTool(ThinkTool);
//# sourceMappingURL=thinkTool.js.map