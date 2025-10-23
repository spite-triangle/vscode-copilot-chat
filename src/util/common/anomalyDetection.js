"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateLineRepetitionStats = calculateLineRepetitionStats;
exports.isRepetitive = isRepetitive;
const configs = [
    // in case of single token, 10 repetitions is too much already:
    { max_token_sequence_length: 1, last_tokens_to_consider: 10 },
    // if the last 30 tokens are a repeat of up to 10 tokens, then it's a pattern:
    { max_token_sequence_length: 10, last_tokens_to_consider: 30 },
    // if the pattern is very long, it needs to account for a long stretch so we can be sure
    { max_token_sequence_length: 20, last_tokens_to_consider: 45 },
    { max_token_sequence_length: 30, last_tokens_to_consider: 60 },
    { max_token_sequence_length: 60, last_tokens_to_consider: 120 },
];
/**
 * Given a string calculates how many times each line in the string is repeated
 * @param text The string to analyze
 * @returns The repeating line, the number of times it repeats, total number of lines
 */
function calculateLineRepetitionStats(text) {
    if (text.length === 0) {
        return { numberOfRepetitions: 0, mostRepeatedLine: '', totalLines: 0 };
    }
    const repetitionMap = new Map();
    const lines = text.split('\n');
    for (let line of lines) {
        line = line.trim();
        if (line.length === 0) {
            continue;
        }
        const repetitions = repetitionMap.get(line) || 0;
        repetitionMap.set(line, repetitions + 1);
    }
    let mostRepeatedLine = '';
    let maxRepetitions = 0;
    for (const [line, repetitions] of repetitionMap.entries()) {
        if (repetitions > maxRepetitions) {
            maxRepetitions = repetitions;
            mostRepeatedLine = line;
        }
    }
    return { numberOfRepetitions: maxRepetitions, mostRepeatedLine, totalLines: lines.length };
}
/**
 * Return whether the given token array ends in a repetition of a pattern.
 * Controlling the necessary pattern length is set in the configs array.
 */
function isRepetitive(tokens) {
    const tokensBackwards = tokens.slice();
    tokensBackwards.reverse();
    return (isRepeatedPattern(tokensBackwards) ||
        isRepeatedPattern(tokensBackwards.filter(token => token.trim().length > 0)));
}
/**
 * Determine whether the given array or string starts with the repetition of a pattern,
 * according to one of the predefined configs.
 */
function isRepeatedPattern(s) {
    const prefix = kmp_prefix_function(s);
    for (const config of configs) {
        if (s.length < config.last_tokens_to_consider) {
            continue;
        }
        // This is the smallest number of characters that one may shift `s` so that it
        // overlaps with itself. That is also the smallest length of a repeated
        // pattern that makes up `s`, where the last repetition is possibly truncated.
        const patternLength = config.last_tokens_to_consider - 1 - prefix[config.last_tokens_to_consider - 1];
        if (patternLength <= config.max_token_sequence_length) {
            return true;
        }
    }
    return false;
}
/** Return the Knuth-Morris-Pratt prefix function pi.
 *  For each i=0,..,.s.length-1, then
 *    pi[i] = max(j < i, s.slice(0,i+1).beginsWith(s.slice(0, j+1)))
 *  (note pi[0] = -1 by this definition)
 *  Adapted from
 *  Introduction to Algorithms, 3rd edition, by Thomas H. Cormen, et al.
 */
function kmp_prefix_function(s) {
    const pi = Array(s.length).fill(0);
    pi[0] = -1;
    let k = -1;
    for (let q = 1; q < s.length; q++) {
        while (k >= 0 && s[k + 1] !== s[q]) {
            k = pi[k];
        }
        if (s[k + 1] === s[q]) {
            k++;
        }
        pi[q] = k;
    }
    return pi;
}
//# sourceMappingURL=anomalyDetection.js.map