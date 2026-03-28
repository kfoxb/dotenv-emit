# dotenv-emit

A CLI tool and library for parsing `.env` files and emitting them in multiple formats.

## Installation

```bash
npm install -g dotenv-emit
```

## Usage

```
dotenv-emit [options] [files...]
```

### Options

```
-f, --format <format>     Output format: dotenv|shell|json|yaml|csv  (default: dotenv)
-k, --key <key>           Only emit specified key (can be repeated)
-p, --prefix <prefix>     Only emit keys matching prefix
    --strip-prefix        Remove prefix from output keys (use with --prefix)
-e, --expand              Expand variable references in values
    --expand-env          Use process.env for expansion fallback
-o, --output <file>       Write to file instead of stdout
    --sort                Sort keys alphabetically
    --no-comments         Strip comments from dotenv output
    --quote-all           Force double-quote all values (dotenv format)
    --export              Add `export` prefix to all keys
    --override <kv>       Override KEY=VALUE (can be repeated)
    --merge-strategy <s>  How to handle duplicate keys: first|last|error (default: last)
    --validate            Validate file(s) without emitting; exit 1 on error
-q, --quiet               Suppress warnings
-V, --version             Print version
-h, --help                Show help
```

### Examples

```bash
# Emit as JSON
dotenv-emit --format json .env

# Emit as shell-sourceable script
dotenv-emit --format shell .env > env.sh && source env.sh

# Filter to DATABASE_ keys and strip prefix
dotenv-emit --format json --prefix DATABASE_ --strip-prefix .env

# Merge two files (later file wins)
dotenv-emit --format dotenv .env .env.local

# Expand variable references
dotenv-emit --expand --format shell .env

# Validate a file
dotenv-emit --validate .env

# Override specific values
dotenv-emit --override APP_ENV=staging --format json .env

# Sort keys and strip comments
dotenv-emit --sort --no-comments .env
```

## Supported Formats

| Format   | Description                             |
|----------|-----------------------------------------|
| `dotenv` | Standard `.env` format (default)        |
| `shell`  | `export KEY="VALUE"` shell script       |
| `json`   | Flat JSON object                        |
| `yaml`   | YAML key-value pairs                    |
| `csv`    | CSV with `key,value` columns            |

## Library Usage

```typescript
import { parse, emitJson, emitShell, filterDocument, expandDocument } from 'dotenv-emit';

const doc = parse('APP_NAME=myapp\nDB_URL=postgres://localhost/db');

// Emit as JSON
console.log(emitJson(doc));

// Filter to DB_ keys
const dbDoc = filterDocument(doc, { prefix: 'DB_', stripPrefix: true });
console.log(emitShell(dbDoc));

// Expand variables
import { expandDocument } from 'dotenv-emit';
const expanded = expandDocument(parse('BASE=https://example.com\nURL=${BASE}/api'));
```
