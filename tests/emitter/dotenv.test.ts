import { describe, expect, it } from 'vitest';
import { emitDotenv } from '../../src/emitter/dotenv.js';
import { parse } from '../../src/parser/lexer.js';

describe('emitDotenv()', () => {
  it('round-trips a simple file', () => {
    const input = 'APP_NAME=myapp\nPORT=3000';
    const doc = parse(input);
    const output = emitDotenv(doc);
    expect(output).toBe(input);
  });

  it('preserves comments and blank lines', () => {
    const input = '# comment\n\nKEY=value';
    const doc = parse(input);
    expect(emitDotenv(doc)).toBe(input);
  });

  it('strips comments when stripComments=true', () => {
    const input = '# comment\n\nKEY=value';
    const doc = parse(input);
    expect(emitDotenv(doc, { stripComments: true })).toBe('KEY=value');
  });

  it('forces double-quoting with quoteAll=true', () => {
    const input = 'KEY=hello';
    const doc = parse(input);
    expect(emitDotenv(doc, { quoteAll: true })).toBe('KEY="hello"');
  });

  it('adds export prefix with addExport=true', () => {
    const input = 'KEY=value';
    const doc = parse(input);
    expect(emitDotenv(doc, { addExport: true })).toBe('export KEY=value');
  });

  it('removes export prefix with removeExport=true', () => {
    const input = 'export KEY=value';
    const doc = parse(input);
    expect(emitDotenv(doc, { removeExport: true })).toBe('KEY=value');
  });

  it('sorts keys alphabetically with sortKeys=true', () => {
    const input = 'ZEBRA=z\nALPHA=a\nMIDDLE=m';
    const doc = parse(input);
    const output = emitDotenv(doc, { sortKeys: true });
    expect(output).toBe('ALPHA=a\nMIDDLE=m\nZEBRA=z');
  });

  it('preserves inline comments', () => {
    const input = 'PORT=3000 # default port';
    const doc = parse(input);
    expect(emitDotenv(doc)).toBe('PORT=3000 # default port');
  });

  it('properly escapes special chars when quoteAll=true', () => {
    const input = 'KEY=hello world';
    const doc = parse(input);
    expect(emitDotenv(doc, { quoteAll: true })).toBe('KEY="hello world"');
  });
});
