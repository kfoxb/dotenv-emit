import type { AssignmentNode, DotenvDocument, Node } from '../parser/types.js';
import type { DotenvEmitOptions } from './types.js';

/**
 * Emit a DotenvDocument back to dotenv format.
 * When no options are given, this is a near-lossless round-trip emitter
 * (reconstructs the file, though leading whitespace on assignment lines is normalized).
 */
export function emitDotenv(doc: DotenvDocument, opts: DotenvEmitOptions = {}): string {
  let nodes = [...doc.nodes];

  if (opts.stripComments) {
    nodes = nodes.filter((n) => n.type !== 'comment' && n.type !== 'blank');
  }

  if (opts.sortKeys) {
    nodes = sortByKey(nodes);
  }

  const lines: string[] = [];
  for (const node of nodes) {
    lines.push(renderNode(node, opts));
  }

  return lines.join('\n');
}

function renderNode(node: Node, opts: DotenvEmitOptions): string {
  if (node.type === 'blank') return '';
  if (node.type === 'comment') return node.text;

  return renderAssignment(node, opts);
}

function renderAssignment(node: AssignmentNode, opts: DotenvEmitOptions): string {
  let prefix = '';

  if (opts.addExport) {
    prefix = 'export ';
  } else if (opts.removeExport) {
    prefix = '';
  } else if (node.export) {
    prefix = 'export ';
  }

  const quoteStyle = opts.quoteAll ? 'double' : node.quoteStyle;

  let quotedValue: string;
  if (quoteStyle === 'double') {
    const escaped = node.value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
      .replace(/\$/g, '\\$');
    quotedValue = `"${escaped}"`;
  } else if (quoteStyle === 'single') {
    quotedValue = `'${node.value}'`;
  } else if (quoteStyle === 'backtick') {
    const escaped = node.value.replace(/`/g, '\\`').replace(/\\/g, '\\\\');
    quotedValue = `\`${escaped}\``;
  } else {
    quotedValue = node.value;
  }

  let line = `${node.leadingWhitespace}${prefix}${node.key}=${quotedValue}`;

  if (node.inlineComment !== null && !opts.stripComments) {
    line += ` # ${node.inlineComment}`;
  }

  return line;
}

/**
 * Sort nodes: keep comment/blank nodes "attached" to the assignment that follows them.
 */
function sortByKey(nodes: Node[]): Node[] {
  // Build groups: each group is [leading comment/blank lines..., assignment node]
  type Group = { leading: Node[]; assignment: AssignmentNode | null };
  const groups: Group[] = [];
  let currentLeading: Node[] = [];

  for (const node of nodes) {
    if (node.type === 'assignment') {
      groups.push({ leading: currentLeading, assignment: node });
      currentLeading = [];
    } else {
      currentLeading.push(node);
    }
  }
  // Trailing non-assignment nodes
  const trailing = currentLeading;

  groups.sort((a, b) => {
    const keyA = a.assignment?.key ?? '';
    const keyB = b.assignment?.key ?? '';
    return keyA.localeCompare(keyB);
  });

  const result: Node[] = [];
  for (const group of groups) {
    result.push(...group.leading);
    if (group.assignment) result.push(group.assignment);
  }
  result.push(...trailing);
  return result;
}
