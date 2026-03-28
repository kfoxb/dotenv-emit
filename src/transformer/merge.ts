import type { DotenvDocument, Node } from '../parser/types.js';

export type MergeStrategy = 'first' | 'last' | 'error';

export interface MergeOptions {
  /** How to handle duplicate keys across documents (default: 'last') */
  strategy?: MergeStrategy;
}

/**
 * Merge multiple DotenvDocuments into one.
 * Nodes from later documents follow nodes from earlier documents.
 * Duplicate key handling depends on the merge strategy.
 */
export function mergeDocuments(docs: DotenvDocument[], opts: MergeOptions = {}): DotenvDocument {
  const strategy = opts.strategy ?? 'last';

  if (docs.length === 0) {
    return { nodes: [] };
  }

  if (docs.length === 1) {
    return docs[0] as DotenvDocument;
  }

  if (strategy === 'error') {
    const seenKeys = new Set<string>();
    for (const doc of docs) {
      for (const node of doc.nodes) {
        if (node.type === 'assignment') {
          if (seenKeys.has(node.key)) {
            throw new Error(`Duplicate key "${node.key}" found across merged documents`);
          }
          seenKeys.add(node.key);
        }
      }
    }
    // No duplicates — fall through to 'last' behavior
  }

  if (strategy === 'first') {
    const seenKeys = new Set<string>();
    const nodes: Node[] = [];
    for (const doc of docs) {
      for (const node of doc.nodes) {
        if (node.type === 'assignment') {
          if (!seenKeys.has(node.key)) {
            seenKeys.add(node.key);
            nodes.push(node);
          }
        } else {
          nodes.push(node);
        }
      }
    }
    return { nodes };
  }

  // 'last' strategy: later document values override earlier ones
  // Build a map of key → latest value, then reconstruct preserving node order from
  // the first occurrence but updating the value.
  const keyToLatest = new Map<string, string>();
  for (const doc of [...docs].reverse()) {
    for (const node of doc.nodes) {
      if (node.type === 'assignment' && !keyToLatest.has(node.key)) {
        keyToLatest.set(node.key, node.value);
      }
    }
  }

  // Build merged node list: first-seen structural positions, updated values
  const seenKeys = new Set<string>();
  const nodes: Node[] = [];
  for (const doc of docs) {
    for (const node of doc.nodes) {
      if (node.type === 'assignment') {
        if (!seenKeys.has(node.key)) {
          seenKeys.add(node.key);
          const latestValue = keyToLatest.get(node.key) ?? node.value;
          nodes.push({ ...node, value: latestValue });
        }
        // Skip duplicate key nodes
      } else {
        nodes.push(node);
      }
    }
  }

  return { nodes };
}
