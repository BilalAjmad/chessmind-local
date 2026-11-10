// ─── Position: 0x88 board, full rules, make/unmake, FEN ────────────────────
import {
  EMPTY, WHITE, BLACK, PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING,
  wK, bK, wP, bP,
  CASTLE_WK, CASTLE_WQ, CASTLE_BK, CASTLE_BQ,
  FILE, RANK, ON_BOARD, SQUARE, sqToAlg,
  makeMove, mFrom, mTo, mPromo, mFlags,
  FLAG_CAPTURE, FLAG_DOUBLE, FLAG_EP, FLAG_CASTLE_K, FLAG_CASTLE_Q, FLAG_PROMO,
  pieceColor, pieceType, moveToUci, uciToMoveParts,
  START_FEN, MATE_SCORE,
  type Color, type GameOutcome,
} from "./types";
import {
  PIECE_HASH, PIECE_LOCK, CASTLE_HASH, CASTLE_LOCK,
  EP_HASH, EP_LOCK, SIDE_HASH, SIDE_LOCK,
} from "./zobrist";

// Attack offsets (0x88)
const KNIGHT_OFFS = [33, 31, 18, 14, -33, -31, -18, -14];
const BISHOP_OFFS = [17, 15, -17, -15];
const ROOK_OFFS = [16, 1, -16, -1];
const KING_OFFS = [17, 16, 15, 1, -1, -15, -16, -17];

export const WHITE_PROMO_RANK = 7; // 0-based rank index (rank 8)
export const BLACK_PROMO_RANK = 0;

export interface HistEntry {
  move: number;
  captured: number;
  castling: number;
  ep: number;
  halfmove: number;
  hash: number;
  lock: number;
}

export class Position {
  squares = new Int8Array(128);
  side: Color = WHITE;
  castling = CASTLE_WK | CASTLE_WQ | CASTLE_BK | CASTLE_BQ;
  ep = -1; // en-passant target square (0x88) or -1
  halfmove = 0;
  fullmove = 1;
  hash = 0;
  lock = 0;
  hist: HistEntry[] = [];
  kingSq: [number, number] = [-1, -1]; // cached king squares [white, black]

  constructor(fen: string = START_FEN) {
    this.setFen(fen);
  }

  clone(): Position {
    const p = new Position(this.boardOnlyFen());
    p.ep = this.ep;
    p.halfmove = this.halfmove;
    p.fullmove = this.fullmove;
    // rebuild hash exactly
    p.hash = this.hash;
    p.lock = this.lock;
    return p;
  }

  private boardOnlyFen(): string {
    let str = "";
    for (let r = 7; r >= 0; r--) {
      let empty = 0;
      for (let f = 0; f < 8; f++) {
        const pc = this.squares[SQUARE(f, r)];
        if (pc === EMPTY) empty++;
        else {
          if (empty) { str += empty; empty = 0; }
          str += FEN_CHAR[pc];
        }
      }
      if (empty) str += empty;
      if (r > 0) str += "/";
    }
    return str + " " + (this.side === WHITE ? "w" : "b") + " - - 0 1";
  }

  setFen(fen: string): void {
    const parts = fen.trim().split(/\s+/);
    this.squares.fill(EMPTY);
    let rank = 7, file = 0;
    for (const ch of parts[0]) {
      if (ch === "/") { rank--; file = 0; }
      else if (ch >= "1" && ch <= "8") file += Number(ch);
      else {
        this.squares[SQUARE(file, rank)] = FEN_CODE[ch];
        file++;
      }
    }
    this.side = parts[1] === "w" ? WHITE : BLACK;
    this.castling = 0;
    if (parts[2] && parts[2] !== "-") {
      if (parts[2].includes("K")) this.castling |= CASTLE_WK;
      if (parts[2].includes("Q")) this.castling |= CASTLE_WQ;
      if (parts[2].includes("k")) this.castling |= CASTLE_BK;
      if (parts[2].includes("q")) this.castling |= CASTLE_BQ;
    }
    this.ep = parts[3] && parts[3] !== "-" ? SQUARE(parts[3].charCodeAt(0) - 97, Number(parts[3][1]) - 1) : -1;
    this.halfmove = parts[4] ? Number(parts[4]) : 0;
    this.fullmove = parts[5] ? Number(parts[5]) : 1;
    this.hist = [];
    this.recomputeHash();
  }

