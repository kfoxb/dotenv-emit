import type { DotenvDocument } from '../parser/types.js';

export interface DotenvEmitOptions {
  /** Force double-quote wrapping on all values */
  quoteAll?: boolean;
  /** Remove comment and blank-line nodes */
  stripComments?: boolean;
  /** Normalize all keys to have `export` prefix */
  addExport?: boolean;
  /** Remove `export` prefix from all keys */
  removeExport?: boolean;
  /** Sort assignment keys alphabetically */
  sortKeys?: boolean;
}

export interface ShellEmitOptions {
  /** Always add `export` prefix (default: true) */
  addExport?: boolean;
  /** Sort keys alphabetically */
  sortKeys?: boolean;
}

export interface JsonEmitOptions {
  /** Pretty-print JSON (default: true) */
  pretty?: boolean;
  /** Sort keys alphabetically */
  sortKeys?: boolean;
  /** Omit keys with empty string values */
  omitEmpty?: boolean;
}

export interface YamlEmitOptions {
  /** Sort keys alphabetically */
  sortKeys?: boolean;
}

export interface CsvEmitOptions {
  /** Include header row */
  header?: boolean;
  /** Sort keys alphabetically */
  sortKeys?: boolean;
}

export type EmitFormat = 'dotenv' | 'shell' | 'json' | 'yaml' | 'csv';

export type EmitOptions =
  | ({ format: 'dotenv' } & DotenvEmitOptions)
  | ({ format: 'shell' } & ShellEmitOptions)
  | ({ format: 'json' } & JsonEmitOptions)
  | ({ format: 'yaml' } & YamlEmitOptions)
  | ({ format: 'csv' } & CsvEmitOptions);

export type Emitter = (doc: DotenvDocument, opts?: Record<string, unknown>) => string;
