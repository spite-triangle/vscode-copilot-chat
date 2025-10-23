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
exports.ConfigContextKeyHelper = void 0;
const vscode = __importStar(require("vscode"));
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const configurationService_1 = require("../common/configurationService");
let ConfigContextKeyHelper = class ConfigContextKeyHelper extends lifecycle_1.DisposableStore {
    constructor(setting, customContextKeyName, configurationService) {
        super();
        this.setting = setting;
        this.configurationService = configurationService;
        this.contextKeyName = customContextKeyName ?? `${setting.fullyQualifiedId}.enabled`;
        this.add(configurationService.onDidChangeConfiguration(e => {
            if (setting.advancedSubKey) {
                // This is a `github.copilot.advanced.*` setting
                if (e.affectsConfiguration(`${configurationService_1.CopilotConfigPrefix}.advanced`)) {
                    this.updateContextKey();
                }
            }
            else if (e.affectsConfiguration(setting.fullyQualifiedId)) {
                this.updateContextKey();
            }
        }));
        this.updateContextKey();
    }
    updateContextKey() {
        vscode.commands.executeCommand('setContext', this.contextKeyName, this.configurationService.getConfig(this.setting));
    }
};
exports.ConfigContextKeyHelper = ConfigContextKeyHelper;
exports.ConfigContextKeyHelper = ConfigContextKeyHelper = __decorate([
    __param(2, configurationService_1.IConfigurationService)
], ConfigContextKeyHelper);
//# sourceMappingURL=configurationContextKey.js.map