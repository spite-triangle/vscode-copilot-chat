"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const vitest_1 = require("vitest");
const uri_1 = require("../../../util/vs/base/common/uri");
const range_1 = require("../../../util/vs/editor/common/core/range");
const semanticSearchTextSearchProvider_1 = require("../../workspaceSemanticSearch/node/semanticSearchTextSearchProvider");
(0, vitest_1.suite)('Extract Code Snippets From Files', () => {
    const uri1 = uri_1.URI.file('/c:/Users/file1.ts');
    const uri2 = uri_1.URI.file('/c:/Users/file2.ts');
    const fileReader = async (uri) => {
        if (uri === uri1) {
            return Buffer.from(`
const express = require("express");
const patchHandler = require("./patchHandler");
const app = express();
const port = 3001;

app.get("/", (req, res) => {
	console.log('\${new Date()} \${req.method} \${req.path}');
	res.send("Hello world!");
});

const b = [1, 2, 3, 4, 5];

// This comment shouldn't be included
app.post("/", (req, res) => {
	console.log('\${new Date()} \${req.method} \${req.path}');
	// Fake comment
	// That should be included
	res.send("Post");
});

app.use("/", patchHandler);

app.listen(port, () => console.log('Example app listening on port \${port}!'));
`);
        }
        else {
            return Buffer.from(`
const express = require("express");
const router = express.Router();

router.patch("/", (req, res) => {
	console.log('\${new Date()} \${req.method} \${req.path}');
	res.send("Patch");
});

module.exports = router;
`);
        }
    };
    (0, vitest_1.test)('Return the ranges from the code snippet', async () => {
        const range1 = new range_1.Range(14, 0, 19, 2);
        const range2 = new range_1.Range(4, 0, 7, 2);
        const fileResults = [];
        fileResults.push({
            file: uri1,
            range: range1,
            text: `
app.post("/", (req, res) => {
	console.log('\${new Date()} \${req.method} \${req.path}');
	res.send("Post");
});`,
            rawText: undefined,
        });
        fileResults.push({
            file: uri2,
            range: range2,
            text: `
router.patch("/", (req, res) => {
	console.log('\${new Date()} \${req.method} \${req.path}');
	res.send("Patch");
});
`,
            rawText: undefined,
        });
        const results = await (0, semanticSearchTextSearchProvider_1.getSearchResults)(fileReader, fileResults);
        assert_1.default.strictEqual(results.length, 2);
        assert_1.default.strictEqual(results[0].ranges[0].sourceRange.start.line, 14);
        assert_1.default.strictEqual(results[0].ranges[0].sourceRange.end.line, 19);
        assert_1.default.strictEqual(results[1].ranges[0].sourceRange.start.line, 4);
        assert_1.default.strictEqual(results[1].ranges[0].sourceRange.end.line, 7);
    });
});
//# sourceMappingURL=extractCodeSnippets.spec.js.map