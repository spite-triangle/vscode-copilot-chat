"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultCppSimilarFilesOptions = exports.nullSimilarFilesOptions = exports.conservativeFilesOptions = exports.defaultSimilarFilesOptions = exports.DEFAULT_MAX_CHARACTERS_PER_FILE = exports.DEFAULT_MAX_NUMBER_OF_FILES = exports.DEFAULT_MAX_SNIPPETS_PER_FILE = exports.DEFAULT_MAX_TOP_SNIPPETS = exports.DEFAULT_SNIPPET_WINDOW_SIZE = exports.DEFAULT_SNIPPET_THRESHOLD = void 0;
exports.getSimilarSnippets = getSimilarSnippets;
const jaccardMatching_1 = require("./jaccardMatching");
const subsetMatching_1 = require("./subsetMatching");
exports.DEFAULT_SNIPPET_THRESHOLD = 0.0;
exports.DEFAULT_SNIPPET_WINDOW_SIZE = 60;
exports.DEFAULT_MAX_TOP_SNIPPETS = 4;
exports.DEFAULT_MAX_SNIPPETS_PER_FILE = 1;
exports.DEFAULT_MAX_NUMBER_OF_FILES = 20;
exports.DEFAULT_MAX_CHARACTERS_PER_FILE = 10000;
// Moved to ../prompt due to cyclic dependencies.
// export interface SimilarFilesOptions {
exports.defaultSimilarFilesOptions = {
    snippetLength: exports.DEFAULT_SNIPPET_WINDOW_SIZE,
    threshold: exports.DEFAULT_SNIPPET_THRESHOLD,
    maxTopSnippets: exports.DEFAULT_MAX_TOP_SNIPPETS,
    maxCharPerFile: exports.DEFAULT_MAX_CHARACTERS_PER_FILE,
    maxNumberOfFiles: exports.DEFAULT_MAX_NUMBER_OF_FILES,
    maxSnippetsPerFile: exports.DEFAULT_MAX_SNIPPETS_PER_FILE,
    useSubsetMatching: false,
};
exports.conservativeFilesOptions = {
    snippetLength: 10,
    threshold: 0.3,
    maxTopSnippets: 1,
    maxCharPerFile: exports.DEFAULT_MAX_CHARACTERS_PER_FILE,
    maxNumberOfFiles: exports.DEFAULT_MAX_NUMBER_OF_FILES,
    maxSnippetsPerFile: 1,
};
exports.nullSimilarFilesOptions = {
    snippetLength: 0,
    threshold: 1,
    maxTopSnippets: 0,
    maxCharPerFile: 0,
    maxNumberOfFiles: 0,
    maxSnippetsPerFile: 0,
};
// Default similarity parameters for languageId === 'cpp'.
// Tuned by A/B/n experimentation
exports.defaultCppSimilarFilesOptions = {
    snippetLength: 60,
    threshold: 0.0,
    maxTopSnippets: 16,
    maxCharPerFile: 100000,
    maxNumberOfFiles: 200,
    maxSnippetsPerFile: 4,
};
function getMatcher(doc, selection) {
    const matcherFactory = selection.useSubsetMatching
        ? subsetMatching_1.BlockTokenSubsetMatcher.FACTORY(selection.snippetLength)
        : jaccardMatching_1.FixedWindowSizeJaccardMatcher.FACTORY(selection.snippetLength);
    return matcherFactory.to(doc);
}
/**
 * @returns A SnippetWithProviderInfo describing the best matches from similar files.
 */
async function getSimilarSnippets(doc, similarFiles, options) {
    const matcher = getMatcher(doc, options);
    if (options.maxTopSnippets === 0) {
        return [];
    }
    const snippets = (await similarFiles
        // filter out absurdly long or absurdly many open files
        .filter(similarFile => similarFile.source.length < options.maxCharPerFile && similarFile.source.length > 0)
        // slice(0) duplicates an array
        .slice(0, options.maxNumberOfFiles)
        .reduce(async (acc, similarFile // accumulator of all snippets from all similarFiles
    ) => (await acc).concat((await matcher.findMatches(similarFile, options.maxSnippetsPerFile)).map(snippet => ({
        relativePath: similarFile.relativePath,
        ...snippet,
    }))), Promise.resolve([])))
        .filter(similarFile => 
    // remove files that had no match at all
    similarFile.score &&
        similarFile.snippet &&
        // remove files that had a low score
        similarFile.score > options.threshold)
        // order them with best (highest scores) last
        .sort((a, b) => a.score - b.score)
        // take the best options from the end
        .slice(-options.maxTopSnippets);
    return snippets;
}
//# sourceMappingURL=similarFiles.js.map