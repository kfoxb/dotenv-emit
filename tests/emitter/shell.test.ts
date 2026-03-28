import { describe, expect, it } from 'vitest';
import { emitShell } from '../../src/emitter/shell.js';
import { parse } from '../../src/parser/lexer.js';

describe('emitShell()', () => {
  it('emits export KEY="VALUE" lines', () => {
    const doc = parse('KEY=value\nOTHER=hello');
    const output = emitShell(doc);
    expect(output).toBe('export KEY="value"\nexport OTHER="hello"');
  });

  it('omits export prefix when addExport=false', () => {
    const doc = parse('KEY=value');
    const output = emitShell(doc, { addExport: false });
    expect(output).toBe('KEY="value"');
  });

  it('sorts keys with sortKeys=true', () => {
    const doc = parse('ZEBRA=z\nALPHA=a');
    const output = emitShell(doc, { sortKeys: true });
    expect(output).toBe('export ALPHA="a"\nexport ZEBRA="z"');
  });

  it('ignores comment and blank nodes', () => {
    const doc = parse('# comment\n\nKEY=value');
    const output = emitShell(doc);
    expect(output).toBe('export KEY="value"');
  });

  it('escapes double quotes in values', () => {
    const doc = parse('KEY=say "hello"');
    const output = emitShell(doc);
    expect(output).toBe('export KEY="say \\"hello\\""');
  });

  it('escapes dollar signs in values', () => {
    const doc = parse('KEY=costs $5');
    const output = emitShell(doc);
    expect(output).toBe('export KEY="costs \\$5"');
  });
});
