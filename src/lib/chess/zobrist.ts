// ─── Zobrist hashing (two independent 32-bit keys) ──────────────────────────
import { EMPTY } from "./types";

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0);
  };
}

const rand = mulberry32(0x1f2e3d4c);

// 15 piece codes (index 0 unused), 128 squares (0x88)
export const PIECE_HASH = new Int32Array(15 * 128);
export const PIECE_LOCK = new Int32Array(15 * 128);
export const CASTLE_HASH = new Int32Array(16);
export const CASTLE_LOCK = new Int32Array(16);
export const EP_HASH = new Int32Array(8);
export const EP_LOCK = new Int32Array(8);
export let SIDE_HASH = 0;
export let SIDE_LOCK = 0;

(function init() {
  for (let i = 1; i < 15; i++) {
    if (i === 7 || i === 8) continue; // unused codes
    for (let s = 0; s < 128; s++) {
      if (s & 0x88) continue;
      PIECE_HASH[i * 128 + s] = rand() | 0;
      PIECE_LOCK[i * 128 + s] = rand() | 0;
    }
  }
  for (let i = 0; i < 16; i++) {
    CASTLE_HASH[i] = rand() | 0;
    CASTLE_LOCK[i] = rand() | 0;
  }
  for (let i = 0; i < 8; i++) {
    EP_HASH[i] = rand() | 0;
    EP_LOCK[i] = rand() | 0;
  }
  SIDE_HASH = rand() | 0;
  SIDE_LOCK = rand() | 0;
})();
