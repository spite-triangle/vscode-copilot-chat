"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.supportedProviderIds = exports.defaultNextEditProviderId = void 0;
exports.createNextEditProvider = createNextEditProvider;
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const xtabProvider_1 = require("../../xtab/node/xtabProvider");
const serverPoweredInlineEditProvider_1 = require("./serverPoweredInlineEditProvider");
exports.defaultNextEditProviderId = configurationService_1.XTabProviderId;
exports.supportedProviderIds = {
    [(0, configurationService_1.registerNextEditProviderId)(xtabProvider_1.XtabProvider.ID)]: xtabProvider_1.XtabProvider,
    [(0, configurationService_1.registerNextEditProviderId)(serverPoweredInlineEditProvider_1.ServerPoweredInlineEditProvider.ID)]: serverPoweredInlineEditProvider_1.ServerPoweredInlineEditProvider,
};
function createNextEditProvider(nextEditProviderId, instantiationService) {
    const providerId = nextEditProviderId ?? exports.defaultNextEditProviderId;
    const provider = exports.supportedProviderIds[providerId];
    if (!provider) {
        throw new Error(`Unknown next edit provider ID: ${providerId}`);
    }
    return instantiationService.createInstance(provider);
}
//# sourceMappingURL=createNextEditProvider.js.map