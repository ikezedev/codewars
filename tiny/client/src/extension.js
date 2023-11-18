"use strict";
exports.__esModule = true;
exports.deactivate = exports.activate = void 0;
var path = require("path");
var vscode_1 = require("vscode");
var node_1 = require("vscode-languageclient/node");
var client;
function activate(context) {
    var serverModule = context.asAbsolutePath(path.join('server', 'out', 'server.js'));
    var serverOptions = {
        run: { module: serverModule, transport: node_1.TransportKind.ipc },
        debug: {
            module: serverModule,
            transport: node_1.TransportKind.ipc
        }
    };
    var clientOptions = {
        documentSelector: [{ scheme: 'file', language: 'tiny' }],
        synchronize: {
            fileEvents: vscode_1.workspace.createFileSystemWatcher('**/.tinyrc')
        }
    };
    client = new node_1.LanguageClient('TinyLsp', 'Tiny Language server', serverOptions, clientOptions);
    client.start();
}
exports.activate = activate;
function deactivate() {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
exports.deactivate = deactivate;
