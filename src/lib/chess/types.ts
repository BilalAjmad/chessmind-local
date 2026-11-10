// ─── Core chess types & constants (0x88 board representation) ───────────────

export const EMPTY = 0;
// Piece codes: bit 3 = color (0 white, 1 black), bits 0-2 = type
export const WHITE = 0;
export const BLACK = 1;

export const PAWN = 1;
export const KNIGHT = 2;
export const BISHOP = 3;
export const ROOK = 4;
export const QUEEN = 5;
export const KING = 6;

export const wP = 1, wN = 2, wB = 3, wR = 4, wQ = 5, wK = 6;
export const bP = 9, bN = 10, bB = 11, bR = 12, bQ = 13, bK = 14;

export type Color = 0 | 1;
export type PieceType = 1 | 2 | 3 | 4 | 5 | 6;

export const pieceColor = (code: number): Color => (code >> 3) as Color;
export const pieceType = (code: number): PieceType => (code & 7) as PieceType;

// Castling right bits
export const CASTLE_WK = 1;
export const CASTLE_WQ = 2;
export const CASTLE_BK = 4;
export const CASTLE_BQ = 8;

// 0x88 helpers
export const FILE = (sq: number) => sq & 7;
export const RANK = (sq: number) => sq >> 4;
export const ON_BOARD = (sq: number) => (sq & 0x88) === 0;
export const SQUARE = (file: number, rank: number) => rank * 16 + file;

/** Convert 0x88 index to algebraic (a1=0 .. h8=119) */
export function sqToAlg(sq: number): string {
  return String.fromCharCode(97 + FILE(sq)) + (RANK(sq) + 1);
}
/** Convert algebraic to 0x88 index */
export function algToSq(s: string): number {
  return SQUARE(s.charCodeAt(0) - 97, Number(s[1]) - 1);
}

export const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

// ─── Move encoding (packed integer) ─────────────────────────────────────────
// bits 0-6   : from square
// bits 7-13  : to square
// bits 14-16 : promotion piece type (0 = none)
// bits 17-21 : flags
export const FLAG_CAPTURE = 1 << 17;
export const FLAG_DOUBLE = 1 << 18; // pawn double push
export const FLAG_EP = 1 << 19; // en passant capture
export const FLAG_CASTLE_K = 1 << 20;
export const FLAG_CASTLE_Q = 1 << 21;
export const FLAG_PROMO = 1 << 22;

export function makeMove(
  from: number,
  to: number,
  promo = 0,
  flags = 0
): number {
  return from | (to << 7) | (promo << 14) | flags;
}
export const mFrom = (m: number) => m & 0x7f;
export const mTo = (m: number) => (m >> 7) & 0x7f;
export const mPromo = (m: number) => (m >> 14) & 7;
export const mFlags = (m: number) => m & 0x3e0000;
export const isCapture = (m: number) => (m & FLAG_CAPTURE) !== 0;
export const isPromo = (m: number) => (m & FLAG_PROMO) !== 0;

export const moveEq = (a: number, b: number) =>
  (a & 0x7fff) === (b & 0x7fff); // compare from/to/promo only

/** UCI string ("e2e4", "e7e8q") */
export function moveToUci(m: number): string {
  let s = sqToAlg(mFrom(m)) + sqToAlg(mTo(m));
  if (mPromo(m)) s += "nbrq"[mPromo(m) - KNIGHT];
  return s;
}
/** Parse "e2e4"/"e7e8q" into packed move; returns 0 if squares malformed */
export function uciToMoveParts(uci: string): { from: number; to: number; promo: number } {
  const from = algToSq(uci.slice(0, 2));
  const to = algToSq(uci.slice(2, 4));
  let promo = 0;
  if (uci.length >= 5) {
    const p = uci[4];
    promo = p === "n" ? KNIGHT : p === "b" ? BISHOP : p === "r" ? ROOK : QUEEN;
  }
  return { from, to, promo };
}

export const MATE_SCORE = 30000;
export const INFINITE = 40000;

export const START_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export type GameResultReason =
  | "checkmate"
  | "stalemate"
  | "fifty-move"
  | "repetition"
  | "insufficient-material"
  | "resign"
  | "timeout"
  | "agreement";

export type GameOutcome =
  | { over: false }
  | {
      over: true;
      winner: Color | null; // null = draw
      reason: GameResultReason;
    };
