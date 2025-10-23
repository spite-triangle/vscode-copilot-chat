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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeaderContributors = exports.IHeaderContributors = exports.userAgentLibraryHeader = void 0;
exports.stringifyUrlOrRequestMetadata = stringifyUrlOrRequestMetadata;
exports.createCapiRequestBody = createCapiRequestBody;
exports.canRetryOnceNetworkError = canRetryOnceNetworkError;
exports.postRequest = postRequest;
exports.getRequest = getRequest;
const copilot_api_1 = require("@vscode/copilot-api");
const vscode = __importStar(require("vscode"));
const services_1 = require("../../../util/common/services");
const tokenizer_1 = require("../../../util/common/tokenizer");
const errors_1 = require("../../../util/vs/base/common/errors");
const openai_1 = require("./openai");
exports.userAgentLibraryHeader = 'X-VSCode-User-Agent-Library-Version';
// The maximum time to wait for a request to complete.
const requestTimeoutMs = 30 * 1000; // 30 seconds
function stringifyUrlOrRequestMetadata(urlOrRequestMetadata) {
    if (typeof urlOrRequestMetadata === 'string') {
        return urlOrRequestMetadata;
    }
    return JSON.stringify(urlOrRequestMetadata);
}
/** Function to create a standard request body for CAPI completions */
function createCapiRequestBody(options, model, callback) {
    // FIXME@ulugbekna: need to investigate why language configs have such stop words, eg
    // python has `\ndef` and `\nclass` which must be stop words for ghost text
    // const stops = getLanguageConfig<string[]>(accessor, ConfigKey.Stops);
    const request = {
        messages: (0, openai_1.rawMessageToCAPI)(options.messages, callback),
        model,
        // stop: stops,
    };
    if (options.postOptions) {
        Object.assign(request, options.postOptions);
    }
    return request;
}
function networkRequest(fetcher, telemetryService, capiClientService, requestType, endpointOrUrl, secretKey, intent, requestId, body, additionalHeaders, cancelToken, useFetcher) {
    // TODO @lramos15 Eventually don't even construct this fake endpoint object.
    const endpoint = typeof endpointOrUrl === 'string' || 'type' in endpointOrUrl ? {
        modelMaxPromptTokens: 0,
        urlOrRequestMetadata: endpointOrUrl,
        family: '',
        tokenizer: tokenizer_1.TokenizerType.O200K,
        acquireTokenizer: () => {
            throw new Error('Method not implemented.');
        },
        name: '',
        version: '',
    } : endpointOrUrl;
    let config = vscode.workspace.getConfiguration('github.copilot.baseModel');
    if (typeof endpoint.urlOrRequestMetadata !== 'string') {
        let type = endpoint.urlOrRequestMetadata.type;
        if (type == copilot_api_1.RequestType.CAPIEmbeddings) {
            config = vscode.workspace.getConfiguration('github.copilot.embeddingModel');
        }
    }
    let apikey = config.has('apikey') ? config.get('apikey') : secretKey;
    const headers = {
        Authorization: `Bearer ${apikey}`,
        'X-Request-Id': requestId,
        'X-Interaction-Type': intent,
        'OpenAI-Intent': intent, // Tells CAPI who flighted this request. Helps find buggy features
        'X-GitHub-Api-Version': '2025-05-01',
        ...additionalHeaders,
        ...(endpoint.getExtraHeaders ? endpoint.getExtraHeaders() : {}),
    };
    if (endpoint.interceptBody) {
        endpoint.interceptBody(body);
    }
    if (body) {
        body.model = config.get('model');
        body.max_tokens = config.has('max_tokens') ? config.get('max_tokens') : body.max_tokens;
        body.max_output_tokens = config.has('max_output_tokens') ? config.get('max_output_tokens') : body.max_output_tokens;
        body.max_completion_tokens = config.has('max_completion_tokens') ? config.get('max_completion_tokens') : body.max_completion_tokens;
        body.temperature = config.has('temperature') ? config.get('temperature') : body.temperature;
        body.top_p = config.has('top_p') ? config.get('top_p') : body.top_p;
        body.stream = config.has('stream') ? config.get('strean') : body.stream;
        body.n = config.has('n') ? config.get('n') : body.n;
        body.dimensions = config.has('dimensions') ? config.get('dimensions') : body.dimensions;
        body.encoding_format = config.has('encoding_format') ? config.get('encoding_format') : body.encoding_format;
    }
    const request = {
        method: requestType,
        headers: headers,
        json: body,
        timeout: requestTimeoutMs,
        useFetcher,
    };
    if (cancelToken) {
        const abort = fetcher.makeAbortController();
        cancelToken.onCancellationRequested(() => {
            // abort the request when the token is canceled
            telemetryService.sendGHTelemetryEvent('networking.cancelRequest', {
                headerRequestId: requestId,
            });
            abort.abort();
        });
        // pass the controller abort signal to the request
        request.signal = abort.signal;
    }
    if (typeof endpoint.urlOrRequestMetadata === 'string') {
        const requestPromise = fetcher.fetch(endpoint.urlOrRequestMetadata, request).catch(reason => {
            if (canRetryOnceNetworkError(reason)) {
                // disconnect and retry the request once if the connection was reset
                telemetryService.sendGHTelemetryEvent('networking.disconnectAll');
                return fetcher.disconnectAll().then(() => {
                    return fetcher.fetch(endpoint.urlOrRequestMetadata, request);
                });
            }
            else if (fetcher.isAbortError(reason)) {
                throw new errors_1.CancellationError();
            }
            else {
                throw reason;
            }
        });
        return requestPromise;
    }
    else {
        let url = config.has('url') ? config.get('url') : "https://api.githubcopilot.com";
        let token = {
            endpoints: {
                api: url,
                proxy: url
            },
            sku: 'yearly_subscriber'
        };
        capiClientService.updateDomains(token, url);
        return capiClientService.makeRequest(request, endpoint.urlOrRequestMetadata);
    }
}
function canRetryOnceNetworkError(reason) {
    return [
        'ECONNRESET',
        'ETIMEDOUT',
        'ERR_NETWORK_CHANGED',
        'ERR_HTTP2_INVALID_SESSION',
        'ERR_HTTP2_STREAM_CANCEL',
        'ERR_HTTP2_GOAWAY_SESSION',
        'ERR_HTTP2_PROTOCOL_ERROR',
    ].includes(reason?.code);
}
function postRequest(fetcherService, telemetryService, capiClientService, endpointOrUrl, secretKey, hmac, intent, requestId, body, additionalHeaders, cancelToken, useFetcher) {
    return networkRequest(fetcherService, telemetryService, capiClientService, 'POST', endpointOrUrl, secretKey, intent, requestId, body, additionalHeaders, cancelToken, useFetcher);
}
function getRequest(fetcherService, telemetryService, capiClientService, endpointOrUrl, secretKey, hmac, intent, requestId, body, additionalHeaders, cancelToken) {
    return networkRequest(fetcherService, telemetryService, capiClientService, 'GET', endpointOrUrl, secretKey, intent, requestId, body, additionalHeaders, cancelToken);
}
exports.IHeaderContributors = (0, services_1.createServiceIdentifier)('headerContributors');
class HeaderContributors {
    constructor() {
        this.contributors = [];
    }
    add(contributor) {
        this.contributors.push(contributor);
    }
    remove(contributor) {
        const index = this.contributors.indexOf(contributor);
        if (index === -1) {
            return;
        }
        this.contributors.splice(index, 1);
    }
    contributeHeaders(headers) {
        for (const contributor of this.contributors) {
            contributor.contributeHeaderValues(headers);
        }
    }
    size() {
        return this.contributors.length;
    }
}
exports.HeaderContributors = HeaderContributors;
//# sourceMappingURL=networking.js.map