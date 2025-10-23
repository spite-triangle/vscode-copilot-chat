"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const serverPoweredInlineEditProvider_1 = require("../../../src/extension/inlineEdits/node/serverPoweredInlineEditProvider");
const xtabProvider_1 = require("../../../src/extension/xtab/node/xtabProvider");
const configurationService_1 = require("../../../src/platform/configuration/common/configurationService");
const stest_1 = require("../../base/stest");
const fileLoading_1 = require("./fileLoading");
const inlineEditTester_1 = require("./inlineEditTester");
const CompScore1 = 'CompScore1';
const CompScore2 = 'CompScore2';
const CompScore3 = 'CompScore3';
function getTester() {
    return new inlineEditTester_1.InlineEditTester();
}
const commonXtabTestConfigurations = [
// uncomment to include viewed files
// {
// 	key: ConfigKey.Internal.InlineEditsXtabIncludeViewedFiles,
// 	value: true,
// },
// uncomment to use paged clipping
// {
// 	key: ConfigKey.Internal.InlineEditsXtabUsePagedClipping,
// 	value: true,
// },
// uncomment to use varying lines above
// {
// 	key: ConfigKey.Internal.InlineEditsXtabProviderUseVaryingLinesAbove,
// 	value: true,
// },
// uncomment to disable tags in current file
// {
// 	key: ConfigKey.Internal.InlineEditsXtabIncludeTagsInCurrentFile,
// 	value: false,
// },
// uncomment to disable streamed edits
// {
// 	key: ConfigKey.Internal.InlineEditsStreamEdits,
// 	value: false,
// }
// uncomment to enable diffing only for documents in the prompt
// {
// 	key: ConfigKey.Internal.InlineEditsXtabDiffOnlyForDocsInPrompt,
// 	value: true,
// }
];
const testConfigs = [
    {
        providerName: "xtab",
        extensionConfiguration: [
            {
                key: configurationService_1.ConfigKey.Internal.InlineEditsProviderId,
                value: xtabProvider_1.XtabProvider.ID,
            },
            ...commonXtabTestConfigurations,
        ],
    },
    {
        providerName: "server",
        extensionConfiguration: [
            {
                key: configurationService_1.ConfigKey.Internal.InlineEditsProviderId,
                value: serverPoweredInlineEditProvider_1.ServerPoweredInlineEditProvider.ID,
            }
        ],
    },
];
for (const testConfig of testConfigs) {
    const providerName = testConfig.providerName;
    function ssuiteByProvider(descr, testRegistrationFactory) {
        if (providerName === 'server') {
            return stest_1.ssuite.optional(// remember: optional tests aren't run in CI (which matches current desired behavior but don't be surprised)
            (opts) => !opts.runServerPoweredNesProvider, descr, testRegistrationFactory);
        }
        else {
            return (0, stest_1.ssuite)(descr, testRegistrationFactory);
        }
    }
    ssuiteByProvider({ title: "InlineEdit GoldenScenario", subtitle: `[${testConfig.providerName}]`, location: "external", configurations: testConfig.extensionConfiguration }, () => {
        const tester = getTester();
        (0, stest_1.stest)({ description: '[MustHave] 1-point.ts', language: 'typescript', attributes: { [CompScore1]: 1, [CompScore2]: 0.5, [CompScore3]: 0 } }, collection => tester.runAndScoreTestFromRecording(collection, (0, fileLoading_1.loadFile)({ filePath: (0, fileLoading_1.inlineEditsFixture)("1-point.ts/recording.w.json") })));
        (0, stest_1.stest)({ description: '[NiceToHave] 2-helloworld-sample-remove-generic-parameter', language: 'typescript', attributes: { [CompScore1]: 0 } }, collection => tester.runAndScoreTestFromRecording(collection, (0, fileLoading_1.loadFile)({ filePath: (0, fileLoading_1.inlineEditsFixture)("2-helloworld-sample-remove-generic-parameter/recording.w.json") })));
        (0, stest_1.stest)({ description: '[MustHave] 6-vscode-remote-try-java-part-1', language: 'java', attributes: { [CompScore1]: 1, [CompScore2]: 1, [CompScore3]: 0.75 } }, collection => tester.runAndScoreTestFromRecording(collection, (0, fileLoading_1.loadFile)({ filePath: (0, fileLoading_1.inlineEditsFixture)("6-vscode-remote-try-java-part-1/recording.w.json") })));
        // TODO: this test case is weird, it overspecifies like directing via comments
        (0, stest_1.stest)({ description: '[MustHave] 6-vscode-remote-try-java-part-2', language: 'java', attributes: { [CompScore1]: 1, [CompScore2]: 1, [CompScore3]: 0.75 } }, collection => tester.runAndScoreTestFromRecording(collection, (0, fileLoading_1.loadFile)({ filePath: (0, fileLoading_1.inlineEditsFixture)("6-vscode-remote-try-java-part-2/recording.w.json") })));
        // 7 covered in "From codium"
        (0, stest_1.stest)({ description: '[MustHave] 8-cppIndividual-1-point.cpp', language: 'cpp', attributes: { [CompScore1]: 1, [CompScore2]: 0, [CompScore3]: 1 } }, collection => tester.runAndScoreTestFromRecording(collection, (0, fileLoading_1.loadFile)({ filePath: (0, fileLoading_1.inlineEditsFixture)("8-cppIndividual-1-point.cpp/recording.w.json") })));
        (0, stest_1.stest)({ description: '[MustHave] 8-cppIndividual-2-collection-farewell', language: 'cpp', attributes: { [CompScore1]: 1, [CompScore2]: 0.5, [CompScore3]: 0.5 } }, collection => tester.runAndScoreTestFromRecording(collection, (0, fileLoading_1.loadFile)({ filePath: (0, fileLoading_1.inlineEditsFixture)("8-cppIndividual-2-collection-farewell/recording.w.json") })));
        (0, stest_1.stest)({ description: '[MustHave] 9-cppProject-add-header-expect-implementation', language: 'cpp', attributes: { [CompScore1]: 1, [CompScore2]: 0.66, [CompScore3]: 0.5 } }, collection => tester.runAndScoreTestFromRecording(collection, (0, fileLoading_1.loadFile)({ filePath: (0, fileLoading_1.inlineEditsFixture)("9-cppProject-add-header-expect-implementation/recording.w.json") })));
        (0, stest_1.stest)({ description: '[MustHave] 9-cppProject-add-implementation-expect-header', language: 'cpp', attributes: { [CompScore1]: 1, [CompScore2]: 0, [CompScore3]: 1 } }, collection => tester.runAndScoreTestFromRecording(collection, (0, fileLoading_1.loadFile)({ filePath: (0, fileLoading_1.inlineEditsFixture)("9-cppProject-add-implementation-expect-header/recording.w.json") })));
        (0, stest_1.stest)({ description: 'Notebook 10-update-name-in-same-cell-of-notebook', language: 'python' }, collection => tester.runAndScoreTestFromRecording(collection, (0, fileLoading_1.loadFile)({
            filePath: (0, fileLoading_1.inlineEditsFixture)("10-update-name-in-same-cell-of-notebook/recording.w.json"),
        })));
        (0, stest_1.stest)({ description: 'Notebook 11-update-name-in-next-cell-of-notebook', language: 'python' }, collection => tester.runAndScoreTestFromRecording(collection, (0, fileLoading_1.loadFile)({
            filePath: (0, fileLoading_1.inlineEditsFixture)("11-update-name-in-next-cell-of-notebook/recording.w.json"),
        })));
    });
}
//# sourceMappingURL=inlineEdit.stest.js.map