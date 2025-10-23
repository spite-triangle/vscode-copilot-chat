"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpyingServerPoweredNesProvider = void 0;
const serverPoweredInlineEditProvider_1 = require("../../../src/extension/inlineEdits/node/serverPoweredInlineEditProvider");
const spyingChatMLFetcher_1 = require("../../base/spyingChatMLFetcher");
const sharedTypes_1 = require("../shared/sharedTypes");
class SpyingServerPoweredNesProvider extends serverPoweredInlineEditProvider_1.ServerPoweredInlineEditProvider {
    spyOnPromptAndResponse(fetcher, { user_prompt, model_response }) {
        if (fetcher instanceof spyingChatMLFetcher_1.SpyingChatMLFetcher) {
            fetcher.requestCollector.addInterceptedRequest(Promise.resolve(new sharedTypes_1.InterceptedRequest(user_prompt, {}, {
                type: 'success',
                value: [model_response],
            }, undefined, undefined)));
        }
    }
}
exports.SpyingServerPoweredNesProvider = SpyingServerPoweredNesProvider;
//# sourceMappingURL=spyingServerPoweredNesProvider.js.map