export type QuoteStyle = 'none' | 'single' | 'double' | 'backtick';

export interface AssignmentNode {
  type: 'assignment';
  /** true if the line started with `export ` */
  export: boolean;
  key: string;
  /** The unquoted, resolved value */
  value: string;
  /** How the value was quoted in source */
  quoteStyle: QuoteStyle;
  /** Trailing inline comment text (without leading `#`), or null */
  inlineComment: string | null;
  /** Leading whitespace before key (usually empty) */
  leadingWhitespace: string;
}

export interface CommentNode {
  type: 'comment';
  /** Full line text including leading `#` */
  text: string;
}

export interface BlankLineNode {
  type: 'blank';
}

export type Node = AssignmentNode | CommentNode | BlankLineNode;

export interface DotenvDocument {
  nodes: Node[];
  filePath?: string;
}
