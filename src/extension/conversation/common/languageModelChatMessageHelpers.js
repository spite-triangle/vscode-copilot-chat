"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.isImageDataPart = isImageDataPart;
const vscodeTypes_1 = require("../../../vscodeTypes");
function isImageDataPart(part) {
    if (part instanceof vscodeTypes_1.LanguageModelDataPart && isChatImageMimeType(part.mimeType)) {
        return true;
    }
    return false;
}
function isChatImageMimeType(mimeType) {
    switch (mimeType) {
        case vscodeTypes_1.ChatImageMimeType.JPEG:
        case vscodeTypes_1.ChatImageMimeType.PNG:
        case vscodeTypes_1.ChatImageMimeType.GIF:
        case vscodeTypes_1.ChatImageMimeType.WEBP:
        case vscodeTypes_1.ChatImageMimeType.BMP:
            return true;
        default:
            return false;
    }
}
//# sourceMappingURL=languageModelChatMessageHelpers.js.map