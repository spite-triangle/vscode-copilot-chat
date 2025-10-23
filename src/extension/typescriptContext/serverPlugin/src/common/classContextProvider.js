"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WholeClassContextProvider = exports.ClassContextProvider = exports.SuperClassRunnable = exports.ClassBlueprintSearch = void 0;
const typescript_1 = __importDefault(require("./typescript"));
const ts = (0, typescript_1.default)();
const code_1 = require("./code");
const contextProvider_1 = require("./contextProvider");
const protocol_1 = require("./protocol");
const typescripts_1 = __importStar(require("./typescripts"));
class ClassBlueprintSearch extends contextProvider_1.Search {
    constructor(program, symbols, classDeclarationOrSearch, stateProvider) {
        super(program, symbols);
        if (classDeclarationOrSearch instanceof ClassBlueprintSearch) {
            const search = classDeclarationOrSearch;
            this.classDeclaration = contextProvider_1.Search.getNodeInProgram(program, search.classDeclaration);
            this.stateProvider = search.stateProvider;
            this.abstractMembers = search.abstractMembers;
            const mapTypeInfo = (typeInfo) => {
                const type = typeInfo.type;
                const sourceFile = program.getSourceFile(type.getSourceFile().fileName);
                if (sourceFile !== undefined) {
                    const localType = typescripts_1.default.getTokenAtPosition(sourceFile, type.pos);
                    if (ts.isExpressionWithTypeArguments(localType)) {
                        const symbol = symbols.getLeafSymbolAtLocation(localType.expression);
                        if (symbol !== undefined && !this.getSymbolInfo(symbol).skip) {
                            return { symbol, type: localType, abstractMembers: typeInfo.abstractMembers };
                        }
                    }
                }
                return undefined;
            };
            if (search.extends !== undefined) {
                this.extends = mapTypeInfo(search.extends);
            }
            if (search.implements !== undefined) {
                let impl;
                for (const info of search.implements) {
                    const mapped = mapTypeInfo(info);
                    if (mapped !== undefined) {
                        impl = impl ?? [];
                        impl.push(mapped);
                    }
                }
                this.implements = impl;
            }
        }
        else {
            const classDeclaration = classDeclarationOrSearch;
            this.classDeclaration = classDeclaration;
            this.stateProvider = stateProvider;
            const heritageClauses = classDeclaration.heritageClauses;
            if (heritageClauses === undefined) {
                this.abstractMembers = 0;
                this.extends = undefined;
                this.implements = undefined;
                return;
            }
            let totalAbstractMembers = 0;
            let extendsSymbol;
            let implementsSymbols;
            for (const heritageClause of heritageClauses) {
                if (heritageClause.token === ts.SyntaxKind.ExtendsKeyword) {
                    if (heritageClause.types.length === 1) {
                        const type = heritageClause.types[0];
                        const symbol = this.getHeritageSymbol(type.expression);
                        if (symbol !== undefined && !this.getSymbolInfo(symbol).skip) {
                            const abstractMembers = this.getNumberOfAbstractMembers(symbol);
                            totalAbstractMembers += abstractMembers;
                            extendsSymbol = { symbol, type: type, abstractMembers: abstractMembers };
                        }
                    }
                }
                else if (heritageClause.token === ts.SyntaxKind.ImplementsKeyword) {
                    for (const type of heritageClause.types) {
                        const symbol = this.getHeritageSymbol(type.expression);
                        if (symbol !== undefined && !this.getSymbolInfo(symbol).skip) {
                            implementsSymbols = implementsSymbols ?? [];
                            const abstractMembers = this.getNumberOfAbstractMembers(symbol);
                            totalAbstractMembers += abstractMembers;
                            implementsSymbols.push({ symbol, type: type, abstractMembers: abstractMembers });
                        }
                    }
                }
            }
            if (implementsSymbols !== undefined) {
                implementsSymbols.sort((a, b) => b.abstractMembers - a.abstractMembers);
            }
            this.abstractMembers = totalAbstractMembers;
            this.extends = extendsSymbol;
            this.implements = implementsSymbols;
        }
    }
    with(program) {
        if (program === this.program) {
            return this;
        }
        return new ClassBlueprintSearch(program, new typescripts_1.Symbols(program), this);
    }
    *all() {
        if (this.extends !== undefined) {
            yield this.extends;
        }
        if (this.implements !== undefined) {
            yield* this.implements;
        }
    }
    isSame(other) {
        return this.classDeclaration === other ||
            (this.classDeclaration.getSourceFile().fileName === other.getSourceFile().fileName && this.classDeclaration.pos === other.pos);
    }
    score(program, context) {
        // We have no abstract member. The program is only
        // of interest if it includes the extends class.
        if (this.abstractMembers === 0) {
            if (this.extends === undefined) {
                return -1;
            }
            const declarations = this.extends.symbol.declarations;
            if (declarations === undefined) {
                return -1;
            }
            for (const declaration of declarations) {
                if (program.getSourceFile(declaration.getSourceFile().fileName) === undefined) {
                    return -1;
                }
            }
            return 1;
        }
        let possible = undefined;
        for (const info of this.all()) {
            if (info.symbol.declarations === undefined) {
                continue;
            }
            for (const declaration of info.symbol.declarations) {
                const sourceFile = declaration.getSourceFile();
                if (program.getSourceFile(sourceFile.fileName) !== undefined) {
                    possible ??= 0;
                    possible += info.abstractMembers;
                    break;
                }
            }
        }
        if (possible === undefined) {
            return -1;
        }
        // this.abstractMembers !== 0 here.
        let result = possible / this.abstractMembers;
        // now factor the neighbor files in to prefer a program where all neighbor files are
        // part of.
        const neighborFiles = context.neighborFiles;
        if (neighborFiles.length === 0) {
            return result;
        }
        const factor = Math.pow(10, neighborFiles.length.toString().length);
        result *= factor;
        for (const file of neighborFiles) {
            if (program.getSourceFile(file) !== undefined) {
                result += 1;
            }
        }
        return result;
    }
    run(context, token) {
        if (this.extends === undefined && this.implements === undefined) {
            return undefined;
        }
        let result;
        const symbol2TypeInfo = new Map([...this.all()].map(info => [info.symbol, info]));
        for (const typeInfo of this.all()) {
            const symbol = typeInfo.symbol;
            const declarations = symbol.declarations;
            if (declarations === undefined) {
                continue;
            }
            const declarationSourceFileVisited = new Set();
            for (const declaration of declarations) {
                if (!ts.isClassDeclaration(declaration) && !ts.isInterfaceDeclaration(declaration) && !ts.isTypeAliasDeclaration(declaration) || declaration.name === undefined) {
                    continue;
                }
                const declarationSourceFile = declaration.getSourceFile();
                if (declarationSourceFileVisited.has(declarationSourceFile.fileName)) {
                    continue;
                }
                const referencedByVisitor = new typescripts_1.ReferencedByVisitor(this.program, declarationSourceFile, context.getPreferredNeighborFiles(this.program), this.stateProvider, token);
                for (const sourceFile of referencedByVisitor.entries()) {
                    token.throwIfCancellationRequested();
                    for (const candidate of typescripts_1.ClassDeclarations.entries(sourceFile)) {
                        if (candidate.heritageClauses === undefined) {
                            continue;
                        }
                        if (this.isSame(candidate)) {
                            continue;
                        }
                        let matchesAbstractMembers = undefined;
                        for (const heritageClause of candidate.heritageClauses) {
                            for (const type of heritageClause.types) {
                                const symbol = this.getHeritageSymbol(type.expression);
                                if (symbol === undefined) {
                                    continue;
                                }
                                const typeInfo = symbol2TypeInfo.get(symbol);
                                if (typeInfo === undefined) {
                                    continue;
                                }
                                matchesAbstractMembers ??= 0;
                                matchesAbstractMembers += typeInfo.abstractMembers;
                            }
                        }
                        if (matchesAbstractMembers !== undefined) {
                            if (result === undefined) {
                                result = { declaration: candidate, matchesAbstractMembers: matchesAbstractMembers };
                            }
                            else if (matchesAbstractMembers > result.matchesAbstractMembers) {
                                result = { declaration: candidate, matchesAbstractMembers: matchesAbstractMembers };
                            }
                        }
                        // Here we can be smart. We could for 30ms continue to search for a better match and then return the best match.
                        if (result !== undefined && result.matchesAbstractMembers === this.abstractMembers) {
                            return result;
                        }
                    }
                }
            }
        }
        return undefined;
    }
    getNumberOfAbstractMembers(symbol) {
        const stats = this.symbols.getMemberStatistic(symbol);
        return stats.abstract.size;
    }
}
exports.ClassBlueprintSearch = ClassBlueprintSearch;
class SuperClassRunnable extends contextProvider_1.AbstractContextRunnable {
    constructor(session, languageService, context, classDeclaration, priority = protocol_1.Priorities.Inherited) {
        super(session, languageService, context, 'SuperClassRunnable', contextProvider_1.SnippetLocation.Primary, priority, contextProvider_1.ComputeCost.Medium);
        this.classDeclaration = classDeclaration;
    }
    getActiveSourceFile() {
        return this.classDeclaration.getSourceFile();
    }
    createRunnableResult(result) {
        const cacheScope = this.createCacheScope(this.classDeclaration.members, this.classDeclaration.getSourceFile());
        return result.createRunnableResult(this.id, this.priority, protocol_1.SpeculativeKind.emit, { emitMode: protocol_1.EmitMode.ClientBased, scope: cacheScope });
    }
    run(_result, _token) {
        const symbols = this.symbols;
        const clazz = symbols.getLeafSymbolAtLocation(this.classDeclaration.name ?? this.classDeclaration);
        if (clazz === undefined || !typescripts_1.Symbols.isClass(clazz) || clazz.declarations === undefined) {
            return;
        }
        const directSuperSymbolInfo = symbols.getDirectSuperSymbols(clazz);
        if (directSuperSymbolInfo === undefined) {
            return;
        }
        if (directSuperSymbolInfo.extends !== undefined) {
            const { symbol, name } = directSuperSymbolInfo.extends;
            if (symbol !== undefined && name !== undefined) {
                this.handleSymbol(symbol, name);
            }
        }
        if (directSuperSymbolInfo.implements !== undefined) {
            for (const impl of directSuperSymbolInfo.implements) {
                const { symbol, name } = impl;
                if (symbol !== undefined && name !== undefined) {
                    this.handleSymbol(symbol, name);
                }
            }
        }
    }
}
exports.SuperClassRunnable = SuperClassRunnable;
class SimilarClassRunnable extends contextProvider_1.AbstractContextRunnable {
    constructor(session, languageService, context, classDeclaration, priority = protocol_1.Priorities.Blueprints) {
        super(session, languageService, context, 'SimilarClassRunnable', contextProvider_1.SnippetLocation.Primary, priority, contextProvider_1.ComputeCost.High);
        this.classDeclaration = classDeclaration;
    }
    getActiveSourceFile() {
        return this.classDeclaration.getSourceFile();
    }
    createRunnableResult(result) {
        return result.createRunnableResult(this.id, this.priority, protocol_1.SpeculativeKind.emit);
    }
    run(result, token) {
        const program = this.getProgram();
        const classDeclaration = this.classDeclaration;
        const symbol = this.symbols.getLeafSymbolAtLocation(classDeclaration.name ?? classDeclaration);
        if (symbol === undefined || !typescripts_1.Symbols.isClass(symbol)) {
            return;
        }
        const search = new ClassBlueprintSearch(program, this.symbols, classDeclaration);
        if (search.extends === undefined && search.implements === undefined) {
            return;
        }
        const [foundInProgram, similarClass] = this.session.run(search, this.context, token);
        if (foundInProgram === undefined || similarClass === undefined) {
            return;
        }
        const code = new code_1.CodeSnippetBuilder(this.context, this.context.getSymbols(foundInProgram), classDeclaration.getSourceFile());
        code.addDeclaration(similarClass.declaration);
        result.addSnippet(code, this.location, undefined);
    }
}
class ClassContextProvider extends contextProvider_1.ContextProvider {
    static create(declaration, tokenInfo) {
        if (declaration.members === undefined || declaration.members.length === 0) {
            return new WholeClassContextProvider(declaration, tokenInfo);
        }
        else {
            return new ClassContextProvider(declaration, tokenInfo);
        }
    }
    constructor(classDeclaration, _tokenInfo) {
        super();
        this.classDeclaration = classDeclaration;
    }
    provide(result, session, languageService, context, token) {
        token.throwIfCancellationRequested();
        result.addPrimary(new SuperClassRunnable(session, languageService, context, this.classDeclaration));
    }
}
exports.ClassContextProvider = ClassContextProvider;
class WholeClassContextProvider extends contextProvider_1.ContextProvider {
    constructor(classDeclaration, _tokenInfo) {
        super();
        this.classDeclaration = classDeclaration;
    }
    provide(result, session, languageService, context, token) {
        token.throwIfCancellationRequested();
        result.addPrimary(new SuperClassRunnable(session, languageService, context, this.classDeclaration));
        if (session.enableBlueprintSearch()) {
            result.addPrimary(new SimilarClassRunnable(session, languageService, context, this.classDeclaration));
        }
    }
}
exports.WholeClassContextProvider = WholeClassContextProvider;
//# sourceMappingURL=classContextProvider.js.map