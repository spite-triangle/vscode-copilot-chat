"use strict";
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
exports.parseSettingsAndCommands = parseSettingsAndCommands;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const l10n = __importStar(require("@vscode/l10n"));
const markdown_1 = require("../../../../util/common/markdown");
async function parseSettingsAndCommands(workbenchService, json) {
    const codeBlock = (0, markdown_1.extractCodeBlocks)(json);
    for (const block of codeBlock) {
        if (block.language !== 'json' && block.language !== '') {
            return [{ commandToRun: undefined, showCodeBlock: true }];
        }
        let parsed = [];
        try {
            const removeTrailingCommas = block.code.replace(/,\s*([\]}])/g, '$1');
            parsed = JSON.parse(removeTrailingCommas);
        }
        catch (error) {
            return [];
        }
        if (!parsed.length) {
            return [];
        }
        const parsedMetadata = [];
        const hasSettings = parsed.some(item => item.type === 'setting');
        const hasCommands = parsed.some(item => item.type === 'command');
        if (hasSettings) {
            const allSettings = await workbenchService.getAllSettings();
            // skip settings which are not found
            parsed = parsed.filter(item => {
                if (item.details) {
                    return Object.keys(allSettings).includes(item.details.key);
                }
                return true;
            });
            // combine all settings into a single code block
            const codeBlock = `\`\`\`\n${JSON.stringify(parsed.reduce((acc, item) => {
                if (item.details) {
                    acc[item.details.key] = item.details.value;
                }
                return acc;
            }, {}), null, 2)}\n\`\`\``;
            const settingsQuery = parsed.reduce((acc, item) => {
                if (item.details) {
                    acc += `@id:${item.details.key} `;
                }
                return acc;
            }, '');
            parsedMetadata.push({
                commandToRun: {
                    command: 'workbench.action.openSettings',
                    arguments: [settingsQuery],
                    title: l10n.t("Show in Settings Editor"),
                },
                showCodeBlock: true,
                codeBlock: codeBlock,
            });
            return parsedMetadata;
        }
        if (hasCommands) {
            const item = parsed[0];
            if (item.details?.key === 'workbench.extensions.search' || item.details?.key === 'workbench.extensions.installExtension') {
                const args = (Array.isArray(item.details.value) ? item.details.value : [item.details.value]).filter((arg) => typeof arg === 'string');
                // We only know how to handle 1 arguments
                if (args.length === 1) {
                    const KNOWN_QUERIES = [
                        'featured',
                        'popular',
                        'recentlyPublished',
                        'recommended',
                        'updates',
                        'builtin',
                        'enabled',
                        'disabled',
                        'installed',
                        'workspaceUnsupported',
                    ];
                    // If the arg contains a colon, assume it is a tag
                    if (args[0].includes(':') && !args[0].startsWith('@')) {
                        args[0] = `@${args[0]}`;
                    }
                    // If the arg is a known query, use it
                    else if (KNOWN_QUERIES.includes(args[0])) {
                        args[0] = `@${args[0]}`;
                    }
                }
                parsedMetadata.push({
                    commandToRun: {
                        command: 'workbench.extensions.search',
                        arguments: args,
                        title: l10n.t("Search Extension Marketplace"),
                    }, showCodeBlock: false,
                });
                return parsedMetadata;
            }
            else {
                const allcommands = (await workbenchService.getAllCommands(/* filterByPreCondition */ true));
                const commandItem = allcommands.find(commandItem => commandItem.command === item.details?.key);
                if (!commandItem) {
                    return [];
                }
                parsedMetadata.push({
                    commandToRun: {
                        command: 'workbench.action.quickOpen',
                        arguments: [`>${commandItem.label ?? ''}`],
                        title: parsedMetadata.length > 1 ? l10n.t('Show "{0}"', commandItem.label ?? '') : l10n.t("Show in Command Palette"),
                    }, showCodeBlock: false,
                });
                return parsedMetadata;
            }
        }
    }
    return [{ commandToRun: undefined, showCodeBlock: true }];
}
//# sourceMappingURL=vscodeContext.js.map