"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const configurationService_1 = require("../../../../platform/configuration/common/configurationService");
const textDocumentSnapshot_1 = require("../../../../platform/editing/common/textDocumentSnapshot");
const heatmapService_1 = require("../../../../platform/heatmap/common/heatmapService");
const services_1 = require("../../../../platform/test/node/services");
const textDocument_1 = require("../../../../util/common/test/shims/textDocument");
const uri_1 = require("../../../../util/vs/base/common/uri");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const temporalContext_1 = require("../inline/temporalContext");
const utils_1 = require("./utils");
(0, vitest_1.suite)('summarizeTemporalContext', () => {
    let instaService;
    let configService;
    let entries;
    let sampleDocCodeEditorWidget;
    let sampleDocCurrent;
    /**
     * Creates a sample TextDocument from a given relative file path.
     * @param p - The relative file path.
     * @returns A promise that resolves to a TextDocument.
     */
    async function makeSampleDoc(p, languageId = 'typescript') {
        const file = await (0, utils_1.loadFile)({ filePath: (0, utils_1.fixture)(p), languageId });
        return (0, textDocument_1.createTextDocumentData)(uri_1.URI.file(file.filePath), file.contents, file.languageId).document;
    }
    (0, vitest_1.beforeEach)(async () => {
        const services = (0, services_1.createPlatformServices)();
        services.define(heatmapService_1.IHeatmapService, new class {
            async getEntries() {
                return entries ?? new Map();
            }
        });
        const testingAccessor = services.createTestingAccessor();
        instaService = testingAccessor.get(instantiation_1.IInstantiationService);
        configService = testingAccessor.get(configurationService_1.IConfigurationService);
        // sample files
        sampleDocCodeEditorWidget = await makeSampleDoc('codeEditorWidget.ts');
        sampleDocCurrent = textDocumentSnapshot_1.TextDocumentSnapshot.create((0, textDocument_1.createTextDocumentData)(uri_1.URI.parse('fake:///file/path/app.ts'), '', 'typescript').document);
    });
    (0, vitest_1.test)('no documents when not entries exist', async () => {
        const result = await instaService.invokeFunction(temporalContext_1.summarizeTemporalContext, 100, [sampleDocCurrent]);
        vitest_1.assert.strictEqual(result.size, 0);
    });
    (0, vitest_1.test)('no documents when filtered', async () => {
        entries = new Map([
            [sampleDocCodeEditorWidget, [new heatmapService_1.SelectionPoint(6749, Date.now())]]
        ]);
        const result = await instaService.invokeFunction(temporalContext_1.summarizeTemporalContext, Number.MAX_SAFE_INTEGER, [textDocumentSnapshot_1.TextDocumentSnapshot.create(sampleDocCodeEditorWidget)]);
        vitest_1.assert.strictEqual(result.size, 0);
    });
    (0, vitest_1.test)('selections, offsets make it', async () => {
        entries = new Map([
            [sampleDocCodeEditorWidget, [new heatmapService_1.SelectionPoint(6749, Date.now())]]
        ]);
        const result = await instaService.invokeFunction(temporalContext_1.summarizeTemporalContext, 8192, [sampleDocCurrent]);
        vitest_1.assert.strictEqual(result.size, 1);
        const { projectedDoc: doc } = result.get(sampleDocCodeEditorWidget.uri.toString());
        vitest_1.assert.ok(doc);
        await (0, vitest_1.expect)(doc?.text).toMatchFileSnapshot(sampleDocCodeEditorWidget.uri.fsPath + '.1.tempo-summarized');
    });
    (0, vitest_1.test)('selections, offsets make it', async () => {
        const docActions = await makeSampleDoc('tempo-actions.ts');
        const docChatActions = await makeSampleDoc('tempo-chatActions.ts');
        const docChatContextActions = await makeSampleDoc('tempo-chatContextActions.ts');
        entries = new Map([
            [docActions, [new heatmapService_1.SelectionPoint(15335, Date.now() - 50)]],
            [docChatActions, [new heatmapService_1.SelectionPoint(4398, Date.now() - 10)]],
            [docChatContextActions, [new heatmapService_1.SelectionPoint(4677, Date.now() - 100), new heatmapService_1.SelectionPoint(5715, 28)]],
        ]);
        const result = await instaService.invokeFunction(temporalContext_1.summarizeTemporalContext, 8192, [sampleDocCurrent]);
        vitest_1.assert.strictEqual(result.size, 3);
        await (0, vitest_1.expect)(result.get(docActions.uri.toString())?.projectedDoc?.text).toMatchFileSnapshot(docActions.uri.fsPath + '.2.tempo-summarized');
        await (0, vitest_1.expect)(result.get(docChatActions.uri.toString())?.projectedDoc?.text).toMatchFileSnapshot(docChatActions.uri.fsPath + '.2.tempo-summarized');
        await (0, vitest_1.expect)(result.get(docChatContextActions.uri.toString())?.projectedDoc?.text).toMatchFileSnapshot(docChatContextActions.uri.fsPath + '.2.tempo-summarized');
    });
    (0, vitest_1.test)('prefer same lang', async () => {
        configService.setConfig(configurationService_1.ConfigKey.Internal.TemporalContextPreferSameLang, true);
        const docActions = await makeSampleDoc('tempo-actions.ts');
        const docActions2 = await makeSampleDoc('tempo-actions.html', 'html');
        entries = new Map([
            [docActions, [new heatmapService_1.SelectionPoint(15335, Date.now() - 50)]],
            [docActions2, [new heatmapService_1.SelectionPoint(15335, Date.now() - 50)]],
        ]);
        const result = await instaService.invokeFunction(temporalContext_1.summarizeTemporalContext, 8192, [sampleDocCurrent]);
        vitest_1.assert.strictEqual(result.size, 2);
        await (0, vitest_1.expect)(result.get(docActions.uri.toString())?.projectedDoc?.text).toMatchFileSnapshot(docActions.uri.fsPath + '.3.tempo-summarized');
        await (0, vitest_1.expect)(result.get(docActions2.uri.toString())?.projectedDoc?.text).toMatchFileSnapshot(docActions2.uri.fsPath + '.3.tempo-summarized');
        configService.setConfig(configurationService_1.ConfigKey.Internal.TemporalContextPreferSameLang, false);
    });
});
//# sourceMappingURL=temporalContext.spec.js.map