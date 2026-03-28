import type { AssignmentNode, DotenvDocument } from '../parser/types.js';
import { CircularReferenceError } from '../utils/errors.js';

export interface ExpandOptions {
  /** Whether to also use process.env for unresolved references (default: false) */
  useProcessEnv?: boolean;
  /** What to do with unresolvable references: 'passthrough' keeps ${VAR} as-is, 'empty' replaces with '' */
  unresolved?: 'passthrough' | 'empty';
}

/**
 * Expand variable references (${VAR} syntax) within assignment values.
 */
export function expandDocument(doc: DotenvDocument, opts: ExpandOptions = {}): DotenvDocument {
  // Build initial value map from document
  const valueMap = new Map<string, string>();
  for (const node of doc.nodes) {
    if (node.type === 'assignment') {
      valueMap.set(node.key, node.value);
    }
  }

  const unresolved = opts.unresolved ?? 'passthrough';

  // Resolve all values, updating the map
  const resolvedMap = new Map<string, string>();

  function resolveKey(key: string, chain: string[] = []): string {
    if (resolvedMap.has(key)) {
      return resolvedMap.get(key) as string;
    }
    if (chain.includes(key)) {
      throw new CircularReferenceError(key, chain);
    }

    const raw = valueMap.get(key);
    if (raw === undefined) {
      if (opts.useProcessEnv && key in process.env) {
        return process.env[key] as string;
      }
      return unresolved === 'empty' ? '' : `\${${key}}`;
    }

    const resolved = expandValue(raw, [...chain, key]);
    resolvedMap.set(key, resolved);
    return resolved;
  }

  function expandValue(value: string, chain: string[]): string {
    // Replace ${VAR} and $VAR patterns
    return value.replace(/\$\{([^}]+)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g, (match, braced, bare) => {
      const refKey = (braced ?? bare) as string;
      try {
        return resolveKey(refKey, chain);
      } catch (e) {
        if (e instanceof CircularReferenceError) throw e;
        return unresolved === 'empty' ? '' : match;
      }
    });
  }

  // Pre-resolve all keys
  for (const node of doc.nodes) {
    if (node.type === 'assignment') {
      resolveKey(node.key);
    }
  }

  const nodes = doc.nodes.map((node) => {
    if (node.type !== 'assignment') return node;
    const resolvedValue = resolvedMap.get(node.key) ?? node.value;
    return { ...node, value: resolvedValue } satisfies AssignmentNode;
  });

  return { nodes, filePath: doc.filePath };
}
