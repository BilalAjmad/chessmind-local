// ─── Evaluation: tapered midgame/endgame (PeSTO-style tables + extras) ──────
import { Position } from "./board";
import { WHITE, BLACK, PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING, FILE, RANK, type Color } from "./types";

// Tables are written from White's POV with rank 8 as the FIRST row.
// Index for a 0x88 square: (7 - rank) * 8 + file.

const MG_PAWN = [
   0,   0,   0,   0,   0,   0,   0,   0,
  98, 134,  61,  95,  68, 126,  34, -11,
  -6,   7,  26,  31,  65,  56,  25, -20,
 -14,  13,   6,  21,  23,  12,  17, -23,
 -27,  -2,  -5,  12,  17,   6,  10, -25,
 -26,  -4,  -4, -10,   3,   3,  33, -12,
 -35,  -1, -20, -23, -15,  24,  38, -22,
   0,   0,   0,   0,   0,   0,   0,   0,
];
const EG_PAWN = [
   0,   0,   0,   0,   0,   0,   0,   0,
 178, 173, 158, 134, 147, 132, 165, 187,
  94, 100,  85,  67,  56,  53,  82,  84,
  32,  24,  13,   5,  -2,   4,  17,  17,
  13,   9,  -3,  -7,  -7,  -8,   3,  -1,
   4,   7,  -6,   1,   0,  -5,  -1,  -8,
  13,   8,   8,  10,  13,   0,   2,  -7,
   0,   0,   0,   0,   0,   0,   0,   0,
];
const MG_KNIGHT = [
-167, -89, -34, -49,  61, -97, -15,-107,
 -73, -41,  72,  36,  23,  62,   7, -17,
 -47,  60,  37,  65,  84, 129,  73,  44,
  -9,  17,  19,  53,  37,  69,  18,  22,
 -13,   4,  16,  13,  28,  19,  21,  -8,
 -23,  -9,  12,  10,  19,  17,  25, -16,
 -29, -53, -12,  -3,  -1,  18, -14, -19,
-105, -21, -58, -33, -17, -28, -19, -23,
];
const EG_KNIGHT = [
 -58, -38, -13, -28, -31, -27, -63, -99,
 -25,  -8, -25,  -2,  -9, -25, -24, -52,
 -24, -20,  10,   9,  -1,  -9, -19, -41,
 -17,   3,  22,  22,  22,  11,   8, -18,
 -18,  -6,  16,  25,  16,  17,   4, -18,
 -23,  -3,  -1,  15,  10,  -3, -20, -22,
 -42, -20, -10,  -5,  -2, -20, -23, -44,
 -29, -51, -23, -15, -22, -18, -50, -64,
];
const MG_BISHOP = [
 -29,   4, -82, -37, -25, -42,   7,  -8,
 -26,  16, -18, -13,  30,  59,  18, -47,
 -16,  37,  43,  40,  35,  50,  37,  -2,
  -4,   5,  19,  50,  37,  37,   7,  -2,
  -6,  13,  13,  26,  34,  12,  10,   4,
   0,  15,  15,  15,  14,  27,  18,  10,
   4,  15,  16,   0,   7,  21,  33,   1,
 -33,  -3, -14, -21, -13, -12, -39, -21,
];
const EG_BISHOP = [
 -14, -21, -11,  -8,  -7,  -9, -17, -24,
  -8,  -4,   7, -12,  -3, -13,  -4, -14,
   2,  -8,   0,  -1,  -2,   6,   0,   4,
  -3,   9,  12,   9,  14,  10,   3,   2,
  -6,   3,  13,  19,   7,  10,  -3,  -9,
  -8,  -3,   5,   8,   8,   6,  -3,  -5,
  -4,  -6,  -1,   0,   0,  -3,  -1,  -4,
 -17, -13, -10, -12,  -9, -11, -14, -19,
];
const MG_ROOK = [
  32,  42,  32,  51,  63,   9,  31,  43,
  27,  32,  58,  62,  80,  67,  26,  44,
  -5,  19,  26,  36,  17,  45,  61,  16,
 -24, -11,   7,  26,  24,  35,  -8, -20,
 -36, -26, -12,  -1,   9,  -7,   6, -23,
 -45, -25, -16, -17,   3,   3, -14, -30,
 -44, -16, -20,  -9,  -1,  11,  -6, -22,
 -19, -13,   1,  17,  16,   7, -37, -26,
];
const EG_ROOK = [
  13,  10,  18,  15,  12,  12,   8,   5,
  11,  13,  13,  11,  -3,   3,   8,   3,
   7,   7,   7,   5,   4,  -3,  -5,  -3,
   4,   3,  13,   1,   2,   1,  -1,   2,
   3,   5,   8,   4,  -5,  -6,  -8, -11,
  -4,   0,  -5,  -1,  -7, -12,  -8, -16,
  -6,  -6,   0,   2,  -9,  -9, -11,  -3,
  -9,   2,   3,  -1,  -5, -13,   4, -20,
];
const MG_QUEEN = [
 -28,   0,  29,  12,  59,  44,  43,  45,
 -24, -39,  -5,   1, -16,  57,  28,  54,
 -13, -17,   7,   8,  29,  56,  47,  57,
 -27, -27, -16, -16,  -1,  17,  -2,   1,
  -9, -26,  -9, -10,  -2,  -4,   3,  -3,
 -14,   2, -11,  -2,  -5,   2,  14,   5,
 -35,  -8,  11,   2,   8,  15,  -3,   1,
  -1, -18,  -9,  10, -15, -25, -31, -50,
];
const EG_QUEEN = [
  -9,  22,  22,  27,  27,  19,  10,  20,
 -17,  20,  32,  41,  58,  25,  30,   0,
 -20,   6,   9,  49,  47,  35,  19,   9,
   3,  22,  24,  45,  57,  40,  57,  36,
 -18,  28,  19,  47,  31,  34,  39,  23,
 -16, -27,  15,   6,   9,  17,  10,   5,
 -22, -23, -30, -16, -16, -23, -36, -32,
 -33, -28, -22, -43,  -5, -32, -20, -41,
];
const MG_KING = [
 -65,  23,  16, -15, -56, -34,   2,  13,
  29,  -1, -20,  -7,  -8,  -4, -38, -29,
  -9,  24,   2, -16, -20,   6,  22, -22,
 -17, -20, -12, -27, -30, -25, -14, -36,
 -49,  -1, -27, -39, -46, -44, -33, -51,
 -14, -14, -22, -46, -44, -30, -15, -27,
   1,   7,  -8, -64, -43, -16,   9,   8,
 -15,  36,  12, -54,   8, -28,  24,  14,
];
const EG_KING = [
 -74, -35, -18, -18, -11,  15,   4, -17,
 -12,  17,  14,  17,  17,  38,  23,  11,
  10,  17,  23,  15,  20,  45,  44,  13,
  -8,  22,  24,  27,  26,  33,  26,   3,
 -18,  -4,  21,  24,  27,  23,   9, -11,
 -19,  -3,  11,  21,  23,  16,   7,  -9,
 -27, -11,   4,  13,  14,   4,  -5, -17,
 -53, -34, -21, -11, -28, -14, -24, -43,
];

