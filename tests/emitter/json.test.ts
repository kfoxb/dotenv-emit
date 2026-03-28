import { describe, expect, it } from 'vitest';
import { emitJson } from '../../src/emitter/json.js';
import { parse } from '../../src/parser/lexer.js';

describe('emitJson()', () => {
  it('emits a flat JSON object', () => {
    const doc = parse('KEY=value\nOTHER=123');
    const output = JSON.parse(emitJson(doc));
    expect(output).toEqual({ KEY: 'value', OTHER: '123' });
  });

  it('pretty-prints by default', () => {
    const doc = parse('KEY=value');
    const output = emitJson(doc);
    expect(output).toContain('\n');
    expect(output).toContain('  ');
  });

  it('emits compact JSON when pretty=false', () => {
    const doc = parse('KEY=value');
    const output = emitJson(doc, { pretty: false });
    expect(output).toBe('{"KEY":"value"}');
  });

  it('sorts keys with sortKeys=true', () => {
    const doc = parse('ZEBRA=z\nALPHA=a');
    const output = emitJson(doc, { sortKeys: true });
    const keys = Object.keys(JSON.parse(output));
    expect(keys).toEqual(['ALPHA', 'ZEBRA']);
  });

  it('omits empty values when omitEmpty=true', () => {
    const doc = parse('KEY=value\nEMPTY=');
    const output = JSON.parse(emitJson(doc, { omitEmpty: true }));
    expect(output).toEqual({ KEY: 'value' });
    expect('EMPTY' in output).toBe(false);
  });

  it('preserves all values including empty when omitEmpty not set', () => {
    const doc = parse('KEY=value\nEMPTY=');
    const output = JSON.parse(emitJson(doc));
    expect(output).toEqual({ KEY: 'value', EMPTY: '' });
  });

  it('ignores comment and blank nodes', () => {
    const doc = parse('# comment\n\nKEY=value');
    const output = JSON.parse(emitJson(doc));
    expect(output).toEqual({ KEY: 'value' });
  });
});
