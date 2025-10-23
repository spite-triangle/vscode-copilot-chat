"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const tokenizer_1 = require("../../../inlineCompletionPrompt/node/tokenization/tokenizer");
const fixture_1 = require("./fixture");
(0, vitest_1.suite)('Prompt integration tests', () => {
    (0, vitest_1.beforeAll)(async () => {
        await tokenizer_1.initializeTokenizers;
    });
    (0, vitest_1.test)('Read fixture', () => {
        const fixture = (0, fixture_1.fixtureFromFile)(`integration-test-001.fixture.yml`);
        vitest_1.assert.ok(fixture, 'Fixture should be loaded successfully');
        vitest_1.assert.strictEqual(fixture.name, 'small current file, no open files, cursor near beginning', 'Fixture name should match');
        vitest_1.assert.strictEqual(fixture.state.openFiles.length, 0);
        vitest_1.assert.strictEqual(fixture.state.currentFile.language, 'typescript');
    });
}, 10000);
//# sourceMappingURL=prompt.spec.js.map