// Parser
export { parse } from './parser/lexer.js';
export type { AssignmentNode, BlankLineNode, CommentNode, DotenvDocument, Node, QuoteStyle } from './parser/types.js';

// Emitters
export { emitCsv } from './emitter/csv.js';
export { emitDotenv } from './emitter/dotenv.js';
export { emitJson } from './emitter/json.js';
export { emitShell } from './emitter/shell.js';
export { emitYaml } from './emitter/yaml.js';
export type {
  CsvEmitOptions,
  DotenvEmitOptions,
  EmitFormat,
  EmitOptions,
  JsonEmitOptions,
  ShellEmitOptions,
  YamlEmitOptions,
} from './emitter/types.js';

// Transformers
export { applyOverrides } from './transformer/override.js';
export { expandDocument } from './transformer/expand.js';
export type { ExpandOptions } from './transformer/expand.js';
export { filterDocument } from './transformer/filter.js';
export type { FilterOptions } from './transformer/filter.js';
export { mergeDocuments } from './transformer/merge.js';
export type { MergeOptions, MergeStrategy } from './transformer/merge.js';

// Utilities
export { ParseError, EmitError, CircularReferenceError } from './utils/errors.js';