  fen(): string {
    let str = this.boardOnlyFen();
    // boardOnlyFen built without ep/castle; rebuild properly
    let board = "";
    for (let r = 7; r >= 0; r--) {
      let empty = 0;
      for (let f = 0; f < 8; f++) {
        const pc = this.squares[SQUARE(f, r)];
        if (pc === EMPTY) empty++;
        else {
          if (empty) { board += empty; empty = 0; }
          board += FEN_CHAR[pc];
        }
      }
      if (empty) board += empty;
      if (r > 0) board += "/";
    }
    const c =
      (this.castling & CASTLE_WK ? "K" : "") +
      (this.castling & CASTLE_WQ ? "Q" : "") +
      (this.castling & CASTLE_BK ? "k" : "") +
      (this.castling & CASTLE_BQ ? "q" : "");
    str = `${board} ${this.side === WHITE ? "w" : "b"} ${c || "-"} ${
      this.ep >= 0 ? sqToAlg(this.ep) : "-"
    } ${this.halfmove} ${this.fullmove}`;
    return str;
  }

  recomputeHash(): void {
    let h = 0, l = 0;
    for (let s = 0; s < 128; s++) {
      if (s & 0x88) continue;
      const pc = this.squares[s];
      if (pc !== EMPTY) {
        h ^= PIECE_HASH[pc * 128 + s];
        l ^= PIECE_LOCK[pc * 128 + s];
      }
    }
    h ^= CASTLE_HASH[this.castling]; l ^= CASTLE_LOCK[this.castling];
    if (this.ep >= 0) { h ^= EP_HASH[FILE(this.ep)]; l ^= EP_LOCK[FILE(this.ep)]; }
    if (this.side === BLACK) { h ^= SIDE_HASH; l ^= SIDE_LOCK; }
    this.hash = h | 0;
    this.lock = l | 0;
    this.kingSq[WHITE] = this.kingSquare(WHITE);
    this.kingSq[BLACK] = this.kingSquare(BLACK);
  }

  kingSquare(color: Color): number {
    const target = color === WHITE ? wK : bK;
    for (let s = 0; s < 128; s++) {
      if (s & 0x88) continue;
      if (this.squares[s] === target) return s;
    }
    return -1;
  }

  // ─── Attack detection ────────────────────────────────────────────────────
  isSquareAttacked(sq: number, by: Color): boolean {
    const b = this.squares;
    // pawns
    const pawn = by === WHITE ? wP : bP;
    if (by === WHITE) {
      if (ON_BOARD(sq - 17) && b[sq - 17] === pawn) return true;
      if (ON_BOARD(sq - 15) && b[sq - 15] === pawn) return true;
    } else {
      if (ON_BOARD(sq + 17) && b[sq + 17] === pawn) return true;
      if (ON_BOARD(sq + 15) && b[sq + 15] === pawn) return true;
    }
    // knights
    const knight = by === WHITE ? 2 : 10;
    for (let i = 0; i < 8; i++) {
      const t = sq + KNIGHT_OFFS[i];
      if (ON_BOARD(t) && b[t] === knight) return true;
    }
    // king
    const king = by === WHITE ? wK : bK;
    for (let i = 0; i < 8; i++) {
      const t = sq + KING_OFFS[i];
      if (ON_BOARD(t) && b[t] === king) return true;
    }
    // bishops/queens
    const bq = by === WHITE ? [3, 5] : [11, 13];
    for (let i = 0; i < 4; i++) {
      const off = BISHOP_OFFS[i];
      let t = sq + off;
      while (ON_BOARD(t)) {
        const pc = b[t];
        if (pc !== EMPTY) {
          const ty = pc & 7;
          if (pc >> 3 === by && (ty === BISHOP || ty === QUEEN)) return true;
          break;
        }
        t += off;
      }
    }
    // rooks/queens
    for (let i = 0; i < 4; i++) {
      const off = ROOK_OFFS[i];
      let t = sq + off;
      while (ON_BOARD(t)) {
        const pc = b[t];
        if (pc !== EMPTY) {
          const ty = pc & 7;
          if (pc >> 3 === by && (ty === ROOK || ty === QUEEN)) return true;
          break;
        }
        t += off;
      }
    }
    return false;
  }

