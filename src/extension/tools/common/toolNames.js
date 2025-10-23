"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.byokEditToolNamesToToolNames = exports.ContributedToolName = exports.ToolName = void 0;
exports.getContributedToolName = getContributedToolName;
exports.getToolName = getToolName;
exports.mapContributedToolNamesInString = mapContributedToolNamesInString;
exports.mapContributedToolNamesInSchema = mapContributedToolNamesInSchema;
const objects_1 = require("../../../util/vs/base/common/objects");
var ToolName;
(function (ToolName) {
    ToolName["ApplyPatch"] = "apply_patch";
    ToolName["Codebase"] = "semantic_search";
    ToolName["VSCodeAPI"] = "get_vscode_api";
    ToolName["TestFailure"] = "test_failure";
    ToolName["RunTests"] = "run_tests";
    ToolName["FindFiles"] = "file_search";
    ToolName["FindTextInFiles"] = "grep_search";
    ToolName["ReadFile"] = "read_file";
    ToolName["ListDirectory"] = "list_dir";
    ToolName["GetErrors"] = "get_errors";
    ToolName["GetScmChanges"] = "get_changed_files";
    ToolName["UpdateUserPreferences"] = "update_user_preferences";
    ToolName["ReadProjectStructure"] = "read_project_structure";
    ToolName["CreateNewWorkspace"] = "create_new_workspace";
    ToolName["CreateNewJupyterNotebook"] = "create_new_jupyter_notebook";
    ToolName["SearchWorkspaceSymbols"] = "search_workspace_symbols";
    ToolName["Usages"] = "list_code_usages";
    ToolName["EditFile"] = "insert_edit_into_file";
    ToolName["CreateFile"] = "create_file";
    ToolName["ReplaceString"] = "replace_string_in_file";
    ToolName["MultiReplaceString"] = "multi_replace_string_in_file";
    ToolName["EditNotebook"] = "edit_notebook_file";
    ToolName["RunNotebookCell"] = "run_notebook_cell";
    ToolName["GetNotebookSummary"] = "copilot_getNotebookSummary";
    ToolName["ReadCellOutput"] = "read_notebook_cell_output";
    ToolName["InstallExtension"] = "install_extension";
    ToolName["Think"] = "think";
    ToolName["FetchWebPage"] = "fetch_webpage";
    ToolName["FindTestFiles"] = "test_search";
    ToolName["GetProjectSetupInfo"] = "get_project_setup_info";
    ToolName["SearchViewResults"] = "get_search_view_results";
    ToolName["DocInfo"] = "get_doc_info";
    ToolName["GithubRepo"] = "github_repo";
    ToolName["SimpleBrowser"] = "open_simple_browser";
    ToolName["CreateDirectory"] = "create_directory";
    ToolName["RunVscodeCmd"] = "run_vscode_command";
    ToolName["CoreManageTodoList"] = "manage_todo_list";
    ToolName["CoreRunInTerminal"] = "run_in_terminal";
    ToolName["CoreGetTerminalOutput"] = "get_terminal_output";
    ToolName["CoreTerminalSelection"] = "terminal_selection";
    ToolName["CoreTerminalLastCommand"] = "terminal_last_command";
    ToolName["CoreCreateAndRunTask"] = "create_and_run_task";
    ToolName["CoreRunTask"] = "run_task";
    ToolName["CoreGetTaskOutput"] = "get_task_output";
    ToolName["CoreRunTest"] = "runTests";
    ToolName["ToolReplay"] = "tool_replay";
    ToolName["EditFilesPlaceholder"] = "edit_files";
    ToolName["ExecutePrompt"] = "execute_prompt";
    ToolName["CoreConfirmationTool"] = "vscode_get_confirmation";
})(ToolName || (exports.ToolName = ToolName = {}));
var ContributedToolName;
(function (ContributedToolName) {
    ContributedToolName["ApplyPatch"] = "copilot_applyPatch";
    ContributedToolName["Codebase"] = "copilot_searchCodebase";
    ContributedToolName["SearchWorkspaceSymbols"] = "copilot_searchWorkspaceSymbols";
    ContributedToolName["Usages"] = "copilot_listCodeUsages";
    ContributedToolName["UpdateUserPreferences"] = "copilot_updateUserPreferences";
    ContributedToolName["VSCodeAPI"] = "copilot_getVSCodeAPI";
    ContributedToolName["TestFailure"] = "copilot_testFailure";
    /** @deprecated moving to core soon */
    ContributedToolName["RunTests"] = "copilot_runTests1";
    ContributedToolName["FindFiles"] = "copilot_findFiles";
    ContributedToolName["FindTextInFiles"] = "copilot_findTextInFiles";
    ContributedToolName["ReadFile"] = "copilot_readFile";
    ContributedToolName["ListDirectory"] = "copilot_listDirectory";
    ContributedToolName["GetErrors"] = "copilot_getErrors";
    ContributedToolName["DocInfo"] = "copilot_getDocInfo";
    ContributedToolName["GetScmChanges"] = "copilot_getChangedFiles";
    ContributedToolName["ReadProjectStructure"] = "copilot_readProjectStructure";
    ContributedToolName["CreateNewWorkspace"] = "copilot_createNewWorkspace";
    ContributedToolName["CreateNewJupyterNotebook"] = "copilot_createNewJupyterNotebook";
    ContributedToolName["EditFile"] = "copilot_insertEdit";
    ContributedToolName["CreateFile"] = "copilot_createFile";
    ContributedToolName["ReplaceString"] = "copilot_replaceString";
    ContributedToolName["MultiReplaceString"] = "copilot_multiReplaceString";
    ContributedToolName["EditNotebook"] = "copilot_editNotebook";
    ContributedToolName["RunNotebookCell"] = "copilot_runNotebookCell";
    ContributedToolName["GetNotebookSummary"] = "copilot_getNotebookSummary";
    ContributedToolName["ReadCellOutput"] = "copilot_readNotebookCellOutput";
    ContributedToolName["InstallExtension"] = "copilot_installExtension";
    ContributedToolName["Think"] = "copilot_think";
    ContributedToolName["FetchWebPage"] = "copilot_fetchWebPage";
    ContributedToolName["FindTestFiles"] = "copilot_findTestFiles";
    ContributedToolName["GetProjectSetupInfo"] = "copilot_getProjectSetupInfo";
    ContributedToolName["SearchViewResults"] = "copilot_getSearchResults";
    ContributedToolName["GithubRepo"] = "copilot_githubRepo";
    ContributedToolName["CreateAndRunTask"] = "copilot_createAndRunTask";
    ContributedToolName["SimpleBrowser"] = "copilot_openSimpleBrowser";
    ContributedToolName["CreateDirectory"] = "copilot_createDirectory";
    ContributedToolName["RunVscodeCmd"] = "copilot_runVscodeCommand";
    ContributedToolName["ToolReplay"] = "copilot_toolReplay";
    ContributedToolName["EditFilesPlaceholder"] = "copilot_editFiles";
    ContributedToolName["ExecutePrompt"] = "execute_prompt";
})(ContributedToolName || (exports.ContributedToolName = ContributedToolName = {}));
exports.byokEditToolNamesToToolNames = {
    'find-replace': ToolName.ReplaceString,
    'multi-find-replace': ToolName.MultiReplaceString,
    'apply-patch': ToolName.ApplyPatch,
    'code-rewrite': ToolName.EditFile,
};
const toolNameToContributedToolNames = new Map();
const contributedToolNameToToolNames = new Map();
for (const [contributedNameKey, contributedName] of Object.entries(ContributedToolName)) {
    const toolName = ToolName[contributedNameKey];
    if (toolName) {
        toolNameToContributedToolNames.set(toolName, contributedName);
        contributedToolNameToToolNames.set(contributedName, toolName);
    }
}
function getContributedToolName(name) {
    return toolNameToContributedToolNames.get(name) ?? name;
}
function getToolName(name) {
    return contributedToolNameToToolNames.get(name) ?? name;
}
function mapContributedToolNamesInString(str) {
    contributedToolNameToToolNames.forEach((value, key) => {
        const re = new RegExp(`\\b${key}\\b`, 'g');
        str = str.replace(re, value);
    });
    return str;
}
function mapContributedToolNamesInSchema(inputSchema) {
    return (0, objects_1.cloneAndChange)(inputSchema, value => typeof value === 'string' ? mapContributedToolNamesInString(value) : undefined);
}
//# sourceMappingURL=toolNames.js.map