// ─── Engine facade: difficulty levels, opening book, adaptive learning bias ──
import { Position } from "./board";
import { lookupBook } from "./book";
import { Searcher, type SearchResult, type SearchInfo } from "./search";
import { evaluate } from "./eval";
import { moveToUci, START_FEN, MATE_SCORE, FLAG_CAPTURE, type Color } from "./types";

export interface LevelConfig {
  level: number; // 1..4
  name: string;
  title: string;
  elo: number; // nominal strength
  depth: number;
  timeMs: number;
  /** softmax temperature over root scores (0 = always best move) */
  temperature: number;
  /** plies of opening book to follow */
  bookDepth: number;
  /** short description shown in UI */
  blurb: string;
}

export const LEVELS: LevelConfig[] = [
  {
    level: 1, name: "Easy", title: "Friendly", elo: 800,
    depth: 2, timeMs: 300, temperature: 140, bookDepth: 2,
    blurb: "Relaxed and forgiving — grabs a free piece now and then, happily gives a few back. Perfect for learning the ropes.",
  },
  {
    level: 2, name: "Medium", title: "Club Player", elo: 1400,
    depth: 3, timeMs: 700, temperature: 30, bookDepth: 6,
    blurb: "Solid club strength. Develops pieces, castles, and punishes real blunders — while staying human enough to beat.",
  },
  {
    level: 3, name: "Ultra Hard", title: "Expert", elo: 2000,
    depth: 8, timeMs: 850, temperature: 0, bookDepth: 12,
    blurb: "Full-strength search, zero compromises: it always plays the strongest move it can find. Small inaccuracies get punished immediately — bring your best game.",
  },
  {
    level: 4, name: "Master", title: "Grandmaster", elo: 2500,
    depth: 14, timeMs: 1300, temperature: 0, bookDepth: 16,
    blurb: "Maximum engine power, no mercy and no deliberate mistakes — it never holds back, never gets tired, and never misses what you miss.",
  },
];

export function levelConfig(level: number): LevelConfig {
  const l = Math.max(1, Math.min(LEVELS.length, Math.round(level)));
  return LEVELS[l - 1];
}

/** seeded RNG (mulberry32) */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface EngineMoveResult {
  uci: string;
  score: number; // centipawns, side-to-move POV (clamped)
  scoreWhite: number; // from White's POV (clamped, ±1500 for eval bar)
  /** plies to mate if score is a mate score (positive: mover mates) */
  mateIn: number | null;
  depth: number;
  nodes: number;
  timeMs: number;
  pv: string[]; // uci moves
  fromBook: boolean;
  considered?: { uci: string; score: number }[];
}

export interface EngineOptions {
  level: number;
  seed?: number;
  /** override thinking time (e.g. for clocks) */
  maxTimeMs?: number;
  /** adaptive style learned from the human opponent (real-time learning) */
  styleBias?: StyleBias;
  /** learned moves to avoid (lines that historically lost) */
  bookAvoid?: string[];
  onInfo?: (info: SearchInfo) => void;
}

/** Live adaptation knobs produced by the learning system. */
export interface StyleBias {
  /** -1..1 — positive prefers sharp tactical (capturing) moves */
  aggression: number;
}

export class ChessEngine {
  private searcher = new Searcher();

  /** reset learned state between games */
  newGame(): void {
    this.searcher.clear();
  }

  findMove(
    fen: string,
    movesUci: string[],
    opts: EngineOptions
  ): EngineMoveResult {
    const cfg = levelConfig(opts.level);
    const rng = makeRng(opts.seed ?? (Date.now() & 0xffffffff));

    // replay game
    const pos = new Position(fen);
    const gameHashes: number[] = [pos.hash];
    let replayOk = true;
    for (const uci of movesUci) {
      const m = pos.findMove(uci);
      if (!m) {
        replayOk = false;
        break;
      }
      pos.makeMove(m);
      gameHashes.push(pos.hash);
    }
    if (!replayOk) {
      // fall back to searching from the FEN position itself
      return this.searchPosition(pos, gameHashes, cfg, rng, opts);
    }

    // opening book (filtered by the learned avoid-list)
    if (movesUci.length < cfg.bookDepth) {
      const choices = lookupBook(movesUci);
      const allowed = choices
        ? choices.filter((c) => !opts.bookAvoid || !opts.bookAvoid.includes(c.move))
        : null;
      if (allowed && allowed.length > 0) {
        const total = allowed.reduce((s, c) => s + c.weight, 0);
        let r = rng() * total;
        let bookMove = allowed[allowed.length - 1].move;
        for (const c of allowed) {
          r -= c.weight;
          if (r <= 0) {
            bookMove = c.move;
            break;
          }
        }
        if (bookMove && pos.findMove(bookMove)) {
          // quick static evaluation of the resulting position for the eval bar
          const m = pos.findMove(bookMove);
          pos.makeMove(m);
          const standEval = staticEvalWhite(pos);
          pos.undoMove();
          return {
            uci: bookMove,
            score: 0,
            scoreWhite: standEval,
            mateIn: null,
            depth: 0,
            nodes: 0,
            timeMs: 0,
            pv: [bookMove],
            fromBook: true,
          };
        }
      }
    }

    return this.searchPosition(pos, gameHashes, cfg, rng, opts);
  }

