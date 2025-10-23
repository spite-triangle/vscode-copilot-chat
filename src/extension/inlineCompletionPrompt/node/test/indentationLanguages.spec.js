"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ts_dedent_1 = __importDefault(require("ts-dedent"));
const vitest_1 = require("vitest");
const api_1 = require("../../common/indentation/api");
const testHelpers_1 = require("./testHelpers");
/** Test some language specific parsing techniques */
(0, vitest_1.suite)('Java', function () {
    (0, vitest_1.test)('method detection in Java', function () {
        const source = (0, ts_dedent_1.default) `
        // first an import
        import java.util.List;

        @Override
        public class Test {
            public static void main(String[] args) {
                System.out.println("Hello World!");

            }

            @Override
            private List<String> list;
        }`;
        const javaParsedTree = (0, api_1.parseTree)(source, 'java');
        // we should have picked up the correct labels
        const lineLabels = [];
        (0, api_1.visitTree)(javaParsedTree, node => {
            if ((0, api_1.isLine)(node) && node.label) {
                lineLabels.push(node.label);
            }
        }, 'topDown');
        vitest_1.assert.deepStrictEqual(lineLabels, [
            'comment_single',
            'import',
            // blank
            'annotation',
            'class',
            'member',
            // not labelled
            'closer',
            // blank
            'member', // as per explicit comment, the annotations within a class are relabeled 'member,
            'member',
            'closer',
        ]);
    });
    (0, vitest_1.test)('labelLines java', function () {
        const tree = (0, api_1.parseTree)((0, ts_dedent_1.default) `
            package com.example;
            import java.awt.*;
            @annotation
            final public class A {
                /** A javadoc
                 *  Second line
                 */
                public static void main(String[] args) {
                    // single-line comment
                    /* Multiline
                     * comment
                     */
                    System.out.println("Hello, world!");
                }
            }
            public interface I { }
            `, 'java');
        (0, testHelpers_1.compareTreeWithSpec)(tree, (0, api_1.topNode)([
            (0, api_1.lineNode)(0, 0, 'pa...', [], 'package'),
            (0, api_1.lineNode)(0, 1, 'imp..', [], 'import'),
            (0, api_1.lineNode)(0, 2, '@ann...', [], 'annotation'),
            (0, api_1.lineNode)(0, 3, 'cla...', [
                (0, api_1.lineNode)(4, 4, '/**...', [(0, api_1.lineNode)(5, 5, '* ...', []), (0, api_1.lineNode)(5, 6, '* ...', [])], 'javadoc'),
                (0, api_1.lineNode)(4, 7, 'public...', [
                    (0, api_1.lineNode)(8, 8, '//...', [], 'comment_single'),
                    (0, api_1.lineNode)(8, 9, '/*...', [(0, api_1.lineNode)(9, 10, '* ...', []), (0, api_1.lineNode)(9, 11, '*/', [])], 'comment_multi'),
                    (0, api_1.lineNode)(8, 12, 'System ...', []),
                    (0, api_1.lineNode)(4, 13, '}', [], 'closer'),
                ]),
                (0, api_1.lineNode)(0, 14, '}', [], 'closer'),
            ], 'class'),
            (0, api_1.lineNode)(0, 15, 'public...', [], 'interface'),
        ]));
    });
    (0, vitest_1.test)('parse Java fields', function () {
        //TODO: Add a field with annotation on separate line
        const tree = (0, api_1.parseTree)((0, ts_dedent_1.default) `
            class A {
                int a;
                /** Javadoc */
                int b;
                // Comment
                @Native int c;
            }
            `, 'java');
        (0, testHelpers_1.compareTreeWithSpec)(tree, (0, api_1.topNode)([
            (0, api_1.lineNode)(0, 0, 'class...', [
                (0, api_1.lineNode)(4, 1, 'int a;', [], 'member'),
                (0, api_1.lineNode)(4, 2, '/**...', [], 'javadoc'),
                (0, api_1.lineNode)(4, 3, 'int b;', [], 'member'),
                (0, api_1.lineNode)(4, 4, '//...', [], 'comment_single'),
                (0, api_1.lineNode)(4, 5, '@Native int c;', [], 'member'),
                (0, api_1.lineNode)(0, 6, '}', [], 'closer'),
            ], 'class'),
        ]));
    });
    (0, vitest_1.test)('parse Java inner class', function () {
        const tree = (0, api_1.parseTree)((0, ts_dedent_1.default) `
            class A {
                int a;

                class Inner {
                    int b;
                }

                interface InnerInterface {
                    int myMethod();
                }
            }
            `, 'java');
        (0, testHelpers_1.compareTreeWithSpec)(tree, (0, api_1.topNode)([
            (0, api_1.lineNode)(0, 0, 'class A {', [
                (0, api_1.lineNode)(4, 1, 'int a;', [], 'member'),
                (0, api_1.blankNode)(2),
                (0, api_1.lineNode)(4, 3, 'class Inner ...', [(0, api_1.lineNode)(8, 4, 'int b;', [], 'member'), (0, api_1.lineNode)(4, 5, '}', [], 'closer')], 'class'),
                (0, api_1.blankNode)(6),
                (0, api_1.lineNode)(4, 7, 'interface InnerInterface ...', [(0, api_1.lineNode)(8, 8, 'int myMethod();', [], 'member'), (0, api_1.lineNode)(4, 9, '}', [], 'closer')], 'interface'),
                (0, api_1.lineNode)(0, 10, '}', [], 'closer'),
            ], 'class'),
        ]));
    });
});
(0, vitest_1.suite)('Markdown', function () {
    (0, vitest_1.test)('header processing in markdown', function () {
        const source = (0, ts_dedent_1.default) `
        A

        # B
        C
        D

        ## E
        F
        G

        # H
        I

        ### J
        K

        L
        M
        `;
        const mdParsedTree = (0, api_1.parseTree)(source, 'markdown');
        (0, testHelpers_1.compareTreeWithSpec)(mdParsedTree, (0, api_1.topNode)([
            (0, api_1.virtualNode)(0, [(0, api_1.lineNode)(0, 0, 'A', []), (0, api_1.blankNode)(1)]),
            (0, api_1.virtualNode)(0, [
                (0, api_1.lineNode)(0, 2, '# B', [
                    (0, api_1.virtualNode)(0, [(0, api_1.lineNode)(0, 3, 'C', []), (0, api_1.lineNode)(0, 4, 'D', []), (0, api_1.blankNode)(5)]),
                    (0, api_1.lineNode)(0, 6, '## E', [(0, api_1.lineNode)(0, 7, 'F', []), (0, api_1.lineNode)(0, 8, 'G', []), (0, api_1.blankNode)(9)], 'subheading'),
                ], 'heading'),
                (0, api_1.lineNode)(0, 10, '# H', [
                    (0, api_1.virtualNode)(0, [(0, api_1.lineNode)(0, 11, 'I', []), (0, api_1.blankNode)(12)]),
                    (0, api_1.lineNode)(0, 13, '### J', [
                        (0, api_1.virtualNode)(0, [(0, api_1.lineNode)(0, 14, 'K', []), (0, api_1.blankNode)(15)]),
                        (0, api_1.virtualNode)(0, [(0, api_1.lineNode)(0, 16, 'L', []), (0, api_1.lineNode)(0, 17, 'M', [])]),
                    ], 'subsubheading'),
                ], 'heading'),
            ]),
        ]));
    });
});
//# sourceMappingURL=indentationLanguages.spec.js.map