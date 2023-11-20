import {
  createConnection,
  Diagnostic,
  DiagnosticSeverity,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  InitializeResult,
} from 'vscode-languageserver/node';

import { TinyDocument } from './TinyDocument';

import { TextDocument } from 'vscode-languageserver-textdocument';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
// const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
const parsedDocuments = new Map<string, TinyDocument>();

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities;

  // Does the client support the `workspace/configuration` request?
  // If not, we fall back using global settings.
  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );
  hasDiagnosticRelatedInformationCapability = !!(
    capabilities.textDocument &&
    capabilities.textDocument.publishDiagnostics &&
    capabilities.textDocument.publishDiagnostics.relatedInformation
  );

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // Tell the client that this server supports code completion.
      completionProvider: {
        resolveProvider: true,
      },
    },
  };
  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true,
      },
    };
  }
  return result;
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    // Register for all configuration changes.
    connection.client.register(
      DidChangeConfigurationNotification.type,
      undefined
    );
  }
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders((_event) => {
      connection.console.log('Workspace folder change event received.');
    });
  }
});

// The example settings
interface ExampleSettings {
  maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
let globalSettings: ExampleSettings = defaultSettings;

// Cache the settings of all open documents
const documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

connection.onDidChangeConfiguration((change) => {
  if (hasConfigurationCapability) {
    // Reset all cached document settings
    documentSettings.clear();
  } else {
    globalSettings = <ExampleSettings>(
      (change.settings.languageServerExample || defaultSettings)
    );
  }

  // Revalidate all open text documents
  // documents.all().forEach(validateTextDocument);
  // Todo: revalidate all docs
});

function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
  if (!hasConfigurationCapability) {
    return Promise.resolve(globalSettings);
  }
  let result = documentSettings.get(resource);
  if (!result) {
    result = connection.workspace.getConfiguration({
      scopeUri: resource,
      section: 'languageServerExample',
    });
    documentSettings.set(resource, result);
  }
  return result;
}

// Only keep settings for open documents
// documents.onDidClose((e) => {
//   documentSettings.delete(e.document.uri);
//   parsedDocuments.delete(e.document.uri);
// });

connection.onDidCloseTextDocument((e) => {
  parsedDocuments.delete(e.textDocument.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
// documents.onDidChangeContent((change) => {
//   validateTextDocument(change.document);
// });

connection.onDidChangeTextDocument((change) => {
  if (parsedDocuments.get(change.textDocument.uri)) {
    const doc = parsedDocuments.get(change.textDocument.uri)!;
    for (const delta of change.contentChanges) {
      doc.applyEdit(change.textDocument.version, delta);
    }
    doc.sync();
    validateTextDocument(doc);
  }
});

async function validateTextDocument(textDocument: TinyDocument): Promise<void> {
  connection.console.info('Validating tiny document ' + textDocument.uri);
  if (!parsedDocuments.get(textDocument.uri)) {
    parsedDocuments.set(textDocument.uri, textDocument);
  }
  const tiny = parsedDocuments.get(textDocument.uri)!;
  const diagnostics: Diagnostic[] = [];
  for (const entry of tiny.tinyDoc.ctx.getErrors()) {
    const diagnostic: Diagnostic = {
      severity: DiagnosticSeverity.Error,
      range: {
        start: tiny.positionAt(entry.span.start),
        end: tiny.positionAt(entry.span.end),
      },
      message: entry.message ?? '',
      source: 'tiny lsp',
    };
    connection.console.log(entry.message ?? 'Empty diagnostic');
    diagnostics.push(diagnostic);
  }

  // Send the computed diagnostics to VSCode.
  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onDidChangeWatchedFiles((_change) => {
  // Monitored files have change in VSCode
  connection.console.log('We received an file change event');
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
  (textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
    const text = textDocumentPosition.textDocument;
    if (!parsedDocuments.get(text.uri)) return [];

    const current = parsedDocuments.get(text.uri);
    // The pass parameter contains the position of the text document in
    // which code complete got requested. For the example we ignore this
    // info and always provide the same completion items.
    return [
      {
        label: 'TypeScript',
        kind: CompletionItemKind.Function,
        data: 1,
      },
      {
        label: 'JavaScript',
        kind: CompletionItemKind.Text,
        data: 2,
      },
    ];
  }
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
  if (item.data === 1) {
    item.detail = 'TypeScript details';
    item.documentation = 'TypeScript documentation';
  } else if (item.data === 2) {
    item.detail = 'JavaScript details';
    item.documentation = 'JavaScript documentation';
  }
  return item;
});

// Make the text document manager listen on the connection
// for open, change and close text document events
// documents.listen(connection);

connection.onDidOpenTextDocument(({ textDocument }) => {
  const { uri, text: content, languageId, version } = textDocument;
  connection.console.info('Opened text document: ' + uri);
  const text = TextDocument.create(uri, languageId, version, content);
  parsedDocuments.set(uri, new TinyDocument(textDocument, uri));
  connection.console.info(`Successfully parsed ${uri}`);
});

// Listen on the connection
connection.listen();