  private searchPosition(
    pos: Position,
    gameHashes: number[],
    cfg: LevelConfig,
    rng: () => number,
    opts: EngineOptions
  ): EngineMoveResult {
    const timeMs = Math.min(cfg.timeMs, opts.maxTimeMs ?? Infinity);
    const fullRoot = cfg.temperature > 0;
    const res: SearchResult = this.searcher.search(
      pos,
      {
        depth: cfg.depth,
        timeMs: Math.max(60, timeMs),
        fullRootScores: fullRoot,
      },
      gameHashes,
      opts.onInfo
    );

    // ── real-time learning: bias root scores toward the AI's adapted style ──
    if (fullRoot && res.rootScores && opts.styleBias && opts.styleBias.aggression !== 0) {
      const bonus = Math.max(-40, Math.min(40, opts.styleBias.aggression * 26));
      for (const r of res.rootScores) {
        if (Math.abs(r.score) < 5000 && (r.move & FLAG_CAPTURE) !== 0) {
          r.score += bonus;
        }
      }
    }

    let chosen = res.bestMove;
    if (fullRoot && res.rootScores && res.rootScores.length > 0 && cfg.temperature > 0) {
      chosen = softmaxPick(res.rootScores, cfg.temperature, rng) ?? res.bestMove;
    }
    if (!chosen) chosen = pos.legalMoves()[0] ?? 0;

    // report the score of the move actually played (not just the best one)
    const chosenScore = res.rootScores?.find((r) => r.move === chosen)?.score;
    const finalScore = chosenScore !== undefined ? chosenScore : res.score;

    const mateIn = mateDistance(finalScore);
    const scoreWhite =
      pos.side === 0 ? clampEval(finalScore) : -clampEval(finalScore);
    return {
      uci: moveToUci(chosen),
      score: clampEval(finalScore),
      scoreWhite,
      mateIn: mateIn === null ? null : pos.side === 0 ? mateIn : -mateIn,
      depth: res.depth,
      nodes: res.nodes,
      timeMs: res.timeMs,
      pv: res.pv.map(moveToUci),
      fromBook: false,
      considered: res.rootScores?.map((r) => ({
        uci: moveToUci(r.move),
        score: clampEval(r.score),
      })),
    };
  }

  /** fixed-depth analysis: best move + score (white POV).
   *  Always time-capped so callers (hint button, eval bar, coach) get an
   *  answer fast — analysis must never hang, whatever the position. */
  analyze(fen: string, movesUci: string[], depth = 8, timeMs = 1500): EngineMoveResult {
    const pos = new Position(fen);
    const gameHashes: number[] = [pos.hash];
    for (const uci of movesUci) {
      const m = pos.findMove(uci);
      if (!m) break;
      pos.makeMove(m);
      gameHashes.push(pos.hash);
    }
    const res = this.searcher.search(pos, { depth, timeMs }, gameHashes);
    const best = res.bestMove || pos.legalMoves()[0] || 0;
    const mateIn = mateDistance(res.score);
    const scoreWhite = pos.side === 0 ? clampEval(res.score) : -clampEval(res.score);
    return {
      uci: moveToUci(best),
      score: clampEval(res.score),
      scoreWhite,
      mateIn: mateIn === null ? null : pos.side === 0 ? mateIn : -mateIn,
      depth: res.depth,
      nodes: res.nodes,
      timeMs: res.timeMs,
      pv: res.pv.map(moveToUci),
      fromBook: false,
    };
  }
}

const MATE_THRESHOLD = 29000;

/** distance to mate in plies (even = mover mates), null if not a mate score */
function mateDistance(score: number): number | null {
  if (score > MATE_THRESHOLD) return MATE_SCORE - score;
  if (score < -MATE_THRESHOLD) return -(MATE_SCORE + score);
  return null;
}

function clampEval(score: number): number {
  if (score > 2000) return 2000;
  if (score < -2000) return -2000;
  return score;
}

/** pure static evaluation (white POV) — used for book moves */
function staticEvalWhite(pos: Position): number {
  const raw = evaluate(pos); // side-to-move POV
  return pos.side === 0 ? raw : -raw;
}

/** temperature-based move selection (softmax over centipawn scores) */
function softmaxPick(
  scores: { move: number; score: number }[],
  temperature: number,
  rng: () => number
): number | null {
  if (scores.length === 0) return null;
  const T = Math.max(0.001, temperature);
  // normalize: use best as reference to avoid overflow
  const best = Math.max(...scores.map((s) => s.score));
  const weights = scores.map((s) => Math.exp((s.score - best) / T));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < scores.length; i++) {
    r -= weights[i];
    if (r <= 0) return scores[i].move;
  }
  return scores[scores.length - 1].move;
}

export type { Color };
export { START_FEN };
