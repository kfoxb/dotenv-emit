import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser/lexer.js';
import { expandDocument } from '../../src/transformer/expand.js';
import { CircularReferenceError } from '../../src/utils/errors.js';

describe('expandDocument()', () => {
  it('expands ${VAR} references', () => {
    const doc = parse('BASE=https://example.com\nAPI=${BASE}/api');
    const expanded = expandDocument(doc);
    const map = Object.fromEntries(
      expanded.nodes.filter((n) => n.type === 'assignment').map((n) => [n.key, n.value]),
    );
    expect(map['API']).toBe('https://example.com/api');
  });

  it('expands chained references', () => {
    const doc = parse('A=hello\nB=${A} world\nC=${B}!');
    const expanded = expandDocument(doc);
    const map = Object.fromEntries(
      expanded.nodes.filter((n) => n.type === 'assignment').map((n) => [n.key, n.value]),
    );
    expect(map['C']).toBe('hello world!');
  });

  it('passes through unresolvable references by default', () => {
    const doc = parse('KEY=${UNDEFINED_VAR}');
    const expanded = expandDocument(doc);
    const node = expanded.nodes.find((n) => n.type === 'assignment');
    expect(node?.value).toBe('${UNDEFINED_VAR}');
  });

  it('replaces unresolvable references with empty when unresolved=empty', () => {
    const doc = parse('KEY=${UNDEFINED_VAR}');
    const expanded = expandDocument(doc, { unresolved: 'empty' });
    const node = expanded.nodes.find((n) => n.type === 'assignment');
    expect(node?.value).toBe('');
  });

  it('throws CircularReferenceError for circular references', () => {
    const doc = parse('A=${B}\nB=${A}');
    expect(() => expandDocument(doc)).toThrow(CircularReferenceError);
  });

  it('expands bare $VAR syntax', () => {
    const doc = parse('HOST=localhost\nURL=http://$HOST/path');
    const expanded = expandDocument(doc);
    const node = expanded.nodes.filter((n) => n.type === 'assignment').find((n) => n.key === 'URL');
    expect(node?.value).toBe('http://localhost/path');
  });

  it('does not mutate original document', () => {
    const doc = parse('BASE=hello\nDERIVED=${BASE}');
    expandDocument(doc);
    const node = doc.nodes.filter((n) => n.type === 'assignment').find((n) => n.key === 'DERIVED');
    expect(node?.value).toBe('${BASE}');
  });
});
