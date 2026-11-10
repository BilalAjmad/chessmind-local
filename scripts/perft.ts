// ─── Perft: exhaustive move-generation validation ───────────────────────────
import { Position } from "../src/lib/chess/board";

function perft(pos: Position, depth: number): number {
  if (depth === 0) return 1;
  let nodes = 0;
  const moves = pos.generateMoves();
  for (const m of moves) {
    pos.makeMove(m);
    if (!pos.inCheck((pos.side ^ 1) as 0 | 1)) {
      nodes += depth === 1 ? 1 : perft(pos, depth - 1);
    }
    pos.undoMove();
  }
  return nodes;
}

interface TestCase {
  name: string;
  fen: string;
  depths: Record<number, number>;
}

// Standard perft suite (chessprogramming wiki)
const CASES: TestCase[] = [
  {
    name: "Initial position",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    depths: { 1: 20, 2: 400, 3: 8902, 4: 197281, 5: 4865609 },
  },
  {
    name: "Kiwipete",
    fen: "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1",
    depths: { 1: 48, 2: 2039, 3: 97862, 4: 4085603 },
  },
  {
    name: "Position 3 (ep pins)",
    fen: "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1",
    depths: { 1: 14, 2: 191, 3: 2812, 4: 43238, 5: 674624 },
  },
  {
    name: "Position 4 (promotions)",
    fen: "r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1",
    depths: { 1: 6, 2: 264, 3: 9467, 4: 422333 },
  },
  {
    name: "Position 5",
    fen: "rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8",
    depths: { 1: 44, 2: 1486, 3: 62379, 4: 2103487 },
  },
  {
    name: "Position 6",
    fen: "r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10",
    depths: { 1: 46, 2: 2079, 3: 89890, 4: 3894594 },
  },
];

let failures = 0;
const t0 = Date.now();

// ── Deterministic zobrist sanity: same position → same hash ──
{
  const p1 = new Position();
  const p2 = new Position();
  for (const uci of ["e2e4", "d7d5", "e4d5", "g8f6", "g1f3"]) {
    const m = p1.findMove(uci);
    p1.makeMove(m);
    p2.makeMove(p2.findMove(uci));
  }
  if (p1.hash === p2.hash && p1.lock === p2.lock && p1.fen() === p2.fen()) {
    console.log("✓ zobrist consistency across two replayed positions");
  } else {
    console.error("✗ zobrist mismatch!");
    failures++;
  }
}

// ── make/undo integrity: hash restored after full traversal ──
{
  const p = new Position("r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1");
  const h0 = p.hash, l0 = p.lock, fen0 = p.fen();
  const moves = p.generateMoves();
  for (const m of moves) {
    p.makeMove(m);
    p.undoMove();
    if (p.hash !== h0 || p.lock !== l0) {
      console.error(`✗ hash not restored after undo of ${m}`);
      failures++;
      break;
    }
  }
  if (p.fen() === fen0) console.log("✓ make/undo restores exact position (Kiwipete)");
  else { console.error("✗ fen changed after undo cycle"); failures++; }
}

for (const c of CASES) {
  const maxDepth = Math.max(...Object.keys(c.depths).map(Number));
  const pos = new Position(c.fen);
  for (const d of [1, 2, 3, 4, 5].slice(0, maxDepth)) {
    const expected = c.depths[d];
    if (expected === undefined) continue;
    const got = perft(pos, d);
    const ok = got === expected;
    if (!ok) failures++;
    console.log(
      `${ok ? "✓" : "✗"} ${c.name} perft(${d}): got ${got}, expected ${expected}`
    );
  }
}

console.log(`\n${failures === 0 ? "ALL TESTS PASSED" : failures + " FAILURES"} in ${Date.now() - t0}ms`);
process.exit(failures === 0 ? 0 : 1);
