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
exports.EmbeddingEndpoint = void 0;
const copilot_api_1 = require("@vscode/copilot-api");
const vscode_1 = require("vscode");
const tokenizer_1 = require("../../tokenizer/node/tokenizer");
let EmbeddingEndpoint = class EmbeddingEndpoint {
    constructor(_modelInfo, _tokenizerProvider) {
        this._modelInfo = _modelInfo;
        this._tokenizerProvider = _tokenizerProvider;
        this.name = this._modelInfo.name;
        this.version = this._modelInfo.version;
        this.family = this._modelInfo.capabilities.family;
        let config = vscode_1.workspace.getConfiguration('github.copilot.embeddingModel');
        this.tokenizer = config.get('tokenzier', this._modelInfo.capabilities.tokenizer);
        this.maxBatchSize = config.get('max_chunk_bacth', this._modelInfo.capabilities.limits?.max_inputs ?? 256);
        this.modelMaxPromptTokens = config.get('max_chunk_tokens', 250);
    }
    acquireTokenizer() {
        return this._tokenizerProvider.acquireTokenizer(this);
    }
    get urlOrRequestMetadata() {
        return { type: copilot_api_1.RequestType.CAPIEmbeddings, modelId: "text-embedding-3-small" /* LEGACY_EMBEDDING_MODEL_ID.TEXT3SMALL */ };
    }
};
exports.EmbeddingEndpoint = EmbeddingEndpoint;
exports.EmbeddingEndpoint = EmbeddingEndpoint = __decorate([
    __param(1, tokenizer_1.ITokenizerProvider)
], EmbeddingEndpoint);
//# sourceMappingURL=embeddingsEndpoint.js.map