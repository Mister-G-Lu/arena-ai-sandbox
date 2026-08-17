import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const MAX_LINES = 500;
const CODE_EXTENSIONS = new Set([
  '.cjs',
  '.css',
  '.js',
  '.jsx',
  '.mjs',
  '.sql',
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
]);
const ROOTS = ['src', 'scripts', 'supabase'];
const ROOT_FILES = ['eslint.config.js', 'vite.config.js', 'vitest.config.ts'];
const IGNORED_DIRECTORIES = new Set(['node_modules', 'coverage', 'dist', 'docs']);

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(entry.name)) continue;
      files.push(...await collectFiles(path.join(directory, entry.name)));
      continue;
    }
    if (CODE_EXTENSIONS.has(path.extname(entry.name))) files.push(path.join(directory, entry.name));
  }
  return files;
}

const files = [
  ...ROOT_FILES,
  ...(await Promise.all(ROOTS.map((root) => collectFiles(root)))).flat(),
].sort();
const counts = await Promise.all(files.map(async (file) => {
  const text = await readFile(file, 'utf8');
  const lines = text.length === 0 ? 0 : text.split(/\r?\n/).length - (text.endsWith('\n') ? 1 : 0);
  return { file, lines };
}));
const oversized = counts.filter(({ lines }) => lines > MAX_LINES);

if (oversized.length > 0) {
  const details = oversized.map(({ file, lines }) => `  ${file}: ${lines} lines`).join('\n');
  throw new Error(`Source file length budget exceeded (${MAX_LINES} lines maximum):\n${details}`);
}

const largest = counts.reduce((current, entry) => entry.lines > current.lines ? entry : current, counts[0]);
console.log(`File length budget passed: ${counts.length} source files checked; largest is ${largest.file} at ${largest.lines}/${MAX_LINES} lines.`);
