// ─── Engine tactical tests & benchmarks ─────────────────────────────────────
import { ChessEngine, levelConfig } from "../src/lib/chess/engine";
import { Position } from "../src/lib/chess/board";
import { START_FEN } from "../src/lib/chess/types";

const engine = new ChessEngine();
let failures = 0;

function check(name: string, cond: boolean, extra = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✓" : "✗"} ${name}${extra ? " — " + extra : ""}`);
}

// ── Mate in 1: back-rank ──
{
  const fen = "6k1/5ppp/8/8/8/8/8/R6K w - - 0 1";
  const r = engine.findMove(fen, [], { level: 5 });
  check("Mate in 1 (Ra8#)", r.uci === "a1a8", `got ${r.uci}, score ${r.score}`);
  check("Mate reported via mateIn", r.mateIn !== null && r.mateIn <= 1, `mateIn ${r.mateIn}`);
}

// ── Mate in 1 as black: Fool's mate ──
{
  const fen = "rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2";
  const r = engine.findMove(fen, [], { level: 5 });
  check("Fool's mate (Qh4#)", r.uci === "d8h4", `got ${r.uci}`);
}

// ── Mate in 2: two-rook ladder ──
{
  const fen = "7k/8/8/8/8/8/R7/1R5K w - - 0 1";
  const r = engine.findMove(fen, [], { level: 7 });
  const ok = r.mateIn !== null && r.mateIn <= 3;
  check("Mate in 2 (ladder)", ok, `got ${r.uci}, mateIn ${r.mateIn}`);
}

// ── Win the hanging queen ──
{
  const fen = "k7/8/8/3q4/8/8/8/K2R4 w - - 0 1";
  const r = engine.findMove(fen, [], { level: 6 });
  check("Capture hanging queen", r.uci === "d1d5", `got ${r.uci}`);
}

// ── WAC.001 (famous queen sac) ──
{
  const fen = "2rr3k/pp3pp1/1nnqbN1p/3pN3/2pP4/2P3Q1/PPB4P/R4RK1 w - - 0 1";
  const t0 = Date.now();
  const r = engine.findMove(fen, [], { level: 10 });
  check("WAC.001 (Qg6!!)", r.uci === "g3g6", `got ${r.uci}, score ${r.score}, depth ${r.depth}, ${(Date.now() - t0)}ms`);
}

// ── Promotion: choose queen under no pressure ──
{
  const fen = "6k1/1P6/8/8/8/8/8/6K1 w - - 0 1";
  const r = engine.findMove(fen, [], { level: 6 });
  check("Promotes to queen", r.uci === "b7b8q", `got ${r.uci}`);
}

// ── Book moves ──
{
  engine.newGame();
  const r = engine.findMove(START_FEN, [], { level: 8, seed: 42 });
  const firstMoves = ["e2e4", "d2d4", "g1f3", "c2c4", "b1c3"];
  check("Book opening move", r.fromBook && firstMoves.includes(r.uci), `got ${r.uci} book=${r.fromBook}`);
  const r2 = engine.findMove(START_FEN, ["e2e4"], { level: 8, seed: 43 });
  check("Book reply to e4", r2.fromBook && ["e7e5", "c7c5", "e7e6", "c7c6", "d7d6", "g7g6", "d7d5", "g8f6"].includes(r2.uci), `got ${r2.uci}`);
}

// ── Weak levels play legal, varied moves ──
{
  const seen = new Set<string>();
  for (let i = 0; i < 20; i++) {
    const r = engine.findMove(START_FEN, [], { level: 1, seed: 1000 + i });
    seen.add(r.uci);
    if (!r.uci) { check("L1 move legality", false); break; }
  }
  check("Easy varies moves (randomness)", seen.size >= 4, `${seen.size}/20 distinct`);
}

// ── NPS benchmark at Master level from a tactical middlegame ──
{
  engine.newGame();
  const fen = "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1"; // Kiwipete
  const t0 = Date.now();
  const r = engine.findMove(fen, [], { level: 10 });
  const dt = Date.now() - t0;
  const nps = Math.round(r.nodes / Math.max(1, r.timeMs / 1000));
  console.log(`ℹ L10 depth=${r.depth} nodes=${r.nodes} time=${r.timeMs}ms nps=${nps.toLocaleString()} move=${r.uci}`);
  check("Master reaches depth >= 6", r.depth >= 6, `depth ${r.depth}`);
  check("NPS >= 100k", nps >= 100000, `nps ${nps}`);
}

// ── Full game self-play: L6 vs L5 (first 40 plies, ensure no crashes) ──
{
  engine.newGame();
  const pos = new Position(START_FEN);
  const moves: string[] = [];
  const t0 = Date.now();
  let plies = 0;
  let okRun = true;
  let outcomeStr = "";
  while (plies < 60) {
    const oc = pos.outcome();
    if (oc.over) {
      outcomeStr = oc.winner === null ? `draw (${oc.reason})` : `${oc.winner === 0 ? "white" : "black"} wins (${oc.reason})`;
      break;
    }
    const lvl = pos.side === 0 ? 6 : 5;
    const r = engine.findMove(START_FEN, moves, { level: lvl, seed: 77 + plies });
    const m = pos.findMove(r.uci);
    if (!m) { okRun = false; check("self-play legality", false, `ply ${plies}: ${r.uci}`); break; }
    pos.makeMove(m);
    moves.push(r.uci);
    plies++;
  }
  check("Self-play 60+ plies without error", okRun && plies >= 60 || outcomeStr !== "",
    `${plies} plies${outcomeStr ? ", " + outcomeStr : ""} in ${Date.now() - t0}ms`);
}

console.log(`\n${failures === 0 ? "ALL ENGINE TESTS PASSED" : failures + " FAILURES"}`);
process.exit(failures === 0 ? 0 : 1);
