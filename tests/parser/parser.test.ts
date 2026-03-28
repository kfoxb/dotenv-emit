import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser/lexer.js';
import { ParseError } from '../../src/utils/errors.js';

const fixturesDir = join(import.meta.dirname, '../fixtures');

function fixture(name: string): string {
  return readFileSync(join(fixturesDir, name), 'utf8');
}

describe('parse()', () => {
  it('returns empty document for empty input', () => {
    const doc = parse('');
    expect(doc.nodes).toHaveLength(0);
  });

  it('returns empty document for whitespace-only input', () => {
    const doc = parse('   \n  \n');
    expect(doc.nodes.every((n) => n.type === 'blank')).toBe(true);
  });

  it('parses simple assignments', () => {
    const doc = parse(fixture('simple.env'));
    const assignments = doc.nodes.filter((n) => n.type === 'assignment');
    expect(assignments).toHaveLength(4);
    expect(assignments[0]).toMatchObject({ key: 'APP_NAME', value: 'myapp', quoteStyle: 'none' });
    expect(assignments[1]).toMatchObject({ key: 'APP_ENV', value: 'production' });
    expect(assignments[2]).toMatchObject({ key: 'PORT', value: '3000' });
    expect(assignments[3]).toMatchObject({ key: 'DEBUG', value: 'false' });
  });

  it('parses quoted values', () => {
    const doc = parse(fixture('quoted.env'));
    const map = Object.fromEntries(
      doc.nodes
        .filter((n) => n.type === 'assignment')
        .map((n) => [n.key, n]),
    );

    expect(map['SINGLE_QUOTED']).toMatchObject({ value: 'hello world', quoteStyle: 'single' });
    expect(map['DOUBLE_QUOTED']).toMatchObject({ value: 'hello world', quoteStyle: 'double' });
    expect(map['BACKTICK_QUOTED']).toMatchObject({ value: 'hello world', quoteStyle: 'backtick' });
    expect(map['ESCAPED_DOUBLE']).toMatchObject({ value: 'it\'s a "test"', quoteStyle: 'double' });
    expect(map['WITH_NEWLINE']).toMatchObject({ value: 'line1\nline2', quoteStyle: 'double' });
    expect(map['WITH_DOLLAR']).toMatchObject({ value: 'cost is $5', quoteStyle: 'double' });
  });

  it('parses comment lines', () => {
    const doc = parse(fixture('comments.env'));
    const comments = doc.nodes.filter((n) => n.type === 'comment');
    expect(comments.length).toBeGreaterThan(0);
    expect(comments[0]).toMatchObject({ type: 'comment', text: '# Application settings' });
  });

  it('preserves inline comments', () => {
    const doc = parse(fixture('comments.env'));
    const assignments = doc.nodes.filter((n) => n.type === 'assignment');
    const dbPort = assignments.find((n) => n.key === 'DB_PORT');
    expect(dbPort).toBeDefined();
    expect(dbPort?.value).toBe('5432');
    expect(dbPort?.inlineComment).toBe('default postgres port');
  });

  it('parses blank lines as blank nodes', () => {
    const doc = parse(fixture('comments.env'));
    const blanks = doc.nodes.filter((n) => n.type === 'blank');
    expect(blanks.length).toBeGreaterThan(0);
  });

  it('parses `export KEY=value` syntax', () => {
    const doc = parse(fixture('exports.env'));
    const assignments = doc.nodes.filter((n) => n.type === 'assignment');
    expect(assignments.length).toBe(3);
    expect(assignments[0]).toMatchObject({ key: 'APP_NAME', export: true, value: 'myapp' });
  });

  it('parses multiline double-quoted values', () => {
    const doc = parse(fixture('multiline.env'));
    const map = Object.fromEntries(
      doc.nodes
        .filter((n) => n.type === 'assignment')
        .map((n) => [n.key, n]),
    );
    expect(map['MULTILINE_VALUE']?.value).toBe('line one\nline two\nline three');
    expect(map['AFTER_MULTILINE']?.value).toBe('world');
  });

  it('handles Windows-style line endings', () => {
    const input = 'KEY1=value1\r\nKEY2=value2\r\n';
    const doc = parse(input);
    const assignments = doc.nodes.filter((n) => n.type === 'assignment');
    expect(assignments).toHaveLength(2);
    expect(assignments[0]).toMatchObject({ key: 'KEY1', value: 'value1' });
    expect(assignments[1]).toMatchObject({ key: 'KEY2', value: 'value2' });
  });

  it('stores filePath on the document', () => {
    const doc = parse('KEY=val', 'test.env');
    expect(doc.filePath).toBe('test.env');
  });

  it('throws ParseError for missing `=`', () => {
    expect(() => parse('INVALID_LINE')).toThrow(ParseError);
  });

  it('throws ParseError for invalid key characters', () => {
    expect(() => parse('123KEY=value')).toThrow(ParseError);
  });

  it('throws ParseError for unterminated double-quoted value', () => {
    expect(() => parse('KEY="unterminated')).toThrow(ParseError);
  });

  it('throws ParseError for unterminated single-quoted value', () => {
    expect(() => parse("KEY='unterminated")).toThrow(ParseError);
  });

  it('does not treat VALUE=foo#bar as having a comment', () => {
    const doc = parse('KEY=foo#bar');
    const node = doc.nodes.find((n) => n.type === 'assignment');
    expect(node?.value).toBe('foo#bar');
    expect(node?.inlineComment).toBeNull();
  });

  it('treats VALUE=foo # comment as having a comment', () => {
    const doc = parse('KEY=foo # comment');
    const node = doc.nodes.find((n) => n.type === 'assignment');
    expect(node?.value).toBe('foo');
    expect(node?.inlineComment).toBe('comment');
  });

  it('parses KEY= as empty string', () => {
    const doc = parse('KEY=');
    const node = doc.nodes.find((n) => n.type === 'assignment');
    expect(node?.value).toBe('');
    expect(node?.quoteStyle).toBe('none');
  });

  it('parses KEY="" as empty double-quoted string', () => {
    const doc = parse('KEY=""');
    const node = doc.nodes.find((n) => n.type === 'assignment');
    expect(node?.value).toBe('');
    expect(node?.quoteStyle).toBe('double');
  });
});
