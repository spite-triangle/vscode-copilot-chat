"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.Response = exports.IFetcherService = void 0;
exports.jsonVerboseError = jsonVerboseError;
const services_1 = require("../../../util/common/services");
exports.IFetcherService = (0, services_1.createServiceIdentifier)('IFetcherService');
/** A basic version of http://developer.mozilla.org/en-US/docs/Web/API/Response */
class Response {
    constructor(status, statusText, headers, getText, getJson, getBody) {
        this.status = status;
        this.statusText = statusText;
        this.headers = headers;
        this.getText = getText;
        this.getJson = getJson;
        this.getBody = getBody;
        this.ok = this.status >= 200 && this.status < 300;
    }
    async text() {
        return this.getText();
    }
    async json() {
        return this.getJson();
    }
    /** Async version of the standard .body field. */
    async body() {
        return this.getBody();
    }
}
exports.Response = Response;
async function jsonVerboseError(resp) {
    const text = await resp.text();
    try {
        return JSON.parse(text);
    }
    catch (err) {
        const lines = text.split('\n');
        const errText = lines.length > 50 ? [...lines.slice(0, 25), '[...]', ...lines.slice(lines.length - 25)].join('\n') : text;
        err.message = `${err.message}. Response: ${errText}`;
        throw err;
    }
}
//# sourceMappingURL=fetcherService.js.map