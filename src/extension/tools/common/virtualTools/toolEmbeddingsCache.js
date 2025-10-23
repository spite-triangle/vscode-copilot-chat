"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolEmbeddingsComputer = exports.PreComputedToolEmbeddingsCache = exports.EMBEDDING_TYPE_FOR_TOOL_GROUPING = void 0;
const embeddingsComputer_1 = require("../../../../platform/embeddings/common/embeddingsComputer");
const embeddingsIndex_1 = require("../../../../platform/embeddings/common/embeddingsIndex");
const envService_1 = require("../../../../platform/env/common/envService");
const logService_1 = require("../../../../platform/log/common/logService");
const telemetryCorrelationId_1 = require("../../../../util/common/telemetryCorrelationId");
const vscodeVersion_1 = require("../../../../util/common/vscodeVersion");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
exports.EMBEDDING_TYPE_FOR_TOOL_GROUPING = embeddingsComputer_1.EmbeddingType.text3small_512;
let PreComputedToolEmbeddingsCache = class PreComputedToolEmbeddingsCache {
    constructor(_logService, instantiationService, envService) {
        this._logService = _logService;
        const cacheVersion = (0, vscodeVersion_1.sanitizeVSCodeVersion)(envService.getEditorInfo().version);
        this.cache = instantiationService.createInstance(embeddingsIndex_1.RemoteEmbeddingsCache, embeddingsIndex_1.EmbeddingCacheType.GLOBAL, 'toolEmbeddings', cacheVersion, exports.EMBEDDING_TYPE_FOR_TOOL_GROUPING, embeddingsIndex_1.RemoteCacheType.Tools);
    }
    get embeddingType() {
        return this.cache.embeddingType;
    }
    async getEmbeddings() {
        if (!this.embeddingsMap) {
            this.embeddingsMap = await this.loadEmbeddings();
        }
        return this.embeddingsMap;
    }
    async loadEmbeddings() {
        try {
            const embeddingsData = await this.cache.getCache();
            const embeddingsMap = new Map();
            if (embeddingsData) {
                for (const [key, embeddingVector] of Object.entries(embeddingsData)) {
                    if (embeddingVector === undefined) {
                        this._logService.warn(`Tool embedding missing for key: ${key}`);
                        continue;
                    }
                    embeddingsMap.set(key, {
                        type: this.embeddingType,
                        value: embeddingVector.embedding
                    });
                }
            }
            return embeddingsMap;
        }
        catch (e) {
            this._logService.error('Failed to load pre-computed tool embeddings', e);
            return new Map();
        }
    }
};
exports.PreComputedToolEmbeddingsCache = PreComputedToolEmbeddingsCache;
exports.PreComputedToolEmbeddingsCache = PreComputedToolEmbeddingsCache = __decorate([
    __param(0, logService_1.ILogService),
    __param(1, instantiation_1.IInstantiationService),
    __param(2, envService_1.IEnvService)
], PreComputedToolEmbeddingsCache);
/**
 * Manages tool embeddings from both pre-computed cache and runtime computation
 */
let ToolEmbeddingsComputer = class ToolEmbeddingsComputer {
    constructor(embeddingsComputer, _logService, instantiationService) {
        this.embeddingsComputer = embeddingsComputer;
        this._logService = _logService;
        this.embeddingsStore = new Map();
        this.isInitialized = false;
        this.embeddingsCache = instantiationService.createInstance(PreComputedToolEmbeddingsCache);
    }
    /**
     * Legacy method name for backward compatibility
     */
    async retrieveSimilarEmbeddingsForAvailableTools(queryEmbedding, availableToolNames, count, token) {
        await this.ensureInitialized();
        await this.ensureToolEmbeddings(availableToolNames, token);
        if (token.isCancellationRequested) {
            return [];
        }
        const availableEmbeddings = this.getAvailableToolEmbeddings(availableToolNames);
        if (availableEmbeddings.length === 0) {
            return [];
        }
        const rankedEmbeddings = this.rankEmbeddings(queryEmbedding, availableEmbeddings, count);
        return rankedEmbeddings.map(x => x.value);
    }
    rankEmbeddings(queryEmbedding, availableEmbeddings, count) {
        return (0, embeddingsComputer_1.rankEmbeddings)(queryEmbedding, availableEmbeddings, count);
    }
    /**
     * Ensures pre-computed embeddings are loaded into the store
     */
    async ensureInitialized() {
        if (this.isInitialized) {
            return;
        }
        const preComputedEmbeddings = await this.embeddingsCache.getEmbeddings();
        for (const [toolName, embedding] of preComputedEmbeddings) {
            this.embeddingsStore.set(toolName, embedding);
        }
        this.isInitialized = true;
    }
    /**
     * Ensures all required tool embeddings are available (computing missing ones if needed)
     */
    async ensureToolEmbeddings(toolNames, token) {
        if (token.isCancellationRequested) {
            return;
        }
        const missingTools = [...toolNames].filter(t => !this.embeddingsStore.has(t));
        await this.computeMissingEmbeddings(missingTools, token);
    }
    /**
     * Computes embeddings for missing tools and stores them
     */
    async computeMissingEmbeddings(missingToolNames, token) {
        if (token.isCancellationRequested || missingToolNames.length === 0) {
            return;
        }
        try {
            const computedEmbeddings = await this.computeEmbeddingsForTools(missingToolNames, token);
            if (computedEmbeddings) {
                for (const [toolName, embedding] of computedEmbeddings) {
                    this.embeddingsStore.set(toolName, embedding);
                }
            }
        }
        catch (e) {
            this._logService.error('Failed to compute embeddings for tools', e);
        }
    }
    /**
     * Computes embeddings for a list of tool names
     */
    async computeEmbeddingsForTools(toolNames, token) {
        if (token.isCancellationRequested) {
            return undefined;
        }
        const embeddings = await this.embeddingsComputer.computeEmbeddings(this.embeddingsCache.embeddingType, toolNames, {}, new telemetryCorrelationId_1.TelemetryCorrelationId('ToolEmbeddingsComputer::computeEmbeddingsForTools'), token);
        if (embeddings?.values.length === 0 || embeddings?.values.length !== toolNames.length) {
            return undefined;
        }
        return toolNames.map((name, index) => [name, embeddings.values[index]]);
    }
    /**
     * Gets embeddings for available tools as an array suitable for ranking
     */
    getAvailableToolEmbeddings(availableToolNames) {
        const result = [];
        for (const toolName of availableToolNames) {
            const embedding = this.embeddingsStore.get(toolName);
            if (embedding) {
                result.push([toolName, embedding]);
            }
        }
        return result;
    }
};
exports.ToolEmbeddingsComputer = ToolEmbeddingsComputer;
exports.ToolEmbeddingsComputer = ToolEmbeddingsComputer = __decorate([
    __param(0, embeddingsComputer_1.IEmbeddingsComputer),
    __param(1, logService_1.ILogService),
    __param(2, instantiation_1.IInstantiationService)
], ToolEmbeddingsComputer);
//# sourceMappingURL=toolEmbeddingsCache.js.map