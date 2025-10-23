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
exports.summarizeToolGroup = summarizeToolGroup;
exports.divideToolsIntoGroups = divideToolsIntoGroups;
exports.divideToolsIntoExistingGroups = divideToolsIntoExistingGroups;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const JSONC = __importStar(require("jsonc-parser"));
const commonTypes_1 = require("../../../../platform/chat/common/commonTypes");
const markdown_1 = require("../../../../util/common/markdown");
const types_1 = require("../../../../util/vs/base/common/types");
const virtualToolTypes_1 = require("./virtualToolTypes");
const virtualToolsConstants_1 = require("./virtualToolsConstants");
function normalizeGroupName(name) {
    return name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
}
function deduplicateTools(tools, seen = new Set()) {
    return tools.filter(tool => {
        const had = seen.has(tool.name);
        seen.add(tool.name);
        return !had;
    });
}
function validateCategoriesWithoutToolsResponse(json, context) {
    if (!Array.isArray(json)) {
        throw new virtualToolTypes_1.SummarizerError(`Invalid response from ${context}: ${JSON.stringify(json)}`);
    }
    if (!json.every((item) => typeof item.name === 'string' && typeof item.summary === 'string')) {
        throw new virtualToolTypes_1.SummarizerError(`Invalid response from ${context}: ${JSON.stringify(json)}`);
    }
}
function validateCategorizationResponse(json, context) {
    validateCategoriesWithoutToolsResponse(json, context);
    if (!json.every((item) => Array.isArray(item.tools) && item.tools.every((t) => typeof t === 'string'))) {
        throw new virtualToolTypes_1.SummarizerError(`Invalid response from ${context}: ${JSON.stringify(json)}`);
    }
}
function processCategorizationResponse(json, toolMap) {
    const categories = json.map((item) => ({
        name: item.name,
        summary: item.summary,
        tools: item.tools.map(toolName => toolMap.get(toolName)).filter(types_1.isDefined),
    }));
    return validateAndCleanupCategories(categories);
}
function validateAndCleanupCategories(categories) {
    const byName = new Map();
    for (const category of categories) {
        const name = normalizeGroupName(category.name);
        const existing = byName.get(name);
        if (!existing) {
            byName.set(category.name, { tools: category.tools, name, summary: category.summary });
        }
        else {
            if (category.summary && category.summary !== existing.summary) {
                existing.summary = `${existing.summary}\n\n${category.summary}`;
            }
            existing.tools = existing.tools.concat(category.tools);
        }
    }
    for (const category of byName.values()) {
        category.tools = deduplicateTools(category.tools);
    }
    return [...byName.values()];
}
/**
 * Adds uncategorized tools to the categories list if any tools are missing.
 */
function addUncategorizedToolsIfNeeded(categories, toolMap) {
    const uncategorizedTools = new Map(toolMap);
    // Use toolMap keys to find uncategorized tools efficiently
    for (const cat of categories) {
        for (const tool of cat.tools) {
            uncategorizedTools.delete(tool.name);
        }
    }
    if (uncategorizedTools.size > 0) {
        categories.push({
            name: virtualToolsConstants_1.UNCATEGORIZED_TOOLS_GROUP_NAME,
            summary: virtualToolsConstants_1.UNCATEGORIZED_TOOLS_GROUP_SUMMARY,
            tools: [...uncategorizedTools.values()],
        });
    }
    return categories;
}
async function summarizeToolGroup(endpoint, tools, token) {
    const renderer = new prompt_tsx_1.PromptRenderer(endpoint, GeneralSummaryPrompt, { tools }, endpoint.acquireTokenizer());
    const result = await renderer.render(undefined, token);
    const json = await getJsonResponse(endpoint, result, token);
    if (!json) {
        return undefined;
    }
    const jsonArr = [json];
    validateCategoriesWithoutToolsResponse(jsonArr, 'categorizer');
    return { ...jsonArr[0], tools: deduplicateTools(tools), name: normalizeGroupName(jsonArr[0].name) };
}
async function divideToolsIntoGroups(endpoint, tools, token) {
    const renderer = new prompt_tsx_1.PromptRenderer(endpoint, CategorizerSummaryPrompt, { tools }, endpoint.acquireTokenizer());
    const result = await renderer.render(undefined, token);
    const json = await getJsonResponse(endpoint, result, token);
    if (!json) {
        return undefined;
    }
    validateCategorizationResponse(json, 'categorizer');
    const toolMap = new Map(tools.map(tool => [tool.name, tool]));
    let categories = processCategorizationResponse(json, toolMap);
    // Check if any tools were forgotten by the model
    const categorizedToolNames = new Set(categories.flatMap((cat) => cat.tools.map((tool) => tool.name)));
    const uncategorizedTools = tools.filter(tool => !categorizedToolNames.has(tool.name));
    if (uncategorizedTools.length > 0) {
        // Try once more using the existing groups function to categorize the missed tools
        const retryResult = await divideToolsIntoExistingGroups(endpoint, categories, uncategorizedTools, token);
        if (retryResult) {
            categories = retryResult;
            // Use the helper to add any remaining uncategorized tools
            categories = addUncategorizedToolsIfNeeded(categories, toolMap);
        }
        else {
            // If retry failed, add all uncategorized tools to an "uncategorized" group
            categories = addUncategorizedToolsIfNeeded(categories, toolMap);
        }
    }
    return categories;
}
/**
 * Categorizes new tools into existing groups or creates new groups as appropriate.
 * This function takes a set of existing tool categories and new tools, then asks the AI model
 * to decide whether each new tool fits into an existing category or requires a new category.
 *
 * @param endpoint The chat endpoint to use for AI categorization
 * @param existingGroups The current tool categories with their tools
 * @param newTools The new tools that need to be categorized
 * @param token Cancellation token
 * @returns Promise that resolves to updated tool categories including both existing and new tools
 */
