import { ParseError } from '../utils/errors.js';
import { unquoteValue } from '../utils/quoting.js';
import type { AssignmentNode, BlankLineNode, CommentNode, DotenvDocument, Node, QuoteStyle } from './types.js';

const KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Parse a .env file string into a DotenvDocument.
 */
export function parse(input: string, filePath?: string): DotenvDocument {
  if (input === '') {
    return { nodes: [], filePath };
  }
  const rawLines = input.split(/\r?\n/);
  const nodes: Node[] = [];
  let i = 0;

  while (i < rawLines.length) {
    const rawLine = rawLines[i] ?? '';
    const lineNumber = i + 1;
    i++;

    const trimmed = rawLine.trim();

    // Blank line
    if (trimmed === '') {
      nodes.push({ type: 'blank' } satisfies BlankLineNode);
      continue;
    }

    // Comment line
    if (trimmed.startsWith('#')) {
      nodes.push({ type: 'comment', text: rawLine } satisfies CommentNode);
      continue;
    }

    // Assignment line
    const leadingWhitespace = rawLine.match(/^(\s*)/)?.[1] ?? '';
    let rest = trimmed;

    // Strip optional `export ` prefix
    let hasExport = false;
    if (rest.startsWith('export ')) {
      hasExport = true;
      rest = rest.slice(7).trimStart();
    }

    // Split on first `=`
    const eqIdx = rest.indexOf('=');
    if (eqIdx === -1) {
      // Line without `=` but not a comment or blank — could be a bare key
      // Treat as parse error
      throw new ParseError(`Missing '=' in assignment: ${JSON.stringify(rawLine)}`, filePath, lineNumber);
    }

    const key = rest.slice(0, eqIdx);
    if (!KEY_PATTERN.test(key)) {
      throw new ParseError(`Invalid key name: ${JSON.stringify(key)}`, filePath, lineNumber);
    }

    const rawValuePart = rest.slice(eqIdx + 1);

    // Detect quote style and extract raw value
    let quoteStyle: QuoteStyle = 'none';
    let rawValue: string;
    let inlineComment: string | null = null;

    if (rawValuePart.startsWith('"')) {
      quoteStyle = 'double';
      // Find closing quote, handling escaped quotes; may span multiple lines
      const result = parseDoubleQuoted(rawValuePart.slice(1), rawLines, i, filePath, lineNumber);
      rawValue = result.value;
      i += result.linesConsumed;
      inlineComment = result.inlineComment;
    } else if (rawValuePart.startsWith("'")) {
      quoteStyle = 'single';
      const result = parseSingleQuoted(rawValuePart.slice(1), filePath, lineNumber);
      rawValue = result.value;
      inlineComment = result.inlineComment;
    } else if (rawValuePart.startsWith('`')) {
      quoteStyle = 'backtick';
      const result = parseBacktickQuoted(rawValuePart.slice(1), filePath, lineNumber);
      rawValue = result.value;
      inlineComment = result.inlineComment;
    } else {
      // Unquoted: strip inline comment
      const commentIdx = findUnquotedCommentIdx(rawValuePart);
      if (commentIdx !== -1) {
        rawValue = rawValuePart.slice(0, commentIdx).trimEnd();
        inlineComment = rawValuePart.slice(commentIdx + 1).trim();
      } else {
        rawValue = rawValuePart;
        inlineComment = null;
      }
      // Trim trailing whitespace from unquoted value
      rawValue = rawValue.trimEnd();
    }

    const value = unquoteValue(rawValue, quoteStyle);

    nodes.push({
      type: 'assignment',
      export: hasExport,
      key,
      value,
      quoteStyle,
      inlineComment,
      leadingWhitespace,
    } satisfies AssignmentNode);
  }

  return { nodes, filePath };
}

/** Find the index of `#` that starts an inline comment in an unquoted value. */
function findUnquotedCommentIdx(s: string): number {
  // In unquoted values, `#` preceded by whitespace starts a comment
  // e.g. VALUE=foo # comment  → # is at index after "foo "
  // But VALUE=foo#bar → no comment (no whitespace before #)
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '#') {
      // Must be preceded by whitespace (or be at start)
      if (i === 0 || /\s/.test(s[i - 1] ?? '')) {
        return i;
      }
    }
  }
  return -1;
}

interface QuoteResult {
  value: string;
  inlineComment: string | null;
  linesConsumed: number;
}

function parseDoubleQuoted(
  afterOpenQuote: string,
  allLines: string[],
  nextLineIdx: number,
  filePath: string | undefined,
  startLine: number,
): QuoteResult {
  let buffer = '';
  let remaining = afterOpenQuote;
  let linesConsumed = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let closed = false;
    for (let i = 0; i < remaining.length; i++) {
      const ch = remaining[i] ?? '';
      if (ch === '\\') {
        // Escape sequence — keep backslash + next char in raw value for unquoteValue
        buffer += ch + (remaining[i + 1] ?? '');
        i++;
        continue;
      }
      if (ch === '"') {
        // Closing quote found
        const afterClose = remaining.slice(i + 1).trimStart();
        let inlineComment: string | null = null;
        if (afterClose.startsWith('#')) {
          inlineComment = afterClose.slice(1).trim();
        }
        return { value: buffer, inlineComment, linesConsumed };
      }
      buffer += ch;
    }

    if (!closed) {
      // Value continues onto the next line (literal newline in double-quoted value)
      if (nextLineIdx + linesConsumed >= allLines.length) {
        throw new ParseError('Unterminated double-quoted value', filePath, startLine);
      }
      buffer += '\n';
      remaining = allLines[nextLineIdx + linesConsumed] ?? '';
      linesConsumed++;
    }
  }
}

function parseSingleQuoted(
  afterOpenQuote: string,
  filePath: string | undefined,
  startLine: number,
): Omit<QuoteResult, 'linesConsumed'> {
  // Single-quoted: find closing `'`; no escape processing
  const closeIdx = afterOpenQuote.indexOf("'");
  if (closeIdx === -1) {
    throw new ParseError('Unterminated single-quoted value', filePath, startLine);
  }
  const value = afterOpenQuote.slice(0, closeIdx);
  const afterClose = afterOpenQuote.slice(closeIdx + 1).trimStart();
  let inlineComment: string | null = null;
  if (afterClose.startsWith('#')) {
    inlineComment = afterClose.slice(1).trim();
  }
  return { value, inlineComment };
}

function parseBacktickQuoted(
  afterOpenQuote: string,
  filePath: string | undefined,
  startLine: number,
): Omit<QuoteResult, 'linesConsumed'> {
  const closeIdx = afterOpenQuote.indexOf('`');
  if (closeIdx === -1) {
    throw new ParseError('Unterminated backtick-quoted value', filePath, startLine);
  }
  const rawValue = afterOpenQuote.slice(0, closeIdx);
  const afterClose = afterOpenQuote.slice(closeIdx + 1).trimStart();
  let inlineComment: string | null = null;
  if (afterClose.startsWith('#')) {
    inlineComment = afterClose.slice(1).trim();
  }
  return { value: rawValue, inlineComment };
}
