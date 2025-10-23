"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const responseProcessor_1 = require("../../../../platform/inlineEdits/common/responseProcessor");
const async_1 = require("../../../../util/vs/base/common/async");
const lineEdit_1 = require("../../../../util/vs/editor/common/core/edits/lineEdit");
const lineRange_1 = require("../../../../util/vs/editor/common/core/ranges/lineRange");
(0, vitest_1.suite)('stream diffing', () => {
    async function run(editWindow, updatedEditWindowLines) {
        const updatedEditWindowLinesStream = async_1.AsyncIterableObject.fromArray(updatedEditWindowLines);
        const editsGen = responseProcessor_1.ResponseProcessor.diff(editWindow, updatedEditWindowLinesStream, 0, responseProcessor_1.ResponseProcessor.DEFAULT_DIFF_PARAMS);
        const edits = [];
        for await (const edit of editsGen) {
            edits.push(edit);
        }
        const lineEdit = new lineEdit_1.LineEdit(edits);
        return {
            lineEdit,
            patch: lineEdit.humanReadablePatch(editWindow),
        };
    }
    (0, vitest_1.suite)('edit window with all lines being unique', () => {
        const editWindow = [
            /* 0  */ `export function printParseTree(node: Parser.SyntaxNode, options: PrintingOptions, print: NodePrinter = ParseTreeEditor.renderNode): string[] {`,
            /* 1  */ `	const printedNodes: string[] = [];`,
            /* 2  */ `	traverseDFPreOrder(node, (cursor, depth) => {`,
            /* 3  */ `		const currentNode = cursor.currentNode();`,
            /* 4  */ `		if (options.printOnlyNamed && !currentNode.isNamed()) {`,
            /* 5  */ `			return;`,
            /* 6  */ `		}`,
            /* 7  */ `		const printedNode = print(currentNode, depth, cursor.currentFieldName());`,
            /* 8  */ `		printedNodes.push(printedNode);`,
            /* 9  */ `	});`,
            /* 10 */ `	return printedNodes;`,
            /* 11 */ `}`
        ];
        (0, vitest_1.test)('in stream middle - 1 line diff', async () => {
            const updatedEditWindow = [...editWindow];
            updatedEditWindow.splice(2, 1, '	traverse(node, (cursor, depth) => {');
            const { patch } = await run(editWindow, updatedEditWindow);
            (0, vitest_1.expect)(patch).toMatchInlineSnapshot(`
				"    1   1 export function printParseTree(node: Parser.SyntaxNode, options: PrintingOptions, print: NodePrinter = ParseTreeEditor.renderNode): string[] {
				    2   2 	const printedNodes: string[] = [];
				-   3     	traverseDFPreOrder(node, (cursor, depth) => {
				+       3 	traverse(node, (cursor, depth) => {
				    4   4 		const currentNode = cursor.currentNode();
				    5   5 		if (options.printOnlyNamed && !currentNode.isNamed()) {
				    6   6 			return;"
			`);
        });
        (0, vitest_1.test)('in stream middle - 2 consecutive lines diff', async () => {
            const updatedEditWindow = [...editWindow];
            updatedEditWindow.splice(2, 1, '	traverse(node, (cursor, depth) => {', '		console.log("new line");');
            const { patch } = await run(editWindow, updatedEditWindow);
            (0, vitest_1.expect)(patch).toMatchInlineSnapshot(`
				"    1   1 export function printParseTree(node: Parser.SyntaxNode, options: PrintingOptions, print: NodePrinter = ParseTreeEditor.renderNode): string[] {
				    2   2 	const printedNodes: string[] = [];
				-   3     	traverseDFPreOrder(node, (cursor, depth) => {
				+       3 	traverse(node, (cursor, depth) => {
				+       4 		console.log("new line");
				    4   5 		const currentNode = cursor.currentNode();
				    5   6 		if (options.printOnlyNamed && !currentNode.isNamed()) {
				    6   7 			return;"
			`);
        });
        (0, vitest_1.test)('in stream middle - 1 line diff, 2 consecutive lines diff', async () => {
            const updatedEditWindow = [...editWindow];
            updatedEditWindow.splice(2, 1, '	traverse(node, (cursor, depth) => {');
            updatedEditWindow.splice(7, 2, 
            /* 7  */ `		const myPrintedNode = print(currentNode, depth, cursor.currentFieldName());`, 
            /* 8  */ `		printedNodes.push(myPrintedNode);`);
            const { patch } = await run(editWindow, updatedEditWindow);
            (0, vitest_1.expect)(patch).toMatchInlineSnapshot(`
				"    1   1 export function printParseTree(node: Parser.SyntaxNode, options: PrintingOptions, print: NodePrinter = ParseTreeEditor.renderNode): string[] {
				    2   2 	const printedNodes: string[] = [];
				-   3     	traverseDFPreOrder(node, (cursor, depth) => {
				+       3 	traverse(node, (cursor, depth) => {
				    4   4 		const currentNode = cursor.currentNode();
				    5   5 		if (options.printOnlyNamed && !currentNode.isNamed()) {
				    6   6 			return;
				    7   7 		}
				-   8     		const printedNode = print(currentNode, depth, cursor.currentFieldName());
				-   9     		printedNodes.push(printedNode);
				+       8 		const myPrintedNode = print(currentNode, depth, cursor.currentFieldName());
				+       9 		printedNodes.push(myPrintedNode);
				   10  10 	});
				   11  11 	return printedNodes;
				   12  12 }"
			`);
        });
        (0, vitest_1.test)('removes lines at beginning', async () => {
            const updatedEditWindow = [...editWindow];
            updatedEditWindow.splice(0, 3);
            const { patch } = await run(editWindow, updatedEditWindow);
            (0, vitest_1.expect)(patch).toMatchInlineSnapshot(`
				"-   1     export function printParseTree(node: Parser.SyntaxNode, options: PrintingOptions, print: NodePrinter = ParseTreeEditor.renderNode): string[] {
				-   2     	const printedNodes: string[] = [];
				-   3     	traverseDFPreOrder(node, (cursor, depth) => {
				    4   1 		const currentNode = cursor.currentNode();
				    5   2 		if (options.printOnlyNamed && !currentNode.isNamed()) {
				    6   3 			return;"
			`);
        });
        (0, vitest_1.test)('removes lines at end', async () => {
            const updatedEditWindow = [...editWindow];
            updatedEditWindow.splice(9, 3);
            const { patch } = await run(editWindow, updatedEditWindow);
            (0, vitest_1.expect)(patch).toMatchInlineSnapshot(`
				"    8   8 		const printedNode = print(currentNode, depth, cursor.currentFieldName());
				    9   9 		printedNodes.push(printedNode);
				-  10     	});
				-  11     	return printedNodes;
				-  12     }"
			`);
        });
    });
    (0, vitest_1.suite)('edit window with non-unique lines', () => {
        (0, vitest_1.test)('removes lines at end', async () => {
            const editWindow = [
                `}`,
                ``,
                `int multiply(int a, int b = 1, int c = 2) {`,
                `	return a * b;`,
                `}`,
                ``,
                `template<typename... Args> auto sum(Args... args) {`,
                `	return (args + ...);`,
                `}`,
                ``,
                `template<typename T> T identify(T value) {`,
                `	return value;`,
                `}`,
            ];
            const updatedEditWindow = [...editWindow];
            updatedEditWindow.splice(3, 1, '	return a * b * c;');
            const { patch } = await run(editWindow, updatedEditWindow);
            (0, vitest_1.expect)(patch).toMatchInlineSnapshot(`
				"    2   2 
				    3   3 int multiply(int a, int b = 1, int c = 2) {
				-   4     	return a * b;
				+       4 	return a * b * c;
				    5   5 }
				    6   6 
				    7   7 template<typename... Args> auto sum(Args... args) {"
			`);
        });
        (0, vitest_1.test)('matching line quite below', async () => {
            const editWindow = [
                /*  1 */ '			if (!document) {',
                /*  2 */ '				return;',
                /*  3 */ '			}				document.selection.set(e.selections.map(s => new OffsetRange(e.textEditor.document.offsetAt(s.start), e.textEditor.document.offsetAt(s.end)), undefined);		}));',
                /*  4 */ '',
                /*  5 */ '		this._register(workspace.onDidCloseTextDocument(e => {',
                /*  6 */ '			if (!this.filter.isTrackingEnabled(e)) {',
                /*  7 */ '				return;',
                /*  8 */ '			}',
                /*  9 */ '',
                /* 10 */ '			this._tracker.handleDocumentClosed(documentUriFromTextDocument(e));',
                /* 11 */ '		}));',
                /* 12 */ '',
                /* 13 */ '		for (const doc of workspace.textDocuments) {',
            ];
            const updatedEditWindow = [...editWindow];
            updatedEditWindow.splice(2, 1, '			}', '			document.selection.set(e.selections.map(s => new OffsetRange(e.textEditor.document.offsetAt(s.start), e.textEditor.document.offsetAt(s.end)), undefined));', '		}));');
            const { patch } = await run(editWindow, updatedEditWindow);
            (0, vitest_1.expect)(patch).toMatchInlineSnapshot(`
				"    1   1 			if (!document) {
				    2   2 				return;
				-   3     			}				document.selection.set(e.selections.map(s => new OffsetRange(e.textEditor.document.offsetAt(s.start), e.textEditor.document.offsetAt(s.end)), undefined);		}));
				+       3 			}
				+       4 			document.selection.set(e.selections.map(s => new OffsetRange(e.textEditor.document.offsetAt(s.start), e.textEditor.document.offsetAt(s.end)), undefined));
				+       5 		}));
				    4   6 
				    5   7 		this._register(workspace.onDidCloseTextDocument(e => {
				    6   8 			if (!this.filter.isTrackingEnabled(e)) {"
			`);
        });
        (0, vitest_1.test)('converge at two lines', async () => {
            const editWindow = [
                /*  1 */ `class Point3D {`,
                /*  2 */ `    x: number;`,
                /*  3 */ `    y: number;`,
                /*  4 */ ``,
                /*  5 */ `    constructor(x: number, y: number) {`,
                /*  6 */ `        this.x = x;`,
                /*  7 */ `        this.y = y;`,
                /*  8 */ `    }`,
                /*  9 */ ``,
                /* 10 */ `    spaghetti(): number {`,
                /* 11 */ `        return this.x + this.y;`,
            ];
            const lineEdit = new lineEdit_1.LineEdit([
                new lineEdit_1.LineReplacement(new lineRange_1.LineRange(4, 4), ['    z: number;']),
                new lineEdit_1.LineReplacement(new lineRange_1.LineRange(5, 6), ['    constructor(x: number, y: number, z: number) {']),
                new lineEdit_1.LineReplacement(new lineRange_1.LineRange(8, 8), ['        this.z = z;']),
                new lineEdit_1.LineReplacement(new lineRange_1.LineRange(11, 12), ['        return this.x + this.y + this.z;'])
            ]);
            const updatedEditWindow = lineEdit.apply(editWindow);
            const { patch } = await run(editWindow, updatedEditWindow);
            (0, vitest_1.expect)(patch).toMatchInlineSnapshot(`
				"    2   2     x: number;
				    3   3     y: number;
				-   4     
				-   5         constructor(x: number, y: number) {
				+       4     z: number;
				+       5 
				+       6     constructor(x: number, y: number, z: number) {
				    6   7         this.x = x;
				    7   8         this.y = y;
				+       9         this.z = z;
				    8  10     }
				    9  11 
				   10  12     spaghetti(): number {
				-  11             return this.x + this.y;
				+      13         return this.x + this.y + this.z;"
			`);
        });
        (0, vitest_1.test)('prefers adding lines than removing them', async () => {
            const editWindow = [
                /*  1 */ `a`,
                /*  2 */ `b`,
                /*  3 */ `c`,
                /*  4 */ `d`,
                /*  5 */ `e`,
                /*  6 */ `f`,
            ];
            const lineEdit = new lineEdit_1.LineEdit([
                new lineEdit_1.LineReplacement(new lineRange_1.LineRange(3, 5), ['c1']),
            ]);
            const updatedEditWindow = lineEdit.apply(editWindow);
            const { patch } = await run(editWindow, updatedEditWindow);
            (0, vitest_1.expect)(patch).toMatchInlineSnapshot(`
				"    1   1 a
				    2   2 b
				-   3     c
				-   4     d
				+       3 c1
				    5   4 e
				    6   5 f"
			`);
        });
        (0, vitest_1.test)('repetitive code should not result in deletion', async () => {
            const editWindow = [
                `function updateKthEntry<T>() {}`,
                ``,
                `function updateAllEntries<T>(cache: Cache, documentId: DocumentId, entries: T[]) {`,
                `    const cachedEntries = cache.get(documentId);`,
                `    if (cachedEntries === undefined) {`,
                `        return;`,
                `    }`,
                `    cachedEntries.push(...entries);`,
                `}`,
            ];
            const updatedEditWindow = [
                `function updateKthEntry<T>(cache: Cache, documentId: DocumentId, k: number, entry: T) {`,
                `    const cachedEntries = cache.get(documentId);`,
                `    if (cachedEntries === undefined) {`,
                `        return;`,
                `    }`,
                `    cachedEntries[k] = entry;`,
                `}`,
                ``,
                `function updateAllEntries<T>(cache: Cache, documentId: DocumentId, entries: T[]) {`,
                `    const cachedEntries = cache.get(documentId);`,
                `    if (cachedEntries === undefined) {`,
                `        return;`,
                `    }`,
                `    cachedEntries.push(...entries);`,
                `}`,
            ];
            const { patch } = await run(editWindow, updatedEditWindow);
            (0, vitest_1.expect)(patch).toMatchInlineSnapshot(`
				"-   1     function updateKthEntry<T>() {}
				+       1 function updateKthEntry<T>(cache: Cache, documentId: DocumentId, k: number, entry: T) {
				+       2     const cachedEntries = cache.get(documentId);
				+       3     if (cachedEntries === undefined) {
				+       4         return;
				+       5     }
				+       6     cachedEntries[k] = entry;
				+       7 }
				    2   8 
				    3   9 function updateAllEntries<T>(cache: Cache, documentId: DocumentId, entries: T[]) {
				    4  10     const cachedEntries = cache.get(documentId);"
			`);
        });
    });
});
//# sourceMappingURL=responseProcessor.spec.js.map