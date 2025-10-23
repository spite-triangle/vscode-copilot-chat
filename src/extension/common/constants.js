"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXTENSION_ID = exports.agentsToCommands = exports.GITHUB_PLATFORM_AGENT = void 0;
exports.getAgentForIntent = getAgentForIntent;
const commonTypes_1 = require("../../platform/chat/common/commonTypes");
exports.GITHUB_PLATFORM_AGENT = 'github.copilot-dynamic.platform';
// TODO@jrieken THIS IS WEIRD. We should read this from package.json
exports.agentsToCommands = {
    ["workspace" /* Intent.Workspace */]: {
        'explain': "explain" /* Intent.Explain */,
        'edit': "edit" /* Intent.Edit */,
        'review': "review" /* Intent.Review */,
        'tests': "tests" /* Intent.Tests */,
        'fix': "fix" /* Intent.Fix */,
        'new': "new" /* Intent.New */,
        'newNotebook': "newNotebook" /* Intent.NewNotebook */,
        'semanticSearch': "semanticSearch" /* Intent.SemanticSearch */,
        'setupTests': "setupTests" /* Intent.SetupTests */,
    },
    ["vscode" /* Intent.VSCode */]: {
        'search': "search" /* Intent.Search */,
        'startDebugging': "startDebugging" /* Intent.StartDebugging */,
    },
    ["terminal" /* Intent.Terminal */]: {
        'explain': "terminalExplain" /* Intent.TerminalExplain */
    },
    ["editor" /* Intent.Editor */]: {
        'doc': "doc" /* Intent.Doc */,
        'fix': "fix" /* Intent.Fix */,
        'explain': "explain" /* Intent.Explain */,
        'review': "review" /* Intent.Review */,
        'tests': "tests" /* Intent.Tests */,
        'edit': "edit" /* Intent.Edit */,
        'generate': "generate" /* Intent.Generate */
    },
    ["chatReplay" /* Intent.ChatReplay */]: {
        'chatReplay': "chatReplay" /* Intent.ChatReplay */
    }
};
// TODO@roblourens gotta tighten up the terminology of "commands", "intents", etc...
function getAgentForIntent(intentId, location) {
    if (Object.keys(exports.agentsToCommands).includes(intentId)) {
        return { agent: intentId };
    }
    for (const [agent, commands] of Object.entries(exports.agentsToCommands)) {
        if (location === commonTypes_1.ChatLocation.Editor && agent !== "editor" /* Intent.Editor */) {
            continue;
        }
        if (Object.values(commands).includes(intentId)) {
            return { agent, command: intentId };
        }
    }
}
exports.EXTENSION_ID = 'GitHub.copilot-chat';
//# sourceMappingURL=constants.js.map