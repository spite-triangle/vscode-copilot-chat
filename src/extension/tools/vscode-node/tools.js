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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolsContribution = void 0;
const vscode = __importStar(require("vscode"));
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const observableInternal_1 = require("../../../util/vs/base/common/observableInternal");
const toolNames_1 = require("../common/toolNames");
const toolsService_1 = require("../common/toolsService");
const virtualToolTypes_1 = require("../common/virtualTools/virtualToolTypes");
require("../node/allTools");
require("./allTools");
let ToolsContribution = class ToolsContribution extends lifecycle_1.Disposable {
    constructor(toolsService, toolGrouping, toolGroupingService) {
        super();
        for (const [name, tool] of toolsService.copilotTools) {
            this._register(vscode.lm.registerTool((0, toolNames_1.getContributedToolName)(name), tool));
        }
        this._register(vscode.commands.registerCommand('github.copilot.debug.resetVirtualToolGroups', async () => {
            await toolGrouping.clear();
            vscode.window.showInformationMessage('Tool groups have been reset. They will be regenerated on the next agent request.');
        }));
        this._register((0, observableInternal_1.autorun)(reader => {
            vscode.commands.executeCommand('setContext', 'chat.toolGroupingThreshold', toolGroupingService.threshold.read(reader));
        }));
    }
};
exports.ToolsContribution = ToolsContribution;
exports.ToolsContribution = ToolsContribution = __decorate([
    __param(0, toolsService_1.IToolsService),
    __param(1, virtualToolTypes_1.IToolGroupingCache),
    __param(2, virtualToolTypes_1.IToolGroupingService)
], ToolsContribution);
//# sourceMappingURL=tools.js.map