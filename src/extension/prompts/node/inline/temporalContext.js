"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemporalContext = exports.TemporalContextStats = void 0;
exports.summarizeTemporalContext = summarizeTemporalContext;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const commonTypes_1 = require("../../../../platform/chat/common/commonTypes");
const configurationService_1 = require("../../../../platform/configuration/common/configurationService");
const textDocumentSnapshot_1 = require("../../../../platform/editing/common/textDocumentSnapshot");
const heatmapService_1 = require("../../../../platform/heatmap/common/heatmapService");
const parserService_1 = require("../../../../platform/parser/node/parserService");
const nullExperimentationService_1 = require("../../../../platform/telemetry/common/nullExperimentationService");
const iterator_1 = require("../../../../util/vs/base/common/iterator");
const map_1 = require("../../../../util/vs/base/common/map");
const numbers_1 = require("../../../../util/vs/base/common/numbers");
const resources_1 = require("../../../../util/vs/base/common/resources");
const strings_1 = require("../../../../util/vs/base/common/strings");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const intents_1 = require("../../../prompt/node/intents");
const tag_1 = require("../base/tag");
const safeElements_1 = require("../panel/safeElements");
const summarizeDocumentHelpers_1 = require("./summarizedDocument/summarizeDocumentHelpers");
async function summarizeTemporalContext(accessor, tokenBudget, currentDocs) {
    const heatmapService = accessor.get(heatmapService_1.IHeatmapService);
    const parserService = accessor.get(parserService_1.IParserService);
    const configService = accessor.get(configurationService_1.IConfigurationService);
    const expService = accessor.get(nullExperimentationService_1.IExperimentationService);
    const entries = await heatmapService.getEntries();
    const entriesByUri = new map_1.ResourceMap();
    const now = Date.now();
    const maxAgeMillis = 1000 * (0, numbers_1.clamp)(configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.TemporalContextMaxAge, expService), 0, Number.MAX_SAFE_INTEGER);
    const input = [];
    let minTimestamp = Number.MAX_SAFE_INTEGER;
    let maxTimestamp = 0;
    // build input, check filter
    for (let [key, value] of entries) {
        // Ignore the current doc
        if (currentDocs.some(doc => (0, resources_1.isEqual)(key.uri, doc.uri))) {
            continue;
        }
        // Ignore values that are too old
        value = value.filter(point => (now - point.timestamp) <= maxAgeMillis);
        if (value.length === 0) {
            continue;
        }
        input.push({
            document: textDocumentSnapshot_1.TextDocumentSnapshot.create(key),
            formattingOptions: undefined,
            selection: undefined
        });
        entriesByUri.set(key.uri, value);
        // find old/young timestamps
        for (const point of value) {
            if (point.timestamp < minTimestamp) {
                minTimestamp = point.timestamp;
            }
            if (point.timestamp > maxTimestamp) {
                maxTimestamp = point.timestamp;
            }
        }
    }
    const timespawn = (maxTimestamp - minTimestamp);
    if (input.length === 0) {
        return new Map();
    }
    const preferSameLang = configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.TemporalContextPreferSameLang, expService);
    // summarize
    const documents = await (0, summarizeDocumentHelpers_1.summarizeDocuments)(parserService, input, tokenBudget, {
        costFnOverride: (node, currentCost, snapshot) => {
            const points = entriesByUri.get(snapshot.uri);
            if (!points) {
                return false; // should not happen
            }
            // add some cost if the language is different
            const langCost = preferSameLang && currentDocs.some(doc => snapshot.languageId !== doc.languageId) ? 1 : 0;
            let distance = Number.MAX_SAFE_INTEGER;
            for (const point of points) {
                if (node.range.contains(point.offset)) {
                    const age = timespawn && 1 - ((point.timestamp - minTimestamp) / timespawn);
                    if (node.children.length === 0) {
                        return 1 + langCost + age; // truly selected
                    }
                    else {
                        return 3 + langCost + age + currentCost;
                    }
                }
                distance = Math.min(distance, Math.abs(point.offset - node.range.start), Math.abs(point.offset - node.range.endExclusive));
            }
            // doesn't contain a recent offset -> add distance to the costs
            return 1 + distance + langCost + currentCost;
        },
    });
    // turn into map, filter empty documents
    const map = new Map();
    for (let i = 0; i < documents.length; i++) {
        if ((0, strings_1.isFalsyOrWhitespace)(documents[i].text)) {
            continue;
        }
        map.set(input[i].document.uri.toString(), { doc: input[i].document, projectedDoc: documents[i] });
    }
    return map;
}
class TemporalContextStats extends intents_1.TelemetryData {
    constructor(documentCount, totalCharLength) {
        super();
        this.documentCount = documentCount;
        this.totalCharLength = totalCharLength;
    }
}
exports.TemporalContextStats = TemporalContextStats;
let TemporalContext = class TemporalContext extends prompt_tsx_1.PromptElement {
    constructor(props, instantiationService, configurationService, experimentationService) {
        super(props);
        this.instantiationService = instantiationService;
        this.configurationService = configurationService;
        this.experimentationService = experimentationService;
    }
    async render(_state, sizing) {
        const enabled = (this.props.location === true
            || (this.props.location === commonTypes_1.ChatLocation.Editor
                ? this.configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.TemporalContextInlineChatEnabled, this.experimentationService)
                : this.configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.TemporalContextEditsEnabled, this.experimentationService)));
        if (!enabled) {
            return;
        }
        const documents = await this.instantiationService.invokeFunction(summarizeTemporalContext, Math.min(sizing.tokenBudget, 32_000), this.props.context);
        if (documents.size === 0) {
            return;
        }
        return vscpp(tag_1.Tag, { name: 'recentDocuments' },
            "I have read or edited some files recently. They may be helpful for answering the current question.",
            vscpp("br", null),
            vscpp(tag_1.Tag, { name: 'note' }, "These documents are provided as extra insights but are not meant to be edited or changed in any way."),
            Array.from(iterator_1.Iterable.map(documents, ([_, { doc: origDoc, projectedDoc }]) => {
                return vscpp(vscppf, null,
                    vscpp(tag_1.Tag, { name: projectedDoc.isOriginal ? 'document' : 'documentFragment' },
                        "From `",
                        vscpp(safeElements_1.Uri, { value: origDoc.uri, mode: 1 /* UriMode.Path */ }),
                        "` I have read or edited:",
                        vscpp("br", null),
                        vscpp(safeElements_1.CodeBlock, { includeFilepath: this.props.includeFilePaths, languageId: origDoc.languageId, uri: origDoc.uri, code: projectedDoc.text })),
                    vscpp("br", null));
            })),
            vscpp("meta", { value: new TemporalContextStats(documents.size, iterator_1.Iterable.reduce(documents.values(), (p, { projectedDoc: c }) => p + c.text.length, 0)) }));
    }
};
exports.TemporalContext = TemporalContext;
exports.TemporalContext = TemporalContext = __decorate([
    __param(1, instantiation_1.IInstantiationService),
    __param(2, configurationService_1.IConfigurationService),
    __param(3, nullExperimentationService_1.IExperimentationService)
], TemporalContext);
//# sourceMappingURL=temporalContext.js.map