async function divideToolsIntoExistingGroups(endpoint, existingGroups, newTools, token) {
    // todo: try using embeddings here to sort high-confidence tools automatically
    const renderer = new prompt_tsx_1.PromptRenderer(endpoint, ExistingGroupCategorizerPrompt, { existingGroups, newTools }, endpoint.acquireTokenizer());
    const result = await renderer.render(undefined, token);
    const json = await getJsonResponse(endpoint, result, token);
    if (!json) {
        return undefined;
    }
    validateCategorizationResponse(json, 'existing group categorizer');
    // Create a map of all available tools (existing + new) for lookup
    const allTools = [...existingGroups.flatMap(group => group.tools), ...newTools];
    const toolMap = new Map(allTools.map(tool => [tool.name, tool]));
    const categories = processCategorizationResponse(json, toolMap);
    // Use the helper to add any uncategorized tools
    return addUncategorizedToolsIfNeeded(categories, toolMap);
}
class ToolInformation extends prompt_tsx_1.PromptElement {
    render() {
        const { tool } = this.props;
        return vscpp(vscppf, null,
            `<tool name=${JSON.stringify(tool.name)}>${tool.description}</tool>`,
            vscpp("br", null));
    }
}
class GeneralSummaryPrompt extends prompt_tsx_1.PromptElement {
    render() {
        return vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, null,
                "Context: There are many tools available for a user. However, the number of tools can be large, and it is not always practical to present all of them at once. We need to create a summary of them that accurately reflects the capabilities they provide.",
                vscpp("br", null),
                vscpp("br", null),
                "The user present you with the tools available to them, and you must create a summary of the tools that is accurate and comprehensive. The summary should include the capabilities of the tools and when they should be used.",
                vscpp("br", null)),
            vscpp(prompt_tsx_1.UserMessage, null,
                this.props.tools.map(tool => vscpp(ToolInformation, { tool: tool })),
                vscpp("br", null),
                vscpp("br", null),
                "Your response must follow the JSON schema:",
                vscpp("br", null),
                vscpp("br", null),
                "```",
                vscpp("br", null),
                JSON.stringify({
                    type: 'object',
                    required: ['name', 'summary'],
                    properties: {
                        summary: {
                            type: 'string',
                            description: 'A summary of the tool capabilities, including their capabilities and how they can be used together. This may be up to five pararaphs long, be careful not to leave out important details.',
                            example: 'These tools assist with authoring the "foo" language. They can provide diagnostics, run tests, and provide refactoring actions for the foo language.'
                        },
                        name: {
                            type: 'string',
                            description: 'A short name for the group. It may only contain the characters a-z, A-Z, 0-9, and underscores.',
                            example: 'foo_language_tools'
                        }
                    }
                }, null, 2)));
    }
}
class CategorizerSummaryPrompt extends prompt_tsx_1.PromptElement {
    render() {
        return vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, null,
                "Context: There are many tools available for a user. However, the number of tools can be large, and it is not always practical to present all of them at once. We need to create logical groups for the user to pick from at a glance.",
                vscpp("br", null),
                vscpp("br", null),
                "The user present you with the tools available to them, and you must group them into logical categories and provide a summary of each one. The summary should include the capabilities of the tools and when they should be used. Every tool MUST be a part of EXACTLY one category. Category names in your response MUST be unique\u2014do not reuse the same name for different categories. If two categories would share a base name, append a short, descriptive suffix to disambiguate (e.g., python_tools_testing vs python_tools_packaging).",
                vscpp("br", null)),
            vscpp(prompt_tsx_1.UserMessage, null,
                this.props.tools.map(tool => vscpp(ToolInformation, { tool: tool })),
                vscpp("br", null),
                vscpp("br", null),
                "You MUST make sure every tool is part of a category. Your response must follow the JSON schema:",
                vscpp("br", null),
                vscpp("br", null),
                "```",
                vscpp("br", null),
                JSON.stringify({
                    type: 'array',
                    items: {
                        type: 'object',
                        required: ['name', 'tools', 'summary'],
                        properties: {
                            name: {
                                type: 'string',
                                description: 'A short, unique name for the category across this response. It may only contain the characters a-z, A-Z, 0-9, and underscores. If a potential collision exists, add a short suffix to keep names unique (e.g., _testing, _packaging).',
                                example: 'foo_language_tools'
                            },
                            tools: {
                                type: 'array',
                                description: 'The tool names that are part of this category.',
                                items: { type: 'string' },
                            },
                            summary: {
                                type: 'string',
                                description: 'A summary of the tool capabilities, including their capabilities and how they can be used together. This may be up to five pararaphs long, be careful not to leave out important details.',
                                example: 'These tools assist with authoring the "foo" language. They can provide diagnostics, run tests, and provide refactoring actions for the foo language.'
                            },
                        }
                    }
                }, null, 2)));
    }
}
class ExistingGroupInformation extends prompt_tsx_1.PromptElement {
    render() {
        const { group } = this.props;
        return vscpp(vscppf, null,
            `<group name=${JSON.stringify(group.name)}>`,
            vscpp("br", null),
            `<summary>${group.summary}</summary>`,
            vscpp("br", null),
            group.tools.map(t => `<tool name=${JSON.stringify(t.name)} />\n`),
            `</group>`,
            vscpp("br", null));
    }
}
class ExistingGroupCategorizerPrompt extends prompt_tsx_1.PromptElement {
    render() {
        return vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, null,
                "Context: There are existing tool categories that have been previously established. New tools have become available and need to be categorized. You must decide whether each new tool fits into an existing category or requires a new category to be created.",
                vscpp("br", null),
                vscpp("br", null),
                "The user will provide you with the existing categories and their current tools, as well as the new tools that need to be categorized. You must assign each new tool to either an existing category (if it fits well) or create new categories as needed. You should also return all existing tools in their current categories unless there's a compelling reason to reorganize them.",
                vscpp("br", null),
                vscpp("br", null),
                "Every tool (both existing and new) MUST be part of EXACTLY one category in your response. Category names MUST be unique within the response. If a new category would conflict with an existing category name, choose a distinct, disambiguating name.",
                vscpp("br", null)),
            vscpp(prompt_tsx_1.UserMessage, null,
                "**Existing Categories:**",
                vscpp("br", null),
                this.props.existingGroups.map(group => vscpp(ExistingGroupInformation, { group: group })),
                vscpp("br", null),
                "**New Tools to Categorize:**",
                vscpp("br", null),
                this.props.newTools.map(tool => vscpp(ToolInformation, { tool: tool })),
                vscpp("br", null),
                vscpp("br", null),
                "Instructions:",
                vscpp("br", null),
                "1. For each new tool, determine if it fits well into an existing category or if it needs a new category",
                vscpp("br", null),
                "2. Keep existing tools in their current categories unless there's a strong reason to move them",
                vscpp("br", null),
                "3. Create new categories only when new tools don't fit well into existing ones",
                vscpp("br", null),
                "4. Every tool (existing + new) MUST appear in exactly one category",
                vscpp("br", null),
                vscpp("br", null),
                "Your response must follow the JSON schema:",
                vscpp("br", null),
                vscpp("br", null),
                "```",
                vscpp("br", null),
                JSON.stringify({
                    type: 'array',
                    items: {
                        type: 'object',
                        required: ['name', 'tools', 'summary'],
                        properties: {
                            name: {
                                type: 'string',
                                description: 'A short, unique name for the category across this response. It may only contain the characters a-z, A-Z, 0-9, and underscores. Do not reuse names; add a short suffix if needed to avoid collisions.',
                                example: 'foo_language_tools'
                            },
                            tools: {
                                type: 'array',
                                description: 'The tool names that are part of this category.',
                                items: { type: 'string' },
                            },
                            summary: {
                                type: 'string',
                                description: 'A summary of the tool capabilities, including their capabilities and how they can be used together. This may be up to five pararaphs long, be careful not to leave out important details.',
                                example: 'These tools assist with authoring the "foo" language. They can provide diagnostics, run tests, and provide refactoring actions for the foo language.'
                            },
                        }
                    }
                }, null, 2)));
    }
}
async function getJsonResponse(endpoint, rendered, token) {
    const result = await endpoint.makeChatRequest('summarizeVirtualTools', rendered.messages, undefined, token, commonTypes_1.ChatLocation.Other);
    if (result.type !== commonTypes_1.ChatFetchResponseType.Success) {
        return undefined;
    }
    for (const block of (0, markdown_1.extractCodeBlocks)(result.value)) {
        try {
            return JSONC.parse(block.code);
        }
        catch {
            // ignored
        }
    }
    const idx = result.value.indexOf('{');
    return JSONC.parse(result.value.slice(idx)) || undefined;
}
//# sourceMappingURL=virtualToolSummarizer.js.map