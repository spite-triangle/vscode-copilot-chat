"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs/promises"));
const vitest_1 = require("vitest");
const nesXtabHistoryTracker_1 = require("../../../../platform/inlineEdits/common/workspaceEditTracker/nesXtabHistoryTracker");
const assert_1 = require("../../../../util/vs/base/common/assert");
const path = __importStar(require("../../../../util/vs/base/common/path"));
const observableWorkspaceRecordingReplayer_1 = require("../../common/observableWorkspaceRecordingReplayer");
(0, vitest_1.describe)('NesXtabHistoryTracker', () => {
    function createTracker(replayerWorkspace, maxHistorySize) {
        return new nesXtabHistoryTracker_1.NesXtabHistoryTracker(replayerWorkspace, maxHistorySize);
    }
    (0, vitest_1.it)('1 line, 1 edit', () => {
        const recording = {
            log: [
                { documentType: "workspaceRecording@1.0", kind: 'header', repoRootUri: 'file:///Users/john/myProject', time: 0, uuid: '' },
                { time: 10, id: 0, kind: 'documentEncountered', relativePath: 'src/a.ts' },
                { time: 11, id: 0, v: 1, kind: 'setContent', content: 'hemmo world\ngoodbye' },
                { time: 11, id: 0, v: 1, kind: 'changed', edit: [[2, 4, 'll']] },
            ]
        };
        const replayer = new observableWorkspaceRecordingReplayer_1.ObservableWorkspaceRecordingReplayer(recording);
        const tracker = createTracker(replayer.workspace);
        replayer.replay();
        const history = tracker.getHistory();
        (0, assert_1.assert)(history.every(e => e.kind === 'edit'));
        (0, vitest_1.expect)(history.map(h => h.edit.toString()).join('\n---\n')).toMatchInlineSnapshot(`
			"-   1     hemmo world
			+       1 hello world
			    2   2 goodbye"
		`);
    });
    (0, vitest_1.it)('1 line, 2 edits', () => {
        const recording = {
            log: [
                { documentType: "workspaceRecording@1.0", kind: 'header', repoRootUri: 'file:///Users/john/myProject', time: 0, uuid: '' },
                { time: 10, id: 0, kind: 'documentEncountered', relativePath: 'src/a.ts' },
                { time: 11, id: 0, v: 1, kind: 'setContent', content: 'hemmo world\ngoodbye' },
                { time: 11, id: 0, v: 1, kind: 'changed', edit: [[2, 4, 'll']] },
                { time: 11, id: 0, v: 1, kind: 'changed', edit: [[8, 8, 'ooooo']] },
            ]
        };
        const replayer = new observableWorkspaceRecordingReplayer_1.ObservableWorkspaceRecordingReplayer(recording);
        const tracker = createTracker(replayer.workspace);
        replayer.replay();
        const history = tracker.getHistory();
        (0, assert_1.assert)(history.every(e => e.kind === 'edit'));
        (0, vitest_1.expect)(history.map(h => h.edit.toString()).join('\n---\n')).toMatchInlineSnapshot(`
			"-   1     hemmo world
			+       1 hello woooooorld
			    2   2 goodbye"
		`);
    });
    (0, vitest_1.it)('handles simple history', () => {
        const recording = {
            log: [
                { documentType: "workspaceRecording@1.0", kind: 'header', repoRootUri: 'file:///Users/john/myProject', time: 0, uuid: '' },
                { time: 10, id: 0, kind: 'documentEncountered', relativePath: 'src/a.ts' },
                { time: 11, id: 0, v: 1, kind: 'setContent', content: 'hemmo' },
                { time: 11, id: 0, v: 1, kind: 'changed', edit: [[5, 5, '\n']] },
                { time: 11, id: 0, v: 1, kind: 'changed', edit: [[2, 4, 'll']] },
                { time: 11, id: 0, v: 1, kind: 'changed', edit: [[6, 6, 'world']] },
            ]
        };
        const replayer = new observableWorkspaceRecordingReplayer_1.ObservableWorkspaceRecordingReplayer(recording);
        const tracker = createTracker(replayer.workspace);
        replayer.replay();
        const history = tracker.getHistory();
        (0, assert_1.assert)(history.every(e => e.kind === 'edit'));
        (0, vitest_1.expect)(history.map(h => h.edit.toString()).join('\n---\n')).toMatchInlineSnapshot(`
			"    1   1 hemmo
			+       2 
			---
			-   1     hemmo
			+       1 hello
			    2   2 
			---
			    1   1 hello
			-   2     
			+       2 world"
		`);
    });
    (0, vitest_1.it)('handles simple history with small maxHistorySize', () => {
        const recording = {
            log: [
                { documentType: "workspaceRecording@1.0", kind: 'header', repoRootUri: 'file:///Users/john/myProject', time: 0, uuid: '' },
                { time: 10, id: 0, kind: 'documentEncountered', relativePath: 'src/a.ts' },
                { time: 11, id: 0, v: 1, kind: 'setContent', content: 'hemmo' },
                { time: 12, id: 0, v: 2, kind: 'changed', edit: [[5, 5, '\n']] },
                { time: 13, id: 0, v: 3, kind: 'changed', edit: [[2, 4, 'll']] },
                { time: 14, id: 0, v: 4, kind: 'changed', edit: [[6, 6, 'world']] },
                { time: 15, id: 0, v: 5, kind: 'changed', edit: [[0, 5, 'goodbye']] },
            ]
        };
        const replayer = new observableWorkspaceRecordingReplayer_1.ObservableWorkspaceRecordingReplayer(recording);
        const tracker = createTracker(replayer.workspace, 2);
        replayer.replay();
        const history = tracker.getHistory();
        (0, assert_1.assert)(history.every(e => e.kind === 'edit'));
        (0, vitest_1.expect)(history.map(h => h.edit.toString()).join('\n---\n')).toMatchInlineSnapshot(`
			"    1   1 hello
			-   2     
			+       2 world
			---
			-   1     hello
			+       1 goodbye
			    2   2 world"
		`);
    });
    (0, vitest_1.it)('add new lines and edit one of them', async () => {
        const recording = await fs.readFile(path.join(__dirname, 'recordings/ArrayToObject.recording.w.json'), 'utf8').then(JSON.parse);
        const replayer = new observableWorkspaceRecordingReplayer_1.ObservableWorkspaceRecordingReplayer(recording);
        const tracker = createTracker(replayer.workspace);
        replayer.replay();
        const history = tracker.getHistory();
        (0, assert_1.assert)(history.every(e => e.kind === 'edit'));
        (0, vitest_1.expect)(history.map(h => h.edit.toString()).join('\n---\n')).toMatchInlineSnapshot(`
			"  147 147 			commandsWithArgs.set(commandId, argumentsSchema);
			  148 148 		}
			+     149 
			+     150 		
			  149 151 
			  150 152 		const searchableCommands: Searchables<Command>[] = [];
			  151 153 
			---
			  148 148 		}
			  149 149 
			- 150     		
			+     150 		function findVscodeDiff(schema: any, path: string[] = []): void {
			  151 151 
			  152 152 		const searchableCommands: Searchables<Command>[] = [];
			  153 153 
			---
			  149 149 
			  150 150 		function findVscodeDiff(schema: any, path: string[] = []): void {
			+     151 			if (typeof schema === 'object' && schema !== null) {
			+     152 				for (const key in schema) {
			+     153 					if (schema[key] === 'vscode.diff') {
			+     154 						console.log(\`Found "vscode.diff" at path: \${path.concat(key).join('.')}\`);
			+     155 					} else {
			+     156 						findVscodeDiff(schema[key], path.concat(key));
			+     157 					}
			+     158 				}
			+     159 			}
			+     160 		}
			+     161 
			+     162 		findVscodeDiff(keybindingsSchema);
			  151 163 
			  152 164 		const searchableCommands: Searchables<Command>[] = [];
			  153 165 
			---
			  147 147 			commandsWithArgs.set(commandId, argumentsSchema);
			  148 148 		}
			- 149     
			- 150     		function findVscodeDiff(schema: any, path: string[] = []): void {
			- 151     			if (typeof schema === 'object' && schema !== null) {
			- 152     				for (const key in schema) {
			- 153     					if (schema[key] === 'vscode.diff') {
			- 154     						console.log(\`Found "vscode.diff" at path: \${path.concat(key).join('.')}\`);
			- 155     					} else {
			- 156     						findVscodeDiff(schema[key], path.concat(key));
			- 157     					}
			- 158     				}
			- 159     			}
			- 160     		}
			- 161     
			- 162     		findVscodeDiff(keybindingsSchema);
			  163 149 
			  164 150 		const searchableCommands: Searchables<Command>[] = [];
			  165 151 
			---
			   25  25 }
			   26  26 
			+      27 export interface Searchables
			+      28 
			   27  29 export class Configurations implements vscode.Disposable {
			   28  30 
			   29  31 	private readonly miniSearch: MiniSearch<Searchables<Setting | Command>>;
			---
			   24  24 	when?: string;
			   25  25 }
			-  26     
			-  27     export interface Searchables
			   28  26 
			   29  27 export class Configurations implements vscode.Disposable {
			   30  28 
			---
			   18  18    }
			   19  19 
			-  20        private validateSettings(settings: IStringDictionary<any>): [string, any][] {
			+      20    private validateSettings(settings: IStringDictionary<any>): {key: string, value:any}[] {
			   21  21       const result: [string, any][] = [];
			   22  22       for (const [key, value] of Object.entries(settings)) {
			   23  23          result.push([key, value]);"
		`);
    });
    (0, vitest_1.it)('doesnt throw with empty line edit', async () => {
        const recording = await fs.readFile(path.join(__dirname, 'recordings/DeclaringConstructorArgument.recording.w.json'), 'utf8').then(JSON.parse);
        const replayer = new observableWorkspaceRecordingReplayer_1.ObservableWorkspaceRecordingReplayer(recording);
        const tracker = createTracker(replayer.workspace);
        replayer.replay();
        const history = tracker.getHistory();
        (0, assert_1.assert)(history.every(e => e.kind === 'edit'));
        (0, vitest_1.expect)(history.map(h => `${h.docId.path}\n---\n${h.edit.toString()}`).join('\n--------------\n')).toMatchInlineSnapshot(`
			"/c:/code/src/platform/inlineEdits/common/workspaceEditTracker/nesWorkspaceEditTracker.ts
			---
			   36  36 }
			   37  37 
			+      38 class FifoQueue<T> {
			+      39 	
			+      40 }
			+      41 
			   38  42 class DocumentState {
			   39  43 	private baseValue: StringValue;
			   40  44 	private currentValue: StringValue;
			--------------
			/c:/code/src/platform/inlineEdits/common/workspaceEditTracker/nesWorkspaceEditTracker.ts
			---
			   37  37 
			   38  38 class FifoQueue<T> {
			-  39     	
			+      39 	constructor(
			+      40 		public readonly size: number
			+      41 	)
			   40  42 }
			   41  43 
			   42  44 class DocumentState {
			--------------
			/c:/code/src/platform/inlineEdits/common/workspaceEditTracker/nesWorkspaceEditTracker.ts
			---
			   39  39 	constructor(
			   40  40 		public readonly size: number
			-  41     	)
			+      41 	) {
			+      42 		
			+      43 	}
			   42  44 }
			   43  45 
			   44  46 class DocumentState {
			--------------
			/c:/code/src/platform/inlineEdits/common/workspaceEditTracker/nesWorkspaceEditTracker.ts
			---
			   40  40 		public readonly size: number
			   41  41 	) {
			-  42     		
			   43  42 	}
			   44  43 }
			   45  44 
			--------------
			/c:/code/src/platform/inlineEdits/common/workspaceEditTracker/nesWorkspaceEditTracker.ts
			---
			   41  41 	) {
			   42  42 	}
			+      43 
			+      44 	
			   43  45 }
			   44  46 
			   45  47 class DocumentState {
			--------------
			/c:/code/src/platform/inlineEdits/common/workspaceEditTracker/nesWorkspaceEditTracker.ts
			---
			   38  38 class FifoQueue<T> {
			   39  39 	constructor(
			-  40     		public readonly size: number
			+      40 		public readonly maxSize: number
			   41  41 	) {
			   42  42 	}
			   43  43 
			-  44     	
			+      44 
			   45  45 }
			   46  46 
			   47  47 class DocumentState {
			--------------
			/c:/code/src/platform/inlineEdits/common/workspaceEditTracker/nesWorkspaceEditTracker.ts
			---
			   41  41 	) {
			   42  42 	}
			-  43     
			+      43 	
			   44  44 
			   45  45 }
			   46  46 
			--------------
			/c:/code/src/platform/inlineEdits/common/workspaceEditTracker/nesWorkspaceEditTracker.ts
			---
			   37  37 
			   38  38 class FifoQueue<T> {
			+      39 	private _arr: T[] = [];
			   39  40 	constructor(
			   40  41 		public readonly maxSize: number
			   41  42 	) {
			   42  43 	}
			-  43     	
			+      44 
			   44  45 
			   45  46 }
			   46  47 
			--------------
			/c:/code/src/platform/inlineEdits/common/workspaceEditTracker/nesWorkspaceEditTracker.ts
			---
			   38  38 class FifoQueue<T> {
			   39  39 	private _arr: T[] = [];
			+      40 
			   40  41 	constructor(
			   41  42 		public readonly maxSize: number
			   42  43 	) {
			   43  44 	}
			   44  45 
			-  45     
			+      46 	
			   46  47 }
			   47  48 
			   48  49 class DocumentState {
			--------------
			/c:/code/src/platform/inlineEdits/common/workspaceEditTracker/nesWorkspaceEditTracker.ts
			---
			   44  44 	}
			   45  45 
			-  46     	
			+      46 	push(e: T): void {
			+      47 		this._arr.push(e);
			+      48 		if (this._arr.length > this.maxSize) {
			+      49 			this._arr.shift();
			+      50 		}
			+      51 	}
			   47  52 }
			   48  53 
			   49  54 class DocumentState {
			--------------
			/c:/code/src/platform/inlineEdits/common/workspaceEditTracker/nesWorkspaceEditTracker.ts
			---
			   15  15 export class NesWorkspaceEditTracker implements IWorkspaceEditTracker {
			   16  16 	private readonly _documentState = new Map<DocumentUri, DocumentState>();
			+      17 	private readonly _lastDocuments = new FifoQueue<DocumentUri>(5);
			   17  18 
			   18  19 	public handleDocumentOpened(docUri: DocumentUri, state: StringValue): void {
			   19  20 		this._documentState.set(docUri, new DocumentState(state.value));
			--------------
			/c:/code/src/platform/inlineEdits/common/workspaceEditTracker/nesWorkspaceEditTracker.ts
			---
			   23  23 	public handleEdit(docUri: DocumentUri, edit: Edit): void {
			   24  24 		const state = this._documentState.get(docUri)!;
			+      25 		this._lastDocuments.push()
			   25  26 		state.handleEdit(edit);
			   26  27 	}
			   27  28 
			--------------
			/c:/code/src/platform/inlineEdits/common/workspaceEditTracker/nesWorkspaceEditTracker.ts
			---
			   15  15 export class NesWorkspaceEditTracker implements IWorkspaceEditTracker {
			   16  16 	private readonly _documentState = new Map<DocumentUri, DocumentState>();
			-  17     	private readonly _lastDocuments = new FifoQueue<DocumentUri>(5);
			+      17 	private readonly _lastDocuments = new FifoSet<DocumentState>(5);
			   18  18 
			   19  19 	public handleDocumentOpened(docUri: DocumentUri, state: StringValue): void {
			   20  20 		this._documentState.set(docUri, new DocumentState(state.value));
			---
			   38  38 }
			   39  39 
			-  40     class FifoQueue<T> {
			+      40 class FifoSet<T> {
			   41  41 	private _arr: T[] = [];
			   42  42 
			   43  43 	constructor(
			--------------
			/c:/code/src/platform/inlineEdits/common/workspaceEditTracker/nesWorkspaceEditTracker.ts
			---
			   47  47 
			   48  48 	push(e: T): void {
			-  49     		this._arr.push(e);
			-  50     		if (this._arr.length > this.maxSize) {
			-  51     			this._arr.shift();
			-  52     		}
			+      49 		
			   53  50 	}
			   54  51 }
			   55  52 
			--------------
			/c:/code/src/platform/inlineEdits/common/workspaceEditTracker/nesWorkspaceEditTracker.ts
			---

			--------------
			/c:/code/src/platform/inlineEdits/common/workspaceEditTracker/nesWorkspaceEditTracker.ts
			---
			   47  47 
			   48  48 	push(e: T): void {
			-  49     		
			+      49 		const existing = this._arr.indexOf(e);
			+      50 		
			   50  51 	}
			   51  52 }
			   52  53 
			--------------
			/c:/code/src/platform/inlineEdits/common/workspaceEditTracker/nesWorkspaceEditTracker.ts
			---
			   48  48 	push(e: T): void {
			   49  49 		const existing = this._arr.indexOf(e);
			-  50     		
			+      50 		if (existing !== -1) {
			+      51 			this._arr.splice(existing, 1);
			+      52 		} else if (this._arr.length >= this.maxSize) {
			+      53 			this._arr.shift();
			+      54 		}
			   51  55 	}
			   52  56 }
			   53  57 
			--------------
			/c:/code/src/platform/inlineEdits/common/workspaceEditTracker/nesWorkspaceEditTracker.ts
			---
			   50  50 		if (existing !== -1) {
			   51  51 			this._arr.splice(existing, 1);
			+      52 
			   52  53 		} else if (this._arr.length >= this.maxSize) {
			   53  54 			this._arr.shift();
			   54  55 		}
			--------------
			/c:/code/src/platform/inlineEdits/common/workspaceEditTracker/nesWorkspaceEditTracker.ts
			---
			   54  54 			this._arr.shift();
			   55  55 		}
			+      56 		this._arr.push(e);
			   56  57 	}
			   57  58 }
			   58  59 
			--------------
			/c:/code/src/platform/inlineEdits/common/workspaceEditTracker/nesWorkspaceEditTracker.ts
			---
			   50  50 		if (existing !== -1) {
			   51  51 			this._arr.splice(existing, 1);
			-  52     
			   53  52 		} else if (this._arr.length >= this.maxSize) {
			   54  53 			this._arr.shift();
			   55  54 		}
			--------------
			/c:/code/src/platform/inlineEdits/common/workspaceEditTracker/nesWorkspaceEditTracker.ts
			---
			   23  23 	public handleEdit(docUri: DocumentUri, edit: Edit): void {
			   24  24 		const state = this._documentState.get(docUri)!;
			-  25     		this._lastDocuments.push()
			+      25 		this._lastDocuments.push(state);
			   26  26 		state.handleEdit(edit);
			   27  27 	}
			   28  28 
			--------------
			/c:/code/src/platform/inlineEdits/common/workspaceEditTracker/nesWorkspaceEditTracker.ts
			---
			   86  86 	}
			   87  87 
			-  88     	getRecentEdit(): RecentWorkspaceEdits | undefined {
			+      88 	getRecentEdit(editCount: number): RecentWorkspaceEdits | undefined {
			   89  89 		this._applyStaleEdits();
			   90  90 
			   91  91 		if (this.edits.length === 0) { return undefined; }
			--------------
			/c:/code/src/platform/inlineEdits/common/workspaceEditTracker/nesWorkspaceEditTracker.ts
			---
			   87  87 
			   88  88 	getRecentEdit(editCount: number): RecentWorkspaceEdits | undefined {
			-  89     		this._applyStaleEdits();
			+      89 		this._applyStaleEdits(editCount);
			   90  90 
			   91  91 		if (this.edits.length === 0) { return undefined; }
			   92  92 
			--------------
			/c:/code/src/platform/inlineEdits/common/workspaceEditTracker/nesWorkspaceEditTracker.ts
			---
			   86  86 	}
			   87  87 
			-  88     	getRecentEdit(editCount: number): RecentWorkspaceEdits | undefined {
			+      88 	getRecentEdit(editCount: number): { edits: RecentWorkspaceEdits; editCount: number } | undefined {
			   89  89 		this._applyStaleEdits(editCount);
			   90  90 
			   91  91 		if (this.edits.length === 0) { return undefined; }
			--------------
			/c:/code/src/platform/inlineEdits/common/workspaceEditTracker/nesWorkspaceEditTracker.ts
			---
			   99  99 	}
			  100 100 
			- 101     	private _applyStaleEdits(): void {
			+     101 	private _applyStaleEdits(editCount: number): void {
			  102 102 		let recentEdit = Edit.empty;
			  103 103 		let i: number;
			  104 104 		let count = 0;
			--------------
			/c:/code/src/platform/inlineEdits/common/workspaceEditTracker/nesWorkspaceEditTracker.ts
			---
			  103 103 		let i: number;
			  104 104 		let count = 0;
			- 105     		for (i = this.edits.length - 1; i >= 0 && count < 5; i--, count++) {
			+     105 		for (i = this.edits.length - 1; i >= 0 && count < editCount; i--, count++) {
			  106 106 			const e = this.edits[i];
			  107 107 
			  108 108 			if (now() - e.instant > 10 * 60 * 1000) { break; }
			--------------
			/c:/code/src/platform/inlineEdits/common/workspaceEditTracker/nesWorkspaceEditTracker.ts
			---
			   96  96 
			   97  97 		const result = new RootedEdit(this.baseValue, composedEdits);
			-  98     		return new RecentWorkspaceEdits(result, recentEditRange!);
			+      98 		return {
			+      99 			edits: new RecentWorkspaceEdits(result, recentEditRange!) };
			   99 100 	}
			  100 101 
			  101 102 	private _applyStaleEdits(editCount: number): void {
			--------------
			/c:/code/src/platform/inlineEdits/common/workspaceEditTracker/nesWorkspaceEditTracker.ts
			---
			   97  97 		const result = new RootedEdit(this.baseValue, composedEdits);
			   98  98 		return {
			-  99     			edits: new RecentWorkspaceEdits(result, recentEditRange!) };
			+      99 			edits: new RecentDocumentEdit(result, recentEditRange!),
			+     100 			editCount: this.edits.length,
			+     101 		};
			  100 102 	}
			  101 103 
			  102 104 	private _applyStaleEdits(editCount: number): void {
			--------------
			/c:/code/src/platform/inlineEdits/common/workspaceEditTracker/nesWorkspaceEditTracker.ts
			---
			   11  11 import { TextLengthEdit } from '../dataTypes/textEditLength';
			   12  12 import { Instant, now } from '../utils/utils';
			-  13     import { IWorkspaceEditTracker, RecentWorkspaceEdits } from './workspaceEditTracker';
			+      13 import { IWorkspaceEditTracker, RecentDocumentEdit, RecentWorkspaceEdits } from './workspaceEditTracker';
			   14  14 
			   15  15 export class NesWorkspaceEditTracker implements IWorkspaceEditTracker {
			   16  16 	private readonly _documentState = new Map<DocumentUri, DocumentState>();
			--------------
			/c:/code/src/platform/inlineEdits/common/workspaceEditTracker/nesWorkspaceEditTracker.ts
			---
			   97  97 		const result = new RootedEdit(this.baseValue, composedEdits);
			   98  98 		return {
			-  99     			edits: new RecentDocumentEdit(result, recentEditRange!),
			+      99 			edits: new RecentDocumentEdit(this.docUri, result, recentEditRange!),
			  100 100 			editCount: this.edits.length,
			  101 101 		};
			  102 102 	}"
		`);
    });
});
//# sourceMappingURL=nesXtabHistoryTracker.spec.js.map