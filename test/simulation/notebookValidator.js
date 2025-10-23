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
exports.KernelProvider = exports.KernelProcess = exports.executeRequest = exports.isMessageType = exports.Connection = exports.EventEmitter = exports.promiseMap = void 0;
exports.getZeroMQ = getZeroMQ;
exports.convertExecutionReplies = convertExecutionReplies;
exports.isValidNotebookCell = isValidNotebookCell;
exports.doIsValidNotebookCell = doIsValidNotebookCell;
exports.launchKernel = launchKernel;
exports.executeNotebookCells = executeNotebookCells;
exports.generateCodeToFetchVariables = generateCodeToFetchVariables;
exports.notebookCellInputFuzzyMatches = notebookCellInputFuzzyMatches;
exports.notebookCellOutputFuzzyMatches = notebookCellOutputFuzzyMatches;
const wireProtocol = __importStar(require("@nteract/messaging/lib/wire-protocol"));
const child_process_1 = require("child_process");
const crypto = __importStar(require("crypto"));
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const os_1 = require("os");
const path_1 = require("path");
const crypto_2 = require("../../src/util/common/crypto");
const notebookDocument_1 = require("../../src/util/common/test/shims/notebookDocument");
const ports_1 = require("../../src/util/vs/base/node/ports");
const salts_1 = require("../base/salts");
const simulationContext_1 = require("../base/simulationContext");
const cacheSalt_1 = require("../cacheSalt");
const python_1 = require("./diagnosticProviders/python");
const promiseMap = async (obj) => {
    const out = {};
    await Promise.all(Object.keys(obj).map(async (key) => (out[key] = await obj[key])));
    return out;
};
exports.promiseMap = promiseMap;
class EventEmitter {
    constructor() {
        this.listeners = new Map();
    }
    on(event, listener) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        const listeners = this.listeners.get(event);
        listeners?.push(listener);
    }
    off(event, listener) {
        const listeners = this.listeners.get(event);
        if (!listeners) {
            return;
        }
        const index = listeners.indexOf(listener);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    }
    emit(event, ...args) {
        const listeners = this.listeners.get(event);
        if (!listeners) {
            return;
        }
        listeners.forEach(listener => {
            listener(...args);
        });
    }
}
exports.EventEmitter = EventEmitter;
const fromRawMessage = (channel, rawMessage) => {
    return {
        ...rawMessage,
        channel,
        buffers: rawMessage.buffers ? Buffer.concat(rawMessage.buffers) : undefined,
    };
};
const toRawMessage = (rawMessage) => {
    return {
        ...rawMessage,
        header: rawMessage.header,
        parent_header: rawMessage.parent_header,
        buffers: rawMessage.buffers ? rawMessage.buffers.map(buf => buf instanceof ArrayBuffer ? Buffer.from(buf) : Buffer.from(buf.buffer)) : [],
        idents: [],
    };
};
function getZeroMQ() {
    try {
        const zmq = require(`${'zeromq'}`);
        return zmq;
    }
    catch (e) {
        throw e;
    }
}
const portPool = new Set();
let lastUsedPort = 3000;
async function createSocket(socket) {
    const port = await findFreePortFasterWithQueue();
    socket.connect(`tcp://127.0.0.1:${port}`);
    return { port, socket };
}
const portQueue = [];
async function findFreePortFasterWithQueue() {
    return new Promise((resolve, reject) => {
        portQueue.push({ resolve, reject });
        if (portQueue.length === 1) {
            processPortQueue();
        }
    });
}
async function processPortQueue() {
    while (portQueue.length > 0) {
        const { resolve, reject } = portQueue.shift();
        try {
            const startPort = lastUsedPort + 1;
            portPool.add(startPort);
            let port = await (0, ports_1.findFreePortFaster)(startPort, 10000, 3000);
            while (portPool.has(port)) {
                port = await (0, ports_1.findFreePortFaster)(port + 1, 10000, 3000);
            }
            portPool.add(port);
            lastUsedPort = port;
            resolve(port);
        }
        catch (error) {
            reject(error);
        }
    }
}
class Connection {
    static async create() {
        const zmq = getZeroMQ();
        const routingId = crypto.randomBytes(8).toString('hex');
        const sockets = await (0, exports.promiseMap)({
            key: crypto.randomBytes(32).toString('hex'),
            signatureScheme: 'hmac-sha256',
            control: createSocket(new zmq.Dealer({ routingId })),
            heartbeat: createSocket(new zmq.Push()),
            iopub: createSocket(new zmq.Subscriber()),
            shell: createSocket(new zmq.Dealer({ routingId })),
            stdin: createSocket(new zmq.Dealer({ routingId })),
        });
        sockets.iopub.socket.subscribe();
        const cnx = new Connection(sockets, await createConnectionFile(sockets));
        cnx.processSocketMessages('control', sockets.control.socket);
        cnx.processSocketMessages('iopub', sockets.iopub.socket);
        cnx.processSocketMessages('shell', sockets.shell.socket);
        cnx.processSocketMessages('stdin', sockets.stdin.socket);
        return cnx;
    }
    constructor(sockets, connectionFile) {
        this.sockets = sockets;
        this.connectionFile = connectionFile;
        this.messages = [];
        this._messageEventEmitter = new EventEmitter();
    }
    async processSocketMessages(channel, socket) {
        for await (const msg of socket) {
            const message = wireProtocol.decode(msg, this.sockets.key, this.sockets.signatureScheme);
            const m = fromRawMessage(channel, message);
            this.messages.push(m);
            this._messageEventEmitter.emit('message', m);
        }
    }
    sendAndReceive(message) {
        return new Promise((resolve, reject) => {
            const replyMessages = [];
            const messageListener = (msg) => {
                if (msg.parent_header?.msg_id === message.header.msg_id) {
                    replyMessages.push(msg);
                    if (msg.header.msg_type === 'execute_reply') {
                        resolve(replyMessages);
                    }
                }
            };
            this._messageEventEmitter.on('message', messageListener);
            const data = wireProtocol.encode(toRawMessage(message), this.sockets.key, this.sockets.signatureScheme);
            this.sockets[message.channel].socket.send(data);
        });
    }
    sendRaw(message) {
        const data = wireProtocol.encode(toRawMessage(message), this.sockets.key, this.sockets.signatureScheme);
        return this.sockets[message.channel].socket.send(data);
    }
    dispose() {
        this.sockets.control.socket.close();
        this.sockets.heartbeat.socket.close();
        this.sockets.iopub.socket.close();
        this.sockets.shell.socket.close();
        this.sockets.stdin.socket.close();
        portPool.delete(this.sockets.control.port);
        portPool.delete(this.sockets.heartbeat.port);
        portPool.delete(this.sockets.iopub.port);
        portPool.delete(this.sockets.shell.port);
        portPool.delete(this.sockets.stdin.port);
        fs_1.promises.unlink(this.connectionFile).catch(() => {
            /* it's a temp file, just ignore */
        });
    }
}
exports.Connection = Connection;
async function createConnectionFile(sockets, host = '127.0.0.1') {
    const contents = JSON.stringify({
        control_port: sockets.control.port,
        shell_port: sockets.shell.port,
        hb_port: sockets.heartbeat.port,
        stdin_port: sockets.stdin.port,
        iopub_port: sockets.iopub.port,
        transport: 'tcp',
        ip: host,
        signature_scheme: sockets.signatureScheme,
        key: sockets.key,
    });
    const fname = (0, path_1.join)((0, os_1.tmpdir)(), `notebook-cnf-${crypto.randomBytes(8).toString('hex')}.json`);
    await fs_1.promises.writeFile(fname, contents);
    return fname;
}
/**
 * Type guard for Jupyter messages. Simply checking msg.header.msg_type
 * is not good enough for TS discriminate between types, for some reason.
 */
