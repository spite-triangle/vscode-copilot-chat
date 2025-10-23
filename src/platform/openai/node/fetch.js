"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatFailKind = exports.FetchResponseKind = void 0;
exports.fetchAndStreamChat = fetchAndStreamChat;
const crypto_1 = require("../../../util/common/crypto");
const uuid_1 = require("../../../util/vs/base/common/uuid");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const authentication_1 = require("../../authentication/common/authentication");
const chatQuotaService_1 = require("../../chat/common/chatQuotaService");
const commonTypes_1 = require("../../chat/common/commonTypes");
const interactionService_1 = require("../../chat/common/interactionService");
const capiClient_1 = require("../../endpoint/common/capiClient");
const domainService_1 = require("../../endpoint/common/domainService");
const envService_1 = require("../../env/common/envService");
const logService_1 = require("../../log/common/logService");
const fetch_1 = require("../../networking/common/fetch");
const fetcherService_1 = require("../../networking/common/fetcherService");
const networking_1 = require("../../networking/common/networking");
const chatStream_1 = require("../../networking/node/chatStream");
const stream_1 = require("../../networking/node/stream");
const telemetry_1 = require("../../telemetry/common/telemetry");
const telemetryData_1 = require("../../telemetry/common/telemetryData");
var FetchResponseKind;
(function (FetchResponseKind) {
    FetchResponseKind["Success"] = "success";
    FetchResponseKind["Failed"] = "failed";
    FetchResponseKind["Canceled"] = "canceled";
})(FetchResponseKind || (exports.FetchResponseKind = FetchResponseKind = {}));
var ChatFailKind;
(function (ChatFailKind) {
    ChatFailKind["OffTopic"] = "offTopic";
    ChatFailKind["TokenExpiredOrInvalid"] = "tokenExpiredOrInvalid";
    ChatFailKind["ServerCanceled"] = "serverCanceled";
    ChatFailKind["ClientNotSupported"] = "clientNotSupported";
    ChatFailKind["RateLimited"] = "rateLimited";
    ChatFailKind["QuotaExceeded"] = "quotaExceeded";
    ChatFailKind["ExtensionBlocked"] = "extensionBlocked";
    ChatFailKind["ServerError"] = "serverError";
    ChatFailKind["ContentFilter"] = "contentFilter";
    ChatFailKind["AgentUnauthorized"] = "unauthorized";
    ChatFailKind["AgentFailedDependency"] = "failedDependency";
    ChatFailKind["ValidationFailed"] = "validationFailed";
    ChatFailKind["InvalidPreviousResponseId"] = "invalidPreviousResponseId";
    ChatFailKind["NotFound"] = "notFound";
    ChatFailKind["Unknown"] = "unknown";
})(ChatFailKind || (exports.ChatFailKind = ChatFailKind = {}));
/**
 * A fetcher specialized to fetch ChatML completions. This differs from the standard fetcher in the form that ChatML
 * requires a different datamodel. Details can be found here https://platform.openai.com/docs/guides/chat
 *
 * This fetcher was created because the standard fetcher is tightly coupled to the OpenAI API completion models and a major refactoring
 * or rewrite is necessary to have a more generic fetcher that can be used for both completions and chat models.
 */
