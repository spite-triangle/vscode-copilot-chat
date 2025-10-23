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
exports.InlineChatHintFeature = exports.LineCheck = void 0;
const vscode = __importStar(require("vscode"));
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const logService_1 = require("../../../platform/log/common/logService");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
var LineCheck;
(function (LineCheck) {
    const _keywordsByLanguage = new Map();
    _keywordsByLanguage.set('typescript', new Set(['abstract', 'any', 'as', 'asserts', 'async', 'await', 'bigint', 'boolean', 'break', 'case', 'catch', 'class', 'const', 'continue', 'constructor', 'debugger', 'declare', 'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'from', 'function', 'get', 'if', 'implements', 'import', 'in', 'infer', 'instanceof', 'interface', 'is', 'keyof', 'let', 'module', 'namespace', 'never', 'new', 'null', 'number', 'object', 'of', 'package', 'private', 'protected', 'public', 'readonly', 'require', 'return', 'set', 'static', 'string', 'super', 'switch', 'symbol', 'this', 'throw', 'true', 'try', 'type', 'typeof', 'undefined', 'unique', 'unknown', 'var', 'void', 'while', 'with', 'yield']));
    _keywordsByLanguage.set('typescriptreact', new Set(['abstract', 'any', 'as', 'asserts', 'async', 'await', 'bigint', 'boolean', 'break', 'case', 'catch', 'class', 'const', 'continue', 'constructor', 'debugger', 'declare', 'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'from', 'function', 'get', 'if', 'implements', 'import', 'in', 'infer', 'instanceof', 'interface', 'is', 'keyof', 'let', 'module', 'namespace', 'never', 'new', 'null', 'number', 'object', 'of', 'package', 'private', 'protected', 'public', 'readonly', 'require', 'return', 'set', 'static', 'string', 'super', 'switch', 'symbol', 'this', 'throw', 'true', 'try', 'type', 'typeof', 'undefined', 'unique', 'unknown', 'var', 'void', 'while', 'with', 'yield']));
    _keywordsByLanguage.set('javascript', new Set(['async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'constructor', 'debugger', 'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'from', 'function', 'get', 'if', 'import', 'in', 'instanceof', 'interface', 'is', 'let', 'new', 'null', 'require', 'return', 'set', 'static', 'string', 'super', 'switch', 'symbol', 'this', 'throw', 'true', 'try', 'type', 'typeof', 'undefined', 'var', 'void', 'while', 'with', 'yield']));
    _keywordsByLanguage.set('javascriptreact', new Set(['async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'constructor', 'debugger', 'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'from', 'function', 'get', 'if', 'import', 'in', 'instanceof', 'interface', 'is', 'let', 'new', 'null', 'require', 'return', 'set', 'static', 'string', 'super', 'switch', 'symbol', 'this', 'throw', 'true', 'try', 'type', 'typeof', 'undefined', 'var', 'void', 'while', 'with', 'yield']));
    _keywordsByLanguage.set('python', new Set(['False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield']));
    _keywordsByLanguage.set('java', new Set(['abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final', 'finally', 'float', 'for', 'goto', 'if', 'implements', 'import', 'instanceof', 'int', 'interface', 'long', 'native', 'new', 'null', 'package', 'private', 'protected', 'public', 'return', 'short', 'static', 'strictfp', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'try', 'void', 'volatile', 'while']));
    _keywordsByLanguage.set('go', new Set(['break', 'case', 'chan', 'const', 'continue', 'default', 'defer', 'else', 'fallthrough', 'for', 'func', 'go', 'goto', 'if', 'import', 'interface', 'map', 'package', 'range', 'return', 'select', 'struct', 'switch', 'type', 'var']));
    _keywordsByLanguage.set('csharp', new Set(['abstract', 'as', 'base', 'bool', 'break', 'byte', 'case', 'catch', 'char', 'checked', 'class', 'const', 'continue', 'decimal', 'default', 'delegate', 'do', 'double', 'else', 'enum', 'event', 'explicit', 'extern', 'false', 'finally', 'fixed', 'float', 'for', 'foreach', 'goto', 'if', 'implicit', 'in', 'int', 'interface', 'internal', 'is', 'lock', 'long', 'namespace', 'new', 'null', 'object', 'operator', 'out', 'override', 'params', 'private', 'protected', 'public', 'readonly', 'ref', 'return', 'sbyte', 'sealed', 'short', 'sizeof', 'stackalloc', 'static', 'string', 'struct', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'uint', 'ulong', 'unchecked', 'unsafe', 'ushort', 'using', 'virtual', 'void', 'volatile', 'while']));
    _keywordsByLanguage.set('cpp', new Set(['alignas', 'alignof', 'and', 'and_eq', 'asm', 'atomic_cancel', 'atomic_commit', 'atomic_noexcept', 'auto', 'bitand', 'bitor', 'bool', 'break', 'case', 'catch', 'char', 'char8_t', 'char16_t', 'char32_t', 'class', 'compl', 'concept', 'const', 'consteval', 'constexpr', 'constinit', 'const_cast', 'continue', 'co_await', 'co_return', 'co_yield', 'decltype', 'default', 'delete', 'do', 'double', 'dynamic_cast', 'else', 'enum', 'explicit', 'export', 'extern', 'false', 'float', 'for', 'friend', 'goto', 'if', 'import', 'inline', 'int', 'long', 'module', 'mutable', 'namespace', 'new', 'noexcept', 'not', 'not_eq', 'nullptr', 'operator', 'or', 'or_eq', 'private', 'protected', 'public', 'reflexpr', 'register', 'reinterpret_cast', 'requires', 'return', 'short', 'signed', 'sizeof', 'static', 'static_assert', 'static_cast', 'struct', 'switch', 'synchronized', 'template', 'this', 'thread_local', 'throw', 'true', 'try', 'typedef', 'typeid', 'typename', 'union', 'unsigned', 'using', 'virtual', 'void', 'volatile', 'wchar_t', 'while', 'xor', 'xor_eq']));
    _keywordsByLanguage.set('rust', new Set(['as', 'break', 'const', 'continue', 'crate', 'else', 'enum', 'extern', 'false', 'fn', 'for', 'if', 'impl', 'in', 'let', 'loop', 'match', 'mod', 'move', 'mut', 'pub', 'ref', 'return', 'self', 'Self', 'static', 'struct', 'super', 'trait', 'true', 'type', 'unsafe', 'use', 'where', 'while', 'async', 'await', 'dyn']));
    _keywordsByLanguage.set('ruby', new Set(['BEGIN', 'END', 'alias', 'and', 'begin', 'break', 'case', 'class', 'def', 'defined?', 'do', 'else', 'elsif', 'end', 'ensure', 'false', 'for', 'if', 'in', 'module', 'next', 'nil', 'not', 'or', 'redo', 'rescue', 'retry', 'return', 'self', 'super', 'then', 'true', 'undef', 'unless', 'until', 'when', 'while', 'yield']));
    // typical keywords of various programming languages
    _keywordsByLanguage.set('*', new Set(['abstract', 'as', 'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'from', 'function', 'get', 'if', 'import', 'in', 'instanceof', 'interface', 'is', 'let', 'new', 'null', 'package', 'private', 'protected', 'public', 'return', 'static', 'super', 'switch', 'this', 'throw', 'true', 'try', 'type', 'typeof', 'var', 'void', 'while', 'with', 'yield']));
    LineCheck.languages = Array.from(_keywordsByLanguage.keys());
    function _classifyLine(document, position) {
        const keywords = _keywordsByLanguage.get(document.languageId);
        const result = [];
        const line = document.lineAt(position);
        let column = line.firstNonWhitespaceCharacterIndex;
        let lastEnd = column;
        while (column < line.range.end.character) {
            const pos = new vscode.Position(position.line, column);
            const wordRange = document.getWordRangeAtPosition(pos);
            if (!wordRange) {
                column += 1;
                continue;
            }
            const start = wordRange.start.character;
            const end = wordRange.end.character;
            if (start !== lastEnd) {
                const value = line.text.substring(lastEnd, start);
                result.push({
                    type: value.match(/^\s+$/) ? 'space' : 'other',
                    value
                });
            }
            const value = line.text.substring(start, end);
            result.push({
                type: keywords?.has(value) ? 'keyword' : 'word',
                value
            });
            column = end + 1;
            lastEnd = end;
        }
        if (lastEnd < line.range.end.character) {
            const value = line.text.substring(lastEnd);
            result.push({
                type: value.match(/^\s+$/) ? 'space' : 'other',
                value
            });
        }
        const last = result.at(-1);
        if (last?.type === 'word') {
            // check if this is a keyword prefix
            for (const keyword of keywords ?? []) {
                if (keyword.startsWith(last.value)) {
                    last.type = 'keyword_start';
                    break;
                }
            }
        }
        return result;
    }
    function isNaturalLanguageDominated(document, position, logService) {
        // LOGIC: tokenize the line into words (as defined by the language), whitespace, and other
        // characters (which can be a mix of whitespace and non-word characters).
        const tokens = _classifyLine(document, position);
        let wordCount = 0;
        let keywordCount = 0;
        let keywordStartCount = 0;
        let spaceCount = 0;
        let otherCount = 0;
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            switch (token.type) {
                case 'keyword':
                    keywordCount += 1;
                    break;
                case 'keyword_start':
                    keywordStartCount += 1;
                    break;
                case 'word':
                    wordCount += 1;
                    break;
                case 'space':
                    spaceCount += 1;
                    break;
                case 'other':
                    otherCount += 1;
                    break;
            }
        }
        logService?.trace('[ChatTrigger] ' + JSON.stringify({ wordCount, keywordCount, spaceCount, otherCount, tokenCount: tokens.length }));
        if (tokens.length < 4 || spaceCount < 2) {
            // too little content
            return false;
        }
        if (keywordCount === 0 && otherCount === 0) {
            return false;
        }
        if ((keywordCount + keywordStartCount) >= wordCount) {
            return false; // too many keywords
        }
        if (otherCount >= spaceCount) {
            return false; // too much punctuation
        }
        return true;
    }
    LineCheck.isNaturalLanguageDominated = isNaturalLanguageDominated;
})(LineCheck || (exports.LineCheck = LineCheck = {}));
let InlineChatCompletionsTriggerDecoration = class InlineChatCompletionsTriggerDecoration {
    constructor(_logService) {
        this._logService = _logService;
        this._store = new lifecycle_1.DisposableStore();
        this._sessionStore = new lifecycle_1.DisposableStore();
        this._store.add(vscode.window.onDidChangeActiveTextEditor(() => this._update()));
        this._update();
    }
    dispose() {
        this._store.dispose();
    }
    _update() {
        this._sessionStore.clear();
        const editor = vscode.window.activeTextEditor;
        if (!editor || !editor.viewColumn) {
            return;
        }
        if (!vscode.languages.match(LineCheck.languages, editor.document)) {
            return;
        }
        this._sessionStore.add(vscode.window.onDidChangeTextEditorSelection(e => {
            if (e.textEditor !== editor) {
                return;
            }
            const lineRange = editor.document.lineAt(editor.selection.active.line).range;
            if (e.kind === vscode.TextEditorSelectionChangeKind.Keyboard
                && editor.selection.isSingleLine
                && lineRange.end.character === editor.selection.active.character // EOL
                && LineCheck.isNaturalLanguageDominated(editor.document, editor.selection.active, this._logService) // mostly words
            ) {
                vscode.commands.executeCommand('inlineChat.showHint', editor.document.uri, editor.selection.active);
            }
            else {
                vscode.commands.executeCommand('inlineChat.hideHint');
            }
        }));
        this._sessionStore.add((0, lifecycle_1.toDisposable)(() => {
            vscode.commands.executeCommand('inlineChat.hideHint');
        }));
    }
};
InlineChatCompletionsTriggerDecoration = __decorate([
    __param(0, logService_1.ILogService)
], InlineChatCompletionsTriggerDecoration);
let InlineChatHintFeature = class InlineChatHintFeature {
    constructor(instaService, configService) {
        this._store = new lifecycle_1.DisposableStore();
        const d = this._store.add(new lifecycle_1.MutableDisposable());
        const config = 'inlineChat.lineNaturalLanguageHint';
        const update = () => {
            if (configService.getNonExtensionConfig(config)) {
                d.value = instaService.createInstance(InlineChatCompletionsTriggerDecoration);
            }
            else {
                d.clear();
            }
        };
        this._store.add(configService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(config)) {
                update();
            }
        }));
        update();
    }
    dispose() {
        this._store.dispose();
    }
};
exports.InlineChatHintFeature = InlineChatHintFeature;
exports.InlineChatHintFeature = InlineChatHintFeature = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, configurationService_1.IConfigurationService)
], InlineChatHintFeature);
// should disable the sash when bounds are equal
//# sourceMappingURL=inlineChatHint.js.map