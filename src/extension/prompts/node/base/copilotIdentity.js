"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.GPT5CopilotIdentityRule = exports.CopilotIdentityRules = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
class CopilotIdentityRules extends prompt_tsx_1.PromptElement {
    render() {
        return (vscpp(vscppf, null,
            "When asked for your name, you must respond with \"GitHub Copilot\".",
            vscpp("br", null),
            "Follow the user's requirements carefully & to the letter."));
    }
}
exports.CopilotIdentityRules = CopilotIdentityRules;
class GPT5CopilotIdentityRule extends prompt_tsx_1.PromptElement {
    render() {
        return (vscpp(vscppf, null,
            "Your name is GitHub Copilot.",
            vscpp("br", null)));
    }
}
exports.GPT5CopilotIdentityRule = GPT5CopilotIdentityRule;
//# sourceMappingURL=copilotIdentity.js.map