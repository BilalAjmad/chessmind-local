// ─── Search: iterative deepening alpha-beta + quiescence + TT ───────────────
import { Position } from "./board";
import { evaluate, hasNonPawnMaterial } from "./eval";
import {
  mFrom, mTo, mPromo,
  FLAG_CAPTURE, FLAG_PROMO, FLAG_EP,
  PAWN, QUEEN,
  MATE_SCORE, INFINITE, WHITE,
  type Color,
} from "./types";

const TT_SIZE = 1 << 20; // 1M entries
const TT_MASK = TT_SIZE - 1;
const FLAG_EXACT = 0, FLAG_LOWER = 1, FLAG_UPPER = 2;

const MAX_PLY = 64;
const VALUE_CAPTURE_BASE = 1_000_000;
const KILLER_SCORE = 900_000;
const HISTORY_CAP = 800_000;
const MATE_BOUND = MATE_SCORE - 2000;

export interface SearchLimits {
  depth?: number;
  timeMs?: number;
  nodes?: number;
  /** evaluate every root move with a full window (for softmax move choice) */
  fullRootScores?: boolean;
}

export interface RootScore {
  move: number;
  score: number;
}

export interface SearchResult {
  bestMove: number;
  score: number;
  depth: number;
  nodes: number;
  timeMs: number;
  pv: number[];
  rootScores?: RootScore[];
  completed: boolean;
}

export interface SearchInfo {
  depth: number;
  score: number;
  nodes: number;
  timeMs: number;
  pv: number[];
}

export class Searcher {
  private ttKey = new Int32Array(TT_SIZE);
  private ttLock = new Int32Array(TT_SIZE);
  private ttMove = new Int32Array(TT_SIZE);
  private ttScore = new Int32Array(TT_SIZE);
  private ttDepth = new Int8Array(TT_SIZE);
  private ttFlag = new Uint8Array(TT_SIZE);

  private killers = new Int32Array(MAX_PLY * 2);
  private history = new Int32Array(15 * 128);

  private moveLists: number[][] = [];
  private scoreLists: number[][] = [];

  private nodes = 0;
  private deadline = Infinity;
  private nodeLimit = Infinity;
  private stopped = false;

  private hashHist: number[] = [];
  private startTime = 0;

  clear(): void {
    this.ttKey.fill(0);
    this.ttLock.fill(0);
    this.ttMove.fill(0);
    this.ttScore.fill(0);
    this.ttDepth.fill(0);
    this.ttFlag.fill(0);
    this.clearHistory();
  }

  clearHistory(): void {
    this.history.fill(0);
    this.killers.fill(0);
  }

  private listAt(ply: number): number[] {
    while (this.moveLists.length <= ply) this.moveLists.push([]);
    return this.moveLists[ply];
  }
  private scoresAt(ply: number): number[] {
    while (this.scoreLists.length <= ply) this.scoreLists.push([]);
    return this.scoreLists[ply];
  }

  private timeUp(): boolean {
    if (this.stopped) return true;
    if ((this.nodes & 1023) === 0 && Date.now() >= this.deadline) {
      this.stopped = true;
    }
    return this.stopped;
  }

