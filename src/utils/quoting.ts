import type { QuoteStyle } from '../parser/types.js';

/**
 * Unquote a raw value string based on the detected quote style.
 * For double-quoted strings, processes escape sequences.
 */
export function unquoteValue(raw: string, style: QuoteStyle): string {
  if (style === 'none') {
    return raw;
  }

  if (style === 'single') {
    // Single-quoted: no escape processing, content is literal
    return raw;
  }

  if (style === 'double' || style === 'backtick') {
    // Process escape sequences
    return raw
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\`/g, '`')
      .replace(/\\\\/g, '\\')
      .replace(/\\\$/g, '$');
  }

  return raw;
}

/**
 * Quote a value for output in the given style.
 * For 'none', only quotes if the value contains special characters.
 */
export function quoteValue(value: string, style: QuoteStyle): string {
  if (style === 'none') {
    return value;
  }

  if (style === 'single') {
    return value;
  }

  if (style === 'double' || style === 'backtick') {
    // Escape special characters
    return value
      .replace(/\\/g, '\\\\')
      .replace(/\$/g, '\\$')
      .replace(/"/g, '\\"')
      .replace(/`/g, '\\`')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }

  return value;
}

/**
 * Determine if a value needs quoting for safe shell use.
 */
export function needsShellQuoting(value: string): boolean {
  return /[\s"'\\$`!&#;|<>(){}]/.test(value) || value.length === 0;
}

/**
 * Produce a shell-safe double-quoted string for use in `export KEY="VALUE"`.
 */
export function shellQuote(value: string): string {
  const escaped = value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\$/g, '\\$')
    .replace(/`/g, '\\`');
  return `"${escaped}"`;
}
