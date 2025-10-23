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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var VirtualToolGrouper_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VirtualToolGrouper = void 0;
const configurationService_1 = require("../../../../platform/configuration/common/configurationService");
const embeddingsComputer_1 = require("../../../../platform/embeddings/common/embeddingsComputer");
const endpointProvider_1 = require("../../../../platform/endpoint/common/endpointProvider");
const logService_1 = require("../../../../platform/log/common/logService");
const nullExperimentationService_1 = require("../../../../platform/telemetry/common/nullExperimentationService");
const telemetry_1 = require("../../../../platform/telemetry/common/telemetry");
const telemetryCorrelationId_1 = require("../../../../util/common/telemetryCorrelationId");
const collections_1 = require("../../../../util/vs/base/common/collections");
const iterator_1 = require("../../../../util/vs/base/common/iterator");
const stopwatch_1 = require("../../../../util/vs/base/common/stopwatch");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const toolEmbeddingsCache_1 = require("./toolEmbeddingsCache");
const virtualTool_1 = require("./virtualTool");
const virtualToolSummarizer_1 = require("./virtualToolSummarizer");
const virtualToolTypes_1 = require("./virtualToolTypes");
const Constant = __importStar(require("./virtualToolsConstants"));
const BUILT_IN_GROUP = 'builtin';
const CATEGORIZATION_ENDPOINT = "gpt-4o-mini" /* CHAT_MODEL.GPT4OMINI */;
const SUMMARY_PREFIX = 'Call this tool when you need access to a new category of tools. The category of tools is described as follows:\n\n';
const SUMMARY_SUFFIX = '\n\nBe sure to call this tool if you need a capability related to the above.';
let VirtualToolGrouper = VirtualToolGrouper_1 = class VirtualToolGrouper {
    constructor(_endpointProvider, _cache, _telemetryService, _logService, embeddingsComputer, _configurationService, _expService, _instantiationService) {
        this._endpointProvider = _endpointProvider;
        this._cache = _cache;
        this._telemetryService = _telemetryService;
        this._logService = _logService;
        this.embeddingsComputer = embeddingsComputer;
        this._configurationService = _configurationService;
        this._expService = _expService;
        this.toolEmbeddingsComputer = _instantiationService.createInstance(toolEmbeddingsCache_1.ToolEmbeddingsComputer);
    }
    get virtualToolEmbeddingRankingEnabled() {
        return this._configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.VirtualToolEmbeddingRanking, this._expService);
    }
    async addGroups(query, root, tools, token) {
        // If there's no need to group tools, just add them all directly;
        if (tools.length < Constant.START_GROUPING_AFTER_TOOL_COUNT) {
            root.contents = tools;
            return;
        }
        const byToolset = (0, collections_1.groupBy)(tools, t => {
            if (t.source instanceof vscodeTypes_1.LanguageModelToolExtensionSource) {
                return 'ext_' + t.source.id;
            }
            else if (t.source instanceof vscodeTypes_1.LanguageModelToolMCPSource) {
                return 'mcp_' + t.source.label;
            }
            else {
                return BUILT_IN_GROUP;
            }
        });
        const previousGroups = new Map();
        const previousCategorizations = new Map();
        for (const tool of root.all()) {
            if (tool instanceof virtualTool_1.VirtualTool) {
                previousGroups.set(tool.name, tool);
                if (tool.metadata?.toolsetKey) {
                    previousCategorizations.set(tool.metadata.toolsetKey, tool.metadata.groups);
                }
            }
        }
        const predictedToolsSw = new stopwatch_1.StopWatch();
        const predictedToolsPromise = this.virtualToolEmbeddingRankingEnabled && this._getPredictedTools(query, tools, token).then(tools => ({ tools, durationMs: predictedToolsSw.elapsed() }));
        const grouped = await Promise.all(Object.entries(byToolset).map(([key, tools]) => {
            if (key === BUILT_IN_GROUP) {
                return tools;
            }
            else {
                return this._generateGroupsFromToolset(key, tools, previousCategorizations.get(key), token);
            }
        }));
        this._cache.flush();
        root.contents = VirtualToolGrouper_1.deduplicateGroups(grouped.flat());
        for (const tool of root.all()) {
            if (tool instanceof virtualTool_1.VirtualTool) {
                const prev = previousGroups.get(tool.name);
                if (prev) {
                    tool.isExpanded = prev.isExpanded;
                    tool.metadata.wasExpandedByDefault = prev.metadata.wasExpandedByDefault;
                    tool.lastUsedOnTurn = prev.lastUsedOnTurn;
                }
            }
        }
        await this._reExpandTools(root, predictedToolsPromise);
    }
    async recomputeEmbeddingRankings(query, root, token) {
        if (!this.virtualToolEmbeddingRankingEnabled) {
            return;
        }
        const predictedToolsSw = new stopwatch_1.StopWatch();
        await this._reExpandTools(root, this._getPredictedTools(query, [...root.tools()], token).then(tools => ({
            tools,
            durationMs: predictedToolsSw.elapsed()
        })));
    }
    _addPredictedToolsGroup(root, predictedTools) {
        const newGroup = new virtualTool_1.VirtualTool(virtualTool_1.EMBEDDINGS_GROUP_NAME, 'Tools with high predicted relevancy for this query', Infinity, {
            toolsetKey: virtualTool_1.EMBEDDINGS_GROUP_NAME,
            wasExpandedByDefault: true,
            canBeCollapsed: false,
            groups: [],
        });
        newGroup.isExpanded = true;
        for (const tool of predictedTools) {
            newGroup.contents.push(tool);
        }
        const idx = root.contents.findIndex(t => t.name === virtualTool_1.EMBEDDINGS_GROUP_NAME);
        if (idx >= 0) {
            root.contents[idx] = newGroup;
        }
        else {
            root.contents.unshift(newGroup);
        }
    }
    async _reExpandTools(root, predictedToolsPromise) {
        if (predictedToolsPromise) {
            // Aggressively expand groups with predicted tools up to hard limit
            const sw = new stopwatch_1.StopWatch();
            let error;
            let computeMs;
            try {
                const { tools, durationMs } = await predictedToolsPromise;
                computeMs = durationMs;
                this._addPredictedToolsGroup(root, tools);
            }
            catch (e) {
                error = e;
            }
            finally {
                // Telemetry for predicted tool re-expansion
                /* __GDPR__
                    "virtualTools.expandEmbedding" : {
                        "owner": "connor4312",
                        "comment": "Expansion of virtual tool groups using embedding-based ranking.",
                        "error": { "classification": "CallstackOrException", "purpose": "PerformanceAndHealth", "comment": "Error message if expansion failed" },
                        "blockingMs": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Blocking duration of the expansion operation in milliseconds", "isMeasurement": true },
                        "computeMs": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Duration of the expansion operation in milliseconds", "isMeasurement": true },
                        "hadError": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Whether the operation had an error", "isMeasurement": true }
                    }
                */
                this._telemetryService.sendMSFTTelemetryEvent('virtualTools.expandEmbedding', { error: error ? error.message : undefined }, {
                    blockingMs: sw.elapsed(),
                    computeMs,
                    hadError: error ? 1 : 0,
                });
            }
        }
        this._reExpandToolsToHitBudget(root, g => g.contents.length);
    }
    static deduplicateGroups(grouped) {
        const seen = new Map();
        for (const item of grouped) {
            const saw = seen.get(item.name);
            if (!saw) {
                seen.set(item.name, item);
                continue;
            }
            if (saw instanceof virtualTool_1.VirtualTool && saw.metadata.possiblePrefix) {
                seen.delete(saw.name);
                const replacement = saw.cloneWithPrefix(saw.metadata.possiblePrefix);
                seen.set(replacement.name, replacement);
                seen.set(item.name, item);
            }
            else if (item instanceof virtualTool_1.VirtualTool && item.metadata.possiblePrefix) {
                const next = item.cloneWithPrefix(item.metadata.possiblePrefix);
                seen.set(next.name, next);
            }
        }
        return [...seen.values()];
    }
    /**
     * Eagerly expand groups when possible just to reduce the number of indirections.
     * Uses the provided ranker function to determine expansion priority.
     *
     * @param root The root virtual tool containing groups to expand
     * @param ranker Function to rank groups (lower scores = higher priority)
     * @param targetLimit Maximum number of tools to expand to (defaults to EXPAND_UNTIL_COUNT)
     *
     * Note: when this is made smarter, we should increase `MIN_TOOLSET_SIZE_TO_GROUP`,
     * which is right now because tiny toolsets are likely to automatically be included.
     */
    _reExpandToolsToHitBudget(root, ranker, targetLimit = Constant.EXPAND_UNTIL_COUNT) {
        let toolCount = iterator_1.Iterable.length(root.tools());
        if (toolCount > targetLimit) {
            return; // No need to expand further.
        }
        // Get unexpanded virtual tools, sorted by the ranker function (ascending order).
        const expandable = root.contents
            .filter((t) => t instanceof virtualTool_1.VirtualTool && !t.isExpanded)
            .sort((a, b) => ranker(a) - ranker(b));
        // Expand them until we hit the target limit
        for (const vtool of expandable) {
            const nextCount = toolCount - 1 + vtool.contents.length;
            if (nextCount > configurationService_1.HARD_TOOL_LIMIT) {
                break;
            }
            vtool.isExpanded = true;
            vtool.metadata.wasExpandedByDefault = true;
            toolCount = nextCount;
            if (toolCount > targetLimit) {
                break;
            }
        }
    }
    /** Top-level request to categorize a group of tools from a single source. */
    async _generateGroupsFromToolset(key, tools, previous, token) {
        if (tools.length <= Constant.MIN_TOOLSET_SIZE_TO_GROUP) {
            return tools;
        }
        let retries = 0;
        let virts;
        const sw = stopwatch_1.StopWatch.create();
        for (; !virts && retries < Constant.MAX_CATEGORIZATION_RETRIES; retries++) {
            try {
                virts = await this._cache.getOrInsert(tools, () => tools.length <= Constant.GROUP_WITHIN_TOOLSET
                    ? this._summarizeToolGroup(tools, token)
                    : this._divideToolsIntoGroups(tools, previous, token));
            }
            catch (e) {
                this._logService.warn(`Failed to categorize tools: ${e}`);
            }
        }
        let uncategorized = [];
        if (!virts) {
            uncategorized = tools;
        }
        else {
            const group = virts.findIndex(g => g.name === Constant.UNCATEGORIZED_TOOLS_GROUP_NAME);
            if (group >= 0) {
                uncategorized = virts[group].tools;
                virts.splice(group, 1);
            }
        }
        /* __GDPR__
            "virtualTools.generate" : {
                "owner": "connor4312",
                "comment": "Reports information about the generation of virtual tools.",
                "groupKey": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Key of the categorized group (MCP or extension)" },

                "toolsBefore": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Number of tools before categorization", "isMeasurement": true },
                "toolsAfter": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Number of tools after categorization", "isMeasurement": true },
                "retries": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Number of retries to categorize the tools", "isMeasurement": true },
                "uncategorizedTools": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Number of tools that could not be categorized", "isMeasurement": true },
                "durationMs": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Total duration of the operation in milliseconds", "isMeasurement": true }
            }
        */
        this._telemetryService.sendMSFTTelemetryEvent('virtualTools.generate', {
            groupKey: key,
        }, {
            uncategorized: uncategorized?.length || 0,
            toolsBefore: tools.length,
            toolsAfter: virts?.length || 0,
            retries,
            durationMs: sw.elapsed(),
        });
        this._telemetryService.sendInternalMSFTTelemetryEvent('virtualTools.toolset', {
            uncategorized: JSON.stringify(uncategorized.map(t => t.name)),
            groups: JSON.stringify(virts?.map(v => ({ name: v.name, tools: v.tools.map(t => t.name) })) || []),
        }, { retries, durationMs: sw.elapsed() });
        const virtualTools = virts?.map(v => {
            const src = tools[0].source;
            const possiblePrefix = src instanceof vscodeTypes_1.LanguageModelToolExtensionSource
                ? (src.id.split('.').at(1) || src.id)
                : src?.label;
            const vt = new virtualTool_1.VirtualTool(virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX + v.name, SUMMARY_PREFIX + v.summary + SUMMARY_SUFFIX, 0, {
                toolsetKey: key,
                groups: virts,
                possiblePrefix: possiblePrefix?.replaceAll(/[^a-zA-Z0-9]/g, '_').slice(0, 10) + '_'
            }, v.tools);
            return vt;
        }) || [];
        return virtualTools.concat(uncategorized);
    }
    async _getPredictedTools(query, tools, token) {
        // compute the embeddings for the query
        const queryEmbedding = await this.embeddingsComputer.computeEmbeddings(toolEmbeddingsCache_1.EMBEDDING_TYPE_FOR_TOOL_GROUPING, [query], {}, new telemetryCorrelationId_1.TelemetryCorrelationId('VirtualToolGrouper::_getPredictedTools'), token);
        if (!queryEmbedding || queryEmbedding.values.length === 0) {
            return [];
        }
        const queryEmbeddingVector = queryEmbedding.values[0];
        // Filter out built-in tools. Only consider extension and MCP tools for similarity computation
        const nonBuiltInTools = tools.filter(tool => tool.source instanceof vscodeTypes_1.LanguageModelToolExtensionSource ||
            tool.source instanceof vscodeTypes_1.LanguageModelToolMCPSource);
        // Get the top 10 tool embeddings for the non-built-in tools
        const availableToolNames = new Set(nonBuiltInTools.map(tool => tool.name));
        const toolEmbeddings = await this.toolEmbeddingsComputer.retrieveSimilarEmbeddingsForAvailableTools(queryEmbeddingVector, availableToolNames, 10, token);
        if (!toolEmbeddings) {
            return [];
        }
        // Filter the tools by the top 10 tool embeddings, maintaining order
        const toolNameToTool = new Map(tools.map(tool => [tool.name, tool]));
        const predictedTools = toolEmbeddings
            .map((toolName) => toolNameToTool.get(toolName))
            .filter((tool) => tool !== undefined);
        return predictedTools;
    }
    /** Makes multiple sub-groups from the given tool list. */
    async _divideToolsIntoGroups(tools, previous, token) {
        const endpoint = await this._endpointProvider.getChatEndpoint(CATEGORIZATION_ENDPOINT);
        if (previous) {
            const newTools = new Set(tools.map(t => t.name));
            previous = previous
                .map(p => ({ ...p, tools: p.tools.filter(t => newTools.has(t.name)) }))
                .filter(p => p.tools.length > 0);
        }
        const summarized = previous?.length
            ? await (0, virtualToolSummarizer_1.divideToolsIntoExistingGroups)(endpoint, previous, tools, token)
            : await (0, virtualToolSummarizer_1.divideToolsIntoGroups)(endpoint, tools, token);
        if (!summarized) {
            return undefined;
        }
        return summarized;
    }
    /** Summarizes the given tool list into a single tool group. */
    async _summarizeToolGroup(tools, token) {
        const endpoint = await this._endpointProvider.getChatEndpoint(CATEGORIZATION_ENDPOINT);
        const summarized = await (0, virtualToolSummarizer_1.summarizeToolGroup)(endpoint, tools, token);
        return summarized && [summarized];
    }
};
exports.VirtualToolGrouper = VirtualToolGrouper;
exports.VirtualToolGrouper = VirtualToolGrouper = VirtualToolGrouper_1 = __decorate([
    __param(0, endpointProvider_1.IEndpointProvider),
    __param(1, virtualToolTypes_1.IToolGroupingCache),
    __param(2, telemetry_1.ITelemetryService),
    __param(3, logService_1.ILogService),
    __param(4, embeddingsComputer_1.IEmbeddingsComputer),
    __param(5, configurationService_1.IConfigurationService),
    __param(6, nullExperimentationService_1.IExperimentationService),
    __param(7, instantiation_1.IInstantiationService)
], VirtualToolGrouper);
//# sourceMappingURL=virtualToolGrouper.js.map