  search(
    pos: Position,
    limits: SearchLimits,
    gameHashes: number[] = [],
    onInfo?: (info: SearchInfo) => void
  ): SearchResult {
    this.nodes = 0;
    this.stopped = false;
    this.startTime = Date.now();
    this.deadline = limits.timeMs ? this.startTime + limits.timeMs : Infinity;
    this.nodeLimit = limits.nodes ?? Infinity;
    const maxDepth = Math.min(limits.depth ?? MAX_PLY, MAX_PLY);

    // hash history = all game positions (incl. root) + search-path ancestors
    this.hashHist = [...gameHashes];

    const rootMoves = pos.legalMoves();
    if (rootMoves.length === 0) {
      return {
        bestMove: 0,
        score: pos.inCheck() ? -MATE_SCORE : 0,
        depth: 0, nodes: 0, timeMs: 0, pv: [], completed: true,
      };
    }

    let bestMove = rootMoves[0];
    let bestScore = -INFINITE;
    let completedDepth = 0;
    let prevScores: RootScore[] = rootMoves.map((m) => ({ move: m, score: 0 }));
    let fullScores: RootScore[] | undefined;

    const rootHash = pos.hash;

    for (let depth = 1; depth <= maxDepth; depth++) {
      let iterBest = 0;
      let iterScore = -INFINITE;

      if (limits.fullRootScores) {
        // honest score for every root move (full window, no root pruning)
        const scores: RootScore[] = [];
        for (const m of rootMoves) {
          pos.makeMove(m);
          this.hashHist.push(rootHash);
          const sc = this.timeUp()
            ? -INFINITE
            : -this.alphaBeta(pos, depth - 1, -INFINITE, INFINITE - 1, 1, false);
          this.hashHist.pop();
          pos.undoMove();
          if (this.stopped) break;
          scores.push({ move: m, score: sc });
        }
        if (!this.stopped && scores.length === rootMoves.length) {
          scores.sort((a, b) => b.score - a.score);
          fullScores = scores;
          iterBest = scores[0].move;
          iterScore = scores[0].score;
        }
      } else {
        // standard root loop with alpha-beta
        let alpha = -INFINITE;
        const ordered = [...rootMoves].sort(
          (a, b) =>
            (prevScores.find((r) => r.move === b)?.score ?? 0) -
            (prevScores.find((r) => r.move === a)?.score ?? 0)
        );
        for (const m of ordered) {
          pos.makeMove(m);
          this.hashHist.push(rootHash);
          const sc = this.timeUp()
            ? -INFINITE
            : -this.alphaBeta(pos, depth - 1, -INFINITE, -alpha, 1, true);
          this.hashHist.pop();
          pos.undoMove();
          if (this.stopped) break;
          if (sc > alpha) {
            alpha = sc;
            iterBest = m;
          }
        }
        if (!this.stopped) {
          iterScore = alpha;
          prevScores = prevScores.map((r) =>
            r.move === iterBest ? { move: r.move, score: alpha } : r
          );
        }
      }

      if (this.stopped || iterBest === 0) break;

      bestMove = iterBest;
      bestScore = iterScore;
      completedDepth = depth;

      onInfo?.({
        depth,
        score: bestScore,
        nodes: this.nodes,
        timeMs: Date.now() - this.startTime,
        pv: this.extractPv(pos, bestMove, depth),
      });

      if (Math.abs(bestScore) >= MATE_BOUND) break; // mate found
      const elapsed = Date.now() - this.startTime;
      if (limits.timeMs && elapsed > limits.timeMs * 0.55) break; // next depth won't finish
    }

    return {
      bestMove,
      score: bestScore,
      depth: completedDepth,
      nodes: this.nodes,
      timeMs: Date.now() - this.startTime,
      pv: this.extractPv(pos, bestMove, completedDepth),
      rootScores: fullScores,
      completed: completedDepth > 0,
    };
  }

