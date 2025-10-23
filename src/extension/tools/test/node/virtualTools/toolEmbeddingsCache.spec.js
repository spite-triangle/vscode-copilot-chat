"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const embeddingsComputer_1 = require("../../../../../platform/embeddings/common/embeddingsComputer");
const cancellation_1 = require("../../../../../util/vs/base/common/cancellation");
const instantiation_1 = require("../../../../../util/vs/platform/instantiation/common/instantiation");
const services_1 = require("../../../../test/node/services");
const toolEmbeddingsCache_1 = require("../../../common/virtualTools/toolEmbeddingsCache");
(0, vitest_1.describe)('ToolEmbeddingsComputer', () => {
    const token = cancellation_1.CancellationToken.None;
    let accessor;
    let embeddingsComputerMock;
    function createToolEmbeddingComputer(embeddings) {
        const computer = accessor.get(instantiation_1.IInstantiationService).createInstance(toolEmbeddingsCache_1.ToolEmbeddingsComputer);
        vitest_1.vi.spyOn(computer['embeddingsCache'], 'getEmbeddings').mockResolvedValue(embeddings);
        return computer;
    }
    function createMockEmbedding(value) {
        return {
            type: embeddingsComputer_1.EmbeddingType.text3small_512,
            value
        };
    }
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.resetAllMocks();
        const testingServiceCollection = (0, services_1.createExtensionUnitTestingServices)();
        embeddingsComputerMock = { _serviceBrand: undefined, computeEmbeddings: vitest_1.vi.fn() };
        testingServiceCollection.define(embeddingsComputer_1.IEmbeddingsComputer, embeddingsComputerMock);
        accessor = testingServiceCollection.createTestingAccessor();
    });
    (0, vitest_1.afterEach)(() => {
        accessor.dispose();
    });
    (0, vitest_1.it)('should return empty array when no tools are available', async () => {
        const availableTools = new Set();
        const queryEmbedding = createMockEmbedding([1, 0, 0]);
        const computer = createToolEmbeddingComputer(new Map());
        vitest_1.vi.spyOn(computer, 'rankEmbeddings').mockReturnValue([]);
        const result = await computer.retrieveSimilarEmbeddingsForAvailableTools(queryEmbedding, availableTools, 10, token);
        (0, vitest_1.expect)(result).toEqual([]);
    });
    (0, vitest_1.it)('should return tool names for available tools', async () => {
        const availableTools = new Set(['tool1', 'tool2']);
        const queryEmbedding = createMockEmbedding([1, 0, 0]);
        const computer = createToolEmbeddingComputer(new Map([
            ['tool1', createMockEmbedding([0.9, 0.1, 0])],
            ['tool2', createMockEmbedding([0.8, 0.2, 0])],
            ['tool3', createMockEmbedding([0, 1, 0])]
        ]));
        // Mock rankEmbeddings to return results in order
        vitest_1.vi.spyOn(computer, 'rankEmbeddings').mockReturnValue([
            { value: 'tool1', distance: { value: 0.5, embeddingType: embeddingsComputer_1.EmbeddingType.text3small_512 } },
            { value: 'tool2', distance: { value: 0.8, embeddingType: embeddingsComputer_1.EmbeddingType.text3small_512 } }
        ]);
        const result = await computer.retrieveSimilarEmbeddingsForAvailableTools(queryEmbedding, availableTools, 10, token);
        (0, vitest_1.expect)(result).toHaveLength(2);
        (0, vitest_1.expect)(result[0]).toBe('tool1');
        (0, vitest_1.expect)(result[1]).toBe('tool2');
    });
    (0, vitest_1.it)('should respect count parameter', async () => {
        const availableTools = new Set(['tool1', 'tool2', 'tool3']);
        const queryEmbedding = createMockEmbedding([1, 0, 0]);
        const computer = createToolEmbeddingComputer(new Map([
            ['tool1', createMockEmbedding([0.9, 0.1, 0])],
            ['tool2', createMockEmbedding([0.8, 0.2, 0])],
            ['tool3', createMockEmbedding([0, 1, 0])]
        ]));
        // Mock rankEmbeddings to return limited results based on count
        vitest_1.vi.spyOn(computer, 'rankEmbeddings').mockReturnValue([
            { value: 'tool1', distance: { value: 0.3, embeddingType: embeddingsComputer_1.EmbeddingType.text3small_512 } },
            { value: 'tool2', distance: { value: 0.6, embeddingType: embeddingsComputer_1.EmbeddingType.text3small_512 } }
        ]);
        const result = await computer.retrieveSimilarEmbeddingsForAvailableTools(queryEmbedding, availableTools, 2, // Limit to 2 results
        token);
        (0, vitest_1.expect)(result).toHaveLength(2);
        (0, vitest_1.expect)(result[0]).toBe('tool1');
        (0, vitest_1.expect)(result[1]).toBe('tool2');
    });
    (0, vitest_1.it)('should maintain order from ranking function', async () => {
        const availableTools = new Set(['tool1', 'tool2', 'tool3']);
        const queryEmbedding = createMockEmbedding([1, 0, 0]);
        const computer = createToolEmbeddingComputer(new Map([
            ['tool1', createMockEmbedding([0.9, 0.1, 0])],
            ['tool2', createMockEmbedding([0.8, 0.2, 0])],
            ['tool3', createMockEmbedding([0, 1, 0])]
        ]));
        // Mock rankEmbeddings to return specific order (tool3, tool1, tool2)
        vitest_1.vi.spyOn(computer, 'rankEmbeddings').mockReturnValue([
            { value: 'tool3', distance: { value: 0.1, embeddingType: embeddingsComputer_1.EmbeddingType.text3small_512 } },
            { value: 'tool1', distance: { value: 0.5, embeddingType: embeddingsComputer_1.EmbeddingType.text3small_512 } },
            { value: 'tool2', distance: { value: 0.9, embeddingType: embeddingsComputer_1.EmbeddingType.text3small_512 } }
        ]);
        const result = await computer.retrieveSimilarEmbeddingsForAvailableTools(queryEmbedding, availableTools, 10, token);
        (0, vitest_1.expect)(result).toHaveLength(3);
        (0, vitest_1.expect)(result[0]).toBe('tool3');
        (0, vitest_1.expect)(result[1]).toBe('tool1');
        (0, vitest_1.expect)(result[2]).toBe('tool2');
    });
    (0, vitest_1.it)('should handle partial cache hits and compute missing embeddings', async () => {
        const availableTools = new Set(['tool1', 'tool2', 'tool3', 'tool4']);
        const queryEmbedding = createMockEmbedding([1, 0, 0]);
        // Create mock embeddings computer that returns embeddings for missing tools
        embeddingsComputerMock.computeEmbeddings.mockResolvedValue({
            values: [
                createMockEmbedding([0.7, 0.3, 0]), // tool3
                createMockEmbedding([0.5, 0.5, 0]) // tool4
            ]
        });
        const computer = createToolEmbeddingComputer(new Map([
            ['tool1', createMockEmbedding([0.9, 0.1, 0])],
            ['tool2', createMockEmbedding([0.8, 0.2, 0])]
        ]));
        vitest_1.vi.spyOn(computer, 'rankEmbeddings').mockReturnValue([
            { value: 'tool1', distance: { value: 0.4, embeddingType: embeddingsComputer_1.EmbeddingType.text3small_512 } },
            { value: 'tool4', distance: { value: 0.7, embeddingType: embeddingsComputer_1.EmbeddingType.text3small_512 } }
        ]);
        const result = await computer.retrieveSimilarEmbeddingsForAvailableTools(queryEmbedding, availableTools, 10, token);
        (0, vitest_1.expect)(result).toHaveLength(2);
        (0, vitest_1.expect)(result[0]).toBe('tool1');
        (0, vitest_1.expect)(result[1]).toBe('tool4');
        (0, vitest_1.expect)(embeddingsComputerMock.computeEmbeddings).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(embeddingsComputerMock.computeEmbeddings.mock.calls[0][1]).toEqual(['tool3', 'tool4']);
    });
    (0, vitest_1.it)('shoulds cache computed embeddings for future use', async () => {
        const availableTools = new Set(['tool1', 'tool2', 'tool3']);
        const queryEmbedding = createMockEmbedding([1, 0, 0]);
        const computer = createToolEmbeddingComputer(new Map([
            ['tool1', createMockEmbedding([0.9, 0.1, 0])]
        ]));
        vitest_1.vi.spyOn(computer, 'rankEmbeddings').mockReturnValue([
            { value: 'tool1', distance: { value: 0.2, embeddingType: embeddingsComputer_1.EmbeddingType.text3small_512 } },
            { value: 'tool3', distance: { value: 0.5, embeddingType: embeddingsComputer_1.EmbeddingType.text3small_512 } }
        ]);
        embeddingsComputerMock.computeEmbeddings.mockResolvedValue({
            values: [
                createMockEmbedding([0.8, 0.2, 0]), // tool2
                createMockEmbedding([0, 0, 1]) // tool3
            ]
        });
        let result = await computer.retrieveSimilarEmbeddingsForAvailableTools(queryEmbedding, availableTools, 10, token);
        (0, vitest_1.expect)(result).toHaveLength(2);
        (0, vitest_1.expect)(result[0]).toBe('tool1');
        (0, vitest_1.expect)(result[1]).toBe('tool3');
        (0, vitest_1.expect)(embeddingsComputerMock.computeEmbeddings).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(embeddingsComputerMock.computeEmbeddings.mock.calls[0][1]).toEqual(['tool2', 'tool3']);
        result = await computer.retrieveSimilarEmbeddingsForAvailableTools(queryEmbedding, availableTools, 10, token);
        (0, vitest_1.expect)(result).toHaveLength(2);
        (0, vitest_1.expect)(result[0]).toBe('tool1');
        (0, vitest_1.expect)(result[1]).toBe('tool3');
        (0, vitest_1.expect)(embeddingsComputerMock.computeEmbeddings).toHaveBeenCalledTimes(1);
    });
});
//# sourceMappingURL=toolEmbeddingsCache.spec.js.map