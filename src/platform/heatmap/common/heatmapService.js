"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.nullHeatmapService = exports.IHeatmapService = exports.SelectionPoint = void 0;
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
class SelectionPoint {
    constructor(offset, timestamp) {
        this.offset = offset;
        this.timestamp = timestamp;
    }
    adjust(delta) {
        return new SelectionPoint(this.offset + delta, this.timestamp);
    }
}
exports.SelectionPoint = SelectionPoint;
exports.IHeatmapService = (0, instantiation_1.createDecorator)('heatmapService');
exports.nullHeatmapService = {
    _serviceBrand: undefined,
    async getEntries() {
        return new Map();
    }
};
//# sourceMappingURL=heatmapService.js.map