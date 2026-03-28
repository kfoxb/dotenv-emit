import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const distCli = join(import.meta.dirname, '../../dist/cli.js');
const fixturesDir = join(import.meta.dirname, '../fixtures');

function run(args: string[], options: { cwd?: string } = {}): { stdout: string; stderr: string; exitCode: number } {
  const result = spawnSync(process.execPath, [distCli, ...args], {
    cwd: options.cwd ?? fixturesDir,
    encoding: 'utf8',
  });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    exitCode: result.status ?? 1,
  };
}

describe('dotenv-emit CLI', () => {
  describe('--format json', () => {
    it('emits valid JSON from simple.env', () => {
      const { stdout, exitCode } = run(['--format', 'json', 'simple.env']);
      expect(exitCode).toBe(0);
      const parsed = JSON.parse(stdout);
      expect(parsed).toMatchObject({
        APP_NAME: 'myapp',
        APP_ENV: 'production',
        PORT: '3000',
        DEBUG: 'false',
      });
    });
  });

  describe('--format shell', () => {
    it('emits shell export lines', () => {
      const { stdout, exitCode } = run(['--format', 'shell', 'simple.env']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('export APP_NAME="myapp"');
      expect(stdout).toContain('export PORT="3000"');
    });
  });

  describe('--format dotenv', () => {
    it('emits dotenv format by default', () => {
      const { stdout, exitCode } = run(['simple.env']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('APP_NAME=myapp');
    });
  });

  describe('--format yaml', () => {
    it('emits valid YAML', () => {
      const { stdout, exitCode } = run(['--format', 'yaml', 'simple.env']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('APP_NAME: myapp');
    });
  });

  describe('--format csv', () => {
    it('emits CSV with header', () => {
      const { stdout, exitCode } = run(['--format', 'csv', 'simple.env']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('key,value');
      expect(stdout).toContain('APP_NAME,myapp');
    });
  });

  describe('--prefix / --strip-prefix', () => {
    it('filters to only DB_ keys', () => {
      const { stdout, exitCode } = run(['--format', 'json', '--prefix', 'DB_', 'comments.env']);
      expect(exitCode).toBe(0);
      const parsed = JSON.parse(stdout);
      expect(Object.keys(parsed)).toEqual(expect.arrayContaining(['DB_HOST', 'DB_PORT', 'DB_NAME']));
      expect('APP_NAME' in parsed).toBe(false);
    });

    it('strips prefix from output keys', () => {
      const { stdout, exitCode } = run(['--format', 'json', '--prefix', 'DB_', '--strip-prefix', 'comments.env']);
      expect(exitCode).toBe(0);
      const parsed = JSON.parse(stdout);
      expect(Object.keys(parsed)).toEqual(expect.arrayContaining(['HOST', 'PORT', 'NAME']));
    });
  });

  describe('--key', () => {
    it('emits only specified keys', () => {
      const { stdout, exitCode } = run(['--format', 'json', '--key', 'APP_NAME', '--key', 'PORT', 'simple.env']);
      expect(exitCode).toBe(0);
      const parsed = JSON.parse(stdout);
      expect(Object.keys(parsed)).toHaveLength(2);
      expect(parsed).toMatchObject({ APP_NAME: 'myapp', PORT: '3000' });
    });
  });

  describe('--sort', () => {
    it('sorts keys alphabetically in JSON output', () => {
      const { stdout, exitCode } = run(['--format', 'json', '--sort', 'simple.env']);
      expect(exitCode).toBe(0);
      const keys = Object.keys(JSON.parse(stdout));
      expect(keys).toEqual([...keys].sort());
    });
  });

  describe('--no-comments', () => {
    it('strips comments from dotenv output', () => {
      const { stdout, exitCode } = run(['--no-comments', 'comments.env']);
      expect(exitCode).toBe(0);
      expect(stdout).not.toContain('#');
    });
  });

  describe('--validate', () => {
    it('exits 0 for valid file', () => {
      const { exitCode } = run(['--validate', 'simple.env']);
      expect(exitCode).toBe(0);
    });

    it('exits 1 for non-existent file', () => {
      const { exitCode, stderr } = run(['--validate', 'nonexistent.env']);
      expect(exitCode).toBe(1);
      expect(stderr).toContain('error');
    });
  });

  describe('--expand', () => {
    it('expands variable references', () => {
      const { stdout, exitCode } = run(['--format', 'json', '--expand', 'interpolated.env']);
      expect(exitCode).toBe(0);
      const parsed = JSON.parse(stdout);
      expect(parsed['API_URL']).toBe('https://example.com/api');
      expect(parsed['FULL_URL']).toBe('https://example.com/api/v1');
    });
  });

  describe('--override', () => {
    it('overrides a key value', () => {
      const { stdout, exitCode } = run(['--format', 'json', '--override', 'APP_NAME=overridden', 'simple.env']);
      expect(exitCode).toBe(0);
      const parsed = JSON.parse(stdout);
      expect(parsed['APP_NAME']).toBe('overridden');
    });

    it('adds a new key via override', () => {
      const { stdout, exitCode } = run(['--format', 'json', '--override', 'NEW_KEY=newvalue', 'simple.env']);
      expect(exitCode).toBe(0);
      const parsed = JSON.parse(stdout);
      expect(parsed['NEW_KEY']).toBe('newvalue');
    });
  });

  describe('unknown format', () => {
    it('exits 1 with error message', () => {
      const { exitCode, stderr } = run(['--format', 'xml', 'simple.env']);
      expect(exitCode).toBe(1);
      expect(stderr).toContain('unknown format');
    });
  });

  describe('export prefix', () => {
    it('adds export prefix with --export flag', () => {
      const { stdout, exitCode } = run(['--export', 'simple.env']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('export APP_NAME=myapp');
    });
  });

  describe('--version', () => {
    it('prints version', () => {
      const { stdout, exitCode } = run(['--version']);
      expect(exitCode).toBe(0);
      expect(stdout.trim()).toBe('1.0.0');
    });
  });
});