const MG_TABLE: number[][] = [[], MG_PAWN, MG_KNIGHT, MG_BISHOP, MG_ROOK, MG_QUEEN, MG_KING];
const EG_TABLE: number[][] = [[], EG_PAWN, EG_KNIGHT, EG_BISHOP, EG_ROOK, EG_QUEEN, EG_KING];

const MG_VALUE = [0, 82, 337, 365, 477, 1025, 0];
const EG_VALUE = [0, 94, 281, 297, 512, 936, 0];
const PHASE_INC = [0, 0, 1, 1, 2, 4, 0];
const MAX_PHASE = 24;

// map 0x88 → table index (white POV)
const PST_INDEX = new Int8Array(128);
for (let s = 0; s < 128; s++) {
  if (s & 0x88) continue;
  PST_INDEX[s] = (7 - RANK(s)) * 8 + FILE(s);
}
// mirrored index for black (flip rank)
const PST_INDEX_MIRROR = new Int8Array(128);
for (let s = 0; s < 128; s++) {
  if (s & 0x88) continue;
  PST_INDEX_MIRROR[s] = RANK(s) * 8 + FILE(s);
}

const PASSED_MG = [0, 5, 10, 20, 35, 60, 100, 0];
const PASSED_EG = [0, 10, 20, 35, 60, 100, 150, 0];

