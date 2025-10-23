"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.UNCATEGORIZED_TOOLS_GROUP_SUMMARY = exports.UNCATEGORIZED_TOOLS_GROUP_NAME = exports.MAX_CATEGORIZATION_RETRIES = exports.MIN_TOOLSET_SIZE_TO_GROUP = exports.GROUP_WITHIN_TOOLSET = exports.TRIM_THRESHOLD = exports.EXPAND_UNTIL_COUNT = exports.START_GROUPING_AFTER_TOOL_COUNT = void 0;
const configurationService_1 = require("../../../../platform/configuration/common/configurationService");
/** Point after which we'll start grouping tools */
exports.START_GROUPING_AFTER_TOOL_COUNT = configurationService_1.HARD_TOOL_LIMIT / 2; // 64, currently
/** Re-expand groups until we have at least this many tools. */
exports.EXPAND_UNTIL_COUNT = exports.START_GROUPING_AFTER_TOOL_COUNT;
/**
 * If we have an opportunity to re-collapse during summarization, do so if the
 * number of tools exceeds this threshold.
 */
exports.TRIM_THRESHOLD = configurationService_1.HARD_TOOL_LIMIT * 3 / 4; // 96, currently
/**
 * By default we group all MCP/extension tools together. If the number of tools
 * the toolset contains is above this limit, we'll instead categorize tools
 * within the toolset into groups.
 */
exports.GROUP_WITHIN_TOOLSET = configurationService_1.HARD_TOOL_LIMIT / 8; // 16, currently
/** Minimum number of tools in a toolset to group, vs always just including them individually. */
exports.MIN_TOOLSET_SIZE_TO_GROUP = 2;
/** Max number of times to retrying categorization in the event of failures. */
exports.MAX_CATEGORIZATION_RETRIES = 3;
/** Name for the group containing tools that could not be automatically categorized */
exports.UNCATEGORIZED_TOOLS_GROUP_NAME = 'uncategorized_tools';
/** Summary for the group containing tools that could not be automatically categorized */
exports.UNCATEGORIZED_TOOLS_GROUP_SUMMARY = 'Tools that could not be automatically categorized into existing groups.';
//# sourceMappingURL=virtualToolsConstants.js.map