// ─── Validate opening book: all sequences & replies must be legal ───────────
import { Position } from "../src/lib/chess/board";
import { BOOK } from "../src/lib/chess/book";

const pos = new Position();
const gameHashes: number[] = [pos.hash];
const made: string[] = [];
let failures = 0;

/** depth-first walk of the book tree */
function walk(): void {
  const entry = BOOK[made.join(" ")];
  if (entry) {
    for (const raw of entry) {
      const [uci] = raw.split(":");
      const m = pos.findMove(uci);
      if (!m) {
        console.error(`✗ ILLEGAL book move "${uci}" after: ${made.join(" ") || "(start)"}`);
        failures++;
        continue;
      }
      // recurse into line
      pos.makeMove(m);
      gameHashes.push(pos.hash);
      made.push(uci);
      walk();
      made.pop();
      gameHashes.pop();
      pos.undoMove();
    }
  }
}

walk();

// ── Independent check: every key replayed from scratch ──
{
  let checked = 0;
  for (const key of Object.keys(BOOK)) {
    const seq = key === "" ? [] : key.split(" ");
    const p = new Position();
    let ok = true;
    for (const uci of seq) {
      const m = p.findMove(uci);
      if (!m) {
        console.error(`✗ KEY PREFIX ILLEGAL: "${uci}" in key "${key}"`);
        failures++;
        ok = false;
        break;
      }
      p.makeMove(m);
    }
    if (!ok) continue;
    for (const raw of BOOK[key]) {
      const [uci] = raw.split(":");
      if (!p.findMove(uci)) {
        console.error(`✗ ILLEGAL book move "${uci}" in key "${key}"`);
        failures++;
      }
    }
    checked++;
  }
  console.log(`Independently checked ${checked}/${Object.keys(BOOK).length} keys`);
}

// count total positions
let count = 0;
for (const k of Object.keys(BOOK)) count++;
console.log(`Book positions: ${count}`);
console.log(failures === 0 ? "✓ BOOK VALID — all moves legal" : `✗ ${failures} illegal moves`);

// Also verify the lookup + rng sampling
import { pickBookMove, lookupBook } from "../src/lib/chess/book";
let rngSeed = 12345;
const rng = () => {
  rngSeed = (rngSeed * 1664525 + 1013904223) >>> 0;
  return rngSeed / 4294967296;
};
const picks: Record<string, number> = {};
for (let i = 0; i < 1000; i++) {
  const m = pickBookMove([], rng);
  picks[m ?? "none"] = (picks[m ?? "none"] ?? 0) + 1;
}
console.log("First-move sampling (1000 games):", picks);
if (picks.none) { console.error("✗ book returned none at root"); failures++; }

process.exit(failures === 0 ? 0 : 1);
