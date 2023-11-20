import { TextDocument } from 'vscode-languageserver-textdocument';
import { TinyDocument as Td } from '@tiny/compiler';
import {
  Range,
  Position,
  TextDocumentContentChangeEvent,
  TextDocumentItem,
  URI,
} from 'vscode-languageserver';

export class TinyDocument {
  #document: TextDocument;
  #uri: URI;
  #filepath: string;
  tinyDoc: Td;

  constructor(doc: TextDocumentItem, filepath: string) {
    const { uri, languageId, version, text } = doc;
    this.#document = TextDocument.create(uri, languageId, version, text);
    this.#uri = uri;
    this.#filepath = filepath;
    this.tinyDoc = new Td(text, uri);
  }

  get uri(): URI {
    return this.#uri;
  }

  get filepath(): string {
    return this.#filepath;
  }

  get languageId(): string {
    return this.#document.languageId;
  }

  get version(): number {
    return this.#document.version;
  }

  getText(range?: Range): string {
    return this.#document.getText(range);
  }

  positionAt(offset: number): Position {
    return this.#document.positionAt(offset);
  }

  offsetAt(position: Position): number {
    return this.#document.offsetAt(position);
  }

  get lineCount(): number {
    return this.#document.lineCount;
  }

  getLine(line: number): string {
    const lineRange = this.getLineRange(line);
    return this.getText(lineRange);
  }
  getLineRange(line: number): Range {
    const lineStart = this.getLineStart(line);
    const lineEnd = this.getLineEnd(line);
    return Range.create(lineStart, lineEnd);
  }

  getLineEnd(line: number): Position {
    const nextLine = line + 1;
    const nextLineOffset = this.getLineOffset(nextLine);
    // If next line doesn't exist then the offset is at the line end already.
    return this.positionAt(
      nextLine < this.#document.lineCount ? nextLineOffset - 1 : nextLineOffset
    );
  }

  getLineOffset(line: number): number {
    const lineStart = this.getLineStart(line);
    return this.offsetAt(lineStart);
  }

  getLineStart(line: number): Position {
    return Position.create(line, 0);
  }

  getFullRange(): Range {
    return Range.create(
      Position.create(0, 0),
      this.getLineEnd(Math.max(this.lineCount - 1, 0))
    );
  }

  applyEdit(version: number, change: TextDocumentContentChangeEvent): void {
    const content = this.getText();
    let newContent = change.text;
    if (TextDocumentContentChangeEvent.isIncremental(change)) {
      const start = this.offsetAt(change.range.start);
      const end = this.offsetAt(change.range.end);
      newContent =
        content.substring(0, start) + change.text + content.substring(end);
    }
    this.#document = TextDocument.create(
      this.#uri.toString(),
      this.languageId,
      version,
      newContent
    );
  }

  sync() {
    this.tinyDoc = new Td(this.#document.getText(), this.#uri);
  }
}
