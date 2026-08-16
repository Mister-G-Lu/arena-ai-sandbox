import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const ASSET_DIR = path.resolve('docs/assets');
const MAX_CHUNK_BYTES = 250 * 1024;

const files = (await readdir(ASSET_DIR)).filter((file) => file.endsWith('.js'));
if (files.length === 0) {
  throw new Error(`Bundle budget could not find JavaScript chunks in ${ASSET_DIR}.`);
}

const chunks = await Promise.all(
  files.map(async (file) => ({
    file,
    bytes: (await stat(path.join(ASSET_DIR, file))).size,
  })),
);
const oversized = chunks.filter(({ bytes }) => bytes > MAX_CHUNK_BYTES);
const largest = chunks.toSorted((a, b) => b.bytes - a.bytes)[0];

if (oversized.length > 0) {
  const details = oversized
    .map(({ file, bytes }) => `${file}: ${(bytes / 1024).toFixed(1)} KiB`)
    .join('\n');
  throw new Error(
    `JavaScript chunk budget exceeded (${MAX_CHUNK_BYTES / 1024} KiB max):\n${details}`,
  );
}

console.log(
  `Bundle budget passed: ${chunks.length} JS chunks; largest is ${largest.file} ` +
    `at ${(largest.bytes / 1024).toFixed(1)} KiB / ${MAX_CHUNK_BYTES / 1024} KiB.`,
);