  inCheck(color: Color = this.side): boolean {
    const k = this.kingSq[color];
    if (k < 0) return false;
    return this.isSquareAttacked(k, (color ^ 1) as Color);
  }

  // ─── Move generation (pseudo-legal) ──────────────────────────────────────
  generateMoves(capturesOnly = false): number[] {
    return this.genInto([], capturesOnly);
  }

  /** Pseudo-legal move generation writing into a reusable array (no allocation) */
  genInto(moves: number[], capturesOnly = false): number[] {
    moves.length = 0;
    const b = this.squares;
    const us = this.side;
    const them = (us ^ 1) as Color;
    const dir = us === WHITE ? 16 : -16;
    const startRank = us === WHITE ? 1 : 6;
    const promoRank = us === WHITE ? 7 : 0;

    for (let s = 0; s < 128; s++) {
      if (s & 0x88) continue;
      const pc = b[s];
      if (pc === EMPTY || pieceColor(pc) !== us) continue;
      const ty = pieceType(pc);

      if (ty === PAWN) {
        const one = s + dir;
        if (ON_BOARD(one) && b[one] === EMPTY && !capturesOnly) {
          if (RANK(one) === promoRank) {
            moves.push(makeMove(s, one, QUEEN, FLAG_PROMO));
            moves.push(makeMove(s, one, ROOK, FLAG_PROMO));
            moves.push(makeMove(s, one, BISHOP, FLAG_PROMO));
            moves.push(makeMove(s, one, KNIGHT, FLAG_PROMO));
          } else {
            moves.push(makeMove(s, one));
            const two = one + dir;
            if (RANK(s) === startRank && b[two] === EMPTY)
              moves.push(makeMove(s, two, 0, FLAG_DOUBLE));
          }
        }
        for (let k = 0; k < 2; k++) {
          const d = k === 0 ? dir - 1 : dir + 1;
          const t = s + d;
          if (!ON_BOARD(t)) continue;
          const tp = b[t];
          if (tp !== EMPTY && pieceColor(tp) === them) {
            if (RANK(t) === promoRank) {
              moves.push(makeMove(s, t, QUEEN, FLAG_CAPTURE | FLAG_PROMO));
              moves.push(makeMove(s, t, ROOK, FLAG_CAPTURE | FLAG_PROMO));
              moves.push(makeMove(s, t, BISHOP, FLAG_CAPTURE | FLAG_PROMO));
              moves.push(makeMove(s, t, KNIGHT, FLAG_CAPTURE | FLAG_PROMO));
            } else {
              moves.push(makeMove(s, t, 0, FLAG_CAPTURE));
            }
          } else if (t === this.ep && tp === EMPTY) {
            moves.push(makeMove(s, t, 0, FLAG_CAPTURE | FLAG_EP));
          }
        }
      } else if (ty === KNIGHT || ty === KING) {
        const offs = ty === KNIGHT ? KNIGHT_OFFS : KING_OFFS;
        for (let i = 0; i < 8; i++) {
          const t = s + offs[i];
          if (!ON_BOARD(t)) continue;
          const tp = b[t];
          if (tp === EMPTY) {
            if (!capturesOnly) moves.push(makeMove(s, t));
          } else if (pieceColor(tp) === them)
            moves.push(makeMove(s, t, 0, FLAG_CAPTURE));
        }
      } else {
        const offs =
          ty === BISHOP ? BISHOP_OFFS : ty === ROOK ? ROOK_OFFS : KING_OFFS;
        const n = ty === QUEEN ? 8 : 4;
        for (let i = 0; i < n; i++) {
          let t = s + offs[i];
          while (ON_BOARD(t)) {
            const tp = b[t];
            if (tp === EMPTY) {
              if (!capturesOnly) moves.push(makeMove(s, t));
            } else {
              if (pieceColor(tp) === them)
                moves.push(makeMove(s, t, 0, FLAG_CAPTURE));
              break;
            }
            t += offs[i];
          }
        }
      }
    }

    // Castling
    if (!capturesOnly) {
      if (us === WHITE) {
        if (
          this.castling & CASTLE_WK &&
          b[5] === EMPTY && b[6] === EMPTY &&
          !this.isSquareAttacked(4, BLACK) &&
          !this.isSquareAttacked(5, BLACK) &&
          !this.isSquareAttacked(6, BLACK)
        )
          moves.push(makeMove(4, 6, 0, FLAG_CASTLE_K));
        if (
          this.castling & CASTLE_WQ &&
          b[3] === EMPTY && b[2] === EMPTY && b[1] === EMPTY &&
          !this.isSquareAttacked(4, BLACK) &&
          !this.isSquareAttacked(3, BLACK) &&
          !this.isSquareAttacked(2, BLACK)
        )
          moves.push(makeMove(4, 2, 0, FLAG_CASTLE_Q));
      } else {
        if (
          this.castling & CASTLE_BK &&
          b[0x75] === EMPTY && b[0x76] === EMPTY &&
          !this.isSquareAttacked(0x74, WHITE) &&
          !this.isSquareAttacked(0x75, WHITE) &&
          !this.isSquareAttacked(0x76, WHITE)
        )
          moves.push(makeMove(0x74, 0x76, 0, FLAG_CASTLE_K));
        if (
          this.castling & CASTLE_BQ &&
          b[0x73] === EMPTY && b[0x72] === EMPTY && b[0x71] === EMPTY &&
          !this.isSquareAttacked(0x74, WHITE) &&
          !this.isSquareAttacked(0x73, WHITE) &&
          !this.isSquareAttacked(0x72, WHITE)
        )
          moves.push(makeMove(0x74, 0x72, 0, FLAG_CASTLE_Q));
      }
    }
    return moves;
  }

