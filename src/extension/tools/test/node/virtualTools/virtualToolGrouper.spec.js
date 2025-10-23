"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const configurationService_1 = require("../../../../../platform/configuration/common/configurationService");
const embeddingsComputer_1 = require("../../../../../platform/embeddings/common/embeddingsComputer");
const extensionContext_1 = require("../../../../../platform/extContext/common/extensionContext");
const cancellation_1 = require("../../../../../util/vs/base/common/cancellation");
const instantiation_1 = require("../../../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../../../vscodeTypes");
const services_1 = require("../../../../test/node/services");
const virtualTool_1 = require("../../../common/virtualTools/virtualTool");
const virtualToolGrouper_1 = require("../../../common/virtualTools/virtualToolGrouper");
const virtualToolsConstants_1 = require("../../../common/virtualTools/virtualToolsConstants");
(0, vitest_1.describe)('Virtual Tools - Grouper', () => {
    let accessor;
    let grouper;
    let root;
    class TestVirtualToolGrouper extends virtualToolGrouper_1.VirtualToolGrouper {
        // Stub out the protected methods to avoid hitting the endpoint
        async _divideToolsIntoGroups(tools, previous, token) {
            // Simulate dividing tools into groups based on their name prefix
            const groups = new Map();
            tools.forEach(tool => {
                const prefix = tool.name.split('_')[0];
                if (!groups.has(prefix)) {
                    groups.set(prefix, []);
                }
                groups.get(prefix).push(tool);
            });
            return Array.from(groups.entries()).map(([prefix, groupTools]) => ({
                name: prefix,
                summary: `Tools for ${prefix} operations`,
                tools: groupTools
            }));
        }
        async _summarizeToolGroup(tools, token) {
            // Simulate summarizing a group of tools
            const prefix = tools[0]?.name.split('_')[0] || 'unknown';
            return [{
                    name: prefix,
                    summary: `Summarized tools for ${prefix}`,
                    tools
                }];
        }
    }
    function makeTool(name, source) {
        return {
            name,
            description: `Tool for ${name}`,
            inputSchema: undefined,
            source,
            tags: [],
        };
    }
    function makeExtensionSource(id) {
        // TODO@connor4312
        return new vscodeTypes_1.LanguageModelToolExtensionSource(id, id);
    }
    function makeMCPSource(label) {
        // TODO@connor4312
        return new vscodeTypes_1.LanguageModelToolMCPSource(label, label);
    }
    (0, vitest_1.beforeEach)(() => {
        const testingServiceCollection = (0, services_1.createExtensionUnitTestingServices)();
        accessor = testingServiceCollection.createTestingAccessor();
        grouper = accessor.get(instantiation_1.IInstantiationService).createInstance(TestVirtualToolGrouper);
        root = new virtualTool_1.VirtualTool(virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX, '', Infinity, { groups: [], toolsetKey: '', wasExpandedByDefault: true });
        root.isExpanded = true;
    });
    (0, vitest_1.describe)('_deduplicateGroups', () => {
        function vt(name, possiblePrefix) {
            return new virtualTool_1.VirtualTool(name, `VT ${name}`, 0, { toolsetKey: 'k', groups: [], possiblePrefix }, []);
        }
        (0, vitest_1.it)('deduplicates VirtualTool against LM tool by prefixing existing VT', () => {
            const dupName = `${virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX}foo`;
            const items = [
                vt(dupName, 'ext_'),
                makeTool(dupName),
            ];
            const result = virtualToolGrouper_1.VirtualToolGrouper.deduplicateGroups(items);
            // Expect both the LM tool and the prefixed VT to exist, and no unprefixed VT
            const names = result.map(i => i.name);
            (0, vitest_1.expect)(names).toContain(dupName);
            (0, vitest_1.expect)(names).toContain(`activate_ext_${dupName.slice(virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX.length)}`);
            (0, vitest_1.expect)(result.find(i => i instanceof virtualTool_1.VirtualTool && i.name === dupName)).toBeUndefined();
        });
        (0, vitest_1.it)('deduplicates LM tool against VirtualTool by prefixing new VT', () => {
            const dupName = `${virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX}bar`;
            const items = [
                makeTool(dupName),
                vt(dupName, 'mcp_'),
            ];
            const result = virtualToolGrouper_1.VirtualToolGrouper.deduplicateGroups(items);
            const names = result.map(i => i.name);
            (0, vitest_1.expect)(names).toContain(dupName); // LM tool remains under original name
            (0, vitest_1.expect)(names).toContain(`activate_mcp_${dupName.slice(virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX.length)}`); // VT is cloned with prefix
        });
        (0, vitest_1.it)('handles VT vs VT duplicate by prefixing the first and keeping the second', () => {
            const dupName = `${virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX}baz`;
            const first = vt(dupName, 'ext_');
            const second = vt(dupName, 'mcp_');
            const result = virtualToolGrouper_1.VirtualToolGrouper.deduplicateGroups([first, second]);
            const vtPrefixed = result.find(i => i instanceof virtualTool_1.VirtualTool && i.name === `activate_ext_${dupName.slice(virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX.length)}`);
            const vtUnprefixed = result.find(i => i.name === dupName);
            (0, vitest_1.expect)(vtPrefixed).toBeDefined();
            // Second VT should remain at the original (unprefixed) name
            (0, vitest_1.expect)(vtUnprefixed).toBeInstanceOf(virtualTool_1.VirtualTool);
        });
        (0, vitest_1.it)('drops duplicate when no possiblePrefix is available on VT', () => {
            const dupName = `${virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX}qux`;
            const items = [
                vt(dupName), // no possiblePrefix
                makeTool(dupName),
            ];
            const result = virtualToolGrouper_1.VirtualToolGrouper.deduplicateGroups(items);
            // Only the first VT remains
            (0, vitest_1.expect)(result).toHaveLength(1);
            (0, vitest_1.expect)(result[0]).toBeInstanceOf(virtualTool_1.VirtualTool);
            (0, vitest_1.expect)(result[0].name).toBe(dupName);
        });
        (0, vitest_1.it)('keeps only the first LM tool on LM vs LM duplicate', () => {
            const dupName = `${virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX}dup`;
            const items = [makeTool(dupName), makeTool(dupName)];
            const result = virtualToolGrouper_1.VirtualToolGrouper.deduplicateGroups(items);
            (0, vitest_1.expect)(result).toHaveLength(1);
            (0, vitest_1.expect)(result[0].name).toBe(dupName);
        });
    });
    (0, vitest_1.afterEach)(() => {
        accessor.dispose();
    });
    (0, vitest_1.describe)('addGroups - basic functionality', () => {
        (0, vitest_1.it)('should add tools directly when below START_GROUPING_AFTER_TOOL_COUNT', async () => {
            const tools = Array.from({ length: virtualToolsConstants_1.START_GROUPING_AFTER_TOOL_COUNT - 1 }, (_, i) => makeTool(`tool_${i}`));
            await grouper.addGroups('', root, tools, cancellation_1.CancellationToken.None);
            (0, vitest_1.expect)(root.contents).toEqual(tools);
        });
        (0, vitest_1.it)('should group tools when above START_GROUPING_AFTER_TOOL_COUNT', async () => {
            const tools = Array.from({ length: virtualToolsConstants_1.START_GROUPING_AFTER_TOOL_COUNT + 1 }, (_, i) => makeTool(`tool_${i}`));
            await grouper.addGroups('', root, tools, cancellation_1.CancellationToken.None);
            (0, vitest_1.expect)(root.contents.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(root.contents.length).toEqual(tools.length);
        });
    });
    (0, vitest_1.describe)('addGroups - toolset grouping', () => {
        (0, vitest_1.it)('should handle built-in tools without grouping', async () => {
            const builtInTools = [
                makeTool('builtin_tool1'),
                makeTool('builtin_tool2'),
                makeTool('builtin_tool3'),
            ];
            await grouper.addGroups('', root, builtInTools, cancellation_1.CancellationToken.None);
            (0, vitest_1.expect)(root.contents).toEqual(builtInTools);
        });
        (0, vitest_1.it)('should group extension tools by extension id', async () => {
            const extensionSource = makeExtensionSource('test.extension');
            const extensionTools = Array.from({ length: virtualToolsConstants_1.GROUP_WITHIN_TOOLSET + 1 }, (_, i) => makeTool(`ext_tool_${i}`, extensionSource));
            // Need enough tools to trigger grouping
            const allTools = [
                ...extensionTools,
                ...Array.from({ length: virtualToolsConstants_1.START_GROUPING_AFTER_TOOL_COUNT }, (_, i) => makeTool(`extra_${i}`))
            ];
            await grouper.addGroups('', root, allTools, cancellation_1.CancellationToken.None);
            // Should have created virtual tools for the extension
            const vt = root.contents.filter((tool) => tool instanceof virtualTool_1.VirtualTool);
            (0, vitest_1.expect)(vt).toHaveLength(1);
            (0, vitest_1.expect)(vt[0].name).toBe('activate_ext');
        });
        (0, vitest_1.it)('should group MCP tools by MCP source label', async () => {
            const mcpSource = makeMCPSource('test-mcp');
            const mcpTools = Array.from({ length: virtualToolsConstants_1.GROUP_WITHIN_TOOLSET + 1 }, (_, i) => makeTool(`mcp_tool_${i}`, mcpSource));
            // Need enough tools to trigger grouping
            const allTools = [
                ...mcpTools,
                ...Array.from({ length: virtualToolsConstants_1.START_GROUPING_AFTER_TOOL_COUNT }, (_, i) => makeTool(`extra_${i}`))
            ];
            await grouper.addGroups('', root, allTools, cancellation_1.CancellationToken.None);
            // Should have created virtual tools for the extension
            const vt = root.contents.filter((tool) => tool instanceof virtualTool_1.VirtualTool);
            (0, vitest_1.expect)(vt).toHaveLength(1);
            (0, vitest_1.expect)(vt[0].name).toBe('activate_mcp');
        });
        (0, vitest_1.it)('should handle mixed toolsets correctly', async () => {
            const extensionSource = makeExtensionSource('test.extension');
            const mcpSource = makeMCPSource('test-mcp');
            const tools = [
                ...Array.from({ length: 5 }, (_, i) => makeTool(`builtin_${i}`)),
                ...Array.from({ length: virtualToolsConstants_1.GROUP_WITHIN_TOOLSET + 1 }, (_, i) => makeTool(`ext_${i}`, extensionSource)),
                ...Array.from({ length: virtualToolsConstants_1.GROUP_WITHIN_TOOLSET + 1 }, (_, i) => makeTool(`mcp_${i}`, mcpSource)),
            ];
            // Need enough tools to trigger grouping
            const allTools = [
                ...tools,
                ...Array.from({ length: virtualToolsConstants_1.START_GROUPING_AFTER_TOOL_COUNT }, (_, i) => makeTool(`extra_${i}`))
            ];
            await grouper.addGroups('', root, allTools, cancellation_1.CancellationToken.None);
            // Should have built-in tools and virtual tools for extension and MCP
            const nonExtra = root.contents.filter(tool => !tool.name.includes('extra_'));
            const builtInCount = nonExtra.filter(tool => !(tool instanceof virtualTool_1.VirtualTool)).length;
            const virtualCount = nonExtra.filter(tool => tool instanceof virtualTool_1.VirtualTool).length;
            (0, vitest_1.expect)(builtInCount).toBe(5); // Built-in tools added directly
            (0, vitest_1.expect)(virtualCount).toBeGreaterThan(0); // Virtual tools for extension and MCP
        });
    });
    (0, vitest_1.describe)('addGroups - toolset size thresholds', () => {
        (0, vitest_1.it)('should not group toolsets below MIN_TOOLSET_SIZE_TO_GROUP', async () => {
            const extensionSource = makeExtensionSource('small.extension');
            const smallToolset = Array.from({ length: virtualToolsConstants_1.MIN_TOOLSET_SIZE_TO_GROUP - 1 }, (_, i) => makeTool(`small_${i}`, extensionSource));
            // Need enough total tools to trigger grouping
            const allTools = [
                ...smallToolset,
                ...Array.from({ length: virtualToolsConstants_1.START_GROUPING_AFTER_TOOL_COUNT }, (_, i) => makeTool(`builtin_${i}`))
            ];
            await grouper.addGroups('', root, allTools, cancellation_1.CancellationToken.None);
            // Small toolset should be added directly without grouping
            const addedDirectly = root.contents.filter(tool => !(tool instanceof virtualTool_1.VirtualTool) && tool.name.startsWith('small_'));
            (0, vitest_1.expect)(addedDirectly).toHaveLength(virtualToolsConstants_1.MIN_TOOLSET_SIZE_TO_GROUP - 1);
        });
        (0, vitest_1.it)('should divide large toolsets into subgroups', async () => {
            const extensionSource = makeExtensionSource('large.extension');
            const largeToolset = Array.from({ length: virtualToolsConstants_1.GROUP_WITHIN_TOOLSET + 5 }, (_, i) => makeTool(`group${i % 3}_tool_${i}`, extensionSource) // Create 3 groups
            );
            // Need enough tools to trigger grouping
            const allTools = [
                ...largeToolset,
                ...Array.from({ length: virtualToolsConstants_1.START_GROUPING_AFTER_TOOL_COUNT }, (_, i) => makeTool(`extra_${i}`))
            ];
            await grouper.addGroups('', root, allTools, cancellation_1.CancellationToken.None);
            // Should have created virtual tools for the extension
            const vt = root.contents.filter((tool) => tool instanceof virtualTool_1.VirtualTool);
            (0, vitest_1.expect)(vt).toHaveLength(3);
            (0, vitest_1.expect)(vt.map(vt => vt.name)).toMatchInlineSnapshot(`
				[
				  "activate_group0",
				  "activate_group1",
				  "activate_group2",
				]
			`);
        });
    });
    (0, vitest_1.describe)('addGroups - state preservation', () => {
        (0, vitest_1.it)('should preserve expansion state of existing virtual tools', async () => {
            const tools = Array.from({ length: virtualToolsConstants_1.START_GROUPING_AFTER_TOOL_COUNT + 1 }, (_, i) => makeTool(`file_tool_${i}`));
            // First grouping
            await grouper.addGroups('', root, tools, cancellation_1.CancellationToken.None);
            // Expand a virtual tool
            const virtualTool = root.contents.find(tool => tool instanceof virtualTool_1.VirtualTool);
            if (virtualTool) {
                virtualTool.isExpanded = true;
                virtualTool.lastUsedOnTurn = 5;
            }
            // Second grouping with same tools
            await grouper.addGroups('', root, tools, cancellation_1.CancellationToken.None);
            // State should be preserved
            const newVirtualTool = root.contents.find(tool => tool instanceof virtualTool_1.VirtualTool && tool.name === virtualTool?.name);
            if (newVirtualTool) {
                (0, vitest_1.expect)(newVirtualTool.isExpanded).toBe(true);
                (0, vitest_1.expect)(newVirtualTool.lastUsedOnTurn).toBe(5);
            }
        });
    });
    (0, vitest_1.describe)('reExpandToolsToHitBudget', () => {
        (0, vitest_1.it)('should expand small virtual tools when below EXPAND_UNTIL_COUNT', async () => {
            // Create tools that will form small groups
            const tools = [
                makeTool('group1_tool1', makeExtensionSource('a')),
                makeTool('group1_tool2', makeExtensionSource('a')),
                makeTool('group1_tool3', makeExtensionSource('a')),
                makeTool('group2_tool1', makeExtensionSource('b')),
                makeTool('group2_tool2', makeExtensionSource('b')),
                makeTool('group3_tool2', makeExtensionSource('b')),
            ];
            // Need enough tools to trigger grouping
            const allTools = [
                ...tools,
                ...Array.from({ length: virtualToolsConstants_1.START_GROUPING_AFTER_TOOL_COUNT - 4 }, (_, i) => makeTool(`extra_${i}`))
            ];
            await grouper.addGroups('', root, allTools, cancellation_1.CancellationToken.None);
            // Should have expanded small groups automatically
            const expandedVirtualTools = root.contents.filter(tool => tool instanceof virtualTool_1.VirtualTool);
            // At least some virtual tools should be expanded to reach EXPAND_UNTIL_COUNT
            (0, vitest_1.expect)(expandedVirtualTools.length).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should not expand when already above EXPAND_UNTIL_COUNT', async () => {
            // Create enough individual tools to exceed EXPAND_UNTIL_COUNT
            const tools = Array.from({ length: virtualToolsConstants_1.EXPAND_UNTIL_COUNT + 10 }, (_, i) => makeTool(`individual_${i}`));
            await grouper.addGroups('', root, tools, cancellation_1.CancellationToken.None);
            // All tools should remain as individual tools (no virtual tools created)
            const virtualTools = root.contents.filter(tool => tool instanceof virtualTool_1.VirtualTool);
            (0, vitest_1.expect)(virtualTools).toHaveLength(0);
        });
        (0, vitest_1.it)('should not expand beyond HARD_TOOL_LIMIT', async () => {
            // Create large groups that could exceed HARD_TOOL_LIMIT if all expanded
            const extensionSource = makeExtensionSource('large.extension');
            const largeGroups = Array.from({ length: 5 }, (groupIndex) => Array.from({ length: 50 }, (toolIndex) => makeTool(`group${groupIndex}_tool_${toolIndex}`, extensionSource))).flat();
            await grouper.addGroups('', root, largeGroups, cancellation_1.CancellationToken.None);
            const totalTools = Array.from(root.tools()).length;
            (0, vitest_1.expect)(totalTools).toBeLessThanOrEqual(configurationService_1.HARD_TOOL_LIMIT);
        });
        (0, vitest_1.it)('should prioritize expanding smaller groups first', async () => {
            const extensionSource = makeExtensionSource('test.extension');
            // Create groups of different sizes
            const tools = [
                // Small group (2 tools)
                makeTool('small_tool1', extensionSource),
                makeTool('small_tool2', extensionSource),
                // Large group (20 tools)
                ...Array.from({ length: 20 }, (_, i) => makeTool(`large_tool_${i}`, extensionSource)),
            ];
            await grouper.addGroups('', root, tools, cancellation_1.CancellationToken.None);
            // The smaller group should be more likely to be expanded
            const smallGroup = root.contents.find(tool => tool instanceof virtualTool_1.VirtualTool && tool.name.includes('small'));
            const largeGroup = root.contents.find(tool => tool instanceof virtualTool_1.VirtualTool && tool.name.includes('large'));
            // If we have both groups, small should be expanded preferentially
            if (smallGroup && largeGroup) {
                (0, vitest_1.expect)(smallGroup.isExpanded || !largeGroup.isExpanded).toBe(true);
            }
        });
    });
    (0, vitest_1.describe)('cache integration', () => {
        (0, vitest_1.it)('should use cache for tool group generation', async () => {
            const tools1 = Array.from({ length: virtualToolsConstants_1.GROUP_WITHIN_TOOLSET + 1 }, (_, i) => makeTool(`grouped_tool_${i}`, makeExtensionSource('cached.extension1')));
            const tools2 = Array.from({ length: virtualToolsConstants_1.MIN_TOOLSET_SIZE_TO_GROUP + 1 }, (_, i) => makeTool(`summarized_tool_${i}`, makeExtensionSource('cached.extension2')));
            const allTools = [
                ...tools1,
                ...tools2,
                ...Array.from({ length: virtualToolsConstants_1.START_GROUPING_AFTER_TOOL_COUNT }, (_, i) => makeTool(`extra_${i}`))
            ];
            await grouper.addGroups('', root, allTools, cancellation_1.CancellationToken.None);
            const context = accessor.get(extensionContext_1.IVSCodeExtensionContext);
            const cached = context.globalState.get('virtToolGroupCache');
            function sortObj(obj) {
                if (Array.isArray(obj)) {
                    return obj.map(sortObj).sort();
                }
                if (obj && typeof obj === 'object') {
                    return Object.fromEntries(Object.entries(obj)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([k, v]) => [k, sortObj(v)]));
                }
                return obj;
            }
            (0, vitest_1.expect)(sortObj(cached)).toMatchInlineSnapshot(`
				{
				  "lru": [
				    [
				      "5sujG9z5TJJRhFVv6jkxLSvKfLlEi6DEUboDpSCLfvQ=",
				      {
				        "groups": [
				          {
				            "name": "grouped",
				            "summary": "Tools for grouped operations",
				            "tools": [
				              "grouped_tool_0",
				              "grouped_tool_1",
				              "grouped_tool_10",
				              "grouped_tool_11",
				              "grouped_tool_12",
				              "grouped_tool_13",
				              "grouped_tool_14",
				              "grouped_tool_15",
				              "grouped_tool_16",
				              "grouped_tool_2",
				              "grouped_tool_3",
				              "grouped_tool_4",
				              "grouped_tool_5",
				              "grouped_tool_6",
				              "grouped_tool_7",
				              "grouped_tool_8",
				              "grouped_tool_9",
				            ],
				          },
				        ],
				      },
				    ],
				    [
				      {
				        "groups": [
				          {
				            "name": "summarized",
				            "summary": "Summarized tools for summarized",
				            "tools": [
				              "summarized_tool_0",
				              "summarized_tool_1",
				              "summarized_tool_2",
				            ],
				          },
				        ],
				      },
				      "ukyzHGWUUwylzlhwETqBtsi69Xhj9XqiFp45nH8yqYE=",
				    ],
				  ],
				}
			`);
            const intoGroups = vitest_1.vi.spyOn(grouper, '_divideToolsIntoGroups');
            const intoSummary = vitest_1.vi.spyOn(grouper, '_summarizeToolGroup');
            await grouper.addGroups('', root, allTools, cancellation_1.CancellationToken.None);
            (0, vitest_1.expect)(intoGroups).not.toHaveBeenCalled();
            (0, vitest_1.expect)(intoSummary).not.toHaveBeenCalled();
            const tools3 = Array.from({ length: virtualToolsConstants_1.MIN_TOOLSET_SIZE_TO_GROUP + 2 }, (_, i) => makeTool(`summarized_tool_${i}`, makeExtensionSource('cached.extension2')));
            const allTools2 = [
                ...tools1,
                ...tools3,
                ...Array.from({ length: virtualToolsConstants_1.START_GROUPING_AFTER_TOOL_COUNT }, (_, i) => makeTool(`extra_${i}`))
            ];
            await grouper.addGroups('', root, allTools2, cancellation_1.CancellationToken.None);
            (0, vitest_1.expect)(intoGroups).not.toHaveBeenCalled();
            (0, vitest_1.expect)(intoSummary).toHaveBeenCalledOnce();
        });
    });
    (0, vitest_1.describe)('embedding-based expansion', () => {
        (0, vitest_1.beforeEach)(() => {
            const configurationService = accessor.get(configurationService_1.IConfigurationService);
            vitest_1.vi.spyOn(configurationService, 'getExperimentBasedConfig').mockReturnValue(true);
        });
        (0, vitest_1.it)('should expand virtual tools containing predicted tools when embedding ranking is enabled', async () => {
            // Create extension tools that will be grouped
            const extensionSource = makeExtensionSource('test.extension');
            const extensionTools = [
                makeTool('predicted_tool1', extensionSource), // Higher priority (index 0)
                makeTool('predicted_tool2', extensionSource), // Lower priority (index 1)
                makeTool('other_tool1', extensionSource),
                makeTool('other_tool2', extensionSource),
            ];
            // Add enough builtin tools to trigger grouping
            const builtinTools = Array.from({ length: virtualToolsConstants_1.START_GROUPING_AFTER_TOOL_COUNT }, (_, i) => makeTool(`builtin_${i}`));
            const allTools = [...extensionTools, ...builtinTools];
            // Mock the embedding computation and tool retrieval
            const embeddingsComputer = accessor.get(embeddingsComputer_1.IEmbeddingsComputer);
            vitest_1.vi.spyOn(embeddingsComputer, 'computeEmbeddings').mockResolvedValue({
                type: embeddingsComputer_1.EmbeddingType.text3small_512,
                values: [{
                        type: embeddingsComputer_1.EmbeddingType.text3small_512,
                        value: [0.1, 0.2, 0.3, 0.4, 0.5]
                    }]
            });
            // Mock the tool embeddings computer to return specific predicted tools
            vitest_1.vi.spyOn(grouper['toolEmbeddingsComputer'], 'retrieveSimilarEmbeddingsForAvailableTools')
                .mockResolvedValue(['predicted_tool1', 'predicted_tool2']);
            const query = 'test query for embeddings';
            // Call addGroups which should trigger embedding-based expansion
            await grouper.addGroups(query, root, allTools, cancellation_1.CancellationToken.None);
            // Find the virtual tool that was created for the extension
            const virtualTools = root.contents.filter((tool) => tool instanceof virtualTool_1.VirtualTool);
            (0, vitest_1.expect)(virtualTools.length).toBeGreaterThan(0);
            // The virtual tool containing predicted tools should be expanded
            const extVirtualTool = virtualTools.find(vt => vt.contents.some(tool => tool.name === 'predicted_tool1' || tool.name === 'predicted_tool2'));
            (0, vitest_1.expect)(extVirtualTool).toBeDefined();
            if (extVirtualTool) {
                (0, vitest_1.expect)(extVirtualTool.isExpanded).toBe(true);
                (0, vitest_1.expect)(extVirtualTool.metadata.wasExpandedByDefault).toBe(true);
            }
        });
    });
    (0, vitest_1.describe)('recomputeEmbeddingRankings', () => {
        (0, vitest_1.beforeEach)(() => {
            const configurationService = accessor.get(configurationService_1.IConfigurationService);
            vitest_1.vi.spyOn(configurationService, 'getExperimentBasedConfig').mockReturnValue(true);
        });
        (0, vitest_1.it)('should do nothing when embedding ranking is disabled', async () => {
            const configurationService = accessor.get(configurationService_1.IConfigurationService);
            vitest_1.vi.spyOn(configurationService, 'getExperimentBasedConfig').mockReturnValue(false);
            const tools = [makeTool('test1'), makeTool('test2')];
            root.contents = [...tools];
            const originalContents = [...root.contents];
            await grouper.recomputeEmbeddingRankings('query', root, cancellation_1.CancellationToken.None);
            // Should not have changed anything
            (0, vitest_1.expect)(root.contents).toEqual(originalContents);
        });
        (0, vitest_1.it)('should create embeddings group with predicted tools', async () => {
            const tools = [makeTool('predicted1'), makeTool('regular1'), makeTool('predicted2'), makeTool('regular2')];
            root.contents = [...tools];
            // Mock the embeddings computer and tool retrieval
            const embeddingsComputer = accessor.get(embeddingsComputer_1.IEmbeddingsComputer);
            vitest_1.vi.spyOn(embeddingsComputer, 'computeEmbeddings').mockResolvedValue({
                type: embeddingsComputer_1.EmbeddingType.text3small_512,
                values: [{
                        type: embeddingsComputer_1.EmbeddingType.text3small_512,
                        value: [0.1, 0.2, 0.3, 0.4, 0.5]
                    }]
            });
            vitest_1.vi.spyOn(grouper['toolEmbeddingsComputer'], 'retrieveSimilarEmbeddingsForAvailableTools')
                .mockResolvedValue(['predicted1', 'predicted2']);
            await grouper.recomputeEmbeddingRankings('test query', root, cancellation_1.CancellationToken.None);
            // Should have added embeddings group at the beginning
            (0, vitest_1.expect)(root.contents[0]).toBeInstanceOf(virtualTool_1.VirtualTool);
            const embeddingsGroup = root.contents[0];
            (0, vitest_1.expect)(embeddingsGroup.name).toBe('activate_embeddings');
            (0, vitest_1.expect)(embeddingsGroup.description).toBe('Tools with high predicted relevancy for this query');
            (0, vitest_1.expect)(embeddingsGroup.isExpanded).toBe(true);
            (0, vitest_1.expect)(embeddingsGroup.metadata.canBeCollapsed).toBe(false);
            (0, vitest_1.expect)(embeddingsGroup.metadata.wasExpandedByDefault).toBe(true);
            // Should contain the predicted tools
            (0, vitest_1.expect)(embeddingsGroup.contents).toHaveLength(2);
            (0, vitest_1.expect)(embeddingsGroup.contents.map(t => t.name)).toEqual(['predicted1', 'predicted2']);
            // Original tools should still be in root
            const remainingTools = root.contents.slice(1);
            (0, vitest_1.expect)(remainingTools).toEqual(tools);
        });
        (0, vitest_1.it)('should replace existing embeddings group when recomputing', async () => {
            const tools = [makeTool('tool1'), makeTool('tool2'), makeTool('tool3')];
            root.contents = [...tools];
            const embeddingsComputer = accessor.get(embeddingsComputer_1.IEmbeddingsComputer);
            vitest_1.vi.spyOn(embeddingsComputer, 'computeEmbeddings').mockResolvedValue({
                type: embeddingsComputer_1.EmbeddingType.text3small_512,
                values: [{
                        type: embeddingsComputer_1.EmbeddingType.text3small_512,
                        value: [0.1, 0.2, 0.3, 0.4, 0.5]
                    }]
            });
            // First call - predict tool1
            vitest_1.vi.spyOn(grouper['toolEmbeddingsComputer'], 'retrieveSimilarEmbeddingsForAvailableTools')
                .mockResolvedValueOnce(['tool1']);
            await grouper.recomputeEmbeddingRankings('query1', root, cancellation_1.CancellationToken.None);
            // Should have embeddings group with tool1
            (0, vitest_1.expect)(root.contents[0]).toBeInstanceOf(virtualTool_1.VirtualTool);
            let embeddingsGroup = root.contents[0];
            (0, vitest_1.expect)(embeddingsGroup.contents).toHaveLength(1);
            (0, vitest_1.expect)(embeddingsGroup.contents[0].name).toBe('tool1');
            // Second call - predict tool2 and tool3
            vitest_1.vi.spyOn(grouper['toolEmbeddingsComputer'], 'retrieveSimilarEmbeddingsForAvailableTools')
                .mockResolvedValueOnce(['tool2', 'tool3']);
            await grouper.recomputeEmbeddingRankings('query2', root, cancellation_1.CancellationToken.None);
            // Should have replaced the embeddings group
            (0, vitest_1.expect)(root.contents[0]).toBeInstanceOf(virtualTool_1.VirtualTool);
            embeddingsGroup = root.contents[0];
            (0, vitest_1.expect)(embeddingsGroup.contents).toHaveLength(2);
            (0, vitest_1.expect)(embeddingsGroup.contents.map(t => t.name)).toEqual(['tool2', 'tool3']);
        });
        (0, vitest_1.it)('should create empty embeddings group when no predicted tools found', async () => {
            const tools = [makeTool('tool1'), makeTool('tool2')];
            root.contents = [...tools];
            const embeddingsComputer = accessor.get(embeddingsComputer_1.IEmbeddingsComputer);
            vitest_1.vi.spyOn(embeddingsComputer, 'computeEmbeddings').mockResolvedValue({
                type: embeddingsComputer_1.EmbeddingType.text3small_512,
                values: [{
                        type: embeddingsComputer_1.EmbeddingType.text3small_512,
                        value: [0.1, 0.2, 0.3, 0.4, 0.5]
                    }]
            });
            // Return no predicted tools
            vitest_1.vi.spyOn(grouper['toolEmbeddingsComputer'], 'retrieveSimilarEmbeddingsForAvailableTools')
                .mockResolvedValue([]);
            await grouper.recomputeEmbeddingRankings('query', root, cancellation_1.CancellationToken.None);
            // Should have added empty embeddings group at the beginning
            (0, vitest_1.expect)(root.contents[0]).toBeInstanceOf(virtualTool_1.VirtualTool);
            const embeddingsGroup = root.contents[0];
            (0, vitest_1.expect)(embeddingsGroup.name).toBe('activate_embeddings');
            (0, vitest_1.expect)(embeddingsGroup.contents).toHaveLength(0);
            // Original tools should still be in root after the embeddings group
            const remainingTools = root.contents.slice(1);
            (0, vitest_1.expect)(remainingTools).toEqual(tools);
        });
        (0, vitest_1.it)('should create empty embeddings group when predicted tools are not found in root', async () => {
            const tools = [makeTool('tool1'), makeTool('tool2')];
            root.contents = [...tools];
            const embeddingsComputer = accessor.get(embeddingsComputer_1.IEmbeddingsComputer);
            vitest_1.vi.spyOn(embeddingsComputer, 'computeEmbeddings').mockResolvedValue({
                type: embeddingsComputer_1.EmbeddingType.text3small_512,
                values: [{
                        type: embeddingsComputer_1.EmbeddingType.text3small_512,
                        value: [0.1, 0.2, 0.3, 0.4, 0.5]
                    }]
            });
            // Return predicted tools that don't exist in root
            vitest_1.vi.spyOn(grouper['toolEmbeddingsComputer'], 'retrieveSimilarEmbeddingsForAvailableTools')
                .mockResolvedValue(['nonexistent1', 'nonexistent2']);
            await grouper.recomputeEmbeddingRankings('query', root, cancellation_1.CancellationToken.None);
            // Should have added empty embeddings group since predicted tools don't exist in root
            (0, vitest_1.expect)(root.contents[0]).toBeInstanceOf(virtualTool_1.VirtualTool);
            const embeddingsGroup = root.contents[0];
            (0, vitest_1.expect)(embeddingsGroup.name).toBe('activate_embeddings');
            (0, vitest_1.expect)(embeddingsGroup.contents).toHaveLength(0);
            // Original tools should still be in root after the embeddings group
            const remainingTools = root.contents.slice(1);
            (0, vitest_1.expect)(remainingTools).toEqual(tools);
        });
        (0, vitest_1.it)('should handle errors in embeddings computation gracefully', async () => {
            const tools = [makeTool('tool1'), makeTool('tool2')];
            root.contents = [...tools];
            // Mock embeddings computation to throw an error
            const embeddingsComputer = accessor.get(embeddingsComputer_1.IEmbeddingsComputer);
            vitest_1.vi.spyOn(embeddingsComputer, 'computeEmbeddings').mockRejectedValue(new Error('Embeddings computation failed'));
            const originalContents = [...root.contents];
            // Should not throw and should not modify contents
            await (0, vitest_1.expect)(grouper.recomputeEmbeddingRankings('query', root, cancellation_1.CancellationToken.None)).resolves.toBeUndefined();
            (0, vitest_1.expect)(root.contents).toEqual(originalContents);
        });
    });
    (0, vitest_1.describe)('edge cases', () => {
        (0, vitest_1.it)('should handle empty tool list', async () => {
            await grouper.addGroups('', root, [], cancellation_1.CancellationToken.None);
            (0, vitest_1.expect)(root.contents).toHaveLength(0);
        });
        (0, vitest_1.it)('should handle single tool', async () => {
            const tools = [makeTool('single_tool')];
            await grouper.addGroups('', root, tools, cancellation_1.CancellationToken.None);
            (0, vitest_1.expect)(root.contents).toEqual(tools);
        });
    });
    /**
     * Tests for the deduplication logic that ensures unique names by prefixing
     * virtual tools when necessary.
     */
    (0, vitest_1.describe)('deduplicateGroups', () => {
        (0, vitest_1.it)('keeps unique items unchanged', () => {
            const items = [
                makeTool('a'),
                new virtualTool_1.VirtualTool(`${virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX}groupA`, 'desc', 0, { toolsetKey: 'k', groups: [], possiblePrefix: 'ext_' }),
                makeTool('b'),
            ];
            const out = virtualToolGrouper_1.VirtualToolGrouper.deduplicateGroups(items);
            (0, vitest_1.expect)(out.map(i => i.name)).toEqual(['a', `${virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX}groupA`, 'b']);
        });
        (0, vitest_1.it)('prefixes first seen virtual tool if a later collision occurs with a real tool', () => {
            const v = new virtualTool_1.VirtualTool(`${virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX}conflict`, 'desc', 0, { toolsetKey: 'k', groups: [], possiblePrefix: 'ext_' });
            const real = makeTool(`${virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX}conflict`);
            const out = virtualToolGrouper_1.VirtualToolGrouper.deduplicateGroups([v, real]);
            (0, vitest_1.expect)(out.map(i => i.name).sort()).toEqual(['activate_conflict', 'activate_ext_conflict'].sort());
        });
        (0, vitest_1.it)('prefixes newly seen virtual tool when collision occurs with an existing real tool', () => {
            const real = makeTool(`${virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX}c`);
            const v = new virtualTool_1.VirtualTool(`${virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX}c`, 'desc', 0, { toolsetKey: 'k', groups: [], possiblePrefix: 'mcp_' });
            const out = virtualToolGrouper_1.VirtualToolGrouper.deduplicateGroups([real, v]);
            (0, vitest_1.expect)(out.map(i => i.name).sort()).toEqual(['activate_c', 'activate_mcp_c'].sort());
        });
        (0, vitest_1.it)('replaces earlier virtual tool with prefixed clone when colliding with later virtual tool', () => {
            const v1 = new virtualTool_1.VirtualTool(`${virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX}x`, 'd1', 0, { toolsetKey: 'k', groups: [], possiblePrefix: 'ext_' });
            const v2 = new virtualTool_1.VirtualTool(`${virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX}x`, 'd2', 0, { toolsetKey: 'k', groups: [], possiblePrefix: 'mcp_' });
            const out = virtualToolGrouper_1.VirtualToolGrouper.deduplicateGroups([v1, v2]);
            // first is replaced with ext_ prefix, second remains as-is (still original name)
            (0, vitest_1.expect)(out.map(i => i.name).sort()).toEqual(['activate_ext_x', 'activate_x'].sort());
        });
        (0, vitest_1.it)('no prefixing when virtual has no possiblePrefix', () => {
            const v1 = new virtualTool_1.VirtualTool(`${virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX}dup`, 'd1', 0, { toolsetKey: 'k', groups: [] });
            const v2 = new virtualTool_1.VirtualTool(`${virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX}dup`, 'd2', 0, { toolsetKey: 'k', groups: [], possiblePrefix: 'ext_' });
            const out = virtualToolGrouper_1.VirtualToolGrouper.deduplicateGroups([v1, v2]);
            // Since first has no prefix, second with prefix should be applied
            (0, vitest_1.expect)(out.map(i => i.name).sort()).toEqual(['activate_dup', 'activate_ext_dup'].sort());
        });
        (0, vitest_1.it)('handles multiple collisions consistently', () => {
            const items = [
                new virtualTool_1.VirtualTool(`${virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX}n`, 'd', 0, { toolsetKey: 'k', groups: [], possiblePrefix: 'e_' }),
                makeTool(`${virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX}n`),
                new virtualTool_1.VirtualTool(`${virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX}n`, 'd2', 0, { toolsetKey: 'k', groups: [], possiblePrefix: 'm_' }),
                makeTool(`${virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX}p`),
                new virtualTool_1.VirtualTool(`${virtualTool_1.VIRTUAL_TOOL_NAME_PREFIX}p`, 'd3', 0, { toolsetKey: 'k', groups: [], possiblePrefix: 'x_' }),
            ];
            const out = virtualToolGrouper_1.VirtualToolGrouper.deduplicateGroups(items);
            const names = out.map(i => i.name).sort();
            (0, vitest_1.expect)(names).toEqual(['activate_n', 'activate_e_n', 'activate_m_n', 'activate_p', 'activate_x_p'].sort());
        });
    });
});
//# sourceMappingURL=virtualToolGrouper.spec.js.map