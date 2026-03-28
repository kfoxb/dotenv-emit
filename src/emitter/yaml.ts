import yaml from 'js-yaml';
import type { AssignmentNode, DotenvDocument } from '../parser/types.js';
import type { YamlEmitOptions } from './types.js';

/**
 * Emit a DotenvDocument as YAML.
 */
export function emitYaml(doc: DotenvDocument, opts: YamlEmitOptions = {}): string {
  let assignments = doc.nodes.filter((n): n is AssignmentNode => n.type === 'assignment');

  if (opts.sortKeys) {
    assignments = assignments.slice().sort((a, b) => a.key.localeCompare(b.key));
  }

  const obj: Record<string, string> = {};
  for (const node of assignments) {
    obj[node.key] = node.value;
  }

  return yaml.dump(obj, {
    sortKeys: opts.sortKeys,
    lineWidth: -1,
  });
}
