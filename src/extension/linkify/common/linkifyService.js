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
exports.LinkifyService = exports.ILinkifyService = void 0;
const envService_1 = require("../../../platform/env/common/envService");
const fileSystemService_1 = require("../../../platform/filesystem/common/fileSystemService");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const services_1 = require("../../../util/common/services");
const filePathLinkifier_1 = require("./filePathLinkifier");
const linkifier_1 = require("./linkifier");
exports.ILinkifyService = (0, services_1.createServiceIdentifier)('ILinkifyService');
let LinkifyService = class LinkifyService {
    constructor(fileSystem, workspaceService, envService) {
        this.envService = envService;
        this.globalLinkifiers = new Set();
        this.registerGlobalLinkifier({ create: () => new filePathLinkifier_1.FilePathLinkifier(fileSystem, workspaceService) });
    }
    registerGlobalLinkifier(linkifier) {
        if (this.globalLinkifiers.has(linkifier)) {
            throw new Error('Linkifier already registered');
        }
        this.globalLinkifiers.add(linkifier);
        return { dispose: () => this.globalLinkifiers.delete(linkifier) };
    }
    createLinkifier(context, additionalLinkifiers) {
        return new linkifier_1.Linkifier(context, this.envService.uriScheme, [...(additionalLinkifiers || []), ...this.globalLinkifiers].map(x => x.create()));
    }
};
exports.LinkifyService = LinkifyService;
exports.LinkifyService = LinkifyService = __decorate([
    __param(0, fileSystemService_1.IFileSystemService),
    __param(1, workspaceService_1.IWorkspaceService),
    __param(2, envService_1.IEnvService)
], LinkifyService);
//# sourceMappingURL=linkifyService.js.map