async function fetchAndStreamChat(accessor, chatEndpointInfo, request, baseTelemetryData, finishedCb, secretKey, location, ourRequestId, nChoices, userInitiatedRequest, cancel, telemetryProperties, useFetcher) {
    const logService = accessor.get(logService_1.ILogService);
    const telemetryService = accessor.get(telemetry_1.ITelemetryService);
    const fetcherService = accessor.get(fetcherService_1.IFetcherService);
    const envService = accessor.get(envService_1.IEnvService);
    const chatQuotaService = accessor.get(chatQuotaService_1.IChatQuotaService);
    const domainService = accessor.get(domainService_1.IDomainService);
    const capiClientService = accessor.get(capiClient_1.ICAPIClientService);
    const authenticationService = accessor.get(authentication_1.IAuthenticationService);
    const interactionService = accessor.get(interactionService_1.IInteractionService);
    const instantiationService = accessor.get(instantiation_1.IInstantiationService);
    if (cancel?.isCancellationRequested) {
        return { type: FetchResponseKind.Canceled, reason: 'before fetch request' };
    }
    logService.debug(`modelMaxPromptTokens ${chatEndpointInfo.modelMaxPromptTokens}`);
    logService.debug(`modelMaxResponseTokens ${request.max_tokens ?? 2048}`);
    logService.debug(`chat model ${chatEndpointInfo.model}`);
    secretKey ??= (await authenticationService.getCopilotToken()).token;
    if (!secretKey) {
        // If no key is set we error
        const urlOrRequestMetadata = (0, networking_1.stringifyUrlOrRequestMetadata)(chatEndpointInfo.urlOrRequestMetadata);
        logService.error(`Failed to send request to ${urlOrRequestMetadata} due to missing key`);
        (0, stream_1.sendCommunicationErrorTelemetry)(telemetryService, `Failed to send request to ${urlOrRequestMetadata} due to missing key`);
        return {
            type: FetchResponseKind.Failed,
            modelRequestId: undefined,
            failKind: ChatFailKind.TokenExpiredOrInvalid,
            reason: 'key is missing'
        };
    }
    // Generate unique ID to link input and output messages
    const modelCallId = (0, uuid_1.generateUuid)();
    const response = await fetchWithInstrumentation(logService, telemetryService, fetcherService, envService, domainService, capiClientService, interactionService, chatEndpointInfo, ourRequestId, request, secretKey, location, userInitiatedRequest, cancel, { ...telemetryProperties, modelCallId }, useFetcher);
    if (cancel?.isCancellationRequested) {
        const body = await response.body();
        try {
            // Destroy the stream so that the server is hopefully notified we don't want any more data
            // and can cancel/forget about the request itself.
            body.destroy();
        }
        catch (e) {
            logService.error(e, `Error destroying stream`);
            telemetryService.sendGHTelemetryException(e, 'Error destroying stream');
        }
        return { type: FetchResponseKind.Canceled, reason: 'after fetch request' };
    }
    if (response.status === 200 && authenticationService.copilotToken?.isFreeUser && authenticationService.copilotToken?.isChatQuotaExceeded) {
        authenticationService.resetCopilotToken();
    }
    if (response.status !== 200) {
        const telemetryData = createTelemetryData(chatEndpointInfo, location, ourRequestId);
        logService.info('Request ID for failed request: ' + ourRequestId);
        return instantiationService.invokeFunction(handleError, telemetryData, response, ourRequestId);
    }
    // Extend baseTelemetryData with modelCallId for output messages
    const extendedBaseTelemetryData = baseTelemetryData.extendedBy({ modelCallId });
    const chatCompletions = await chatEndpointInfo.processResponseFromChatEndpoint(telemetryService, logService, response, nChoices ?? /* OpenAI's default */ 1, finishedCb, extendedBaseTelemetryData, cancel);
    // CAPI will return us a Copilot Edits Session Header which is our token to using the speculative decoding endpoint
    // We should store this in the auth service for easy use later
    if (response.headers.get('Copilot-Edits-Session')) {
        authenticationService.speculativeDecodingEndpointToken = response.headers.get('Copilot-Edits-Session') ?? undefined;
    }
    chatQuotaService.processQuotaHeaders(response.headers);
    return {
        type: FetchResponseKind.Success,
        chatCompletions: chatCompletions,
        getProcessingTime: () => (0, fetch_1.getProcessingTime)(response),
    };
}
function createTelemetryData(chatEndpointInfo, location, headerRequestId) {
    return telemetryData_1.TelemetryData.createAndMarkAsIssued({
        endpoint: 'completions',
        engineName: 'chat',
        uiKind: commonTypes_1.ChatLocation.toString(location),
        headerRequestId
    });
}
async function handleError(accessor, telemetryData, response, requestId) {
    const logService = accessor.get(logService_1.ILogService);
    const telemetryService = accessor.get(telemetry_1.ITelemetryService);
    const authenticationService = accessor.get(authentication_1.IAuthenticationService);
    const modelRequestIdObj = (0, fetch_1.getRequestId)(response, undefined);
    requestId = modelRequestIdObj.headerRequestId || requestId;
    modelRequestIdObj.headerRequestId = requestId;
    telemetryData.properties.error = `Response status was ${response.status}`;
    telemetryData.properties.status = String(response.status);
    telemetryService.sendGHTelemetryEvent('request.shownWarning', telemetryData.properties, telemetryData.measurements);
    const text = await response.text();
    let jsonData;
    try {
        jsonData = JSON.parse(text);
        jsonData = jsonData?.error ?? jsonData; // Extract nested error object if it exists
    }
    catch {
        // JSON parsing failed, it's not json content.
    }
    if (400 <= response.status && response.status < 500) {
        if (response.status === 400 && text.includes('off_topic')) {
            return {
                type: FetchResponseKind.Failed,
                modelRequestId: modelRequestIdObj,
                failKind: ChatFailKind.OffTopic,
                reason: 'filtered as off_topic by intent classifier: message was not programming related',
            };
        }
        if (response.status === 401 && text.includes('authorize_url') && jsonData?.authorize_url) {
            return {
                type: FetchResponseKind.Failed,
                modelRequestId: modelRequestIdObj,
                failKind: ChatFailKind.AgentUnauthorized,
                reason: response.statusText || response.statusText,
                data: jsonData
            };
        }
        if (response.status === 400 && jsonData?.code === 'previous_response_not_found') {
            return {
                type: FetchResponseKind.Failed,
                modelRequestId: modelRequestIdObj,
                failKind: ChatFailKind.InvalidPreviousResponseId,
                reason: jsonData.message || 'Invalid previous response ID',
                data: jsonData,
            };
        }
        if (response.status === 401 || response.status === 403) {
            // Token has expired or invalid, fetch a new one on next request
            // TODO(drifkin): these actions should probably happen in vsc specific code
            authenticationService.resetCopilotToken(response.status);
            return {
                type: FetchResponseKind.Failed,
                modelRequestId: modelRequestIdObj,
                failKind: ChatFailKind.TokenExpiredOrInvalid,
                reason: jsonData?.message || `token expired or invalid: ${response.status}`,
            };
        }
        if (response.status === 402) {
            // When we receive a 402, we have exceed a quota
            // This is stored on the token so let's refresh it
            authenticationService.resetCopilotToken(response.status);
            const retryAfter = response.headers.get('retry-after');
            const convertToDate = (retryAfterString) => {
                if (!retryAfterString) {
                    return undefined;
                }
                // Try treating it as a date
                const retryAfterDate = new Date(retryAfterString);
                if (!isNaN(retryAfterDate.getDate())) {
                    return retryAfterDate;
                }
                // It is not a date, try treating it as a duration from the current date
                const retryAfterDuration = parseInt(retryAfterString, 10);
                if (isNaN(retryAfterDuration)) {
                    return undefined;
                }
                return new Date(Date.now() + retryAfterDuration * 1000);
            };
            const retryAfterDate = convertToDate(retryAfter);
            return {
                type: FetchResponseKind.Failed,
                modelRequestId: modelRequestIdObj,
                failKind: ChatFailKind.QuotaExceeded,
                reason: jsonData?.message ?? 'Free tier quota exceeded',
                data: {
                    capiError: jsonData,
                    retryAfter: retryAfterDate
                }
            };
        }
        if (response.status === 404) {
            return {
                type: FetchResponseKind.Failed,
                modelRequestId: modelRequestIdObj,
                failKind: ChatFailKind.NotFound,
                reason: 'Resource not found'
            };
        }
        if (response.status === 422) {
            return {
                type: FetchResponseKind.Failed,
                modelRequestId: modelRequestIdObj,
                failKind: ChatFailKind.ContentFilter,
                reason: 'Filtered by Responsible AI Service'
            };
        }
        if (response.status === 424) {
            return {
                type: FetchResponseKind.Failed,
                modelRequestId: modelRequestIdObj,
                failKind: ChatFailKind.AgentFailedDependency,
                reason: text
            };
        }
        if (response.status === 429) {
            let rateLimitReason = text;
            rateLimitReason = jsonData?.message ?? jsonData?.code;
            if (text.includes('extension_blocked') && jsonData?.code === 'extension_blocked' && jsonData?.type === 'rate_limit_error') {
                return {
                    type: FetchResponseKind.Failed,
                    modelRequestId: modelRequestIdObj,
                    failKind: ChatFailKind.ExtensionBlocked,
                    reason: 'Extension blocked',
                    data: {
                        ...jsonData?.message,
                        retryAfter: response.headers.get('retry-after'),
                    }
                };
            }
            // HTTP 429 Too Many Requests
            return {
                type: FetchResponseKind.Failed,
                modelRequestId: modelRequestIdObj,
                failKind: ChatFailKind.RateLimited,
                reason: rateLimitReason,
                data: {
                    retryAfter: response.headers.get('retry-after'),
                    rateLimitKey: response.headers.get('x-ratelimit-exceeded'),
                    capiError: jsonData
                }
            };
        }
        if (response.status === 466) {
            logService.info(text);
            return {
                type: FetchResponseKind.Failed,
                modelRequestId: modelRequestIdObj,
                failKind: ChatFailKind.ClientNotSupported,
                reason: `client not supported: ${text}`
            };
        }
        if (response.status === 499) {
            logService.info('Cancelled by server');
            return {
                type: FetchResponseKind.Failed,
                modelRequestId: modelRequestIdObj,
                failKind: ChatFailKind.ServerCanceled,
                reason: 'canceled by server'
            };
        }
    }
    else if (500 <= response.status && response.status < 600) {
        if (response.status === 503) {
            return {
                type: FetchResponseKind.Failed,
                modelRequestId: modelRequestIdObj,
                failKind: ChatFailKind.RateLimited,
                reason: 'Upstream provider rate limit hit',
                data: {
                    retryAfter: null,
                    rateLimitKey: null,
                    capiError: { code: 'upstream_provider_rate_limit', message: text }
                }
            };
        }
        const reasonNoText = `Server error: ${response.status}`;
        const reason = `${reasonNoText} ${text}`;
        logService.error(reason);
        // HTTP 5xx Server Error
        return {
            type: FetchResponseKind.Failed,
            modelRequestId: modelRequestIdObj,
            failKind: ChatFailKind.ServerError,
            reason: reasonNoText,
        };
    }
    logService.error(`Request Failed: ${response.status} ${text}`);
    (0, stream_1.sendCommunicationErrorTelemetry)(telemetryService, 'Unhandled status from server: ' + response.status, text);
    return {
        type: FetchResponseKind.Failed,
        modelRequestId: modelRequestIdObj,
        failKind: ChatFailKind.Unknown,
        reason: `Request Failed: ${response.status} ${text}`
    };
}
async function fetchWithInstrumentation(logService, telemetryService, fetcherService, envService, domainService, capiClientService, interactionService, chatEndpoint, ourRequestId, request, secretKey, location, userInitiatedRequest, cancel, telemetryProperties, useFetcher) {
    // If request contains an image, we include this header.
    const additionalHeaders = {
        'X-Interaction-Id': interactionService.interactionId,
        'X-Initiator': userInitiatedRequest ? 'user' : 'agent', // Agent = a system request / not the primary user query.
    };
    if (request.messages?.some((m) => Array.isArray(m.content) ? m.content.some(c => 'image_url' in c) : false) && chatEndpoint.supportsVision) {
        additionalHeaders['Copilot-Vision-Request'] = 'true';
    }
    const telemetryData = telemetryData_1.TelemetryData.createAndMarkAsIssued({
        endpoint: 'completions',
        engineName: 'chat',
        uiKind: commonTypes_1.ChatLocation.toString(location),
        ...telemetryProperties // This includes the modelCallId from fetchAndStreamChat
    }, {
        maxTokenWindow: chatEndpoint.modelMaxPromptTokens
    });
    for (const [key, value] of Object.entries(request)) {
        if (key === 'messages') {
            continue;
        } // Skip messages (PII)
        telemetryData.properties[`request.option.${key}`] = JSON.stringify(value) ?? 'undefined';
    }
    // The request ID we are passed in is sent in the request to the proxy, and included in our pre-request telemetry.
    // We hope (but do not rely on) that the model will use the same ID in the response, allowing us to correlate
    // the request and response.
    telemetryData.properties['headerRequestId'] = ourRequestId;
    telemetryService.sendGHTelemetryEvent('request.sent', telemetryData.properties, telemetryData.measurements);
    const requestStart = Date.now();
    const intent = locationToIntent(location);
    // Wrap the Promise with success/error callbacks so we can log/measure it
    return (0, networking_1.postRequest)(fetcherService, telemetryService, capiClientService, chatEndpoint, secretKey, await (0, crypto_1.createRequestHMAC)(process.env.HMAC_SECRET), intent, ourRequestId, request, additionalHeaders, cancel, useFetcher).then(response => {
        const apim = response.headers.get('apim-request-id');
        if (apim) {
            logService.debug(`APIM request id: ${apim}`);
        }
        const ghRequestId = response.headers.get('x-github-request-id');
        if (ghRequestId) {
            logService.debug(`GH request id: ${ghRequestId}`);
        }
        // This ID is hopefully the one the same as ourRequestId, but it is not guaranteed.
        // If they are different then we will override the original one we set in telemetryData above.
        const modelRequestId = (0, fetch_1.getRequestId)(response, undefined);
        telemetryData.extendWithRequestId(modelRequestId);
        // TODO: Add response length (requires parsing)
        const totalTimeMs = Date.now() - requestStart;
        telemetryData.measurements.totalTimeMs = totalTimeMs;
        logService.debug(`request.response: [${(0, networking_1.stringifyUrlOrRequestMetadata)(chatEndpoint.urlOrRequestMetadata)}], took ${totalTimeMs} ms`);
        if (request.messages) {
            logService.debug(`messages: ${JSON.stringify(request.messages)}`);
        }
        else if (request.input) {
            logService.debug(`input: ${JSON.stringify(request.input)}`);
        }
        telemetryService.sendGHTelemetryEvent('request.response', telemetryData.properties, telemetryData.measurements);
        return response;
    })
        .catch(error => {
        if (fetcherService.isAbortError(error)) {
            // If we cancelled a network request, we don't want to log a `request.error`
            throw error;
        }
        const warningTelemetry = telemetryData.extendedBy({ error: 'Network exception' });
        telemetryService.sendGHTelemetryEvent('request.shownWarning', warningTelemetry.properties, warningTelemetry.measurements);
        telemetryData.properties.code = String(error.code ?? '');
        telemetryData.properties.errno = String(error.errno ?? '');
        telemetryData.properties.message = String(error.message ?? '');
        telemetryData.properties.type = String(error.type ?? '');
        const totalTimeMs = Date.now() - requestStart;
        telemetryData.measurements.totalTimeMs = totalTimeMs;
        logService.debug(`request.response: [${chatEndpoint.urlOrRequestMetadata}] took ${totalTimeMs} ms`);
        telemetryService.sendGHTelemetryEvent('request.error', telemetryData.properties, telemetryData.measurements);
        throw error;
    })
        .finally(() => {
        (0, chatStream_1.sendEngineMessagesTelemetry)(telemetryService, request.messages ?? [], telemetryData, false, logService);
    });
}
/**
 * WARNING: The value that is returned from this function drives the disablement of RAI for full-file rewrite requests
 * in Copilot Edits, Copilot Chat, Agent Mode, and Inline Chat.
 * If your chat location generates full-file rewrite requests and you are unsure if changing something here will cause problems, please talk to @roblourens
 */
function locationToIntent(location) {
    switch (location) {
        case commonTypes_1.ChatLocation.Panel:
            return 'conversation-panel';
        case commonTypes_1.ChatLocation.Editor:
            return 'conversation-inline';
        case commonTypes_1.ChatLocation.EditingSession:
            return 'conversation-edits';
        case commonTypes_1.ChatLocation.Notebook:
            return 'conversation-notebook';
        case commonTypes_1.ChatLocation.Terminal:
            return 'conversation-terminal';
        case commonTypes_1.ChatLocation.Other:
            return 'conversation-other';
        case commonTypes_1.ChatLocation.Agent:
            return 'conversation-agent';
    }
}
//# sourceMappingURL=fetch.js.map