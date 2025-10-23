"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.createResponsesRequestBody = createResponsesRequestBody;
exports.processResponseFromChatEndpoint = processResponseFromChatEndpoint;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const arrays_1 = require("../../../util/vs/base/common/arrays");
const async_1 = require("../../../util/vs/base/common/async");
const buffer_1 = require("../../../util/vs/base/common/buffer");
const lazy_1 = require("../../../util/vs/base/common/lazy");
const sseParser_1 = require("../../../util/vs/base/common/sseParser");
const types_1 = require("../../../util/vs/base/common/types");
const uuid_1 = require("../../../util/vs/base/common/uuid");
const configurationService_1 = require("../../configuration/common/configurationService");
const openai_1 = require("../../networking/common/openai");
const nullExperimentationService_1 = require("../../telemetry/common/nullExperimentationService");
const statefulMarkerContainer_1 = require("../common/statefulMarkerContainer");
const thinkingDataContainer_1 = require("../common/thinkingDataContainer");
function createResponsesRequestBody(accessor, options, model, modelInfo) {
    const configService = accessor.get(configurationService_1.IConfigurationService);
    const expService = accessor.get(nullExperimentationService_1.IExperimentationService);
    const body = {
        model,
        ...rawMessagesToResponseAPI(model, options.messages, !!options.ignoreStatefulMarker),
        stream: true,
        tools: options.requestOptions?.tools?.map((tool) => ({
            ...tool.function,
            type: 'function',
            strict: false,
            parameters: (tool.function.parameters || {}),
        })),
        // Only a subset of completion post options are supported, and some
        // are renamed. Handle them manually:
        top_p: options.postOptions.top_p,
        max_output_tokens: options.postOptions.max_tokens,
        tool_choice: typeof options.postOptions.tool_choice === 'object'
            ? { type: 'function', name: options.postOptions.tool_choice.function.name }
            : options.postOptions.tool_choice,
        top_logprobs: options.postOptions.logprobs ? 3 : undefined,
        store: false
    };
    body.truncation = configService.getConfig(configurationService_1.ConfigKey.Internal.UseResponsesApiTruncation) ?
        'auto' :
        'disabled';
    const effortConfig = configService.getExperimentBasedConfig(configurationService_1.ConfigKey.ResponsesApiReasoningEffort, expService);
    const summaryConfig = configService.getExperimentBasedConfig(configurationService_1.ConfigKey.ResponsesApiReasoningSummary, expService);
    const effort = effortConfig === 'default' ? undefined : effortConfig;
    const summary = summaryConfig === 'off' ? undefined : summaryConfig;
    if (effort || summary) {
        body.reasoning = {
            ...(effort ? { effort } : {}),
            ...(summary ? { summary } : {})
        };
    }
    body.include = ['reasoning.encrypted_content'];
    return body;
}
function rawMessagesToResponseAPI(modelId, messages, ignoreStatefulMarker) {
    const statefulMarkerAndIndex = !ignoreStatefulMarker && (0, statefulMarkerContainer_1.getStatefulMarkerAndIndex)(modelId, messages);
    let previousResponseId;
    if (statefulMarkerAndIndex) {
        previousResponseId = statefulMarkerAndIndex.statefulMarker;
        messages = messages.slice(statefulMarkerAndIndex.index + 1);
    }
    const input = [];
    for (const message of messages) {
        switch (message.role) {
            case prompt_tsx_1.Raw.ChatRole.Assistant:
                if (message.content.length) {
                    input.push(...extractThinkingData(message.content));
                    const asstContent = message.content.map(rawContentToResponsesOutputContent).filter(types_1.isDefined);
                    if (asstContent.length) {
                        input.push({
                            role: 'assistant',
                            content: asstContent,
                            // I don't think this needs to be round-tripped.
                            id: 'msg_123',
                            status: 'completed',
                            type: 'message',
                        });
                    }
                }
                if (message.toolCalls) {
                    for (const toolCall of message.toolCalls) {
                        input.push({ type: 'function_call', name: toolCall.function.name, arguments: toolCall.function.arguments, call_id: toolCall.id });
                    }
                }
                break;
            case prompt_tsx_1.Raw.ChatRole.Tool:
                if (message.toolCallId) {
                    const asText = message.content
                        .filter(c => c.type === prompt_tsx_1.Raw.ChatCompletionContentPartKind.Text)
                        .map(c => c.text)
                        .join('');
                    const asImages = message.content
                        .filter(c => c.type === prompt_tsx_1.Raw.ChatCompletionContentPartKind.Image)
                        .map((c) => ({
                        type: 'input_image',
                        detail: c.imageUrl.detail || 'auto',
                        image_url: c.imageUrl.url,
                    }));
                    // todod@connor4312: hack while responses API only supports text output from tools
                    input.push({ type: 'function_call_output', call_id: message.toolCallId, output: asText });
                    if (asImages.length) {
                        input.push({ role: 'user', content: [{ type: 'input_text', text: 'Image associated with the above tool call:' }, ...asImages] });
                    }
                }
                break;
            case prompt_tsx_1.Raw.ChatRole.User:
                input.push({ role: 'user', content: message.content.map(rawContentToResponsesContent).filter(types_1.isDefined) });
                break;
            case prompt_tsx_1.Raw.ChatRole.System:
                input.push({ role: 'system', content: message.content.map(rawContentToResponsesContent).filter(types_1.isDefined) });
                break;
        }
    }
    return { input, previous_response_id: previousResponseId };
}
function rawContentToResponsesContent(part) {
    switch (part.type) {
        case prompt_tsx_1.Raw.ChatCompletionContentPartKind.Text:
            return { type: 'input_text', text: part.text };
        case prompt_tsx_1.Raw.ChatCompletionContentPartKind.Image:
            return { type: 'input_image', detail: part.imageUrl.detail || 'auto', image_url: part.imageUrl.url };
        case prompt_tsx_1.Raw.ChatCompletionContentPartKind.Opaque: {
            const maybeCast = part.value;
            if (maybeCast.type === 'input_text' || maybeCast.type === 'input_image' || maybeCast.type === 'input_file') {
                return maybeCast;
            }
        }
    }
}
function rawContentToResponsesOutputContent(part) {
    switch (part.type) {
        case prompt_tsx_1.Raw.ChatCompletionContentPartKind.Text:
            if (part.text.trim()) {
                return { type: 'output_text', text: part.text, annotations: [] };
            }
    }
}
function extractThinkingData(content) {
    return (0, arrays_1.coalesce)(content.map(part => {
        if (part.type === prompt_tsx_1.Raw.ChatCompletionContentPartKind.Opaque) {
            const thinkingData = (0, thinkingDataContainer_1.rawPartAsThinkingData)(part);
            if (thinkingData) {
                return {
                    type: 'reasoning',
                    id: thinkingData.id,
                    summary: [],
                    encrypted_content: thinkingData.encrypted,
                };
            }
        }
    }));
}
async function processResponseFromChatEndpoint(instantiationService, telemetryService, logService, response, expectedNumChoices, finishCallback, telemetryData) {
    const body = (await response.body());
    return new async_1.AsyncIterableObject(async (feed) => {
        const requestId = response.headers.get('X-Request-ID') ?? (0, uuid_1.generateUuid)();
        const processor = instantiationService.createInstance(OpenAIResponsesProcessor, telemetryData, requestId);
        const parser = new sseParser_1.SSEParser((ev) => {
            try {
                logService.trace(`SSE: ${ev.data}`);
                const completion = processor.push({ type: ev.type, ...JSON.parse(ev.data) }, finishCallback);
                if (completion) {
                    feed.emitOne(completion);
                }
            }
            catch (e) {
                feed.reject(e);
            }
        });
        for await (const chunk of body) {
            parser.feed(chunk);
        }
    }, () => {
        body.destroy();
    });
}
class OpenAIResponsesProcessor {
    constructor(telemetryData, requestId) {
        this.telemetryData = telemetryData;
        this.requestId = requestId;
        this.textAccumulator = '';
        this.hasReceivedReasoningSummary = false;
    }
    push(chunk, _onProgress) {
        const onProgress = (delta) => {
            this.textAccumulator += delta.text;
            _onProgress(this.textAccumulator, 0, delta);
        };
        switch (chunk.type) {
            case 'error':
                return onProgress({ text: '', copilotErrors: [{ agent: 'openai', code: chunk.code || 'unknown', message: chunk.message, type: 'error', identifier: chunk.param || undefined }] });
            case 'response.output_text.delta': {
                const capiChunk = chunk;
                const haystack = new lazy_1.Lazy(() => new TextEncoder().encode(capiChunk.delta));
                return onProgress({
                    text: capiChunk.delta,
                    logprobs: capiChunk.logprobs && {
                        content: capiChunk.logprobs.map(lp => ({
                            ...mapLogProp(haystack, lp),
                            top_logprobs: lp.top_logprobs?.map(l => mapLogProp(haystack, l)) || []
                        }))
                    },
                });
            }
            case 'response.output_item.added':
                if (chunk.item.type === 'function_call') {
                    onProgress({
                        text: '',
                        beginToolCalls: [{ name: chunk.item.name }]
                    });
                }
                return;
            case 'response.output_item.done':
                if (chunk.item.type === 'function_call') {
                    onProgress({
                        text: '',
                        copilotToolCalls: [{
                                id: chunk.item.call_id,
                                name: chunk.item.name,
                                arguments: chunk.item.arguments,
                            }],
                    });
                }
                else if (chunk.item.type === 'reasoning') {
                    onProgress({
                        text: '',
                        thinking: chunk.item.encrypted_content ? {
                            id: chunk.item.id,
                            // CAPI models don't stream the reasoning summary for some reason, byok do, so don't duplicate it
                            text: this.hasReceivedReasoningSummary ?
                                undefined :
                                chunk.item.summary.map(s => s.text),
                            encrypted: chunk.item.encrypted_content,
                        } : undefined
                    });
                }
                return;
            case 'response.reasoning_summary_text.delta':
                this.hasReceivedReasoningSummary = true;
                return onProgress({
                    text: '',
                    thinking: {
                        id: chunk.item_id,
                        text: chunk.delta,
                    }
                });
            case 'response.reasoning_summary_part.done':
                this.hasReceivedReasoningSummary = true;
                return onProgress({
                    text: '',
                    thinking: {
                        id: chunk.item_id
                    }
                });
            case 'response.completed':
                onProgress({ text: '', statefulMarker: chunk.response.id });
                return {
                    blockFinished: true,
                    choiceIndex: 0,
                    tokens: [],
                    telemetryData: this.telemetryData,
                    requestId: { headerRequestId: this.requestId, completionId: chunk.response.id, created: chunk.response.created_at, deploymentId: '', serverExperiments: '' },
                    usage: {
                        prompt_tokens: chunk.response.usage?.input_tokens ?? 0,
                        completion_tokens: chunk.response.usage?.output_tokens ?? 0,
                        total_tokens: chunk.response.usage?.total_tokens ?? 0,
                        prompt_tokens_details: {
                            cached_tokens: chunk.response.usage?.input_tokens_details.cached_tokens ?? 0,
                        },
                        completion_tokens_details: {
                            reasoning_tokens: chunk.response.usage?.output_tokens_details.reasoning_tokens ?? 0,
                            accepted_prediction_tokens: 0,
                            rejected_prediction_tokens: 0,
                        },
                    },
                    finishReason: openai_1.FinishedCompletionReason.Stop,
                    message: {
                        role: prompt_tsx_1.Raw.ChatRole.Assistant,
                        content: chunk.response.output.map((item) => {
                            if (item.type === 'message') {
                                return { type: prompt_tsx_1.Raw.ChatCompletionContentPartKind.Text, text: item.content.map(c => c.type === 'output_text' ? c.text : c.refusal).join('') };
                            }
                            else if (item.type === 'image_generation_call' && item.result) {
                                return { type: prompt_tsx_1.Raw.ChatCompletionContentPartKind.Image, imageUrl: { url: item.result } };
                            }
                        }).filter(types_1.isDefined),
                    }
                };
        }
    }
}
function mapLogProp(text, lp) {
    let bytes = [];
    if (lp.token) {
        const needle = new TextEncoder().encode(lp.token);
        const haystack = text.value;
        const idx = (0, buffer_1.binaryIndexOf)(haystack, needle);
        if (idx !== -1) {
            bytes = [idx, idx + needle.length];
        }
    }
    return {
        token: lp.token,
        bytes,
        logprob: lp.logprob,
    };
}
//# sourceMappingURL=responsesApi.js.map