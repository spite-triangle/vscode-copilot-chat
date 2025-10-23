"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.isHiddenModelA = isHiddenModelA;
exports.isHiddenModelB = isHiddenModelB;
exports.modelPrefersInstructionsInUserMessage = modelPrefersInstructionsInUserMessage;
exports.modelPrefersInstructionsAfterHistory = modelPrefersInstructionsAfterHistory;
exports.modelSupportsApplyPatch = modelSupportsApplyPatch;
exports.modelPrefersJsonNotebookRepresentation = modelPrefersJsonNotebookRepresentation;
exports.modelSupportsReplaceString = modelSupportsReplaceString;
exports.modelSupportsMultiReplaceString = modelSupportsMultiReplaceString;
exports.modelCanUseReplaceStringExclusively = modelCanUseReplaceStringExclusively;
exports.modelCanUseMcpResultImageURL = modelCanUseMcpResultImageURL;
exports.modelCanUseImageURL = modelCanUseImageURL;
exports.modelCanUseApplyPatchExclusively = modelCanUseApplyPatchExclusively;
exports.modelNeedsStrongReplaceStringHint = modelNeedsStrongReplaceStringHint;
exports.modelSupportsSimplifiedApplyPatchInstructions = modelSupportsSimplifiedApplyPatchInstructions;
const buffer_1 = require("../../../util/vs/base/common/buffer");
const _cachedHashes = new Map();
async function getSha256Hash(text) {
    if (_cachedHashes.has(text)) {
        return _cachedHashes.get(text);
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hash = (0, buffer_1.encodeHex)(buffer_1.VSBuffer.wrap(new Uint8Array(hashBuffer)));
    _cachedHashes.set(text, hash);
    return hash;
}
const HIDDEN_MODEL_A_HASHES = [
    'a99dd17dfee04155d863268596b7f6dd36d0a6531cd326348dbe7416142a21a3',
    '6b0f165d0590bf8d508540a796b4fda77bf6a0a4ed4e8524d5451b1913100a95'
];
async function isHiddenModelA(model) {
    const h = await getSha256Hash(model.family);
    return HIDDEN_MODEL_A_HASHES.includes(h);
}
async function isHiddenModelB(model) {
    return await getSha256Hash(model.family) === '42029ef215256f8fa9fedb53542ee6553eef76027b116f8fac5346211b1e473c';
}
/**
 * Returns whether the instructions should be given in a user message instead
 * of a system message when talking to the model.
 */
function modelPrefersInstructionsInUserMessage(modelFamily) {
    return modelFamily.includes('claude-3.5-sonnet');
}
/**
 * Returns whether the instructions should be presented after the history
 * for the given model.
 */
function modelPrefersInstructionsAfterHistory(modelFamily) {
    return modelFamily.includes('claude-3.5-sonnet');
}
/**
 * Model supports apply_patch as an edit tool.
 */
async function modelSupportsApplyPatch(model) {
    return (model.family.includes('gpt') && !model.family.includes('gpt-4o')) || model.family === 'o4-mini' || await isHiddenModelA(model);
}
/**
 * Model prefers JSON notebook representation.
 */
function modelPrefersJsonNotebookRepresentation(model) {
    return (model.family.includes('gpt') && !model.family.includes('gpt-4o')) || model.family === 'o4-mini';
}
/**
 * Model supports replace_string_in_file as an edit tool.
 */
async function modelSupportsReplaceString(model) {
    return model.family.startsWith('claude') || model.family.startsWith('Anthropic') || model.family.includes('gemini') || await isHiddenModelB(model);
}
/**
 * Model supports multi_replace_string_in_file as an edit tool.
 */
async function modelSupportsMultiReplaceString(model) {
    return await modelSupportsReplaceString(model) && !model.family.includes('gemini');
}
/**
 * The model is capable of using replace_string_in_file exclusively,
 * without needing insert_edit_into_file.
 */
async function modelCanUseReplaceStringExclusively(model) {
    return model.family.startsWith('claude') || model.family.startsWith('Anthropic') || await isHiddenModelB(model);
}
/**
 * The model can accept image urls as the `image_url` parameter in mcp tool results.
 */
async function modelCanUseMcpResultImageURL(model) {
    return !model.family.startsWith('claude') && !model.family.startsWith('Anthropic') && !await isHiddenModelB(model);
}
/**
 * The model can accept image urls as the `image_url` parameter in requests.
 */
function modelCanUseImageURL(model) {
    return !model.family.startsWith('gemini');
}
/**
 * The model is capable of using apply_patch as an edit tool exclusively,
 * without needing insert_edit_into_file.
 */
function modelCanUseApplyPatchExclusively(model) {
    return model.family.startsWith('gpt-5');
}
/**
 * Whether, when replace_string and insert_edit tools are both available,
 * verbiage should be added in the system prompt directing the model to prefer
 * replace_string.
 */
function modelNeedsStrongReplaceStringHint(model) {
    return model.family.toLowerCase().includes('gemini');
}
/**
 * Model can take the simple, modern apply_patch instructions.
 */
function modelSupportsSimplifiedApplyPatchInstructions(model) {
    return model.family.startsWith('gpt-5');
}
//# sourceMappingURL=chatModelCapabilities.js.map