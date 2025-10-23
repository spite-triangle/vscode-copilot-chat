"use strict";
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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const assert = __importStar(require("assert"));
const configurationService_1 = require("../../src/platform/configuration/common/configurationService");
const heatmapService_1 = require("../../src/platform/heatmap/common/heatmapService");
const textDocument_1 = require("../../src/util/common/test/shims/textDocument");
const strings_1 = require("../../src/util/vs/base/common/strings");
const uri_1 = require("../../src/util/vs/base/common/uri");
const stest_1 = require("../base/stest");
const outcomeValidators_1 = require("../simulation/outcomeValidators");
const panelCodeMapperSimulator_1 = require("../simulation/panelCodeMapperSimulator");
const stestUtil_1 = require("../simulation/stestUtil");
function executeEditTest(strategy, testingServiceCollection, scenario) {
    return (0, panelCodeMapperSimulator_1.simulatePanelCodeMapper)(testingServiceCollection, scenario, strategy);
}
function forEditsAndAgent(callback) {
    callback(0 /* EditTestStrategy.Edits */, '', undefined, undefined);
    callback(0 /* EditTestStrategy.Edits */, '-claude', "claude-3.5-sonnet" /* CHAT_MODEL.CLAUDE_SONNET */, undefined);
    // callback(EditTestStrategy.Edits2, '-edits2', undefined);
    // callback(EditTestStrategy.Edits2, '-edits2-claude', CHAT_MODEL.CLAUDE_SONNET);
    // callback(EditTestStrategy.Agent, '-agent', undefined);
}
forEditsAndAgent((strategy, variant, model, configurations) => {
    (0, stest_1.ssuite)({ title: `multifile-edit${variant}`, location: 'panel', configurations }, () => {
        (0, stest_1.stest)({ description: 'issue #8098: extract function to unseen file', language: 'typescript', model }, (testingServiceCollection) => {
            return executeEditTest(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('multiFileEdit/issue-8098/debugUtils.ts'),
                    (0, stestUtil_1.fromFixture)('multiFileEdit/issue-8098/debugTelemetry.ts'),
                ],
                queries: [
                    {
                        file: 'debugUtils.ts',
                        selection: [34, 0, 34, 0],
                        visibleRanges: [[3, 0, 44, 0]],
                        query: 'Extract filterExceptionsFromTelemetry to debugTelemetry #file:debugUtils.ts',
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                            assert.ok(outcome.files.length === 2, 'Expected two files to be edited');
                            const utilsTs = (0, outcomeValidators_1.assertFileContent)(outcome.files, 'debugUtils.ts');
                            assert.ok(!utilsTs.includes('function filterExceptionsFromTelemetry'), 'Expected filterExceptionsFromTelemetry to be extracted');
                            const telemetryFile = (0, outcomeValidators_1.assertFileContent)(outcome.files, 'debugTelemetry.ts');
                            assert.ok(telemetryFile.includes('filterExceptionsFromTelemetry'), 'Expected filterExceptionsFromTelemetry to be extracted');
                            assert.strictEqual((await (0, outcomeValidators_1.getWorkspaceDiagnostics)(accessor, workspace, 'tsc')).filter(d => d.kind === 'syntactic').length, 0);
                            (0, outcomeValidators_1.assertNoElidedCodeComments)(outcome);
                        }
                    }
                ]
            });
        });
        (0, stest_1.stest)({
            description: 'Edits keeps editing files that are NOT attached due to temporal context #9130',
            language: 'html',
            model,
            configurations: [{ key: configurationService_1.ConfigKey.TemporalContextEditsEnabled, value: true }]
        }, (testingServiceCollection) => {
            testingServiceCollection = testingServiceCollection.clone();
            testingServiceCollection.define(heatmapService_1.IHeatmapService, new class {
                async getEntries() {
                    const doc1 = (0, textDocument_1.createTextDocumentData)(uri_1.URI.parse('file:///test/path/index.html'), '<html><body>Hello</body></html>', 'html').document;
                    const doc2 = (0, textDocument_1.createTextDocumentData)(uri_1.URI.parse('file:///test/path/page.html'), '<html><head><title name="Page" /></head><body>Page</body></html>', 'html').document;
                    return new Map([
                        [doc1, [new heatmapService_1.SelectionPoint(0, Date.now() - 1000), new heatmapService_1.SelectionPoint(14, Date.now() - 88)]],
                        [doc2, [new heatmapService_1.SelectionPoint(50, Date.now() - 761), new heatmapService_1.SelectionPoint(21, Date.now() - 1761), new heatmapService_1.SelectionPoint(29, Date.now() - 161)]],
                    ]);
                }
            });
            return executeEditTest(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('multiFileEdit/issue-9130/empty.html'),
                ],
                queries: [
                    {
                        file: 'empty.html',
                        selection: [0, 0, 0, 0],
                        visibleRanges: [[0, 0, 0, 0]],
                        query: 'Create in #file:empty.html a fully functional chess game with the following requirements:\n\n1. **Rendering**:\n    - Use three.js to render a top-down view of the chessboard.\n    - Render chess pieces with artistic detail.\n\n2. **Game Mechanics**:\n    - Implement all standard chess rules.\n    - Support turns for two players.\n    - Allow previewing of possible moves for each piece.\n    - Animate piece movements, including jumps.\n\n3. **Implementation**:\n    - Develop the game within a single HTML page.\n    - Import three.js 0.169.0 and any other dependencies from jsdelivr using importmaps.\n\nEnsure the game is interactive and visually appealing.',
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome); // NO workspace edit
                            (0, outcomeValidators_1.assertNoElidedCodeComments)(outcome.fileContents);
                        }
                    }
                ]
            });
        });
        (0, stest_1.stest)({ description: 'issue #8131: properly using dotenv in this file', model }, (testingServiceCollection) => {
            return executeEditTest(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('multiFileEdit/issue-8131/extension.ts'),
                ],
                queries: [
                    {
                        file: 'extension.ts',
                        selection: [29, 20, 29, 20],
                        visibleRanges: [[18, 0, 46, 0]],
                        query: '#file:extension.ts Am I properly using dotenv in this file. The process.env.OPENAI_API_KEY keeps being undefined',
                        validate: async (outcome, workspace, accessor) => {
                            // TODO@add a good validation function here
                            assert.fail('not implemented');
                        }
                    }
                ]
            });
        });
        (0, stest_1.stest)({ description: 'import new helper function', language: 'typescript', model }, (testingServiceCollection) => {
            return executeEditTest(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('multiFileEdit/fibonacci/version1.ts'),
                    (0, stestUtil_1.fromFixture)('multiFileEdit/fibonacci/version2.ts'),
                    (0, stestUtil_1.fromFixture)('multiFileEdit/fibonacci/foo.ts'),
                    (0, stestUtil_1.fromFixture)('multiFileEdit/fibonacci/bar.ts'),
                ],
                queries: [
                    {
                        file: 'foo.ts',
                        selection: [0, 0, 4, 0],
                        visibleRanges: [[9, 0, 4, 0]],
                        query: 'Update #file:foo.ts and #file:bar.ts to use the fibonacci function from #file:version2.ts instead of #file:version1.ts',
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                            assert.strictEqual((await (0, outcomeValidators_1.getWorkspaceDiagnostics)(accessor, workspace, 'tsc')).length, 0);
                            assert.strictEqual(outcome.files.length, 2, 'Expected two files to be edited');
                            for (const file of outcome.files) {
                                const content = (0, outcomeValidators_1.getFileContent)(file);
                                assert.ok(content.includes('./version2'), 'Expected file to include updated import');
                                assert.ok(!content.includes('./version1'), 'Expected file to not include original import');
                                (0, outcomeValidators_1.assertNoElidedCodeComments)(content);
                            }
                        }
                    }
                ]
            });
        });
        (0, stest_1.stest)({ description: 'change library used by two files', language: 'typescript', model }, (testingServiceCollection) => {
            return executeEditTest(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('multiFileEdit/filepaths/1.ts'),
                    (0, stestUtil_1.fromFixture)('multiFileEdit/filepaths/2.ts'),
                ],
                queries: [
                    {
                        file: '1.ts',
                        selection: [0, 0, 26, 0],
                        visibleRanges: [[0, 0, 26, 0]],
                        query: 'Update #file:1.ts and #file:2.ts to replace usage of "path" with vscode apis',
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                            assert.strictEqual((await (0, outcomeValidators_1.getWorkspaceDiagnostics)(accessor, workspace, 'tsc')).filter(d => d.kind === 'syntactic').length, 0);
                            assert.strictEqual(outcome.files.length, 2, 'Expected two files to be edited');
                            for (const file of outcome.files) {
                                const content = (0, outcomeValidators_1.getFileContent)(file);
                                assert.ok(!content.includes("path.join"), 'Expected file to not include path usage');
                                assert.ok(!content.includes("path.relative"), 'Expected file to not include path usage');
                                (0, outcomeValidators_1.assertNoElidedCodeComments)(content);
                            }
                        }
                    }
                ]
            });
        });
        (0, stest_1.stest)({ description: 'add validation logic to three files', language: 'typescript', model }, (testingServiceCollection) => {
            return executeEditTest(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('multiFileEdit/filepaths/1.ts'),
                    (0, stestUtil_1.fromFixture)('multiFileEdit/filepaths/2.ts'),
                    (0, stestUtil_1.fromFixture)('multiFileEdit/filepaths/3.ts'),
                ],
                queries: [
                    {
                        file: '1.ts',
                        selection: [0, 0, 26, 0],
                        visibleRanges: [[0, 0, 26, 0]],
                        query: 'Throw an error if we see a "http" uri #file:1.ts #file:2.ts #file:3.ts',
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                            assert.strictEqual((await (0, outcomeValidators_1.getWorkspaceDiagnostics)(accessor, workspace, 'tsc')).filter(d => d.kind === 'syntactic').length, 0);
                            assert.strictEqual(outcome.files.length, 3, 'Expected three files to be edited');
                            for (const file of outcome.files) {
                                const content = (0, outcomeValidators_1.getFileContent)(file);
                                assert.ok(content.includes("throw new Error"), 'Expected file to not include original import');
                                (0, outcomeValidators_1.assertNoElidedCodeComments)(content);
                            }
                        }
                    }
                ]
            });
        });
        (0, stest_1.stest)({ description: 'does not delete code (big file) #15475', language: 'typescript' }, (testingServiceCollection) => {
            return executeEditTest(strategy, testingServiceCollection, {
                files: [(0, stestUtil_1.fromFixture)('codeMapper/notebookEditorWidget.ts')],
                queries: [
                    {
                        file: 'notebookEditorWidget.ts',
                        selection: [497, 0, 501, 0],
                        visibleRanges: [[480, 0, 520, 0]],
                        query: 'add return types for getSelections',
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            const edit = (0, stestUtil_1.assertInlineEditShape)(outcome, {
                                line: 497,
                                originalLength: 2957,
                                modifiedLength: 2957,
                            });
                            (0, outcomeValidators_1.assertContainsAllSnippets)(edit.changedModifiedLines.join('\n'), ['getSelections(): ICellRange[] {'], 'Edit not applied');
                            assert.deepStrictEqual(edit.changedModifiedLines.join('\n'), `getSelections(): ICellRange[] {`, 'Unrelated edits applied');
                            (0, outcomeValidators_1.assertNoElidedCodeComments)(outcome.fileContents);
                        }
                    }
                ]
            });
        });
        (0, stest_1.stest)({ description: 'add a command and dependency to a VS Code extension', language: 'typescript', model }, (testingServiceCollection) => {
            return executeEditTest(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('multiFileEdit/asciiart/package.json'),
                    (0, stestUtil_1.fromFixture)('multiFileEdit/asciiart/src/extension.ts'),
                ],
                queries: [
                    {
                        query: [
                            `In #file:extension.ts add a new command 'Hello ASCII World' which shows an information dialog that displays 'hello world' as ASCII art.`,
                            `You can use the 'ascii-art' node module to generate the string.`,
                            `Please also update #file:package.json with the new command and the new dependency.`
                        ].join(' '),
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                            assert.strictEqual((await (0, outcomeValidators_1.getWorkspaceDiagnostics)(accessor, workspace, 'tsc')).filter(d => d.kind === 'syntactic').length, 0);
                            assert.strictEqual(outcome.files.length, 2, 'Expected two files to be edited');
                            const packageJson = (0, outcomeValidators_1.assertFileContent)(outcome.files, 'package.json');
                            const extensionTs = (0, outcomeValidators_1.assertFileContent)(outcome.files, 'extension.ts');
                            const packageJsonObj = (0, outcomeValidators_1.assertJSON)(packageJson);
                            assert.ok(!packageJsonObj.devDependencies?.['ascii-art'], 'ascii-art dependency was added to devDependencies');
                            assert.ok(packageJsonObj.dependencies?.['ascii-art'], 'Expected package.json to include ascii-art dependency');
                            const commands = packageJsonObj.contributes.commands;
                            assert.ok(Array.isArray(commands), 'Expected package.json to include a commands array');
                            assert.ok(commands.length === 2, 'Expected package.json to include a new command');
                            const newCommand = commands.find((c) => c.command !== 'test-multifile-1.helloWorld');
                            assert.ok(newCommand, 'Expected package.json to include a command other than helloWorld');
                            assert.ok(extensionTs.match(/\bimport\b[^;\n]+from ['"]ascii-art['"]/), 'Expected an import for ascii-art');
                            assert.ok(extensionTs.match(new RegExp(`\\bregisterCommand\\b[^;\n]['"]${(0, strings_1.escapeRegExpCharacters)(newCommand.command)}['"]`)), 'expected that the new command is registered');
                            (0, outcomeValidators_1.assertNoElidedCodeComments)(outcome);
                        }
                    },
                    {
                        query: [
                            `Better use figlet for creating the ascii art. Please remove the dependency on 'ascii-art'.`,
                        ].join(' '),
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                            assert.strictEqual((await (0, outcomeValidators_1.getWorkspaceDiagnostics)(accessor, workspace, 'tsc')).filter(d => d.kind === 'syntactic').length, 0);
                            assert.strictEqual(outcome.files.length, 2, 'Expected two files to be edited');
                            const packageJson = (0, outcomeValidators_1.assertFileContent)(outcome.files, 'package.json');
                            const extensionTs = (0, outcomeValidators_1.assertFileContent)(outcome.files, 'extension.ts');
                            const packageJsonObj = (0, outcomeValidators_1.assertJSON)(packageJson);
                            assert.ok(packageJsonObj.dependencies['figlet'], 'Expected package.json to include figlet dependency');
                            assert.ok(!packageJsonObj.dependencies['ascii-art'], 'Expected package.json no longer to contain the ascii-art dependency');
                            const commands = packageJsonObj.contributes.commands;
                            assert.ok(Array.isArray(commands), 'Expected package.json to include a commands array');
                            assert.ok(commands.length === 2, 'Expected package.json to still include 2 command');
                            const newCommand = commands.find((c) => c.command !== 'test-multifile-1.helloWorld');
                            assert.ok(newCommand, 'Expected package.json to include a command other than helloWorld');
                            assert.ok(extensionTs.match(/\bimport\b[^;\n]+from ['"]figlet['"]/), 'Expected an import for figlet');
                            (0, outcomeValidators_1.assertNoElidedCodeComments)(outcome);
                        }
                    }
                ]
            });
        });
        stest_1.stest.skip({ description: 'Issue #8336', model }, (testingServiceCollection) => {
            return executeEditTest(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.toFile)({ fileName: "roadmap-parser.ts", fileContents: "export interface ParseOptions {\n    startLine?: string,\n    endLine?: string\n};\n\nexport interface FilterOptions {\n    markers?: string[],\n    extractMatchingMarkers?: boolean\n};\n\nexport function filter(markdown: string, options?: ParseOptions & FilterOptions): string {\n    return parse(markdown, options).filter(options).join();\n}\n\n\nexport class Marker {\n    constructor(public label: string, public offset: number) { }\n\n    public get length() {\n        return this.label.length + 1;\n    }\n}\n\nexport class Line {\n\n    public static nonHeaderLevel(computedLevel: number): number {\n        return computedLevel + 1000;\n    }\n\n    public static headerLevel(computedLevel: number) : number {\n        return computedLevel;\n    }\n\n\n    public children: Line[] = [];\n    public parent: Line | null = null;\n    public isHeader: boolean = false;\n    public level: number = Line.nonHeaderLevel(0);\n    public markers: Marker[] = [];\n\n    constructor(public markdown: string) {\n        let count = -1;\n        let iterator = {\n            next: () => count === this.markdown.length ? undefined : this.markdown.charAt(++count),\n            index: () => count\n        }\n        this.parse(iterator);\n    };\n\n    parse(i: { next: () => string | undefined, index: () => number }) {\n        let c = i.next();\n\n        // eat headers\n        let hashes = 0;\n        while ('#' === c) {\n            hashes++;\n            c = i.next();\n        }\n        if (hashes > 0) {\n            this.isHeader = true;\n            this.level = Line.headerLevel(hashes);\n            return;\n        }\n\n        // eat spaces\n        let spaces = 0;\n        while (' ' === c) {\n            spaces++;\n            c = i.next();\n        }\n\n        if ('-' === c) {\n            // isBullet === true, remember indentation\n            this.level = Line.nonHeaderLevel(Math.floor(spaces / 3));\n            c = i.next();\n        }\n\n        // skip spaces\n        while (' ' === c) {\n            c = i.next();\n        }\n\n        // skip check mark\n        if ('[' === c) {\n            c = i.next();\n            while (']' === c || ' ' === c || 'x' === c || 'X' === c ) {\n                c = i.next();\n            }\n        }\n\n        // eat markers\n        markers: while (':' === c) {\n            const offset = i.index();\n            const label = [];\n            c = i.next();\n            while (':' !== c) {\n                label.push(c);\n                c = i.next();\n                if (c === undefined) {\n                    break markers;\n                }\n            }\n            this.markers.push(new Marker(label.join(''), offset));\n            c = i.next();\n            while (' ' === c) {\n                c = i.next();\n            }\n        }\n\n    }\n\n    add(line: Line): Line {\n        this.children.push(line);\n        return this;\n    }\n\n    matchesMarkers(markers: string[]): boolean {\n        if (this.hasMarkers(markers)) {\n            return true;\n        }\n        return this.children.some(c => c.matchesMarkers(markers));\n    }\n\n    hasMarkers(markers: string[]): boolean {\n        return this.markers.filter(marker => markers.includes(marker.label)).length === markers.length;\n    }\n\n    sanitizedMarkdown(options: FilterOptions) {\n        if (options.extractMatchingMarkers) {\n            const markers = this.markers.sort((m1, m2) => m1.offset - m2.offset);\n            let sanitized = '';\n            let offset = 0;\n            markers.forEach(m => {\n                if (options.markers?.includes(m.label)) {\n                    let behindMarker = m.offset + m.length + 1;\n                    let c = this.markdown.charAt(behindMarker);\n                    while (c === ' ') {\n                        c = this.markdown.charAt(++behindMarker);\n                    }\n                    sanitized += this.markdown.substring(offset, behindMarker);\n                    offset = behindMarker;\n                }\n            });\n            sanitized += this.markdown.substring(offset);\n            return sanitized;\n        }\n            const markers = this.markers.sort((m1, m2) => m1.offset - m2.offset);\n            let sanitized = '';\n            let offset = 0;\n            markers.forEach(m => {\n                if (options.markers?.includes(m.label)) {\n                    let behindMarker = m.offset + m.length + 1;\n                    let c = this.markdown.charAt(behindMarker);\n                    while (c === ' ') {\n                        c = this.markdown.charAt(++behindMarker);\n                    }\n                    sanitized += this.markdown.substring(offset, m.offset);\n                    offset = behindMarker;\n                }\n            });\n            sanitized += this.markdown.substring(offset);\n            return sanitized;\n        }\n        return this.markdown;\n    }\n\n    isEmpty() : boolean {\n        return this.markdown.length === 0;\n    }\n}\n\nexport class LineTree {\n\n    public lines: Line[] = []\n    private lastAddition: Line | null = null;\n\n    public add(line: Line) {\n        if (this.lastAddition) {\n            if (line.level > this.lastAddition.level) {\n                line.parent = this.lastAddition;\n                line.parent.add(line);\n            } else if (line.level === this.lastAddition.level) {\n                line.parent = this.lastAddition.parent;\n                if (line.parent) {\n                    line.parent.add(line);\n                } else {\n                    this.lines.push(line);\n                }\n            } else {\n                let last: Line | null = this.lastAddition;\n                while (last && line.level <= last.level) {\n                    last = last.parent;\n                }\n                if (last) {\n                    line.parent = last;\n                    line.parent.add(line);\n                } else {\n                    this.lines.push(line);\n                }\n            }\n        } else {\n            this.lines.push(line);\n        }\n        this.lastAddition = line;\n    }\n\n    public filter(options?: FilterOptions): LineTree {\n        if (options && options.markers) {\n            const filteredTree = new LineTree();\n            const filter = (lines: Line[]) => {\n                lines.forEach(l => {\n                    if (l.matchesMarkers(options.markers!)) {\n                        filteredTree.add(l);\n                    }\n                    filter(l.children);\n                });\n            };\n            filter(this.lines);\n            return filteredTree;\n        }\n        return this;\n    }\n\n    public join(): string {\n        const contents: string[] = [];\n        const join = (lines: Line[]) => {\n            lines.forEach(l => {\n                contents.push(l.markdown);\n                join(l.children);\n            });\n        };\n        join(this.lines);\n        return contents.join('\\n');\n    }\n}\n\nexport function parse(markdown: string, options?: ParseOptions): LineTree {\n    const tree = new LineTree();\n\n    const input = markdown.split('\\n');\n    let acceptLine = options?.startLine ? false : true;\n    input.forEach(m => {\n        if (options && options.startLine && options.endLine) {\n            if (!acceptLine) {\n                if (options.startLine === m.trim()) {\n                    acceptLine = true;\n                }\n            } else {\n                if (options.endLine === m.trim()) {\n                    acceptLine = false;\n                }\n            }\n        }\n        if (acceptLine) {\n            tree.add(new Line(m));\n        }\n    });\n\n    return tree;\n}" }),
                    (0, stestUtil_1.toFile)({ fileName: "roadmap.ts", fileContents: "import commandLineArgs from 'command-line-args';\nimport { resolve, dirname } from 'path'\nimport { readFileSync, writeFileSync, mkdirSync } from 'fs';\nimport { filter } from './roadmap-parser';\n\nconst optionDefinitions = [\n    { name: 'scope', type: String },\n    { name: 'year', type: String },\n    { name: 'source', type: String },\n    { name: 'template', type: String },\n    { name: 'startLine', type: String, defaultValue: '<!-- BEGIN -->' },\n    { name: 'endLine', type: String, defaultValue: '<!-- END -->' },\n    { name: 'output', type: String }\n];\n\ninterface Options {\n    scope: string | undefined,\n    year: string | undefined,\n    source: string | undefined,\n    template: string | undefined,\n    startLine: string,\n    endLine: string,\n    output: string | undefined\n}\n\nconst options = commandLineArgs(optionDefinitions, { partial: true }) as Options\nif (!(options.source || options.year) || !options.source) {\n    console.log(\n`\nroadmap {--scope <public|internal>} {--year <2021>} --source <perpetual roadmap> {--template <template roadmap to generate>} {--output <file name of the generated roadmap>}\n\nYou may also use '--startLine <line content>' and '--endLine <line content>' to specify\n- the section(s) of the source roadmap to extract and process\n- the section in the template that should be replaced.\n\nThe defaults are '<!-- BEGIN -->' for '--startLine' and '<!-- END -->' for '--endLine'.\n`\n    );\n} else {\n\n    const cwd = process.cwd();\n    const source = resolve(cwd, options.source!);\n    try {\n\n        const markers: string[] = [];\n        if (options.year) {\n            markers.push(options.year);\n        }\n        if (options.scope) {\n            markers.push(options.scope)\n        }\n\n        const rawInput = readFileSync(source);\n        const filteredInput = filter(rawInput.toString(), { startLine: options.startLine, endLine: options.endLine, markers, extractMatchingMarkers: true });\n\n        if (!options.template) {\n            console.log(filteredInput);\n        } else {\n\n            const template = readFileSync(resolve(cwd, options.template!));\n            const processedOutput = replace(template.toString(), filteredInput, options);\n\n            if (!options.output) {\n                console.log(processedOutput)\n            } else {\n\n                const outputFile = resolve(cwd, options.output!);\n                mkdirSync(dirname(outputFile), { recursive: true });\n                writeFileSync(outputFile, processedOutput);\n            }\n        }\n\n    } catch (e) {\n        console.error(e.message);\n    }\n}\n\nfunction replace(source: string, replacement: string, options: Options): string {\n    const replacementRangeStart = source.indexOf(options.startLine) + options.startLine.length;\n    const replacementRangeEnd = source.indexOf(options.endLine);\n    return `${source.substring(0, replacementRangeStart)}\\n${replacement}\\n${source.substring(replacementRangeEnd)}`;\n}\n" }),
                ],
                queries: [
                    {
                        query: "change the code so that rather than markers to remove it works with markers to survive #file:roadmap.ts #file:roadmap-parser.ts  ",
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                            const d = (await (0, outcomeValidators_1.getWorkspaceDiagnostics)(accessor, workspace, 'tsc')).filter(d => d.kind === 'syntactic');
                            assert.strictEqual(d.length, 0);
                            (0, outcomeValidators_1.assertNoElidedCodeComments)(outcome);
                        }
                    }
                ]
            });
        });
        (0, stest_1.stest)({ description: 'fs provider: move function from one file to another', language: 'typescript', model }, (testingServiceCollection) => {
            return executeEditTest(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('multiFileEdit/fsprovider/package.json'),
                    (0, stestUtil_1.fromFixture)('multiFileEdit/fsprovider/src/extension.ts'),
                    (0, stestUtil_1.fromFixture)('multiFileEdit/fsprovider/src/fileSystemProvider.ts'),
                ],
                queries: [
                    {
                        query: [
                            `In #file:extension.ts move the function 'randomData' to the end of #file:fileSystemProvider.ts . Make sure to update the imports in #file:extension.ts and to export the function at the new location`,
                        ].join(' '),
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                            assert.strictEqual((await (0, outcomeValidators_1.getWorkspaceDiagnostics)(accessor, workspace, 'tsc')).filter(d => d.kind === 'syntactic').length, 0);
                            assert.strictEqual(outcome.files.length, 2, 'Expected two files to be edited');
                            const fileSystemProviderTs = (0, outcomeValidators_1.assertFileContent)(outcome.files, 'fileSystemProvider.ts');
                            const extensionTs = (0, outcomeValidators_1.assertFileContent)(outcome.files, 'extension.ts');
                            assert.ok(!extensionTs.includes('function randomData(lineCnt: number, lineLen = 155): Buffer'), 'randomData still found in extension.ts');
                            const newIndex = fileSystemProviderTs.indexOf('function randomData(lineCnt: number, lineLen = 155): Buffer');
                            assert.ok(newIndex !== -1, 'randomData not found in fileSystemProvider.ts');
                            const endOfMemFSIndex = fileSystemProviderTs.indexOf('// end of MemFS');
                            assert.ok(endOfMemFSIndex !== -1, `can no longer find the '// end of MemFS' comment in fileSystemProvider.ts`);
                            assert.ok(newIndex > endOfMemFSIndex, 'randomData was not placed at the end of fileSystemProvider.ts');
                            assert.ok(fileSystemProviderTs.indexOf('export function randomData') !== -1, 'randomData not exported in fileSystemProvider.ts');
                            assert.ok(extensionTs.match(/\bimport {[^}]+randomData[^}]+} from '.\/fileSystemProvider'/), 'Expected an import for randomData in extension.ts');
                            (0, outcomeValidators_1.assertNoElidedCodeComments)(outcome);
                        }
                    },
                    {
                        query: [
                            `Better move 'randomData in its own file: /Users/someone/Projects/proj01/utils.ts'. Don't forget to remove again randomData from #file:fileSystemProvider.ts`,
                        ].join(' '),
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                            assert.strictEqual((await (0, outcomeValidators_1.getWorkspaceDiagnostics)(accessor, workspace, 'tsc')).filter(d => d.kind === 'syntactic').length, 0);
                            const fileSystemProviderTs = (0, outcomeValidators_1.assertFileContent)(outcome.files, 'fileSystemProvider.ts');
                            const extensionTs = (0, outcomeValidators_1.assertFileContent)(outcome.files, 'extension.ts');
                            const utilsTs = (0, outcomeValidators_1.assertFileContent)(outcome.files, 'utils.ts');
                            assert.ok(!fileSystemProviderTs.includes('function randomData(lineCnt: number, lineLen = 155): Buffer'), 'randomData still found in fileSystemProviderTs.ts');
                            const newIndex = utilsTs.indexOf('function randomData(lineCnt: number, lineLen = 155): Buffer');
                            assert.ok(newIndex !== -1, 'randomData not found in utilsTs.ts');
                            assert.ok(utilsTs.indexOf('export function randomData') !== -1, 'randomData not exported in fileSystemProvider.ts');
                            assert.ok(extensionTs.match(/\bimport { MemFS } from '.\/fileSystemProvider'/), 'Expected only MemFs import from fileSystemProvider');
                            assert.ok(extensionTs.match(/\bimport {[^}]+randomData[^}]+} from '.\/utils'/), 'Expected an import for randomData from utils');
                            (0, outcomeValidators_1.assertNoElidedCodeComments)(outcome);
                        }
                    },
                    {
                        query: [
                            `Please add a copyright statement to the new file #file:utils.ts. You can use the same statement as for #file:fileSystemProvider.ts`,
                        ].join(' '),
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                            assert.strictEqual((await (0, outcomeValidators_1.getWorkspaceDiagnostics)(accessor, workspace, 'tsc')).filter(d => d.kind === 'syntactic').length, 0);
                            const utilsTs = (0, outcomeValidators_1.assertFileContent)(outcome.files, 'utils.ts');
                            assert.ok(utilsTs.includes('Copyright (c) Microsoft Corporation. All rights reserved.'), 'copyright (c) Microsoft not found');
                            assert.ok(utilsTs.includes('Licensed under the MIT License. See License.txt in the project root for license information'), 'Licensed under the MIT License not found');
                            (0, outcomeValidators_1.assertNoElidedCodeComments)(outcome);
                        }
                    }
                ]
            });
        });
        (0, stest_1.stest)({ description: 'Issue #9647', language: 'typescript', model }, (testingServiceCollection) => {
            return executeEditTest(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('multiFileEdit/issue-9647/.env'),
                ],
                queries: [
                    {
                        file: ".env",
                        selection: [0, 0, 0, 0],
                        query: "Add OPENAI to .env",
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            assert.ok(outcome.fileContents.includes("OPENAI="), 'Expected OPENAI to be added to .env');
                            (0, outcomeValidators_1.assertNoElidedCodeComments)(outcome.fileContents);
                        }
                    }
                ]
            });
        });
        (0, stest_1.stest)({ description: 'unicode string sequences', model }, (testingServiceCollection) => {
            return executeEditTest(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)("multiFile/unicode-string-sequences/example.js")
                ],
                queries: [
                    {
                        file: "example.js",
                        selection: [8, 0, 8, 0],
                        query: "Avoid recursion in fib ",
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            assert.strictEqual((await (0, outcomeValidators_1.getWorkspaceDiagnostics)(accessor, workspace, 'tsc')).filter(d => d.kind === 'syntactic').length, 0);
                            (0, outcomeValidators_1.assertContainsAllSnippets)(outcome.fileContents, ['\\u002D', '\\x2D']);
                            (0, outcomeValidators_1.assertNoElidedCodeComments)(outcome.fileContents);
                        }
                    }
                ]
            });
        });
        (0, stest_1.stest)({ description: 'multiple questions', model }, (testingServiceCollection) => {
            return executeEditTest(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)("multiFile/multiple-questions/package.json")
                ],
                queries: [
                    {
                        file: "package.json",
                        selection: [13, 77, 13, 77],
                        query: "what is the latest version of typescript?",
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertNoErrorOutcome)(outcome);
                            await (0, outcomeValidators_1.assertCriteriaMetAsync)(accessor, outcome.chatResponseMarkdown, 'Does the response answer the question what the latest version of typescript is?');
                        }
                    },
                    {
                        file: "package.json",
                        selection: [13, 77, 13, 77],
                        query: "What is the latest version of mocha?",
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertNoErrorOutcome)(outcome);
                            await (0, outcomeValidators_1.assertCriteriaMetAsync)(accessor, outcome.chatResponseMarkdown, 'Does the response answer the question what the latest version of mocha is?');
                        }
                    }
                ]
            });
        });
        (0, stest_1.stest)({ description: 'create a README from two other files', model }, (testingServiceCollection) => {
            return executeEditTest(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)("multiFileEdit/readme-generation/.devcontainer/devcontainer.json"),
                    (0, stestUtil_1.fromFixture)("multiFileEdit/readme-generation/.devcontainer/post-install.sh")
                ],
                queries: [
                    {
                        file: "devcontainer.json",
                        selection: [0, 0, 0, 0],
                        query: "add a readme based on these files",
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                            (0, outcomeValidators_1.assertFileContent)(outcome.files, 'README.md');
                            (0, outcomeValidators_1.assertNoElidedCodeComments)(outcome);
                            await (0, outcomeValidators_1.assertCriteriaMetAsync)(accessor, (0, outcomeValidators_1.getFileContent)(outcome.files[0]), 'Does the content look like a Readme file, properly formatted, with multiple lines?');
                        }
                    }
                ]
            });
        });
        (0, stest_1.stest)({ description: 'multiple edits on the same file', model }, (testingServiceCollection) => {
            return executeEditTest(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)("multiFileEdit/two-edits/generate-command-ts.js"),
                ],
                queries: [
                    {
                        file: "generate-command-ts.js",
                        selection: [0, 0, 0, 0],
                        query: [
                            "Replace all occurrences of 'generator.fs.copy' with a call to a top level function 'copy' that takes 'generator', 'extensionConfig', 'from' and 'to' as parameters. ",
                            "Then do the same for 'generator.fs.copyTpl'. Do not emit the full solution in one go. Emit a code block for every change.",
                        ].join(''),
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            (0, outcomeValidators_1.assertNoElidedCodeComments)(outcome);
                            (0, outcomeValidators_1.assertContainsAllSnippets)(outcome.fileContents, [
                                'function copy(generator, extensionConfig, from, to) {',
                                'function copyTpl(generator, extensionConfig, from, to) {',
                                "copy(generator, extensionConfig, generator.templatePath(bundlerPath, 'vscode'), generator.destinationPath('.vscode'));",
                                "copyTpl(generator, extensionConfig, 'vsc-extension-quickstart.md', 'vsc-extension-quickstart.md');"
                            ]);
                        }
                    }
                ]
            });
        });
        (0, stest_1.stest)({ description: 'work with untitled files', model }, (testingServiceCollection) => {
            return executeEditTest(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.toFile)({ uri: uri_1.URI.parse('untitled:Untitled-1'), fileContents: "Hello\n" }),
                ],
                queries: [
                    {
                        query: [
                            `In #file:Untitled-1 add a new line with the following content: 'World'`,
                        ].join(' '),
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                            assert.strictEqual(outcome.files.length, 1, 'Expected one file to be edited');
                            const file = outcome.files[0];
                            (0, stestUtil_1.assertQualifiedFile)(file);
                            assert.strictEqual(file.uri.toString(), 'untitled:Untitled-1', 'Expected the URI to be unchanged');
                            assert.strictEqual(file.fileContents, 'Hello\nWorld\n', 'Expected the file contents to be Hello\\nWorld');
                        }
                    },
                ]
            });
        });
    });
});
//# sourceMappingURL=multiFileEdit.stest.js.map