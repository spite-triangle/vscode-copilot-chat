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
var ExtensionContributedChatEndpoint_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionContributedChatEndpoint = void 0;
exports.convertToApiChatMessage = convertToApiChatMessage;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const vscode = __importStar(require("vscode"));
const tokenizer_1 = require("../../../util/common/tokenizer");
const errorMessage_1 = require("../../../util/vs/base/common/errorMessage");
const uuid_1 = require("../../../util/vs/base/common/uuid");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const commonTypes_1 = require("../../chat/common/commonTypes");
const tokenizer_2 = require("../../tokenizer/node/tokenizer");
const endpointProvider_1 = require("../common/endpointProvider");
const endpointTypes_1 = require("../common/endpointTypes");
const statefulMarkerContainer_1 = require("../common/statefulMarkerContainer");
const thinkingDataContainer_1 = require("../common/thinkingDataContainer");
let ExtensionContributedChatEndpoint = ExtensionContributedChatEndpoint_1 = class ExtensionContributedChatEndpoint {
    constructor(languageModel, _tokenizerProvider, _instantiationService) {
        this.languageModel = languageModel;
        this._tokenizerProvider = _tokenizerProvider;
        this._instantiationService = _instantiationService;
        this.isDefault = false;
        this.isFallback = false;
        this.isPremium = false;
        this.multiplier = 0;
        this.isExtensionContributed = true;
        // Initialize with the model's max tokens
        this._maxTokens = languageModel.maxInputTokens;
        this.supportedEditTools = languageModel.capabilities.editToolsHint?.filter(endpointProvider_1.isEndpointEditToolName);
    }
    get modelMaxPromptTokens() {
        return this._maxTokens;
    }
    get maxOutputTokens() {
        // The VS Code API doesn't expose max output tokens, use a reasonable default
        return 8192;
    }
    get urlOrRequestMetadata() {
        // Not used for extension contributed endpoints
        return '';
    }
    get model() {
        return this.languageModel.id;
    }
    get name() {
        return this.languageModel.name;
    }
    get version() {
        return this.languageModel.version;
    }
    get family() {
        return this.languageModel.family;
    }
    get tokenizer() {
        // Most language models use the O200K tokenizer, if they don't they should specify in their metadata
        return tokenizer_1.TokenizerType.O200K;
    }
    get showInModelPicker() {
        // TODO @lramos15 - Need some API exposed for this, registration seems to have it
        return true;
    }
    get supportsToolCalls() {
        return this.languageModel.capabilities?.supportsToolCalling ?? false;
    }
    get supportsVision() {
        return this.languageModel?.capabilities?.supportsImageToText ?? false;
    }
    get supportsPrediction() {
        return false;
    }
    get policy() {
        return 'enabled';
    }
    async processResponseFromChatEndpoint(telemetryService, logService, response, expectedNumChoices, finishCallback, telemetryData, cancellationToken) {
        throw new Error('processResponseFromChatEndpoint not supported for extension contributed endpoints');
    }
    async acceptChatPolicy() {
        return true;
    }
    acquireTokenizer() {
        // TODO @lramos15, this should be driven by the extension API.
        return this._tokenizerProvider.acquireTokenizer(this);
    }
    async makeChatRequest(debugName, messages, finishedCb, token, location, source, requestOptions, userInitiatedRequest, telemetryProperties) {
        return this.makeChatRequest2({
            debugName,
            messages,
            finishedCb,
            location,
            source,
            requestOptions,
            userInitiatedRequest,
            telemetryProperties,
        }, token);
    }
    async makeChatRequest2({ messages, requestOptions, finishedCb, }, token) {
        const vscodeMessages = convertToApiChatMessage(messages);
        const vscodeOptions = {
            tools: (requestOptions?.tools ?? []).map(tool => ({
                name: tool.function.name,
                description: tool.function.description,
                inputSchema: tool.function.parameters,
            }))
        };
        try {
            const response = await this.languageModel.sendRequest(vscodeMessages, vscodeOptions, token);
            let text = '';
            let numToolsCalled = 0;
            const requestId = (0, uuid_1.generateUuid)();
            // consume stream
            for await (const chunk of response.stream) {
                if (chunk instanceof vscode.LanguageModelTextPart) {
                    text += chunk.value;
                    // Call finishedCb with the current chunk of text
                    if (finishedCb) {
                        await finishedCb(text, 0, { text: chunk.value });
                    }
                }
                else if (chunk instanceof vscode.LanguageModelToolCallPart) {
                    // Call finishedCb with updated tool calls
                    if (finishedCb) {
                        const functionCalls = [chunk].map(tool => ({
                            name: tool.name ?? '',
                            arguments: JSON.stringify(tool.input) ?? '',
                            id: tool.callId
                        }));
                        numToolsCalled++;
                        await finishedCb(text, 0, { text: '', copilotToolCalls: functionCalls });
                    }
                }
                else if (chunk instanceof vscode.LanguageModelDataPart) {
                    if (chunk.mimeType === endpointTypes_1.CustomDataPartMimeTypes.StatefulMarker) {
                        const decoded = (0, statefulMarkerContainer_1.decodeStatefulMarker)(chunk.data);
                        await finishedCb?.(text, 0, { text: '', statefulMarker: decoded.marker });
                    }
                }
                else if (chunk instanceof vscode.LanguageModelThinkingPart) {
                    // Call finishedCb with the current chunk of thinking text with a specific thinking field
                    if (finishedCb) {
                        await finishedCb(text, 0, {
                            text: '', // Use empty text to avoid creating markdown part
                            thinking: {
                                text: chunk.value,
                                id: chunk.id || '',
                                metadata: chunk.metadata
                            }
                        });
                    }
                }
            }
            if (text || numToolsCalled > 0) {
                const response = {
                    type: commonTypes_1.ChatFetchResponseType.Success,
                    requestId,
                    serverRequestId: requestId,
                    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, prompt_tokens_details: { cached_tokens: 0 } },
                    value: text
                };
                return response;
            }
            else {
                return {
                    type: commonTypes_1.ChatFetchResponseType.Unknown,
                    reason: 'No response from language model',
                    requestId: requestId,
                    serverRequestId: undefined
                };
            }
        }
        catch (e) {
            return {
                type: commonTypes_1.ChatFetchResponseType.Failed,
                reason: (0, errorMessage_1.toErrorMessage)(e),
                requestId: (0, uuid_1.generateUuid)(),
                serverRequestId: undefined
            };
        }
    }
    createRequestBody(options) {
        throw new Error('unreachable'); // this endpoint does not call into fetchers
    }
    cloneWithTokenOverride(modelMaxPromptTokens) {
        return this._instantiationService.createInstance(ExtensionContributedChatEndpoint_1, {
            ...this.languageModel,
            maxInputTokens: modelMaxPromptTokens
        });
    }
};
exports.ExtensionContributedChatEndpoint = ExtensionContributedChatEndpoint;
exports.ExtensionContributedChatEndpoint = ExtensionContributedChatEndpoint = ExtensionContributedChatEndpoint_1 = __decorate([
    __param(1, tokenizer_2.ITokenizerProvider),
    __param(2, instantiation_1.IInstantiationService)
], ExtensionContributedChatEndpoint);
function convertToApiChatMessage(messages) {
    const apiMessages = [];
    for (const message of messages) {
        const apiContent = [];
        // Easier to work with arrays everywhere, rather than string in some cases. So convert to a single text content part
        for (const contentPart of message.content) {
            if (contentPart.type === prompt_tsx_1.Raw.ChatCompletionContentPartKind.Text) {
                apiContent.push(new vscode.LanguageModelTextPart(contentPart.text));
            }
            else if (contentPart.type === prompt_tsx_1.Raw.ChatCompletionContentPartKind.Image) {
                // Handle base64 encoded images
                if (contentPart.imageUrl.url.startsWith('data:')) {
                    const dataUrlRegex = /^data:([^;]+);base64,(.*)$/;
                    const match = contentPart.imageUrl.url.match(dataUrlRegex);
                    if (match) {
                        const [, mimeType, base64Data] = match;
                        apiContent.push(new vscode.LanguageModelDataPart(Buffer.from(base64Data, 'base64'), mimeType));
                    }
                }
                else {
                    // Not a base64 image
                    continue;
                }
            }
            else if (contentPart.type === prompt_tsx_1.Raw.ChatCompletionContentPartKind.CacheBreakpoint) {
                apiContent.push(new vscode.LanguageModelDataPart(new TextEncoder().encode('ephemeral'), endpointTypes_1.CustomDataPartMimeTypes.CacheControl));
            }
            else if (contentPart.type === prompt_tsx_1.Raw.ChatCompletionContentPartKind.Opaque) {
                const statefulMarker = (0, statefulMarkerContainer_1.rawPartAsStatefulMarker)(contentPart);
                if (statefulMarker) {
                    apiContent.push(new vscode.LanguageModelDataPart((0, statefulMarkerContainer_1.encodeStatefulMarker)(statefulMarker.modelId, statefulMarker.marker), endpointTypes_1.CustomDataPartMimeTypes.StatefulMarker));
                }
                const thinkingData = (0, thinkingDataContainer_1.rawPartAsThinkingData)(contentPart);
                if (thinkingData) {
                    apiContent.push(new vscode.LanguageModelThinkingPart(thinkingData.text, thinkingData.id, thinkingData.metadata));
                }
            }
        }
        if (message.role === prompt_tsx_1.Raw.ChatRole.System || message.role === prompt_tsx_1.Raw.ChatRole.User) {
            apiMessages.push({
                role: message.role === prompt_tsx_1.Raw.ChatRole.System ? vscode.LanguageModelChatMessageRole.System : vscode.LanguageModelChatMessageRole.User,
                name: message.name,
                content: apiContent
            });
        }
        else if (message.role === prompt_tsx_1.Raw.ChatRole.Assistant) {
            if (message.toolCalls) {
                for (const toolCall of message.toolCalls) {
                    apiContent.push(new vscode.LanguageModelToolCallPart(toolCall.id, toolCall.function.name, JSON.parse(toolCall.function.arguments)));
                }
            }
            apiMessages.push({
                role: vscode.LanguageModelChatMessageRole.Assistant,
                name: message.name,
                content: apiContent
            });
        }
        else if (message.role === prompt_tsx_1.Raw.ChatRole.Tool) {
            const toolResultPart = new vscode.LanguageModelToolResultPart2(message.toolCallId ?? '', apiContent);
            apiMessages.push({
                role: vscode.LanguageModelChatMessageRole.User,
                name: '',
                content: [toolResultPart]
            });
        }
    }
    return apiMessages;
}
//# sourceMappingURL=extChatEndpoint.js.map