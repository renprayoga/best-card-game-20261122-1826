// Runeforge Duel — a best-card-game-20261122-1826 entry (Node 22, standard
// library only). The game lives in this directory's game/ folder: plain
// static files a desktop browser loads offline (index.html plus ES modules,
// no library, no network request). This program hands it in: it copies
// game/ and screenshots/ from beside this file into /output and writes
// /output/dossier.json, the summary the judge reads, using the vendored
// make.fun library.
//
// The game: "Runeforge Duel", an original 1v1 card duel against the AI
// rival Vex. Thirty life each, mana that grows one crystal a turn, a hand
// of five, and four original sigils — Ember, Frost, Verdant, Stone — with
// sixteen creatures and six spells. Creatures forge onto the row and clash
// at the end of the round: both rows strike at once, each creature hitting
// the one opposite it, or the rival hero when the slot is empty, and a
// creature forged this round is sick until the next clash. Spells bolt,
// mend, draw, ward, freeze and blast. First hero to 0 life loses; the end
// screens, the score and the best score are all shown in the game.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const TITLE = 'Runeforge Duel';
const SLUG = 'best-card-game-20261122-1826';

// The gate refuses an entry with no screenshots, so fail loudly here
// instead of handing in a dossier the scorer would reject.
const shots = existsSync(join(here, 'screenshots')) ? readdirSync(join(here, 'screenshots')) : [];
if (shots.length < 3) {
  throw new Error(`Runeforge Duel needs at least 3 screenshots, found ${shots.length}`);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the others refuse an entry the scorer would refuse (more than
// 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB
// of game files, in all, or a path under game/ over 1000 bytes: game/
// counts beside /output's own 1000-entry cap, its screenshots/ and
// dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

console.error(`${TITLE} (${SLUG}): dossier written to ${out}/dossier.json (${shots.length} screenshots)`);
