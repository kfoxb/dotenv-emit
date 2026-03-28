import type { DotenvDocument, Node } from '../parser/types.js';

export interface FilterOptions {
  /** Explicit allowlist of keys */
  keys?: string[];
  /** Only keep keys with this prefix */
  prefix?: string;
  /** When used with prefix, strip the prefix from output keys */
  stripPrefix?: boolean;
  /** Regex pattern to match key names */
  pattern?: string;
  /** Denylist of keys to exclude */
  exclude?: string[];
}

/**
 * Filter a DotenvDocument to only include matching assignment nodes.
 * Comment and blank nodes are preserved unless they precede a filtered-out assignment.
 */
export function filterDocument(doc: DotenvDocument, opts: FilterOptions): DotenvDocument {
  const keysSet = opts.keys ? new Set(opts.keys) : null;
  const excludeSet = opts.exclude ? new Set(opts.exclude) : null;
  const patternRe = opts.pattern ? new RegExp(opts.pattern) : null;

  function matches(key: string): boolean {
    if (keysSet && !keysSet.has(key)) return false;
    if (opts.prefix && !key.startsWith(opts.prefix)) return false;
    if (patternRe && !patternRe.test(key)) return false;
    if (excludeSet && excludeSet.has(key)) return false;
    return true;
  }

  const filteredNodes: Node[] = [];
  let pendingNonAssignments: Node[] = [];

  for (const node of doc.nodes) {
    if (node.type !== 'assignment') {
      pendingNonAssignments.push(node);
      continue;
    }

    if (!matches(node.key)) {
      pendingNonAssignments = [];
      continue;
    }

    // Include pending non-assignment nodes (comments that precede this key)
    filteredNodes.push(...pendingNonAssignments);
    pendingNonAssignments = [];

    if (opts.stripPrefix && opts.prefix && node.key.startsWith(opts.prefix)) {
      filteredNodes.push({
        ...node,
        key: node.key.slice(opts.prefix.length),
      });
    } else {
      filteredNodes.push(node);
    }
  }

  return { nodes: filteredNodes, filePath: doc.filePath };
}