  // ─── Main recursion ────────────────────────────────────────────────────────
  private alphaBeta(
    pos: Position,
    depth: number,
    alpha: number,
    beta: number,
    ply: number,
    isPv: boolean
  ): number {
    this.nodes++;

    if (this.timeUp()) return alpha;
    if (ply >= MAX_PLY - 1) return evaluate(pos);

    // draw detection (50-move + repetition vs game & search path)
    if (pos.halfmove >= 100) return 0;
    {
      const lim = Math.min(this.hashHist.length, pos.halfmove);
      for (let i = this.hashHist.length - lim; i < this.hashHist.length; i++) {
        if (this.hashHist[i] === pos.hash) return 0;
      }
    }

    const inCheck = pos.inCheck();
    if (inCheck) depth++; // check extension

    if (depth <= 0) return this.quiescence(pos, alpha, beta, ply);

    const nodeHash = pos.hash;
    const nodeLock = pos.lock;

    // ── TT probe ──
    const idx = (nodeHash >>> 0) & TT_MASK;
    let ttMove = 0;
    if (this.ttKey[idx] === nodeHash && this.ttLock[idx] === nodeLock) {
      ttMove = this.ttMove[idx];
      if (this.ttDepth[idx] >= depth && !isPv) {
        let sc = this.ttScore[idx];
        if (sc > MATE_BOUND) sc -= ply;
        else if (sc < -MATE_BOUND) sc += ply;
        const fl = this.ttFlag[idx];
        if (fl === FLAG_EXACT) return sc;
        if (fl === FLAG_LOWER && sc >= beta) return sc;
        if (fl === FLAG_UPPER && sc <= alpha) return sc;
      }
    }

    const us = pos.side;

    // ── null-move pruning ──
    if (
      !isPv && !inCheck && depth >= 3 &&
      Math.abs(beta) < MATE_BOUND &&
      hasNonPawnMaterial(pos, us)
    ) {
      pos.makeNull();
      this.hashHist.push(nodeHash);
      const r = depth > 6 ? 3 : 2;
      const sc = -this.alphaBeta(pos, depth - 1 - r, -beta, -beta + 1, ply + 1, false);
      this.hashHist.pop();
      pos.undoNull();
      if (this.stopped) return alpha;
      if (sc >= beta) return beta;
    }

    const moves = this.listAt(ply);
    pos.genInto(moves, false);
    const scores = this.scoresAt(ply);
    scores.length = 0;
    for (let i = 0; i < moves.length; i++) {
      scores.push(this.scoreMove(pos, moves[i], ttMove, ply));
    }

    let legalCount = 0;
    let bestScore = -INFINITE;
    let bestLocalMove = 0;
    const alphaOrig = alpha;

    for (let i = 0; i < moves.length; i++) {
      // incremental selection sort
      let bestI = i;
      for (let j = i + 1; j < moves.length; j++) {
        if (scores[j] > scores[bestI]) bestI = j;
      }
      if (bestI !== i) {
        const tm = moves[i]; moves[i] = moves[bestI]; moves[bestI] = tm;
        const ts = scores[i]; scores[i] = scores[bestI]; scores[bestI] = ts;
      }
      const m = moves[i];
      const isQuiet = (m & (FLAG_CAPTURE | FLAG_PROMO)) === 0;

      pos.makeMove(m);
      if (pos.inCheck(us)) {
        pos.undoMove();
        continue;
      }
      legalCount++;
      this.hashHist.push(nodeHash);

      let sc: number;
      if (depth >= 3 && legalCount > 4 && isQuiet && !inCheck) {
        const red = legalCount > 12 ? 2 : 1;
        sc = -this.alphaBeta(pos, depth - 1 - red, -alpha - 1, -alpha, ply + 1, false);
        if (sc > alpha) {
          sc = -this.alphaBeta(pos, depth - 1, -beta, -alpha, ply + 1, false);
        }
      } else {
        sc = -this.alphaBeta(pos, depth - 1, -beta, -alpha, ply + 1, isPv && legalCount === 1);
      }

      this.hashHist.pop();
      pos.undoMove();
      if (this.stopped) return alpha;

      if (sc > bestScore) {
        bestScore = sc;
        bestLocalMove = m;
        if (sc > alpha) {
          alpha = sc;
          if (alpha >= beta) {
            if (isQuiet) {
              const kBase = ply * 2;
              if (this.killers[kBase] !== m) {
                this.killers[kBase + 1] = this.killers[kBase];
                this.killers[kBase] = m;
              }
              const hIdx = pcAfterUndo(pos, m) * 128 + mTo(m);
              this.history[hIdx] += depth * depth;
              if (this.history[hIdx] > HISTORY_CAP) {
                for (let h = 0; h < this.history.length; h++) {
                  this.history[h] = (this.history[h] / 2) | 0;
                }
              }
            }
            break; // beta cutoff
          }
        }
      }
    }

    if (legalCount === 0) {
      return inCheck ? -MATE_SCORE + ply : 0;
    }

    // ── TT store ──
    let storeScore = bestScore;
    if (storeScore > MATE_BOUND) storeScore += ply;
    else if (storeScore < -MATE_BOUND) storeScore -= ply;
    const flag =
      bestScore <= alphaOrig ? FLAG_UPPER : bestScore >= beta ? FLAG_LOWER : FLAG_EXACT;

    this.ttKey[idx] = nodeHash;
    this.ttLock[idx] = nodeLock;
    this.ttMove[idx] = bestLocalMove;
    this.ttScore[idx] = storeScore;
    this.ttDepth[idx] = Math.min(depth, 127);
    this.ttFlag[idx] = flag;

    return bestScore;
  }

