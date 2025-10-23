"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.IEndpointProvider = exports.ModelSupportedEndpoint = void 0;
exports.isEndpointEditToolName = isEndpointEditToolName;
exports.isChatModelInformation = isChatModelInformation;
exports.isEmbeddingModelInformation = isEmbeddingModelInformation;
exports.isCompletionModelInformation = isCompletionModelInformation;
const services_1 = require("../../../util/common/services");
const allEndpointEditToolNames = new Set([
    'find-replace',
    'multi-find-replace',
    'apply-patch',
    'code-rewrite'
]);
function isEndpointEditToolName(toolName) {
    return allEndpointEditToolNames.has(toolName);
}
var ModelSupportedEndpoint;
(function (ModelSupportedEndpoint) {
    ModelSupportedEndpoint["ChatCompletions"] = "/chat/completions";
    ModelSupportedEndpoint["Responses"] = "/responses";
})(ModelSupportedEndpoint || (exports.ModelSupportedEndpoint = ModelSupportedEndpoint = {}));
function isChatModelInformation(model) {
    return model.capabilities.type === 'chat';
}
function isEmbeddingModelInformation(model) {
    return model.capabilities.type === 'embeddings';
}
function isCompletionModelInformation(model) {
    return model.capabilities.type === 'completion';
}
exports.IEndpointProvider = (0, services_1.createServiceIdentifier)('IEndpointProvider');
//# sourceMappingURL=endpointProvider.js.map