const isMessageType = (messageType, test) => test.header.msg_type === messageType;
exports.isMessageType = isMessageType;
//#region factories
const createHeader = (messageType) => ({
    msg_id: (0, crypto_1.randomBytes)(8).toString('hex'),
    date: new Date().toISOString(),
    version: '5.2',
    msg_type: messageType,
    username: 'vscode',
    session: (0, crypto_1.randomBytes)(8).toString('hex'),
});
const executeRequest = (code, options = {}) => ({
    channel: 'shell',
    header: createHeader('execute_request'),
    metadata: {},
    parent_header: {},
    content: {
        code,
        silent: options.silent ?? false,
        store_history: options.storeHistory ?? true,
        user_expressions: options.userExpressions ?? {},
        allow_stdin: options.allowStdin ?? true,
        stop_on_error: options.stopOnError ?? false,
    },
    buffers: [new Uint8Array()],
});
exports.executeRequest = executeRequest;
function convertExecutionReplies(messages) {
    const outputs = [];
    messages.forEach(message => {
        if (message.header.msg_type === 'execute_result') {
            outputs.push((0, notebookDocument_1.translateDisplayDataOutput)(message.content));
        }
        else if (message.header.msg_type === 'stream') {
            outputs.push((0, notebookDocument_1.translateStreamOutput)(message.content));
        }
        else if (message.header.msg_type === 'error') {
            outputs.push((0, notebookDocument_1.translateErrorOutput)(message.content));
        }
        else if (message.header.msg_type === 'display_data') {
            outputs.push((0, notebookDocument_1.translateDisplayDataOutput)(message.content));
        }
    });
    return outputs;
}
class KernelProcess {
    constructor(_cp) {
        this._cp = _cp;
        this._stdout = [];
        this._stderr = [];
        this._exit = [];
        _cp.stderr.on('data', (data) => this._stderr.push(data));
        _cp.stdout.on('data', (data) => this._stdout.push(data));
        _cp.on('error', (err) => {
            if (err) {
                this._exit.push(err);
            }
        });
        _cp.on('exit', code => {
            if (code !== undefined) {
                this._exit.push(new Error(`Kernel exited with code ${code}`));
            }
        });
    }
    print() {
        console.log('stdout', this._stdout.join(''));
        console.log('stderr', this._stderr.join(''));
        console.log('exit', this._exit);
    }
    dispose() {
        // shutdown cp
        this._cp.kill('SIGKILL');
    }
}
exports.KernelProcess = KernelProcess;
class KernelProvider {
    async launchKernel(spec, env, cwd) {
        const connection = await Connection.create();
        const p = new KernelProcess((0, child_process_1.spawn)(spec.binary, spec.argv.map(arg => arg.replace('{connection_file}', connection.connectionFile)), { stdio: 'pipe', env: env, cwd: cwd }));
        return {
            connection,
            process: p,
            dispose: () => {
                connection.dispose();
                p.dispose();
            },
        };
    }
    async resolveKernelVariables(kernel) {
        const script = generateCodeToFetchVariables();
        const replies = await kernel.connection.sendAndReceive((0, exports.executeRequest)(script));
        const stdout = (replies.find(reply => (0, exports.isMessageType)('stream', reply)));
        if (!stdout) {
            return;
        }
        try {
            const variables = JSON.parse(stdout.content.text);
            return variables.map((v) => ({
                variable: {
                    name: v.name,
                    value: v.value,
                    type: v.type
                },
                hasNamedChildren: false,
                indexedChildrenCount: 0
            }));
        }
        catch {
            // ignore
            return [];
        }
    }
}
exports.KernelProvider = KernelProvider;
//#endregion
async function isValidNotebookCell(accessor, text) {
    const cacheKey = await (0, crypto_2.createSha256Hash)(`notebook-cell-v${cacheSalt_1.NOTEBOOK_CELL_VALID_CACHE_SALT}-${text}`);
    return accessor.get(simulationContext_1.ICachingResourceFetcher).invokeWithCache(simulationContext_1.CacheScope.Notebook, text, salts_1.TestingCacheSalts.notebookCacheSalt, cacheKey, doIsValidNotebookCell);
}
async function doIsValidNotebookCell(text) {
    const provider = new KernelProvider();
    const virtualEnvironment = (0, python_1.ensurePythonVEnv)();
    if (!virtualEnvironment) {
        return false;
    }
    const kernel = await launchKernel(provider, virtualEnvironment, undefined, undefined);
    if (!kernel) {
        return false;
    }
    const replies = await kernel.connection.sendAndReceive((0, exports.executeRequest)(text));
    const executionStatus = replies.reverse().find(reply => (0, exports.isMessageType)('execute_reply', reply));
    const executionSucceed = executionStatus?.content.status === 'ok';
    kernel.dispose();
    return executionSucceed;
}
async function launchKernel(provider, virtualEnvironment, cwd, timeout) {
    const doLaunchKernel = async () => {
        const kernel = await provider.launchKernel({
            binary: virtualEnvironment.pythonInterpreter,
            argv: ['-m', 'ipykernel_launcher', '-f', '{connection_file}'],
            displayName: 'Python 3 (ipykernel)',
            language: 'python'
        }, virtualEnvironment.env, cwd);
        return kernel;
    };
    if (timeout) {
        const kernel = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject('launch kernel timeout');
            }, 5000);
            doLaunchKernel()
                .then((kernel) => {
                clearTimeout(timeout);
                resolve(kernel);
            })
                .catch((error) => {
                clearTimeout(timeout);
                reject(error);
            });
        });
        return kernel;
    }
    else {
        return doLaunchKernel();
    }
}
async function executeNotebookCells(notebook, kernel, range, notebookData) {
    const cells = notebook.getCells(range);
    for (const cell of cells) {
        if (cell.kind === 2) {
            const text = cell.document.getText();
            try {
                const replies = await kernel.connection.sendAndReceive((0, exports.executeRequest)(text));
                notebookData?.appendCellOutput(cell.index, convertExecutionReplies(replies));
                // check if replies contain error
                const errorReply = replies.find(reply => reply.header.msg_type === 'error');
                if (errorReply) {
                    return undefined;
                }
            }
            catch (error) {
                console.error(`Failed to execute cell ${cell.index}: ${error}`);
                return undefined;
            }
        }
    }
    const code = cells.map(cell => cell.document.getText()).join('\n');
    const replies = await kernel.connection.sendAndReceive((0, exports.executeRequest)(code));
    return replies;
}
function generateCodeToFetchVariables() {
    const script = `def _VSCODE_getVariable(what_to_get, is_debugging, *args):
    # Query Jupyter server for the info about a dataframe
    import json as _VSCODE_json
    import builtins as _VSCODE_builtins
    from collections import namedtuple as _VSCODE_namedtuple
    import importlib.util as _VSCODE_importlib_util

    maxStringLength = 1000
    collectionTypes = ["list", "tuple", "set"]

    def truncateString(variable):
        string = _VSCODE_builtins.repr(variable)
        if _VSCODE_builtins.len(string) > maxStringLength:
            sizeInfo = (
                "\\n\\nLength: " + str(_VSCODE_builtins.len(variable))
                if _VSCODE_builtins.type(variable) == _VSCODE_builtins.str
                else ""
            )
            return string[: maxStringLength - 1] + "..." + sizeInfo
        else:
            return string

    DisplayOptions = _VSCODE_namedtuple("DisplayOptions", ["width", "max_columns"])

    def set_pandas_display_options(display_options=None):
        if _VSCODE_importlib_util.find_spec("pandas") is not None:
            try:
                import pandas as _VSCODE_PD

                original_display = DisplayOptions(
                    width=_VSCODE_PD.options.display.width,
                    max_columns=_VSCODE_PD.options.display.max_columns,
                )

                if display_options:
                    _VSCODE_PD.options.display.max_columns = display_options.max_columns
                    _VSCODE_PD.options.display.width = display_options.width
                else:
                    _VSCODE_PD.options.display.max_columns = 100
                    _VSCODE_PD.options.display.width = 1000

                return original_display
            except ImportError:
                pass
            finally:
                del _VSCODE_PD

    def getValue(variable):
        original_display = None
        if (
            _VSCODE_builtins.type(variable).__name__ == "DataFrame"
            and _VSCODE_importlib_util.find_spec("pandas") is not None
        ):
            original_display = set_pandas_display_options()

        try:
            return truncateString(variable=variable)
        finally:
            if original_display:
                set_pandas_display_options(original_display)

    def getFullType(varType):
        module = ""
        if (
            _VSCODE_builtins.hasattr(varType, "__module__")
            and varType.__module__ != "builtins"
        ):
            module = varType.__module__ + "."
        if _VSCODE_builtins.hasattr(varType, "__qualname__"):
            return module + varType.__qualname__
        elif _VSCODE_builtins.hasattr(varType, "__name__"):
            return module + varType.__name__

    def getVariableDescription(variable):
        result = {}

        varType = _VSCODE_builtins.type(variable)
        result["type"] = getFullType(varType)
        if hasattr(varType, "__mro__"):
            result["interfaces"] = [getFullType(t) for t in varType.__mro__]

        if (
            _VSCODE_builtins.hasattr(variable, "__len__")
            and result["type"] in collectionTypes
        ):
            result["count"] = _VSCODE_builtins.len(variable)

        result["hasNamedChildren"] = (
            _VSCODE_builtins.hasattr(variable, "__dict__")
            or _VSCODE_builtins.type(variable) == dict
        )

        result["value"] = getValue(variable)
        return result

    ### Get info on variables at the root level
    def _VSCODE_getVariableDescriptions(varNames):
        variables = [
            {
                "name": varName,
                **getVariableDescription(globals()[varName]),
                "root": varName,
                "propertyChain": [],
                "language": "python",
            }
            for varName in varNames
            if varName in globals()
        ]

        if is_debugging:
            return _VSCODE_json.dumps(variables)
        else:
            return _VSCODE_builtins.print(_VSCODE_json.dumps(variables))

    def _VSCODE_getVariableTypes(varnames):
        # Map with key: varname and value: vartype
        result = {}
        for name in varnames:
            try:
                vartype = _VSCODE_builtins.type(globals()[name])
                if _VSCODE_builtins.hasattr(vartype, "__name__"):
                    result[name] = vartype.__name__
            except _VSCODE_builtins.TypeError:
                pass
        if is_debugging:
            return _VSCODE_json.dumps(result)
        else:
            return _VSCODE_builtins.print(_VSCODE_json.dumps(result))

    def _VSCODE_getVariableSummary(variable):
        if variable is None:
            return None
        # check if the variable is a dataframe
        if (
            _VSCODE_builtins.type(variable).__name__ == "DataFrame"
            and _VSCODE_importlib_util.find_spec("pandas") is not None
        ):
            return _VSCODE_builtins.print(variable.info())

        return None

    try:
        if what_to_get == "AllVariableDescriptions":
            return _VSCODE_getVariableDescriptions(*args)
        elif what_to_get == "summary":
            return _VSCODE_getVariableSummary(*args)
        else:
            return _VSCODE_getVariableTypes(*args)
    finally:
        del _VSCODE_json
        del _VSCODE_builtins
        del _VSCODE_namedtuple
        del _VSCODE_importlib_util
`;
    const scriptCode = script + '\n\nvariables= %who_ls\n_VSCODE_getVariable("AllVariableDescriptions", False, variables)';
    return scriptCode;
}
function notebookCellInputFuzzyMatches(cell, actual) {
    const expected = cell.document.getText();
    if (actual === expected || actual.includes(expected) || expected.includes(actual)) {
        return true;
    }
    if (cell.metadata.tags && Array.isArray(cell.metadata.tags)) {
        const inputMatchingTags = cell.metadata.tags.filter(tag => tag.startsWith('input.includes:'));
        const includeMatched = inputMatchingTags.find(tag => actual.includes(tag.split('input.includes:')[1].trim()));
        if (includeMatched) {
            return true;
        }
        const inputAnyOfTags = cell.metadata.tags.filter(tag => tag.startsWith('input.anyOf'));
        const anyOfMatched = inputAnyOfTags.find(tag => {
            // tag: input.anyOf:["a","b"]
            const expectedOutputs = tag.split('input.anyOf:')[1].replace(/[\[\]\"\\]/g, '').split(',');
            return expectedOutputs.some(expectedOutput => actual.includes(expectedOutput.trim()));
        });
        if (anyOfMatched) {
            return true;
        }
    }
    return false;
}
function notebookCellOutputFuzzyMatches(cell, actualOutput) {
    if (cell.metadata.tags && Array.isArray(cell.metadata.tags)) {
        const outputIncludesTag = cell.metadata.tags.filter(tag => tag.startsWith('output.includes'));
        const includeMatched = outputIncludesTag.find(tag => actualOutput.includes(tag.split('output.includes:')[1].trim()));
        if (includeMatched) {
            return true;
        }
    }
    const expectedOutputItem = cell.outputs[0].items.find(item => item.mime === 'text/plain' || item.mime === 'application/vnd.code.notebook.stdout')?.data;
    const decoder = new TextDecoder('utf-8');
    const expectedOutput = (expectedOutputItem ? decoder.decode(expectedOutputItem) : '').trim();
    if (expectedOutput !== '' && actualOutput !== '' && actualOutput === expectedOutput || actualOutput.includes(expectedOutput) || expectedOutput.includes(actualOutput)) {
        return true;
    }
}
//# sourceMappingURL=notebookValidator.js.map