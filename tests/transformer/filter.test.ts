import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser/lexer.js';
import { filterDocument } from '../../src/transformer/filter.js';

describe('filterDocument()', () => {
  const input = 'APP_NAME=myapp\nDB_HOST=localhost\nDB_PORT=5432\nAWS_KEY=secret';

  it('filters by explicit keys', () => {
    const doc = filterDocument(parse(input), { keys: ['APP_NAME', 'DB_HOST'] });
    const keys = doc.nodes.filter((n) => n.type === 'assignment').map((n) => n.key);
    expect(keys).toEqual(['APP_NAME', 'DB_HOST']);
  });

  it('filters by prefix', () => {
    const doc = filterDocument(parse(input), { prefix: 'DB_' });
    const keys = doc.nodes.filter((n) => n.type === 'assignment').map((n) => n.key);
    expect(keys).toEqual(['DB_HOST', 'DB_PORT']);
  });

  it('strips prefix when stripPrefix=true', () => {
    const doc = filterDocument(parse(input), { prefix: 'DB_', stripPrefix: true });
    const keys = doc.nodes.filter((n) => n.type === 'assignment').map((n) => n.key);
    expect(keys).toEqual(['HOST', 'PORT']);
  });

  it('filters by regex pattern', () => {
    const doc = filterDocument(parse(input), { pattern: '^DB_' });
    const keys = doc.nodes.filter((n) => n.type === 'assignment').map((n) => n.key);
    expect(keys).toEqual(['DB_HOST', 'DB_PORT']);
  });

  it('excludes specified keys', () => {
    const doc = filterDocument(parse(input), { exclude: ['AWS_KEY', 'DB_PORT'] });
    const keys = doc.nodes.filter((n) => n.type === 'assignment').map((n) => n.key);
    expect(keys).toEqual(['APP_NAME', 'DB_HOST']);
  });

  it('returns all nodes when no filter options given', () => {
    const doc = filterDocument(parse(input), {});
    const keys = doc.nodes.filter((n) => n.type === 'assignment').map((n) => n.key);
    expect(keys).toHaveLength(4);
  });

  it('preserves comments associated with kept keys', () => {
    const withComments = '# app\nAPP_NAME=myapp\n# db\nDB_HOST=localhost';
    const doc = filterDocument(parse(withComments), { prefix: 'DB_' });
    const comments = doc.nodes.filter((n) => n.type === 'comment');
    expect(comments).toHaveLength(1);
    expect(comments[0]?.text).toBe('# db');
  });
});
