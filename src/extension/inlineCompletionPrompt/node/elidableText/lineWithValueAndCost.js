"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.LineWithValueAndCost = void 0;
const api_1 = require("../tokenization/api");
/**
 * A line of text together with:
 * * a value >= 0 representing how desirable it is (the higher the better)
 * * a cost >= 0 representing how costly it is to insert it, e.g. in tokens.
 * The text is expected to contain no "\n" character.
 */
class LineWithValueAndCost {
    /**
     * Create a line of text with a value and a cost.
     * @param text The line of text without the `\n` character.
     * @param value The value, expressed from 0 (worthless) to 1 (essential). Values are expected to be combined multiplicatively.
     * @param cost How costly it is to insert this line, e.g. in tokens. Costs are expected to be combined additively.
     * @param validate Whether to validate the input. In some cases, it can make sense to extend the value to above 1 in very rare cases, but these must be deliberately allowed.
     */
    constructor(text, _value, _cost, validate = 'strict', metadata) {
        this.text = text;
        this._value = _value;
        this._cost = _cost;
        this.metadata = metadata;
        this.markedForRemoval = false;
        // check that the text does not contain newlines
        if (text.includes('\n') && validate !== 'none') {
            throw new Error('LineWithValueAndCost: text contains newline');
        }
        if (_value < 0 && validate !== 'none') {
            throw new Error('LineWithValueAndCost: value is negative');
        }
        if (_cost < 0 && validate !== 'none') {
            throw new Error('LineWithValueAndCost: cost is negative');
        }
        if (validate === 'strict' && _value > 1) {
            throw new Error('Value should normally be between 0 and 1 -- set validation to `loose` to ignore this error');
        }
    }
    get value() {
        return this._value;
    }
    get cost() {
        return this._cost;
    }
    /** Multiply the value with a multiplier, typically between 0 and 1 */
    adjustValue(multiplier) {
        this._value *= multiplier;
        return this;
    }
    setValue(value) {
        this._value = value;
        return this;
    }
    /** Change the cost of lines according to a specified function; e.g. to take into account different tokenizers */
    recost(coster = (x) => (0, api_1.getTokenizer)().tokenLength(x + '\n')) {
        this._cost = coster(this.text);
        return this;
    }
    copy() {
        const copy = new LineWithValueAndCost(this.text, this.value, this.cost, 'none', this.metadata);
        copy.markedForRemoval = this.markedForRemoval;
        return copy;
    }
}
exports.LineWithValueAndCost = LineWithValueAndCost;
//# sourceMappingURL=lineWithValueAndCost.js.map