  /** Fully legal moves (filters king-left-in-check) */
  legalMoves(): number[] {
    const out: number[] = [];
    const pseudo = this.generateMoves();
    const us = this.side;
    for (const m of pseudo) {
      this.makeMove(m);
      if (!this.inCheck(us)) out.push(m);
      this.undoMove();
    }
    return out;
  }

  /** Legal moves filtered to matching from/to/promotion (for UI) */
  movesFrom(from: number): number[] {
    return this.legalMoves().filter((m) => mFrom(m) === from);
  }

  findMove(uci: string): number {
    const { from, to, promo } = uciToMoveParts(uci);
    for (const m of this.legalMoves()) {
      if (mFrom(m) === from && mTo(m) === to && mPromo(m) === promo) return m;
    }
    return 0;
  }

  // ─── Make / undo ─────────────────────────────────────────────────────────
  makeMove(m: number): void {
    const b = this.squares;
    const from = mFrom(m), to = mTo(m), promo = mPromo(m), flags = mFlags(m);
    const pc = b[from];
    const us = this.side;
    const captured = (flags & FLAG_EP) ? b[to - (us === WHITE ? 16 : -16)] : b[to];

    this.hist.push({
      move: m, captured,
      castling: this.castling, ep: this.ep,
      halfmove: this.halfmove, hash: this.hash, lock: this.lock,
    });

    // hash out old ep/castle
    let h = this.hash, l = this.lock;
    h ^= CASTLE_HASH[this.castling]; l ^= CASTLE_LOCK[this.castling];
    if (this.ep >= 0) { h ^= EP_HASH[FILE(this.ep)]; l ^= EP_LOCK[FILE(this.ep)]; }

    // remove captured (ep square holds empty; pawn is behind)
    if (flags & FLAG_EP) {
      const capSq = to - (us === WHITE ? 16 : -16);
      h ^= PIECE_HASH[b[capSq] * 128 + capSq]; l ^= PIECE_LOCK[b[capSq] * 128 + capSq];
      b[capSq] = EMPTY;
    } else if (captured !== EMPTY) {
      h ^= PIECE_HASH[captured * 128 + to]; l ^= PIECE_LOCK[captured * 128 + to];
    }

    // move piece
    h ^= PIECE_HASH[pc * 128 + from]; l ^= PIECE_LOCK[pc * 128 + from];
    b[to] = promo ? (promo | (us << 3)) : pc;
    b[from] = EMPTY;
    h ^= PIECE_HASH[b[to] * 128 + to]; l ^= PIECE_LOCK[b[to] * 128 + to];
    if ((pc & 7) === KING) this.kingSq[us] = to;

    // rook move for castling
    if (flags & FLAG_CASTLE_K) {
      const rFrom = us === WHITE ? 7 : 0x77;
      const rTo = us === WHITE ? 5 : 0x75;
      const rk = b[rFrom];
      h ^= PIECE_HASH[rk * 128 + rFrom] ^ PIECE_HASH[rk * 128 + rTo];
      l ^= PIECE_LOCK[rk * 128 + rFrom] ^ PIECE_LOCK[rk * 128 + rTo];
      b[rTo] = rk; b[rFrom] = EMPTY;
    } else if (flags & FLAG_CASTLE_Q) {
      const rFrom = us === WHITE ? 0 : 0x70;
      const rTo = us === WHITE ? 3 : 0x73;
      const rk = b[rFrom];
      h ^= PIECE_HASH[rk * 128 + rFrom] ^ PIECE_HASH[rk * 128 + rTo];
      l ^= PIECE_LOCK[rk * 128 + rFrom] ^ PIECE_LOCK[rk * 128 + rTo];
      b[rTo] = rk; b[rFrom] = EMPTY;
    }

    // castling rights
    this.castling &= CASTLE_MASK[from] & CASTLE_MASK[to];
    h ^= CASTLE_HASH[this.castling]; l ^= CASTLE_LOCK[this.castling];

    // ep square
    this.ep = flags & FLAG_DOUBLE ? from + (us === WHITE ? 16 : -16) : -1;
    if (this.ep >= 0) { h ^= EP_HASH[FILE(this.ep)]; l ^= EP_LOCK[FILE(this.ep)]; }

    // halfmove clock
    const movedType = pieceType(pc);
    if (movedType === PAWN || captured !== EMPTY || flags & FLAG_EP) this.halfmove = 0;
    else this.halfmove++;

    if (us === BLACK) this.fullmove++;
    this.side = (us ^ 1) as Color;
    h ^= SIDE_HASH; l ^= SIDE_LOCK;
    this.hash = h | 0; this.lock = l | 0;
  }

