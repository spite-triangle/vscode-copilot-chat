"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var XAIBYOKLMProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.XAIBYOKLMProvider = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const logService_1 = require("../../../platform/log/common/logService");
const fetcherService_1 = require("../../../platform/networking/common/fetcherService");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const baseOpenAICompatibleProvider_1 = require("./baseOpenAICompatibleProvider");
let XAIBYOKLMProvider = class XAIBYOKLMProvider extends baseOpenAICompatibleProvider_1.BaseOpenAICompatibleLMProvider {
    static { XAIBYOKLMProvider_1 = this; }
    static { this.providerName = 'xAI'; }
    constructor(knownModels, byokStorageService, _fetcherService, _logService, _instantiationService) {
        super(0 /* BYOKAuthType.GlobalApiKey */, XAIBYOKLMProvider_1.providerName, 'https://api.x.ai/v1', knownModels, byokStorageService, _fetcherService, _logService, _instantiationService);
    }
};
exports.XAIBYOKLMProvider = XAIBYOKLMProvider;
exports.XAIBYOKLMProvider = XAIBYOKLMProvider = XAIBYOKLMProvider_1 = __decorate([
    __param(2, fetcherService_1.IFetcherService),
    __param(3, logService_1.ILogService),
    __param(4, instantiation_1.IInstantiationService)
], XAIBYOKLMProvider);
//# sourceMappingURL=xAIProvider.js.map