  // ─── Quiescence ────────────────────────────────────────────────────────────
  private quiescence(pos: Position, alpha: number, beta: number, ply: number): number {
    this.nodes++;
    if (this.timeUp()) return alpha;
    if (ply >= MAX_PLY - 1) return evaluate(pos);

    const inCheck = pos.inCheck();
    let stand = 0;
    if (!inCheck) {
      stand = evaluate(pos);
      if (stand >= beta) return stand;
      if (stand > alpha) alpha = stand;
      if (ply > 28) return stand;
    }

    const moves = this.listAt(ply);
    pos.genInto(moves, !inCheck);
    const scores = this.scoresAt(ply);
    scores.length = 0;
    for (let i = 0; i < moves.length; i++) {
      scores.push(this.scoreMove(pos, moves[i], 0, ply));
    }

    const us = pos.side;
    let best = inCheck ? -INFINITE : stand;
    let legalCount = 0;

    for (let i = 0; i < moves.length; i++) {
      let bestI = i;
      for (let j = i + 1; j < moves.length; j++) {
        if (scores[j] > scores[bestI]) bestI = j;
      }
      if (bestI !== i) {
        const tm = moves[i]; moves[i] = moves[bestI]; moves[bestI] = tm;
        const ts = scores[i]; scores[i] = scores[bestI]; scores[bestI] = ts;
      }
      const m = moves[i];

      // delta pruning
      if (!inCheck && (m & FLAG_PROMO) === 0) {
        const victim = pos.pieceAt(mTo(m));
        const vVal = victim ? VALUE[victim & 7] : m & FLAG_EP ? 100 : 0;
        if (stand + vVal + 200 <= alpha) continue;
      }

      pos.makeMove(m);
      if (pos.inCheck(us)) {
        pos.undoMove();
        continue;
      }
      legalCount++;
      const sc = -this.quiescence(pos, -beta, -alpha, ply + 1);
      pos.undoMove();
      if (this.stopped) return alpha;

      if (sc > best) {
        best = sc;
        if (sc > alpha) {
          alpha = sc;
          if (alpha >= beta) return sc;
        }
      }
    }

    if (inCheck && legalCount === 0) return -MATE_SCORE + ply;
    return best;
  }

  private scoreMove(pos: Position, m: number, ttMove: number, ply: number): number {
    if (m === ttMove) return VALUE_CAPTURE_BASE * 10;
    const to = mTo(m);
    const from = mFrom(m);
    const victim = pos.pieceAt(to);
    const promo = mPromo(m);
    if (victim !== 0 || (m & FLAG_EP)) {
      const vVal = victim ? VALUE[victim & 7] : 100;
      const aVal = VALUE[pos.pieceAt(from) & 7];
      return VALUE_CAPTURE_BASE + vVal * 16 - aVal + (promo ? 400 : 0);
    }
    if (promo === QUEEN) return VALUE_CAPTURE_BASE + 300;
    if (promo) return VALUE_CAPTURE_BASE - 200;
    const k = this.killers[ply * 2];
    if (k === m) return KILLER_SCORE;
    const k2 = this.killers[ply * 2 + 1];
    if (k2 === m) return KILLER_SCORE - 100;
    return this.history[pos.pieceAt(from) * 128 + to];
  }

  private extractPv(pos: Position, firstMove: number, maxLen: number): number[] {
    const pv: number[] = [];
    if (!firstMove) return pv;
    const seen = new Set<number>();
    let made = 0;
    let m = firstMove;
    while (m && made < maxLen + 8) {
      if (!pos.legalMoves().includes(m)) break;
      if (seen.has(pos.hash)) break;
      seen.add(pos.hash);
      pv.push(m);
      pos.makeMove(m);
      made++;
      const idx = (pos.hash >>> 0) & TT_MASK;
      m =
        this.ttKey[idx] === pos.hash && this.ttLock[idx] === pos.lock
          ? this.ttMove[idx]
          : 0;
    }
    while (made > 0) {
      pos.undoMove();
      made--;
    }
    return pv;
  }
}

/** moving piece code after the move has been undone */
function pcAfterUndo(pos: Position, m: number): number {
  return pos.pieceAt(mFrom(m));
}

const VALUE = [0, 100, 320, 330, 500, 900, 20000];

export function evalToWhitePov(score: number, sideToMove: Color): number {
  return sideToMove === WHITE ? score : -score;
}

export { PAWN, QUEEN };
