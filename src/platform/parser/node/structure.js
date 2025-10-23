"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.structureComputer = exports.StructureComputer = void 0;
const cache_1 = require("../../../util/common/cache");
const nodes_1 = require("./nodes");
const parserWithCaching_1 = require("./parserWithCaching");
const querying_1 = require("./querying");
const treeSitterLanguages_1 = require("./treeSitterLanguages");
const treeSitterQueries_1 = require("./treeSitterQueries");
class StructureComputer {
    constructor() {
        this._cache = new cache_1.LRUCache(5);
    }
    setCacheSize(size) {
        this._cache = new cache_1.LRUCache(size);
    }
    async getStructure(lang, source) {
        const cacheKey = `${lang}:${source}`;
        let cacheValue = this._cache.get(cacheKey);
        if (!cacheValue) {
            cacheValue = await this._getStructure(lang, source);
            this._cache.put(cacheKey, cacheValue);
        }
        return cacheValue;
    }
    async _getStructure(lang, source) {
        const queries = treeSitterQueries_1.syntacticallyValidAtoms[lang];
        if (queries.length === 0) {
            // language not supported
            return undefined;
        }
        const treeRef = await (0, parserWithCaching_1._parse)(lang, source);
        try {
            const captures = (0, querying_1.runQueries)(queries, treeRef.tree.rootNode)
                .flatMap(e => e.captures)
                .sort((a, b) => nodes_1.TreeSitterOffsetRange.compare(a.node, b.node));
            // Exclude captures contained in ranges marked with ".exclude_captures"
            const excludedRanges = [];
            for (const capture of captures) {
                if (capture.name.endsWith('.exclude_captures')) {
                    excludedRanges.push(nodes_1.TreeSitterOffsetRange.ofSyntaxNode(capture.node));
                }
            }
            const root = new nodes_1.OverlayNode(0, source.length, 'root', []);
            const parentStack = [root];
            for (let i = 0; i < captures.length; ++i) {
                const currentCapture = captures[i];
                const currentNode = currentCapture.node;
                if (excludedRanges.some(r => nodes_1.TreeSitterOffsetRange.isEqual(r, currentNode))) {
                    // This node should be excluded
                    continue;
                }
                // find a parent node that contains the current capture
                let currentParent;
                do {
                    currentParent = parentStack.pop(); // ! because we know there will be the root node
                } while (currentParent && !nodes_1.TreeSitterOffsetRange.doesContain(currentParent, currentNode));
                // nodes that need to be merged with their child, e.g.,
                // Given `export const foo = 1;`, we can't just remove `const foo = 1;` because then syntax doesn't make sense
                const ambientParents = new Set(['export_statement', 'ambient_declaration']);
                if (ambientParents.has(currentParent.kind)) { // merge the parent with the child
                    currentParent.kind = currentNode.type;
                    parentStack.push(currentParent);
                }
                else {
                    // get a more specific node kind
                    // js/ts/tsx: kind `method_definition` with identifier "constructor" -> kind `constructor`
                    let nodeKind = currentNode.type;
                    if ((lang === treeSitterLanguages_1.WASMLanguage.TypeScript || lang === treeSitterLanguages_1.WASMLanguage.TypeScriptTsx || lang === treeSitterLanguages_1.WASMLanguage.JavaScript) &&
                        nodeKind === 'method_definition' && currentNode.namedChildren.some(c => c.type === 'property_identifier' && c.text === 'constructor')) {
                        nodeKind = 'constructor';
                    }
                    let startIndex = currentNode.startIndex;
                    const prevSibling = currentNode.previousSibling;
                    if (prevSibling !== null) {
                        const textBetweenNodes = source.substring(prevSibling.endIndex, currentNode.startIndex);
                        const nlIdx = textBetweenNodes.indexOf('\n');
                        if (nlIdx === -1) {
                            startIndex = prevSibling.endIndex;
                        }
                        else {
                            startIndex = prevSibling.endIndex + nlIdx + 1;
                        }
                    }
                    let endIndex = currentNode.endIndex;
                    // currentNode should subsume sibling nodes that are trivial, eg `;`, `,`, same-line comment
                    // if trivial sibling node is itself captured as a separate node, then it becomes a child node of currentNode, ie currentNode would have a comment as a child
                    // else it's just part of the node
                    if (currentNode.nextSibling !== null) {
                        let nextSibling = currentNode.nextSibling;
                        if (lang === treeSitterLanguages_1.WASMLanguage.TypeScript || lang === treeSitterLanguages_1.WASMLanguage.TypeScriptTsx || lang === treeSitterLanguages_1.WASMLanguage.JavaScript || lang === treeSitterLanguages_1.WASMLanguage.Cpp) {
                            while (nextSibling &&
                                (nextSibling.type === ';' ||
                                    nextSibling.type === ',' ||
                                    (nextSibling.type === 'comment' && !source.substring(endIndex, nextSibling.startIndex).includes('\n') /* on the same line */))) {
                                excludedRanges.push(nodes_1.TreeSitterOffsetRange.ofSyntaxNode(nextSibling));
                                endIndex = nextSibling.endIndex;
                                nextSibling = nextSibling.nextSibling;
                            }
                        }
                        if (nextSibling !== null) {
                            const textBetweenNodes = source.substring(endIndex, nextSibling.startIndex);
                            const nlIdx = textBetweenNodes.indexOf('\n');
                            if (nlIdx !== -1) {
                                endIndex = endIndex + nlIdx + 1;
                            }
                        }
                    }
                    const newNode = new nodes_1.OverlayNode(startIndex, endIndex, nodeKind, []);
                    currentParent.children.push(newNode);
                    parentStack.push(currentParent, newNode);
                }
            }
            return root;
        }
        catch (e) {
            console.error(e instanceof Error ? e : new Error(e));
        }
        finally {
            treeRef.dispose();
        }
    }
}
exports.StructureComputer = StructureComputer;
exports.structureComputer = new StructureComputer();
//# sourceMappingURL=structure.js.map