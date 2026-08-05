import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Serverless functions are compiled to ESM and run by Node, whose loader
 * requires an explicit file extension on relative imports. Vitest and
 * TypeScript both resolve extensionless paths happily, so a missing extension
 * passes typecheck, tests and the build, then throws ERR_MODULE_NOT_FOUND on
 * the deployed function — a 500 that only ever appears in production.
 *
 * This happened: every /api endpoint imported './_stripe' and returned 500 in
 * production while every local check was green.
 */
const API_DIR = join(__dirname, '..', 'api');

describe('api serverless functions', () => {
  const files = readdirSync(API_DIR).filter(f => f.endsWith('.ts'));

  it('has endpoints to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s uses explicit extensions on relative imports', file => {
    const source = readFileSync(join(API_DIR, file), 'utf8');
    const relativeImports = [...source.matchAll(/from\s+'(\.[^']*)'/g)].map(m => m[1]);

    const missingExtension = relativeImports.filter(spec => !/\.[a-z]+$/.test(spec));
    expect(missingExtension, `relative imports in api/${file} need a .js extension for Node ESM`).toEqual([]);
  });

  it('keeps test files out of /api, where every file becomes an endpoint', () => {
    expect(files.filter(f => f.includes('.test.'))).toEqual([]);
  });
});
