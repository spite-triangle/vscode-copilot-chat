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
const path = __importStar(require("path"));
const markdown_1 = require("../../src/util/common/markdown");
const stest_1 = require("../base/stest");
const scenarioLoader_1 = require("./scenarioLoader");
const scenarioTest_1 = require("./scenarioTest");
const scenarioFolder = path.join(__dirname, '..', 'test/scenarios/test-startDebugging');
(0, stest_1.ssuite)({ title: 'startDebugging', location: 'panel' }, async (inputPath) => {
    const scenarios = (0, scenarioLoader_1.discoverScenarios)(scenarioFolder);
    for (const scenario of scenarios) {
        const fileName = scenario[0].name;
        const testName = inputPath ? fileName.substring(0, fileName.indexOf('.')) : scenario[0].question.replace('@vscode /startDebugging', '');
        (0, stest_1.stest)({ description: testName }, (0, scenarioTest_1.generateScenarioTestRunner)(scenario, async (accessor, question, answer, rawResponse, turn, scenarioIndex, commands) => {
            if (scenario[0].json.matchAnyConfigOf !== undefined) {
                try {
                    const code = (0, markdown_1.extractCodeBlocks)(answer)[0]?.code || answer;
                    const parsed = JSON.parse(code);
                    for (const config of scenario[0].json.matchAnyConfigOf) {
                        if (isSubsetOf(config, parsed.configurations[0])) {
                            return { success: true, errorMessage: answer };
                        }
                    }
                    return { success: false, errorMessage: 'Expected a subset of the config' };
                }
                catch {
                    return { success: false, errorMessage: 'Did not parsed as JSON' };
                }
            }
            return { success: false, errorMessage: 'No requirements set for test.' };
        }));
    }
});
function isSubsetOf(subset, superset) {
    if (typeof subset !== typeof superset) {
        return false;
    }
    if (typeof subset === 'object') {
        for (const key in subset) {
            if (!isSubsetOf(subset[key], superset[key])) {
                return false;
            }
        }
        return true;
    }
    return subset === superset;
}
//# sourceMappingURL=startDebugging.stest.js.map