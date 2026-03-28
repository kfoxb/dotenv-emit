import type { AssignmentNode, DotenvDocument, Node } from '../parser/types.js';

/**
 * Apply key=value overrides to a document.
 * Keys that already exist have their values replaced.
 * New keys are appended at the end.
 */
export function applyOverrides(doc: DotenvDocument, overrides: Record<string, string>): DotenvDocument {
  const overrideMap = new Map(Object.entries(overrides));
  const updatedKeys = new Set<string>();

  const nodes: Node[] = doc.nodes.map((node) => {
    if (node.type !== 'assignment') return node;
    if (overrideMap.has(node.key)) {
      updatedKeys.add(node.key);
      return { ...node, value: overrideMap.get(node.key) as string } satisfies AssignmentNode;
    }
    return node;
  });

  // Append any new keys not already in the document
  for (const [key, value] of overrideMap) {
    if (!updatedKeys.has(key)) {
      nodes.push({
        type: 'assignment',
        export: false,
        key,
        value,
        quoteStyle: 'none',
        inlineComment: null,
        leadingWhitespace: '',
      } satisfies AssignmentNode);
    }
  }

  return { nodes, filePath: doc.filePath };
}
