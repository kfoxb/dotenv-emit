import type { AssignmentNode, DotenvDocument } from '../parser/types.js';
import type { CsvEmitOptions } from './types.js';

/**
 * Emit a DotenvDocument as KEY,VALUE CSV.
 */
export function emitCsv(doc: DotenvDocument, opts: CsvEmitOptions = {}): string {
  let assignments = doc.nodes.filter((n): n is AssignmentNode => n.type === 'assignment');

  if (opts.sortKeys) {
    assignments = assignments.slice().sort((a, b) => a.key.localeCompare(b.key));
  }

  const rows: string[] = [];

  if (opts.header) {
    rows.push('key,value');
  }

  for (const node of assignments) {
    rows.push(`${csvEscape(node.key)},${csvEscape(node.value)}`);
  }

  return rows.join('\n');
}

function csvEscape(s: string): string {
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
