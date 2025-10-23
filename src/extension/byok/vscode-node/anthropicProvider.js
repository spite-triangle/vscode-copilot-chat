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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var AnthropicLMProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnthropicLMProvider = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const vscode_1 = require("vscode");
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const logService_1 = require("../../../platform/log/common/logService");
const requestLogger_1 = require("../../../platform/requestLogger/node/requestLogger");
const progressRecorder_1 = require("../../../util/common/progressRecorder");
const errorMessage_1 = require("../../../util/vs/base/common/errorMessage");
const uuid_1 = require("../../../util/vs/base/common/uuid");
const anthropicMessageConverter_1 = require("../common/anthropicMessageConverter");
const byokProvider_1 = require("../common/byokProvider");
const byokUIService_1 = require("./byokUIService");
let AnthropicLMProvider = class AnthropicLMProvider {
    static { AnthropicLMProvider_1 = this; }
    static { this.providerName = 'Anthropic'; }
    constructor(_knownModels, _byokStorageService, _logService, _requestLogger) {
        this._knownModels = _knownModels;
        this._byokStorageService = _byokStorageService;
        this._logService = _logService;
        this._requestLogger = _requestLogger;
        this.authType = 0 /* BYOKAuthType.GlobalApiKey */;
    }
    // Filters the byok known models based on what the anthropic API knows as well
    async getAllModels(apiKey) {
        if (!this._anthropicAPIClient) {
            this._anthropicAPIClient = new sdk_1.default({ apiKey });
        }
        try {
            const response = await this._anthropicAPIClient.models.list();
            const modelList = {};
            for (const model of response.data) {
                if (this._knownModels && this._knownModels[model.id]) {
                    modelList[model.id] = this._knownModels[model.id];
                }
                else {
                    // Mix in generic capabilities for models we don't know
                    modelList[model.id] = {
                        maxInputTokens: 100000,
                        maxOutputTokens: 16000,
                        name: model.display_name,
                        toolCalling: true,
                        vision: false
                    };
                }
            }
            return modelList;
        }
        catch (error) {
            this._logService.error(error, `Error fetching available ${AnthropicLMProvider_1.providerName} models`);
            throw new Error(error.message ? error.message : error);
        }
    }
    async updateAPIKey() {
        this._apiKey = await (0, byokUIService_1.promptForAPIKey)(AnthropicLMProvider_1.providerName, await this._byokStorageService.getAPIKey(AnthropicLMProvider_1.providerName) !== undefined);
        if (this._apiKey) {
            await this._byokStorageService.storeAPIKey(AnthropicLMProvider_1.providerName, this._apiKey, 0 /* BYOKAuthType.GlobalApiKey */);
        }
    }
    async provideLanguageModelChatInformation(options, token) {
        if (!this._apiKey) { // If we don't have the API key it might just be in storage, so we try to read it first
            this._apiKey = await this._byokStorageService.getAPIKey(AnthropicLMProvider_1.providerName);
        }
        try {
            if (this._apiKey) {
                return (0, byokProvider_1.byokKnownModelsToAPIInfo)(AnthropicLMProvider_1.providerName, await this.getAllModels(this._apiKey));
            }
            else if (options.silent && !this._apiKey) {
                return [];
            }
            else { // Not silent, and no api key = good to prompt user for api key
                await this.updateAPIKey();
                if (this._apiKey) {
                    return (0, byokProvider_1.byokKnownModelsToAPIInfo)(AnthropicLMProvider_1.providerName, await this.getAllModels(this._apiKey));
                }
                else {
                    return [];
                }
            }
        }
        catch {
            return [];
        }
    }
    async provideLanguageModelChatResponse(model, messages, options, progress, token) {
        if (!this._anthropicAPIClient) {
            return;
        }
        // Convert the messages from the API format into messages that we can use against anthropic
        const { system, messages: convertedMessages } = (0, anthropicMessageConverter_1.apiMessageToAnthropicMessage)(messages);
        const requestId = (0, uuid_1.generateUuid)();
        const pendingLoggedChatRequest = this._requestLogger.logChatRequest('AnthropicBYOK', {
            model: model.id,
            modelMaxPromptTokens: model.maxInputTokens,
            urlOrRequestMetadata: this._anthropicAPIClient.baseURL,
        }, {
            model: model.id,
            messages: (0, anthropicMessageConverter_1.anthropicMessagesToRawMessagesForLogging)(convertedMessages, system),
            ourRequestId: requestId,
            location: commonTypes_1.ChatLocation.Other,
            tools: options.tools?.map((tool) => ({
                type: 'function',
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.inputSchema
                }
            })),
        });
        const tools = (options.tools ?? []).map(tool => {
            if (!tool.inputSchema) {
                return {
                    name: tool.name,
                    description: tool.description,
                    input_schema: {
                        type: 'object',
                        properties: {},
                        required: []
                    }
                };
            }
            return {
                name: tool.name,
                description: tool.description,
                input_schema: {
                    type: 'object',
                    properties: tool.inputSchema.properties ?? {},
                    required: tool.inputSchema.required ?? [],
                    $schema: tool.inputSchema.$schema
                }
            };
        });
        const params = {
            model: model.id,
            messages: convertedMessages,
            max_tokens: model.maxOutputTokens,
            stream: true,
            system: [system],
            tools: tools.length > 0 ? tools : undefined,
        };
        const wrappedProgress = new progressRecorder_1.RecordedProgress(progress);
        try {
            const result = await this._makeRequest(wrappedProgress, params, token);
            if (result.ttft) {
                pendingLoggedChatRequest.markTimeToFirstToken(result.ttft);
            }
            pendingLoggedChatRequest.resolve({
                type: commonTypes_1.ChatFetchResponseType.Success,
                requestId,
                serverRequestId: requestId,
                usage: result.usage,
                value: ['value'],
            }, wrappedProgress.items.map((i) => {
                return {
                    text: i instanceof vscode_1.LanguageModelTextPart ? i.value : '',
                    copilotToolCalls: i instanceof vscode_1.LanguageModelToolCallPart ? [{
                            name: i.name,
                            arguments: JSON.stringify(i.input),
                            id: i.callId
                        }] : undefined,
                };
            }));
        }
        catch (err) {
            this._logService.error(`BYOK Anthropic error: ${(0, errorMessage_1.toErrorMessage)(err, true)}`);
            pendingLoggedChatRequest.resolve({
                type: commonTypes_1.ChatFetchResponseType.Unknown,
                requestId,
                serverRequestId: requestId,
                reason: err.message
            }, wrappedProgress.items.map((i) => {
                return {
                    text: i instanceof vscode_1.LanguageModelTextPart ? i.value : '',
                    copilotToolCalls: i instanceof vscode_1.LanguageModelToolCallPart ? [{
                            name: i.name,
                            arguments: JSON.stringify(i.input),
                            id: i.callId
                        }] : undefined,
                };
            }));
            throw err;
        }
    }
    async provideTokenCount(model, text, token) {
        // Simple estimation - actual token count would require Claude's tokenizer
        return Math.ceil(text.toString().length / 4);
    }
    async _makeRequest(progress, params, token) {
        if (!this._anthropicAPIClient) {
            return { ttft: undefined, usage: undefined };
        }
        const start = Date.now();
        let ttft;
        const stream = await this._anthropicAPIClient.messages.create(params);
        let pendingToolCall;
        let usage;
        let hasText = false;
        let firstTool = true;
        for await (const chunk of stream) {
            if (token.isCancellationRequested) {
                break;
            }
            if (ttft === undefined) {
                ttft = Date.now() - start;
            }
            this._logService.trace(`chunk: ${JSON.stringify(chunk)}`);
            if (chunk.type === 'content_block_start') {
                if ('content_block' in chunk && chunk.content_block.type === 'tool_use') {
                    if (hasText && firstTool) {
                        // Flush the linkifier stream otherwise it pauses before the tool call if the last word ends with a punctuation mark.
                        progress.report(new vscode_1.LanguageModelTextPart(' '));
                    }
                    pendingToolCall = {
                        toolId: chunk.content_block.id,
                        name: chunk.content_block.name,
                        jsonInput: ''
                    };
                    firstTool = false;
                }
                continue;
            }
            if (chunk.type === 'content_block_delta') {
                if (chunk.delta.type === 'text_delta') {
                    progress.report(new vscode_1.LanguageModelTextPart(chunk.delta.text || ''));
                    hasText ||= chunk.delta.text?.length > 0;
                }
                else if (chunk.delta.type === 'input_json_delta' && pendingToolCall) {
                    pendingToolCall.jsonInput = (pendingToolCall.jsonInput || '') + (chunk.delta.partial_json || '');
                    try {
                        // Try to parse the accumulated JSON to see if it's complete
                        const parsedJson = JSON.parse(pendingToolCall.jsonInput);
                        progress.report(new vscode_1.LanguageModelToolCallPart(pendingToolCall.toolId, pendingToolCall.name, parsedJson));
                        pendingToolCall = undefined;
                    }
                    catch {
                        // JSON is not complete yet, continue accumulating
                        continue;
                    }
                }
            }
            if (chunk.type === 'content_block_stop' && pendingToolCall) {
                try {
                    const parsedJson = JSON.parse(pendingToolCall.jsonInput || '{}');
                    progress.report(new vscode_1.LanguageModelToolCallPart(pendingToolCall.toolId, pendingToolCall.name, parsedJson));
                }
                catch (e) {
                    console.error('Failed to parse tool call JSON:', e);
                }
                pendingToolCall = undefined;
            }
            if (chunk.type === 'message_start') {
                // TODO final output tokens: {"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null},"usage":{"output_tokens":46}}
                usage = {
                    completion_tokens: -1,
                    prompt_tokens: chunk.message.usage.input_tokens + (chunk.message.usage.cache_creation_input_tokens ?? 0) + (chunk.message.usage.cache_read_input_tokens ?? 0),
                    total_tokens: -1,
                    prompt_tokens_details: {
                        cached_tokens: chunk.message.usage.cache_read_input_tokens ?? 0,
                        cache_creation_input_tokens: chunk.message.usage.cache_creation_input_tokens
                    }
                };
            }
            else if (usage && chunk.type === 'message_delta') {
                if (chunk.usage.output_tokens) {
                    usage.completion_tokens = chunk.usage.output_tokens;
                    usage.total_tokens = usage.prompt_tokens + chunk.usage.output_tokens;
                }
            }
        }
        return { ttft, usage };
    }
};
exports.AnthropicLMProvider = AnthropicLMProvider;
exports.AnthropicLMProvider = AnthropicLMProvider = AnthropicLMProvider_1 = __decorate([
    __param(2, logService_1.ILogService),
    __param(3, requestLogger_1.IRequestLogger)
], AnthropicLMProvider);
//# sourceMappingURL=anthropicProvider.js.map