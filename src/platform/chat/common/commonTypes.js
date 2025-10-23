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
exports.CanceledResult = exports.CanceledMessage = exports.ChatFetchResponseType = exports.ChatLocation = void 0;
exports.getErrorDetailsFromChatFetchError = getErrorDetailsFromChatFetchError;
exports.getFilteredMessage = getFilteredMessage;
const l10n = __importStar(require("@vscode/l10n"));
const time_1 = require("../../../util/common/time");
const vscodeTypes_1 = require("../../../vscodeTypes");
const openai_1 = require("../../networking/common/openai");
/**
 * The location of a chat request.
 */
var ChatLocation;
(function (ChatLocation) {
    /**
     * The chat panel
     */
    ChatLocation[ChatLocation["Panel"] = 1] = "Panel";
    /**
     * Terminal inline chat
     */
    ChatLocation[ChatLocation["Terminal"] = 2] = "Terminal";
    /**
     * Notebook inline chat
     */
    ChatLocation[ChatLocation["Notebook"] = 3] = "Notebook";
    /**
     * Code editor inline chat
     */
    ChatLocation[ChatLocation["Editor"] = 4] = "Editor";
    /**
     * Chat is happening in an editing session.
     * This location doesn't exist in vscode API, but is still used to compute the location sent for some intents.
     */
    ChatLocation[ChatLocation["EditingSession"] = 5] = "EditingSession";
    /**
     * The chat request does not correspond directly to a user chat request.
     */
    ChatLocation[ChatLocation["Other"] = 6] = "Other";
    /**
     * The chat is an agent mode edit session.
     */
    ChatLocation[ChatLocation["Agent"] = 7] = "Agent";
})(ChatLocation || (exports.ChatLocation = ChatLocation = {}));
(function (ChatLocation) {
    /**
     * Use this for passing uiKind to github telemetry, which we don't want to impact.
     * Also known as UIKind in the telemetry data.
     */
    function toString(chatLocation) {
        switch (chatLocation) {
            case ChatLocation.Editor:
                return 'conversationInline';
            case ChatLocation.Panel:
                return 'conversationPanel';
            case ChatLocation.EditingSession:
                return 'editingSession';
            case ChatLocation.Agent:
                return 'editingSessionAgent';
            default:
                return 'none';
        }
    }
    ChatLocation.toString = toString;
    /**
     * This goes to logs and msft telemetry and is ok to change
     */
    function toStringShorter(chatLocation) {
        switch (chatLocation) {
            case ChatLocation.Editor:
            case ChatLocation.Notebook:
                return 'inline';
            case ChatLocation.Panel:
                return 'panel';
            case ChatLocation.EditingSession:
                return 'editingSession';
            default:
                return 'none';
        }
    }
    ChatLocation.toStringShorter = toStringShorter;
})(ChatLocation || (exports.ChatLocation = ChatLocation = {}));
var ChatFetchResponseType;
(function (ChatFetchResponseType) {
    ChatFetchResponseType["OffTopic"] = "offTopic";
    ChatFetchResponseType["Canceled"] = "canceled";
    ChatFetchResponseType["Filtered"] = "filtered";
    ChatFetchResponseType["FilteredRetry"] = "filteredRetry";
    ChatFetchResponseType["PromptFiltered"] = "promptFiltered";
    ChatFetchResponseType["Length"] = "length";
    ChatFetchResponseType["RateLimited"] = "rateLimited";
    ChatFetchResponseType["QuotaExceeded"] = "quotaExceeded";
    ChatFetchResponseType["ExtensionBlocked"] = "extensionBlocked";
    ChatFetchResponseType["BadRequest"] = "badRequest";
    ChatFetchResponseType["NotFound"] = "notFound";
    ChatFetchResponseType["Failed"] = "failed";
    ChatFetchResponseType["Unknown"] = "unknown";
    ChatFetchResponseType["NetworkError"] = "networkError";
    ChatFetchResponseType["AgentUnauthorized"] = "agent_unauthorized";
    ChatFetchResponseType["AgentFailedDependency"] = "agent_failed_dependency";
    ChatFetchResponseType["InvalidStatefulMarker"] = "invalid_stateful_marker";
    ChatFetchResponseType["Success"] = "success";
})(ChatFetchResponseType || (exports.ChatFetchResponseType = ChatFetchResponseType = {}));
function getRateLimitMessage(fetchResult, hideRateLimitTimeEstimate) {
    if (fetchResult.type !== ChatFetchResponseType.RateLimited) {
        throw new Error('Expected RateLimited error');
    }
    if (fetchResult.capiError?.code === 'agent_mode_limit_exceeded') { // Rate limited in agent mode
        return l10n.t('Sorry, you have exceeded the agent mode rate limit. Please switch to ask mode and try again later.');
    }
    if (fetchResult.capiError?.code === 'upstream_provider_rate_limit') {
        return l10n.t('Sorry, the upstream model provider is currently experiencing high demand. Please try again later or consider switching models.');
    }
    // Split rate limit key on comma as multiple headers can come in at once
    const rateLimitKeyParts = fetchResult.rateLimitKey.split(',').map(part => part.trim());
    const globalTPSRateLimit = rateLimitKeyParts.some(part => /^global-user(-[^-]+)?-tps-\d{4}-\d{2}-\d{2}$/.test(part));
    const retryAfterString = (!hideRateLimitTimeEstimate && fetchResult.retryAfter) ? (0, time_1.secondsToHumanReadableTime)(fetchResult.retryAfter) : 'a moment';
    if (fetchResult?.capiError?.code && fetchResult?.capiError?.message) {
        return l10n.t({
            message: 'Sorry, you have been rate-limited. Please wait {0} before trying again. [Learn More]({1})\n\nServer Error: {2}\nError Code: {3}',
            args: [retryAfterString, 'https://aka.ms/github-copilot-rate-limit-error', fetchResult.capiError.message, fetchResult.capiError.code],
            comment: ["{Locked=']({'}"]
        });
    }
    if (!globalTPSRateLimit) {
        return l10n.t({
            message: 'Sorry, you have exhausted this model\'s rate limit. Please wait {0} before trying again, or switch to a different model. [Learn More]({1})',
            args: [retryAfterString, 'https://aka.ms/github-copilot-rate-limit-error'],
            comment: ["{Locked=']({'}"]
        });
    }
    return l10n.t({
        message: 'Sorry, your request was rate-limited. Please wait {0} before trying again. [Learn More]({1})',
        args: [retryAfterString, 'https://aka.ms/github-copilot-rate-limit-error'],
        comment: ["{Locked=']({'}"]
    });
}
function getQuotaHitMessage(fetchResult, copilotPlan) {
    if (fetchResult.type !== ChatFetchResponseType.QuotaExceeded) {
        throw new Error('Expected QuotaExceeded error');
    }
    if (fetchResult.capiError?.code === 'free_quota_exceeded') {
        fetchResult.capiError.code = 'quota_exceeded'; // Remap this to the generic quota code so we get per plan handling
    }
    if (fetchResult.capiError?.code === 'quota_exceeded') {
        switch (copilotPlan) {
            case 'free':
                return l10n.t(`You've reached your monthly chat messages quota. Upgrade to Copilot Pro (30-day free trial) or wait for your allowance to renew.`);
            case 'individual':
                return l10n.t(`You've exhausted your premium model quota. Please enable additional paid premium requests, upgrade to Copilot Pro+, or wait for your allowance to renew.`);
            case 'individual_pro':
                return l10n.t(`You've exhausted your premium model quota. Please enable additional paid premium requests or wait for your allowance to renew.`);
            default:
                return l10n.t(`You've exhausted your premium model quota. Please reach out to your organization's Copilot admin to enable additional paid premium requests or wait for your allowance to renew.`);
        }
    }
    else if (fetchResult.capiError?.code === 'overage_limit_reached') {
        return l10n.t({
            message: 'You cannot accrue additional premium requests at this time. Please contact [GitHub Support]({0}) to continue using Copilot.',
            args: ['https://support.github.com/contact'],
            comment: ["{Locked=']({'}"]
        });
    }
    else if (fetchResult.capiError?.code && fetchResult.capiError?.message) {
        return l10n.t({
            message: 'Quota Exceeded\n\nServer Error: {0}\nError Code: {1}',
            args: [fetchResult.capiError.message, fetchResult.capiError.code],
            comment: ''
        });
    }
    else {
        return l10n.t('Quota Exceeded');
    }
}
function getErrorDetailsFromChatFetchError(fetchResult, copilotPlan, hideRateLimitTimeEstimate) {
    return { code: fetchResult.type, ...getErrorDetailsFromChatFetchErrorInner(fetchResult, copilotPlan, hideRateLimitTimeEstimate) };
}
function getErrorDetailsFromChatFetchErrorInner(fetchResult, copilotPlan, hideRateLimitTimeEstimate) {
    switch (fetchResult.type) {
        case ChatFetchResponseType.OffTopic:
            return { message: l10n.t('Sorry, but I can only assist with programming related questions.') };
        case ChatFetchResponseType.Canceled:
            return exports.CanceledMessage;
        case ChatFetchResponseType.RateLimited:
            return {
                message: getRateLimitMessage(fetchResult, hideRateLimitTimeEstimate),
                level: vscodeTypes_1.ChatErrorLevel.Info,
                isRateLimited: true
            };
        case ChatFetchResponseType.QuotaExceeded:
            return {
                message: getQuotaHitMessage(fetchResult, copilotPlan),
                isQuotaExceeded: true
            };
        case ChatFetchResponseType.BadRequest:
        case ChatFetchResponseType.Failed:
            return { message: l10n.t(`Sorry, your request failed. Please try again. Request id: {0}\n\nReason: {1}`, fetchResult.requestId, fetchResult.reason) };
        case ChatFetchResponseType.NetworkError:
            return { message: l10n.t(`Sorry, there was a network error. Please try again later. Request id: {0}\n\nReason: {1}`, fetchResult.requestId, fetchResult.reason) };
        case ChatFetchResponseType.Filtered:
        case ChatFetchResponseType.PromptFiltered:
            return {
                message: getFilteredMessage(fetchResult.category),
                responseIsFiltered: true,
                level: vscodeTypes_1.ChatErrorLevel.Info,
            };
        case ChatFetchResponseType.AgentUnauthorized:
            return { message: l10n.t(`Sorry, something went wrong.`) };
        case ChatFetchResponseType.AgentFailedDependency:
            return { message: fetchResult.reason };
        case ChatFetchResponseType.Length:
            return { message: l10n.t(`Sorry, the response hit the length limit. Please rephrase your prompt.`) };
        case ChatFetchResponseType.NotFound:
            return { message: l10n.t('Sorry, the resource was not found.') };
        case ChatFetchResponseType.Unknown:
            return { message: l10n.t(`Sorry, no response was returned.`) };
        case ChatFetchResponseType.ExtensionBlocked:
            return { message: l10n.t(`Sorry, something went wrong.`) };
        case ChatFetchResponseType.InvalidStatefulMarker:
            // should be unreachable, retried within the endpoint
            return { message: l10n.t(`Your chat session state is invalid, please start a new chat.`) };
    }
}
function getFilteredMessage(category, supportsMarkdown = true) {
    switch (category) {
        case openai_1.FilterReason.Copyright:
            if (supportsMarkdown) {
                return l10n.t({
                    message: `Sorry, the response matched public code so it was blocked. Please rephrase your prompt. [Learn more](https://aka.ms/copilot-chat-filtered-docs).`,
                    comment: ["{Locked='](https://aka.ms/copilot-chat-filtered-docs)'}"]
                });
            }
            else {
                return l10n.t(`Sorry, the response matched public code so it was blocked. Please rephrase your prompt.`);
            }
        case openai_1.FilterReason.Prompt:
            if (supportsMarkdown) {
                return l10n.t({
                    message: `Sorry, your prompt was filtered by the Responsible AI Service. Please rephrase your prompt and try again. [Learn more](https://aka.ms/copilot-chat-filtered-docs).`,
                    comment: ["{Locked='](https://aka.ms/copilot-chat-filtered-docs)'}"]
                });
            }
            else {
                return l10n.t(`Sorry, your prompt was filtered by the Responsible AI Service. Please rephrase your prompt and try again.`);
            }
        default:
            if (supportsMarkdown) {
                return l10n.t({
                    message: `Sorry, the response was filtered by the Responsible AI Service. Please rephrase your prompt and try again. [Learn more](https://aka.ms/copilot-chat-filtered-docs).`,
                    comment: ["{Locked='](https://aka.ms/copilot-chat-filtered-docs)'}"]
                });
            }
            else {
                return l10n.t(`Sorry, the response was filtered by the Responsible AI Service. Please rephrase your prompt and try again.`);
            }
    }
}
/**
 * Not localized because it's used in the same way that the CancellationError name is used.
 */
exports.CanceledMessage = { message: 'Canceled' };
exports.CanceledResult = { errorDetails: exports.CanceledMessage, };
//# sourceMappingURL=commonTypes.js.map