  undoMove(): void {
    const e = this.hist.pop();
    if (!e) return;
    const b = this.squares;
    const m = e.move;
    const from = mFrom(m), to = mTo(m), promo = mPromo(m), flags = mFlags(m);
    // mover = the side that made this move (current side flipped back)
    this.side = (this.side ^ 1) as Color;
    const mover = this.side;

    b[from] = promo ? (PAWN | (mover << 3)) : b[to];
    b[to] = EMPTY;
    if ((b[from] & 7) === KING) this.kingSq[mover] = from;

    if (flags & FLAG_EP) {
      b[to - (mover === WHITE ? 16 : -16)] = e.captured;
    } else if (e.captured !== EMPTY) {
      b[to] = e.captured;
    }

    if (flags & FLAG_CASTLE_K) {
      const rFrom = mover === WHITE ? 7 : 0x77;
      const rTo = mover === WHITE ? 5 : 0x75;
      b[rFrom] = b[rTo]; b[rTo] = EMPTY;
    } else if (flags & FLAG_CASTLE_Q) {
      const rFrom = mover === WHITE ? 0 : 0x70;
      const rTo = mover === WHITE ? 3 : 0x73;
      b[rFrom] = b[rTo]; b[rTo] = EMPTY;
    }

    this.castling = e.castling;
    this.ep = e.ep;
    this.halfmove = e.halfmove;
    this.hash = e.hash;
    this.lock = e.lock;
    if (mover === BLACK) this.fullmove--;
  }

  /** Make a "null move" (pass turn) — for null-move pruning */
  makeNull(): void {
    this.hist.push({
      move: 0, captured: EMPTY, castling: this.castling, ep: this.ep,
      halfmove: this.halfmove, hash: this.hash, lock: this.lock,
    });
    let h = this.hash, l = this.lock;
    if (this.ep >= 0) { h ^= EP_HASH[FILE(this.ep)]; l ^= EP_LOCK[FILE(this.ep)]; }
    this.ep = -1;
    this.side = (this.side ^ 1) as Color;
    h ^= SIDE_HASH; l ^= SIDE_LOCK;
    this.hash = h | 0; this.lock = l | 0;
  }

