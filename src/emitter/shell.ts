import type { AssignmentNode, DotenvDocument } from '../parser/types.js';
import { shellQuote } from '../utils/quoting.js';
import type { ShellEmitOptions } from './types.js';

/**
 * Emit a DotenvDocument as shell `export KEY="VALUE"` lines.
 */
export function emitShell(doc: DotenvDocument, opts: ShellEmitOptions = {}): string {
  const addExport = opts.addExport !== false; // default true

  let assignments = doc.nodes.filter((n): n is AssignmentNode => n.type === 'assignment');

  if (opts.sortKeys) {
    assignments = assignments.slice().sort((a, b) => a.key.localeCompare(b.key));
  }

  const lines = assignments.map((node) => {
    const quoted = shellQuote(node.value);
    const prefix = addExport ? 'export ' : '';
    return `${prefix}${node.key}=${quoted}`;
  });

  return lines.join('\n');
}
