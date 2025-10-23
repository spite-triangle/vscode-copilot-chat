"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODEL_CONFIGURATION_VALIDATOR = exports.LANGUAGE_CONTEXT_ENABLED_LANGUAGES = exports.DEFAULT_OPTIONS = exports.PromptingStrategy = void 0;
const validator_1 = require("../../../configuration/common/validator");
/**
 * Prompt strategies that tweak prompt in a way that's different from current prod prompting strategy.
 */
var PromptingStrategy;
(function (PromptingStrategy) {
    /**
     * Original Xtab unified model prompting strategy.
     */
    PromptingStrategy["UnifiedModel"] = "xtabUnifiedModel";
    PromptingStrategy["Codexv21NesUnified"] = "codexv21nesUnified";
    PromptingStrategy["Nes41Miniv3"] = "nes41miniv3";
    PromptingStrategy["SimplifiedSystemPrompt"] = "simplifiedSystemPrompt";
    PromptingStrategy["Xtab275"] = "xtab275";
})(PromptingStrategy || (exports.PromptingStrategy = PromptingStrategy = {}));
exports.DEFAULT_OPTIONS = {
    promptingStrategy: undefined,
    currentFile: {
        maxTokens: 2000,
        includeTags: true,
        prioritizeAboveCursor: false,
    },
    pagedClipping: {
        pageSize: 10,
    },
    recentlyViewedDocuments: {
        nDocuments: 5,
        maxTokens: 2000,
        includeViewedFiles: false,
    },
    languageContext: {
        enabled: false,
        maxTokens: 2000,
    },
    diffHistory: {
        nEntries: 25,
        maxTokens: 1000,
        onlyForDocsInPrompt: false,
        useRelativePaths: false,
    },
};
// TODO: consider a better per language setting/experiment approach
exports.LANGUAGE_CONTEXT_ENABLED_LANGUAGES = {
    'prompt': true,
    'instructions': true,
    'chatmode': true,
};
exports.MODEL_CONFIGURATION_VALIDATOR = (0, validator_1.vObj)({
    'modelName': (0, validator_1.vRequired)((0, validator_1.vString)()),
    'promptingStrategy': (0, validator_1.vUnion)((0, validator_1.vEnum)(...Object.values(PromptingStrategy)), (0, validator_1.vUndefined)()),
    'includeTagsInCurrentFile': (0, validator_1.vRequired)((0, validator_1.vBoolean)()),
});
//# sourceMappingURL=xtabPromptOptions.js.map