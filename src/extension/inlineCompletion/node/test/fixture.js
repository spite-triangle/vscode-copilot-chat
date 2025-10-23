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
exports.fixtureFromFile = fixtureFromFile;
exports.listFixtures = listFixtures;
const fsSync = __importStar(require("fs"));
const js_yaml_1 = require("js-yaml");
const path = __importStar(require("path"));
function fixtureFromFile(fileName) {
    const fixturePath = path.resolve(__dirname, 'fixtures', fileName);
    const yamlFixture = fsSync.readFileSync(fixturePath, 'utf-8');
    const fixture = convertKeysToCamelCase((0, js_yaml_1.load)(yamlFixture));
    if (!fixture.state.openFiles) {
        fixture.state.openFiles = [];
    }
    if (!fixture.expectedPrompt.prefix) {
        fixture.expectedPrompt.prefix = '';
    }
    if (!fixture.expectedPrompt.suffix) {
        fixture.expectedPrompt.suffix = '';
    }
    fixture.performance = {
        samples: fixture.performance?.samples ?? 100,
        meanMaxMs: fixture.performance?.meanMaxMs ?? 20,
    };
    return fixture;
}
function listFixtures(additionalFilters) {
    return fsSync
        .readdirSync(path.resolve(__dirname, 'fixtures'))
        .filter(file => file.endsWith('.fixture.yml'))
        .filter(file => additionalFilters.length === 0 || additionalFilters.some(filter => file.includes(filter)))
        .sort();
}
function convertKeysToCamelCase(obj) {
    if (typeof obj !== 'object' || obj === null) {
        if (typeof obj === 'string') {
            return inline(obj);
        }
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(convertKeysToCamelCase);
    }
    const newObj = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            newObj[hyphenToCamelCase(key)] = convertKeysToCamelCase(obj[key]);
        }
    }
    return newObj;
}
function hyphenToCamelCase(str) {
    return str.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}
// Replace file paths with their content. Path is relative to the fixtures folder.
const filePathRegex = /\${file:(.*)}/g;
function inline(text) {
    if (filePathRegex.test(text)) {
        return text.replace(filePathRegex, (_, pathSegment) => {
            const filePath = path.resolve(__dirname, 'fixtures', pathSegment);
            return fsSync.readFileSync(filePath, 'utf-8');
        });
    }
    return text;
}
//# sourceMappingURL=fixture.js.map