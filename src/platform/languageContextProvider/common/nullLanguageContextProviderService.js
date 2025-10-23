"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.NullLanguageContextProviderService = void 0;
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
class NullLanguageContextProviderService {
    registerContextProvider(provider) {
        return lifecycle_1.Disposable.None;
    }
    getAllProviders() {
        return [];
    }
    getContextProviders(doc) {
        return [];
    }
    getContextItems(doc, request, cancellationToken) {
        return {
            [Symbol.asyncIterator]: async function* () {
                // No context items to provide
            }
        };
    }
    getContextItemsOnTimeout(doc, request) {
        return [];
    }
}
exports.NullLanguageContextProviderService = NullLanguageContextProviderService;
//# sourceMappingURL=nullLanguageContextProviderService.js.map