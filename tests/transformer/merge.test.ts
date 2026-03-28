import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser/lexer.js';
import { mergeDocuments } from '../../src/transformer/merge.js';

describe('mergeDocuments()', () => {
  it('returns empty document for empty array', () => {
    const doc = mergeDocuments([]);
    expect(doc.nodes).toHaveLength(0);
  });

  it('returns single document unchanged', () => {
    const doc = parse('KEY=value');
    const merged = mergeDocuments([doc]);
    expect(merged).toBe(doc);
  });

  it('merges two documents with last strategy (default)', () => {
    const doc1 = parse('KEY=first\nONLY_IN_FIRST=yes');
    const doc2 = parse('KEY=second\nONLY_IN_SECOND=yes');
    const merged = mergeDocuments([doc1, doc2]);
    const map = Object.fromEntries(
      merged.nodes.filter((n) => n.type === 'assignment').map((n) => [n.key, n.value]),
    );
    expect(map['KEY']).toBe('second');
    expect(map['ONLY_IN_FIRST']).toBe('yes');
    expect(map['ONLY_IN_SECOND']).toBe('yes');
  });

  it('merges with first strategy: first file wins', () => {
    const doc1 = parse('KEY=first');
    const doc2 = parse('KEY=second');
    const merged = mergeDocuments([doc1, doc2], { strategy: 'first' });
    const node = merged.nodes.find((n) => n.type === 'assignment');
    expect(node?.value).toBe('first');
  });

  it('throws with error strategy on duplicate keys', () => {
    const doc1 = parse('KEY=first');
    const doc2 = parse('KEY=second');
    expect(() => mergeDocuments([doc1, doc2], { strategy: 'error' })).toThrow('Duplicate key');
  });

  it('does not throw with error strategy when no duplicates', () => {
    const doc1 = parse('KEY1=first');
    const doc2 = parse('KEY2=second');
    expect(() => mergeDocuments([doc1, doc2], { strategy: 'error' })).not.toThrow();
  });
});
