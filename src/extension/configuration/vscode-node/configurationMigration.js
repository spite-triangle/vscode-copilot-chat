"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigurationMigrationContribution = exports.ConfigurationMigrationRegistry = exports.Extensions = exports.applicationConfigurationNodeBase = void 0;
/**
 * Heavily lifted from https://github.com/microsoft/vscode/tree/main/src/vs/workbench/common/configuration.ts
 * It is a little simplified and does not handle overrides, but currently we are only migrating experimental configurations
 */
const vscode_1 = require("vscode");
const event_1 = require("../../../util/vs/base/common/event");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const nls_1 = require("../../../util/vs/nls");
exports.applicationConfigurationNodeBase = Object.freeze({
    'id': 'application',
    'order': 100,
    'title': (0, nls_1.localize)('applicationConfigurationTitle', "Application"),
    'type': 'object'
});
exports.Extensions = {
    ConfigurationMigration: 'base.contributions.configuration.migration'
};
class ConfigurationMigrationRegistryImpl {
    constructor() {
        this.migrations = [];
        this._onDidRegisterConfigurationMigrations = new event_1.Emitter();
        this.onDidRegisterConfigurationMigration = this._onDidRegisterConfigurationMigrations.event;
    }
    registerConfigurationMigrations(configurationMigrations) {
        this.migrations.push(...configurationMigrations);
    }
}
exports.ConfigurationMigrationRegistry = new ConfigurationMigrationRegistryImpl();
class ConfigurationMigrationContribution {
    constructor() {
        this._disposables = new lifecycle_1.DisposableStore();
        this._register(vscode_1.workspace.onDidChangeWorkspaceFolders(async (e) => {
            for (const folder of e.added) {
                await this.migrateConfigurationForFolder(folder, exports.ConfigurationMigrationRegistry.migrations);
            }
        }));
        this.migrateConfigurations(exports.ConfigurationMigrationRegistry.migrations);
        this._register(exports.ConfigurationMigrationRegistry.onDidRegisterConfigurationMigration(migration => this.migrateConfigurations(migration)));
    }
    async migrateConfigurations(migrations) {
        if (vscode_1.window.state.focused) {
            await this.migrateConfigurationForFolder(undefined, migrations);
            for (const folder of vscode_1.workspace.workspaceFolders ?? []) {
                await this.migrateConfigurationForFolder(folder, migrations);
            }
        }
    }
    async migrateConfigurationForFolder(folder, migrations) {
        await Promise.all([migrations.map(migration => this.migrateConfigurationsForFolder(migration, folder?.uri))]);
    }
    async migrateConfigurationsForFolder(migration, resource) {
        const configuration = vscode_1.workspace.getConfiguration(undefined, resource);
        const inspectData = configuration.inspect(migration.key);
        if (!inspectData) {
            return;
        }
        const targetPairs = [
            [inspectData.globalValue, vscode_1.ConfigurationTarget.Global],
            [inspectData.workspaceValue, vscode_1.ConfigurationTarget.Workspace],
        ];
        for (const [inspectValue, target] of targetPairs) {
            if (!inspectValue) {
                continue;
            }
            const migrationValues = [];
            if (inspectValue !== undefined) {
                const keyValuePairs = await this.runMigration(migration, inspectValue);
                for (const keyValuePair of keyValuePairs ?? []) {
                    migrationValues.push(keyValuePair);
                }
            }
            if (migrationValues.length) {
                // apply migrations
                await Promise.allSettled(migrationValues.map(async ([key, value]) => {
                    configuration.update(key, value.value, target);
                }));
            }
        }
    }
    async runMigration(migration, value) {
        const result = await migration.migrateFn(value);
        return Array.isArray(result) ? result : [[migration.key, result]];
    }
    _register(disposable) {
        this._disposables.add(disposable);
    }
    dispose() {
        this._disposables.dispose();
    }
}
exports.ConfigurationMigrationContribution = ConfigurationMigrationContribution;
exports.ConfigurationMigrationRegistry.registerConfigurationMigrations([{
        key: 'github.copilot.chat.experimental.startDebugging.enabled',
        migrateFn: async (value) => {
            return [
                ['github.copilot.chat.startDebugging.enabled', { value }],
                ['github.copilot.chat.experimental.startDebugging.enabled', { value: undefined }]
            ];
        }
    }]);
exports.ConfigurationMigrationRegistry.registerConfigurationMigrations([{
        key: 'github.copilot.chat.experimental.setupTests.enabled',
        migrateFn: async (value) => {
            return [
                ['github.copilot.chat.setupTests.enabled', { value }],
                ['github.copilot.chat.experimental.setupTests.enabled', { value: undefined }]
            ];
        }
    }]);
exports.ConfigurationMigrationRegistry.registerConfigurationMigrations([{
        key: 'github.copilot.chat.experimental.codeGeneration.instructions',
        migrateFn: async (value) => {
            return [
                ['github.copilot.chat.codeGeneration.instructions', { value }],
                ['github.copilot.chat.experimental.codeGeneration.instructions', { value: undefined }]
            ];
        }
    }]);
exports.ConfigurationMigrationRegistry.registerConfigurationMigrations([{
        key: 'github.copilot.chat.experimental.codeGeneration.useInstructionFiles',
        migrateFn: async (value) => {
            return [
                ['github.copilot.chat.codeGeneration.useInstructionFiles', { value }],
                ['github.copilot.chat.experimental.codeGeneration.useInstructionFiles', { value: undefined }]
            ];
        }
    }]);
exports.ConfigurationMigrationRegistry.registerConfigurationMigrations([{
        key: 'github.copilot.chat.experimental.testGeneration.instructions',
        migrateFn: async (value) => {
            return [
                ['github.copilot.chat.testGeneration.instructions', { value }],
                ['github.copilot.chat.experimental.testGeneration.instructions', { value: undefined }]
            ];
        }
    }]);
exports.ConfigurationMigrationRegistry.registerConfigurationMigrations([{
        key: 'github.copilot.chat.experimental.generateTests.codeLens',
        migrateFn: async (value) => {
            return [
                ['github.copilot.chat.generateTests.codeLens', { value }],
                ['github.copilot.chat.experimental.generateTests.codeLens', { value: undefined }]
            ];
        }
    }]);
exports.ConfigurationMigrationRegistry.registerConfigurationMigrations([{
        key: 'github.copilot.chat.experimental.temporalContext.enabled',
        migrateFn: async (value) => {
            return [
                ['github.copilot.chat.editor.temporalContext.enabled', { value }],
                ['github.copilot.chat.experimental.temporalContext.enabled', { value: undefined }]
            ];
        }
    }]);
exports.ConfigurationMigrationRegistry.registerConfigurationMigrations([{
        key: 'github.copilot.chat.temporalContext.enabled',
        migrateFn: async (value) => {
            return [
                ['github.copilot.chat.editor.temporalContext.enabled', { value }],
                ['github.copilot.chat.temporalContext.enabled', { value: undefined }]
            ];
        }
    }]);
//# sourceMappingURL=configurationMigration.js.map