  undoNull(): void {
    const e = this.hist.pop();
    if (!e) return;
    this.side = (this.side ^ 1) as Color;
    this.castling = e.castling; this.ep = e.ep;
    this.halfmove = e.halfmove; this.hash = e.hash; this.lock = e.lock;
  }

  // ─── Game end detection ──────────────────────────────────────────────────
  /** hashes of all positions since last irreversible move (for repetition) */
  repetitionKeys(): number[] {
    const keys: number[] = [];
    // include positions before root (game history) by replaying is expensive;
    // caller supplies prior hashes — see engine. Here: hist-based only.
    const start = Math.max(0, this.hist.length - this.halfmove);
    for (let i = start; i < this.hist.length; i++) keys.push(this.hist[i].hash);
    keys.push(this.hash);
    return keys;
  }

  countRepetitions(): number {
    const keys = this.repetitionKeys();
    const current = keys[keys.length - 1];
    let count = 0;
    for (const k of keys) if (k === current) count++;
    return count;
  }

  insufficientMaterial(): boolean {
    let minorW = 0, minorB = 0, other = false;
    let bishopsW: number[] = [], bishopsB: number[] = [];
    for (let s = 0; s < 128; s++) {
      if (s & 0x88) continue;
      const pc = this.squares[s];
      if (pc === EMPTY) continue;
      const ty = pieceType(pc);
      if (ty === KING) continue;
      if (ty === KNIGHT) {
        if (pc >> 3) minorB++; else minorW++;
      } else if (ty === BISHOP) {
        const colorSq = ((FILE(s) + RANK(s)) & 1);
        if (pc >> 3) { minorB++; bishopsB.push(colorSq); }
        else { minorW++; bishopsW.push(colorSq); }
      } else other = true;
    }
    if (other) return false;
    if (minorW === 0 && minorB === 0) return true; // K vs K
    if (minorW + minorB === 1) return true; // K+minor vs K
    if (minorW === 1 && minorB === 1 && bishopsW.length === 1 && bishopsB.length === 1 &&
        bishopsW[0] === bishopsB[0]) return true; // same-color bishops
    return false;
  }

  /** Outcome assuming side to move must act (plus prior repetition count) */
  outcome(priorHashes: number[] = []): GameOutcome {
    const legal = this.legalMoves();
    if (legal.length === 0) {
      if (this.inCheck()) return { over: true, winner: (this.side ^ 1) as Color, reason: "checkmate" };
      return { over: true, winner: null, reason: "stalemate" };
    }
    if (this.halfmove >= 100) return { over: true, winner: null, reason: "fifty-move" };
    if (this.insufficientMaterial()) return { over: true, winner: null, reason: "insufficient-material" };
    const all = [...priorHashes, this.hash];
    let count = 0;
    for (const k of all) if (k === this.hash) count++;
    if (count >= 3) return { over: true, winner: null, reason: "repetition" };
    return { over: false };
  }

  /** Is move giving check? (for SAN) */
  moveGivesCheck(m: number): boolean {
    this.makeMove(m);
    const ch = this.inCheck();
    this.undoMove();
    return ch;
  }

  pieceAt(sq: number): number {
    return this.squares[sq];
  }
}

// castling rights removed when these squares are touched
const CASTLE_MASK = new Int8Array(128).fill(15);
CASTLE_MASK[4] = 15 & ~CASTLE_WK & ~CASTLE_WQ; // e1
CASTLE_MASK[0] = 15 & ~CASTLE_WQ; // a1
CASTLE_MASK[7] = 15 & ~CASTLE_WK; // h1
CASTLE_MASK[0x74] = 15 & ~CASTLE_BK & ~CASTLE_BQ; // e8
CASTLE_MASK[0x70] = 15 & ~CASTLE_BQ; // a8
CASTLE_MASK[0x77] = 15 & ~CASTLE_BK; // h8

const FEN_CODE: Record<string, number> = {
  P: 1, N: 2, B: 3, R: 4, Q: 5, K: 6,
  p: 9, n: 10, b: 11, r: 12, q: 13, k: 14,
};
const FEN_CHAR: Record<number, string> = {
  1: "P", 2: "N", 3: "B", 4: "R", 5: "Q", 6: "K",
  9: "p", 10: "n", 11: "b", 12: "r", 13: "q", 14: "k",
};

export { moveToUci, MATE_SCORE };
