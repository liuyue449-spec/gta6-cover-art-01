// main.ts — hands the Vice Sunset Cover Maker entry to make.fun.
//
// It copies app/ and screenshots/ from this repository into the output
// directory and writes dossier.json there with the kit's buildDossier, so
// the dossier is byte for byte the one the grader rebuilds from the same
// files. MAKEFUN_OUTPUT_DIR stands in for /output outside the grader.

import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The bounty's own caps: buildDossier refuses a tree past any of them, so
// an over-limit entry fails here, in the open, instead of at the gate.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

mkdirSync(outDir, { recursive: true });
for (const part of ['app', 'screenshots']) {
  cpSync(join(repoRoot, part), join(outDir, part), { recursive: true });
}

const dossier = buildDossier(outDir, CAPS);
writeFileSync(join(outDir, 'dossier.json'), dossier);

// The gate caps dossier.json itself at 1.5 MiB. buildDossier has already
// refused anything past the app and screenshot caps, so this size is the
// last one left to check before the entry leaves the machine.
const DOSSIER_MAX_BYTES = 1572864;
if (dossier.length > DOSSIER_MAX_BYTES) {
  throw new Error(`dossier.json is ${dossier.length} bytes, over the ${DOSSIER_MAX_BYTES}-byte cap`);
}
console.log(`main.ts: copied app/ and screenshots/ to ${outDir}, dossier.json is ${dossier.length} bytes`);
