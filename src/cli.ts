import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Command, InvalidArgumentError } from 'commander';
import { emitCsv } from './emitter/csv.js';
import { emitDotenv } from './emitter/dotenv.js';
import { emitJson } from './emitter/json.js';
import { emitShell } from './emitter/shell.js';
import { emitYaml } from './emitter/yaml.js';
import { parse } from './parser/lexer.js';
import type { DotenvDocument } from './parser/types.js';
import { expandDocument } from './transformer/expand.js';
import { filterDocument } from './transformer/filter.js';
import { mergeDocuments } from './transformer/merge.js';
import type { MergeStrategy } from './transformer/merge.js';
import { applyOverrides } from './transformer/override.js';
import { ParseError } from './utils/errors.js';

const program = new Command();

program
  .name('dotenv-emit')
  .description('Parse and emit .env files in multiple formats')
  .version('1.0.0')
  .argument('[files...]', 'One or more .env files to read (default: .env)')
  .option('-f, --format <format>', 'Output format: dotenv|shell|json|yaml|csv', 'dotenv')
  .option(
    '-k, --key <key>',
    'Only emit specified key (can be repeated)',
    (val: string, prev: string[]) => [...(prev ?? []), val],
    [] as string[],
  )
  .option('-p, --prefix <prefix>', 'Only emit keys matching prefix')
  .option('--strip-prefix', 'Remove prefix from output keys (use with --prefix)')
  .option('-e, --expand', 'Expand variable references in values')
  .option('--expand-env', 'Use process.env for expansion fallback (use with --expand)')
  .option('-o, --output <file>', 'Write to file instead of stdout')
  .option('--sort', 'Sort keys alphabetically')
  .option('--no-comments', 'Strip comments from dotenv output')
  .option('--quote-all', 'Force double-quote all values (dotenv format)')
  .option('--export', 'Add `export` prefix to all keys (dotenv/shell format)')
  .option(
    '--override <kv>',
    'Override key values as KEY=VALUE pairs (can be repeated)',
    (val: string, prev: string[]) => {
      if (!val.includes('=')) {
        throw new InvalidArgumentError('Override must be in KEY=VALUE format');
      }
      return [...(prev ?? []), val];
    },
    [] as string[],
  )
  .option(
    '--merge-strategy <strategy>',
    'How to handle duplicate keys when merging: first|last|error',
    'last',
  )
  .option('--validate', 'Validate file(s) without emitting; exit 1 on error')
  .option('-q, --quiet', 'Suppress warnings');

program.parse(process.argv);

const opts = program.opts<{
  format: string;
  key: string[];
  prefix?: string;
  stripPrefix?: boolean;
  expand?: boolean;
  expandEnv?: boolean;
  output?: string;
  sort?: boolean;
  comments?: boolean; // commander flips --no-comments to comments: false
  quoteAll?: boolean;
  export?: boolean;
  override: string[];
  mergeStrategy: string;
  validate?: boolean;
  quiet?: boolean;
}>();

const files = program.args.length > 0 ? program.args : ['.env'];

// Parse files
const docs: DotenvDocument[] = [];
let hasErrors = false;

for (const filePath of files) {
  const absPath = resolve(process.cwd(), filePath);
  let content: string;
  try {
    content = readFileSync(absPath, 'utf8');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`dotenv-emit: error reading ${filePath}: ${message}\n`);
    hasErrors = true;
    continue;
  }

  try {
    const doc = parse(content, filePath);
    docs.push(doc);
  } catch (err) {
    if (err instanceof ParseError) {
      process.stderr.write(`dotenv-emit: parse error: ${err.message}\n`);
    } else {
      const message = err instanceof Error ? err.message : String(err);
      process.stderr.write(`dotenv-emit: error parsing ${filePath}: ${message}\n`);
    }
    hasErrors = true;
  }
}

if (hasErrors) {
  process.exit(1);
}

if (docs.length === 0) {
  process.stderr.write('dotenv-emit: no files could be parsed\n');
  process.exit(1);
}

// If --validate, we already parsed successfully; report success and exit
if (opts.validate) {
  if (!opts.quiet) {
    const fileList = files.join(', ');
    process.stdout.write(`dotenv-emit: ${fileList} is valid\n`);
  }
  process.exit(0);
}

// Merge
const mergeStrategy = opts.mergeStrategy as MergeStrategy;
let doc = mergeDocuments(docs, { strategy: mergeStrategy });

// Apply overrides
if (opts.override.length > 0) {
  const overrideMap: Record<string, string> = {};
  for (const kv of opts.override) {
    const eqIdx = kv.indexOf('=');
    const key = kv.slice(0, eqIdx);
    const value = kv.slice(eqIdx + 1);
    overrideMap[key] = value;
  }
  doc = applyOverrides(doc, overrideMap);
}

// Expand variables
if (opts.expand) {
  doc = expandDocument(doc, { useProcessEnv: opts.expandEnv });
}

// Filter
const hasFilter = opts.key.length > 0 || opts.prefix;
if (hasFilter) {
  doc = filterDocument(doc, {
    keys: opts.key.length > 0 ? opts.key : undefined,
    prefix: opts.prefix,
    stripPrefix: opts.stripPrefix,
  });
}

// Emit
const format = opts.format.toLowerCase();
let output: string;

switch (format) {
  case 'dotenv':
    output = emitDotenv(doc, {
      quoteAll: opts.quoteAll,
      stripComments: opts.comments === false,
      addExport: opts.export,
      sortKeys: opts.sort,
    });
    break;
  case 'shell':
    output = emitShell(doc, {
      addExport: true,
      sortKeys: opts.sort,
    });
    break;
  case 'json':
    output = emitJson(doc, {
      sortKeys: opts.sort,
    });
    break;
  case 'yaml':
    output = emitYaml(doc, {
      sortKeys: opts.sort,
    });
    break;
  case 'csv':
    output = emitCsv(doc, {
      header: true,
      sortKeys: opts.sort,
    });
    break;
  default:
    process.stderr.write(`dotenv-emit: unknown format: ${format}\n`);
    process.stderr.write('Supported formats: dotenv, shell, json, yaml, csv\n');
    process.exit(1);
}

// Ensure output ends with newline
if (output.length > 0 && !output.endsWith('\n')) {
  output += '\n';
}

if (opts.output) {
  const outPath = resolve(process.cwd(), opts.output);
  writeFileSync(outPath, output, 'utf8');
  if (!opts.quiet) {
    process.stderr.write(`dotenv-emit: wrote ${outPath}\n`);
  }
} else {
  process.stdout.write(output);
}
