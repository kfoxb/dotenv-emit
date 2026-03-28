import type { AssignmentNode, DotenvDocument } from '../parser/types.js';
import type { JsonEmitOptions } from './types.js';

/**
 * Emit a DotenvDocument as a flat JSON object.
 */
export function emitJson(doc: DotenvDocument, opts: JsonEmitOptions = {}): string {
  const pretty = opts.pretty !== false; // default true

  let assignments = doc.nodes.filter((n): n is AssignmentNode => n.type === 'assignment');

  if (opts.omitEmpty) {
    assignments = assignments.filter((n) => n.value !== '');
  }

  if (opts.sortKeys) {
    assignments = assignments.slice().sort((a, b) => a.key.localeCompare(b.key));
  }

  const obj: Record<string, string> = {};
  for (const node of assignments) {
    obj[node.key] = node.value;
  }

  return JSON.stringify(obj, null, pretty ? 2 : undefined);
}
