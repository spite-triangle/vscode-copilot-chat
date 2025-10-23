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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchConversationScenariosNested = fetchConversationScenariosNested;
const assert_1 = __importDefault(require("assert"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const diffService_1 = require("../../src/platform/diff/common/diffService");
const diffServiceImpl_1 = require("../../src/platform/diff/node/diffServiceImpl");
const alternativeContent_1 = require("../../src/platform/notebook/common/alternativeContent");
const alternativeContentEditGenerator_1 = require("../../src/platform/notebook/common/alternativeContentEditGenerator");
const notebookService_1 = require("../../src/platform/notebook/common/notebookService");
const simulationWorkspaceServices_1 = require("../../src/platform/test/node/simulationWorkspaceServices");
const map_1 = require("../../src/util/vs/base/common/map");
const types_1 = require("../../src/util/vs/base/common/types");
const descriptors_1 = require("../../src/util/vs/platform/instantiation/common/descriptors");
const notebooks_1 = require("../../src/util/vs/workbench/api/common/extHostTypes/notebooks");
const stest_1 = require("../base/stest");
const python_1 = require("../simulation/diagnosticProviders/python");
const inlineChatSimulator_1 = require("../simulation/inlineChatSimulator");
const notebookValidator_1 = require("../simulation/notebookValidator");
const sharedTypes_1 = require("../simulation/shared/sharedTypes");
const scenarioLoader_1 = require("./scenarioLoader");
function prepareNotebook(notebookEditor) {
    // parse the notebook document, reserve all the cells until the active cell
    // keep the active cell empty and then later on we request the model to fill it
    const document = notebookEditor.notebook;
    const activeCellIndex = notebookEditor.selection.start;
    const allCells = [];
    for (let i = 0; i < activeCellIndex; i++) {
        const cell = document.cellAt(i);
        allCells.push({
            cell_type: cell.kind === 2 ? 'code' : 'markdown',
            source: [cell.document.getText()],
            metadata: cell.metadata,
            outputs: []
        });
    }
    const activeCell = document.cellAt(activeCellIndex);
    allCells.push({
        cell_type: activeCell.kind === 2 ? 'code' : 'markdown',
        source: [],
        metadata: activeCell.metadata,
        outputs: []
    });
    return JSON.stringify({
        cells: allCells,
        metadata: document.metadata,
    }, undefined, 4);
}
function fetchConversationScenariosNested(folder) {
    const scenarios = [];
    const files = fs.readdirSync(folder);
    for (const file of files) {
        const filePath = path.join(folder, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            const nestedScenarios = fetchConversationScenariosNested(filePath);
            scenarios.push(...nestedScenarios);
        }
    }
    // scenarios in the current folder
    const currentFolderScenarios = (0, scenarioLoader_1.fetchConversationScenarios)(folder);
    if (currentFolderScenarios.length) {
        scenarios.push(...currentFolderScenarios);
    }
    return scenarios;
}
// name map
const nameMap = new Set();
function generateUniqueScenarioName(scenario) {
    const stateFile = scenario.json?.stateFile;
    let parentFolderName = path.basename(scenario.scenarioFolderPath);
    let scenarioId = scenario.question;
    if (stateFile) {
        const testName = stateFile.split('.')[0];
        // testName ends with a number, extract that
        const match = testName.match(/(\d+)$/);
        if (match) {
            scenarioId = `${match[0]}`;
        }
        else {
            scenarioId = '0';
        }
    }
    parentFolderName = parentFolderName.replace(/_/g, '-');
    const question = parentFolderName + '-' + scenarioId;
    if (!nameMap.has(question)) {
        nameMap.add(question);
        return question;
    }
    let i = 1;
    while (nameMap.has(`${question}-${i}`)) {
        i++;
    }
    const newName = `${question}-${i}`;
    nameMap.add(newName);
    return newName;
}
async function startKernelAndRunBeforeActiveCell(conversation, solutionNotebook, cellIndex, workspace) {
    try {
        const provider = new notebookValidator_1.KernelProvider();
        const virtualEnvironment = (0, python_1.ensurePythonVEnv)();
        if (!virtualEnvironment) {
            throw new Error(`Python virtual environment not found`);
        }
        const kernel = await (0, notebookValidator_1.launchKernel)(provider, virtualEnvironment, conversation.scenarioFolderPath, 5000);
        if (!kernel) {
            throw new Error('Failed to start kernel');
        }
        const kernelInfo = { provider, kernel, variables: [] };
        const notebookData = workspace?.getNotebook(solutionNotebook.uri);
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                kernel.process.print();
                reject('execute notebook before active cell timeout');
            }, 15000);
            (0, notebookValidator_1.executeNotebookCells)(solutionNotebook, kernel, new notebooks_1.NotebookRange(0, cellIndex), notebookData)
                .then(() => {
                clearTimeout(timeout);
                resolve();
            })
                .catch((error) => {
                clearTimeout(timeout);
                reject(error);
            });
        });
        return kernelInfo;
    }
    catch (ex) {
        throw new Error(`Failed to run cells: ${ex}`);
    }
}
(function () {
    (0, stest_1.ssuite)({ title: 'notebooks', subtitle: 'generate', location: 'inline' }, (inputPath) => {
        const scenarioFolder = inputPath ?? path.join(__dirname, '..', 'test/scenarios/test-notebooks');
        const scenarios = fetchConversationScenariosNested(scenarioFolder);
        for (const scenario of scenarios) {
            for (const conversation of scenario) {
                stest_1.stest.optional(() => { return inputPath === undefined; }, { description: generateUniqueScenarioName(conversation), language: 'python' }, async (testingServiceCollection) => {
                    (0, types_1.assertType)(conversation.getState !== undefined, 'state must be defined');
                    const state = conversation.getState();
                    const activeDoc = state.activeTextEditor.document;
                    const selection = state.activeTextEditor.selection;
                    const activeNotebookEditor = state.activeNotebookEditor;
                    const currentFileContent = prepareNotebook(activeNotebookEditor);
                    const currentFile = {
                        kind: 'qualifiedFile',
                        uri: activeDoc.uri,
                        fileContents: currentFileContent
                    };
                    const activeCellIndex = activeNotebookEditor.selection.start;
                    const filePath = currentFile.uri.path;
                    const solutionNotebook = state.notebookDocuments.find(doc => doc.uri.path === filePath);
                    const cellIndex = state.activeNotebookEditor.selection.start;
                    if (!solutionNotebook) {
                        assert_1.default.ok(false, `Solution notebook not found: ${filePath}`);
                    }
                    const activeCell = solutionNotebook.cellAt(cellIndex);
                    if (!activeCell) {
                        assert_1.default.ok(false, `Cell not found at index ${cellIndex}`);
                    }
                    const testAgainstOutput = activeCell.metadata.tags && Array.isArray(activeCell.metadata.tags) && activeCell.metadata.tags.find(tag => tag.startsWith('output') !== undefined);
                    let kernelInfo = undefined;
                    if (testAgainstOutput) {
                        // Output matching, requires running the notebook
                        try {
                            kernelInfo = await startKernelAndRunBeforeActiveCell(conversation, solutionNotebook, cellIndex, undefined);
                            if (kernelInfo) {
                                const variables = await kernelInfo.provider.resolveKernelVariables(kernelInfo.kernel);
                                kernelInfo.variables = variables;
                            }
                        }
                        catch (ex) {
                            kernelInfo?.kernel.dispose();
                            assert_1.default.ok(false, `Jupyter Kernel Validation failed ${ex}.`);
                        }
                    }
                    const query = {
                        file: currentFile.uri,
                        activeCell: activeCellIndex,
                        selection: [selection.anchor.line, selection.anchor.character, selection.active.line, selection.active.character],
                        diagnostics: [],
                        query: conversation.question,
                        expectedIntent: undefined,
                        validate: async (outcome, workspace, accessor) => {
                            if (outcome.type !== 'inlineEdit') {
                                kernelInfo?.kernel.dispose();
                                assert_1.default.ok(false, `Unexpected outcome type: ${outcome.type}`);
                            }
                            const expected = activeCell.document.getText();
                            const actual = outcome.fileContents.trim();
                            const inputFuzzyMatched = (0, notebookValidator_1.notebookCellInputFuzzyMatches)(activeCell, actual);
                            if (inputFuzzyMatched) {
                                kernelInfo?.kernel.dispose();
                                assert_1.default.ok(true);
                                return;
                            }
                            try {
                                if (!kernelInfo) {
                                    // We didn't start the kernel yet
                                    kernelInfo = await startKernelAndRunBeforeActiveCell(conversation, solutionNotebook, cellIndex, workspace);
                                }
                                if (!kernelInfo) {
                                    assert_1.default.ok(false, 'Failed to start kernel');
                                }
                                const { kernel } = kernelInfo;
                                const replies = await new Promise((resolve, reject) => {
                                    const timeout = setTimeout(() => {
                                        resolve(undefined);
                                    }, 30000);
                                    kernel.connection.sendAndReceive((0, notebookValidator_1.executeRequest)(actual))
                                        .then((replies) => {
                                        clearTimeout(timeout);
                                        resolve(replies);
                                    })
                                        .catch((error) => {
                                        clearTimeout(timeout);
                                        resolve(undefined);
                                    });
                                });
                                if (!replies) {
                                    kernel.dispose();
                                    assert_1.default.ok(false, 'Failed to execute notebook');
                                }
                                const notebookData = workspace?.getNotebook(solutionNotebook.uri);
                                notebookData?.appendCellOutput(activeCell.index, (0, notebookValidator_1.convertExecutionReplies)(replies));
                                const testRuntime = accessor.get(stest_1.ISimulationTestRuntime);
                                const workspacePath = workspace.getFilePath(solutionNotebook.uri);
                                const ext = path.extname(workspacePath);
                                const basename = path.basename(workspacePath, ext);
                                try {
                                    await testRuntime.writeFile(basename + '.output' + ext, workspace.getNotebook(solutionNotebook.uri).getText(), sharedTypes_1.INLINE_NOTEBOOK_EXECUTION_TAG);
                                }
                                catch (_ex) {
                                    // no op
                                }
                                const executionResult = replies.find(reply => reply.header.msg_type === 'execute_result' || reply.header.msg_type === 'stream');
                                if (executionResult) {
                                    const actualOutput = ('data' in executionResult.content ? executionResult.content.data['text/plain'] : executionResult.content.text).trim();
                                    const outputFuzzyMatched = (0, notebookValidator_1.notebookCellOutputFuzzyMatches)(activeCell, actualOutput);
                                    if (outputFuzzyMatched) {
                                        try {
                                            kernel.dispose();
                                        }
                                        catch (_ex) {
                                            // Ignore
                                        }
                                        assert_1.default.ok(true);
                                        return;
                                    }
                                }
                                kernel.dispose();
                                assert_1.default.ok(false, `None of the fuzzy matching works. Expected: ${expected}\nActual: ${actual}`);
                            }
                            catch (ex) {
                                assert_1.default.ok(false, `Jupyter Kernel Validation failed ${ex}.`);
                            }
                        }
                    };
                    const testScenario = {
                        files: [currentFile],
                        queries: [query],
                        extraWorkspaceSetup: async (workspace) => {
                            if (kernelInfo?.variables) {
                                testingServiceCollection.define(notebookService_1.INotebookService, new descriptors_1.SyncDescriptor(simulationWorkspaceServices_1.SimulationNotebookService, [
                                    workspace,
                                    new map_1.ResourceMap([[solutionNotebook.uri, kernelInfo.variables]])
                                ]));
                                testingServiceCollection.define(alternativeContent_1.IAlternativeNotebookContentService, new descriptors_1.SyncDescriptor(simulationWorkspaceServices_1.SimulationAlternativeNotebookContentService, []));
                                testingServiceCollection.define(alternativeContentEditGenerator_1.IAlternativeNotebookContentEditGenerator, new descriptors_1.SyncDescriptor(alternativeContentEditGenerator_1.AlternativeNotebookContentEditGenerator));
                                testingServiceCollection.define(diffService_1.IDiffService, new descriptors_1.SyncDescriptor(diffServiceImpl_1.DiffServiceImpl));
                            }
                        }
                    };
                    await (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, testScenario);
                });
            }
        }
    });
})();
//# sourceMappingURL=notebook.stest.js.map