import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Builds fixtures/notes.docx once, if missing.
export default async function globalSetup() {
  const target = join(__dirname, 'fixtures', 'notes.docx');
  if (existsSync(target)) return;
  const mod = await import(pathToFileURL(join(__dirname, 'scripts', 'make-docx.mjs')).href);
  await mod.makeDocx(target);
}