/** Fast static evaluation from the side-to-move's point of view (centipawns) */
export function evaluate(pos: Position): number {
  const b = pos.squares;
  let mg = 0;
  let eg = 0;
  let phase = 0;

  // piece counts for pawn-structure analysis
  const pawnFileW = new Int8Array(8);
  const pawnFileB = new Int8Array(8);
  let bishopsW = 0, bishopsB = 0;
  // pawn minimal/maximal ranks per file (for passed pawns)
  const wMostAdvanced = new Int8Array(8).fill(-1);
  const bMostAdvanced = new Int8Array(8).fill(8);

  for (let s = 0; s < 128; s++) {
    if (s & 0x88) continue;
    const pc = b[s];
    if (pc === 0) continue;
    const ty = pc & 7;
    const isBlack = pc >> 3;
    const idx = isBlack ? PST_INDEX_MIRROR[s] : PST_INDEX[s];
    const sign = isBlack ? -1 : 1;

    mg += sign * (MG_VALUE[ty] + MG_TABLE[ty][idx]);
    eg += sign * (EG_VALUE[ty] + EG_TABLE[ty][idx]);
    phase += PHASE_INC[ty];

    if (ty === PAWN) {
      const f = FILE(s);
      if (isBlack) {
        pawnFileB[f]++;
        if (RANK(s) < bMostAdvanced[f]) bMostAdvanced[f] = RANK(s);
      } else {
        pawnFileW[f]++;
        if (RANK(s) > wMostAdvanced[f]) wMostAdvanced[f] = RANK(s);
      }
    } else if (ty === BISHOP) {
      if (isBlack) bishopsB++; else bishopsW++;
    }
  }

  // bishop pair
  if (bishopsW >= 2) { mg += 20; eg += 30; }
  if (bishopsB >= 2) { mg -= 20; eg -= 30; }

  // pawn structure
  for (let f = 0; f < 8; f++) {
    if (pawnFileW[f] > 1) { mg -= 10 * (pawnFileW[f] - 1); eg -= 18 * (pawnFileW[f] - 1); }
    if (pawnFileB[f] > 1) { mg += 10 * (pawnFileB[f] - 1); eg += 18 * (pawnFileB[f] - 1); }
    const wIso = pawnFileW[f] > 0 && (f === 0 || pawnFileW[f - 1] === 0) && (f === 7 || pawnFileW[f + 1] === 0);
    const bIso = pawnFileB[f] > 0 && (f === 0 || pawnFileB[f - 1] === 0) && (f === 7 || pawnFileB[f + 1] === 0);
    if (wIso) { mg -= 14; eg -= 8; }
    if (bIso) { mg += 14; eg += 8; }
  }

  // passed pawns + rook files need a second light pass
  for (let s = 0; s < 128; s++) {
    if (s & 0x88) continue;
    const pc = b[s];
    if (pc === 0) continue;
    const ty = pc & 7;
    const isBlack = pc >> 3;
    if (ty === PAWN) {
      const f = FILE(s), r = RANK(s);
      let passed = true;
      if (!isBlack) {
        for (let df = Math.max(0, f - 1); df <= Math.min(7, f + 1); df++) {
          if (pawnFileB[df] > 0 && bMostAdvanced[df] > r) { passed = false; break; }
        }
      } else {
        for (let df = Math.max(0, f - 1); df <= Math.min(7, f + 1); df++) {
          if (pawnFileW[df] > 0 && wMostAdvanced[df] < r) { passed = false; break; }
        }
      }
      if (passed) {
        const relRank = isBlack ? 7 - r : r;
        const bonusM = PASSED_MG[relRank], bonusE = PASSED_EG[relRank];
        mg += isBlack ? -bonusM : bonusM;
        eg += isBlack ? -bonusE : bonusE;
      }
    } else if (ty === ROOK) {
      const f = FILE(s);
      const openW = pawnFileW[f] === 0, openB = pawnFileB[f] === 0;
      if (openW && openB) mg += isBlack ? -25 : 25;
      else if (openW || openB) mg += isBlack ? -12 : 12;
    }
  }

  // king pawn shield (midgame) when both sides still have queens-ish material
  if (phase > 20) {
    const wKf = FILE(pos.kingSq[WHITE]);
    const bKf = FILE(pos.kingSq[BLACK]);
    let shieldW = 0;
    for (let f = Math.max(0, wKf - 1); f <= Math.min(7, wKf + 1); f++) {
      if (pawnFileW[f] === 0) shieldW -= 14;
    }
    let shieldB = 0;
    for (let f = Math.max(0, bKf - 1); f <= Math.min(7, bKf + 1); f++) {
      if (pawnFileB[f] === 0) shieldB -= 14;
    }
    mg += shieldW - shieldB;
  }

  const score = ((mg * phase + eg * (MAX_PHASE - phase)) / MAX_PHASE) | 0;
  // tempo
  const final = score + (pos.side === WHITE ? 10 : -10) * (phase > 0 ? 1 : 0);
  return pos.side === WHITE ? final : -final;
}

/** Does given color have any non-pawn, non-king material? (null-move guard) */
export function hasNonPawnMaterial(pos: Position, color: Color): boolean {
  const b = pos.squares;
  for (let s = 0; s < 128; s++) {
    if (s & 0x88) continue;
    const pc = b[s];
    if (pc === 0) continue;
    if ((pc >> 3) !== color) continue;
    const ty = pc & 7;
    if (ty !== PAWN && ty !== KING) return true;
  }
  return false;
}

export { MG_VALUE, EG_VALUE };
