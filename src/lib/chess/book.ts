// ─── Opening book: keyed by move sequence (uci, space-separated) ─────────────
// Values: "uci:weight" — weighted random choice. Validated by script.

const B: Record<string, string[]> = {
  // ── first move (white) ──
  "": ["e2e4:4", "d2d4:3", "g1f3:2", "c2c4:2", "b1c3:0.5"],

  // ── 1.e4 ──
  "e2e4": ["e7e5:3", "c7c5:3", "e7e6:2", "c7c6:2", "d7d6:1", "g7g6:1", "d7d5:1", "g8f6:0.5"],
  "e2e4 e7e5": ["g1f3:4", "b1c3:1", "f2f4:0.5"],
  "e2e4 e7e5 g1f3": ["b8c6:4", "g8f6:1", "d7d6:0.5"],
  "e2e4 e7e5 g1f3 b8c6": ["f1b5:3", "f1c4:2", "d2d4:1", "d2d3:1"],
  "e2e4 e7e5 g1f3 b8c6 f1b5": ["a7a6:2", "g8f6:2"],
  "e2e4 e7e5 g1f3 b8c6 f1b5 a7a6": ["b5a4:3", "b5c6:1", "e1g1:1"],
  "e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4": ["g8f6:3", "b7b5:2", "d7d6:0.5"],
  "e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6": ["e1g1:3", "b1c3:1", "d2d3:1"],
  "e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6 e1g1": ["f8e7:2", "b7b5:1", "f6e4:1", "f8c5:0.5"],
  "e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6 e1g1 f8e7": ["f1e1:2", "d2d3:2", "b1c3:1"],
  "e2e4 e7e5 g1f3 b8c6 f1b5 g8f6": ["e1g1:3", "b1c3:1"],
  "e2e4 e7e5 g1f3 b8c6 f1b5 g8f6 e1g1": ["f6e4:3", "f8c5:1", "f8e7:0.5"],
  "e2e4 e7e5 g1f3 b8c6 f1b5 g8f6 e1g1 f6e4": ["d2d4:3", "f1e1:2", "d2d3:1"],
  "e2e4 e7e5 g1f3 b8c6 f1c4": ["f8c5:3", "g8f6:2", "f8e7:1"],
  "e2e4 e7e5 g1f3 b8c6 f1c4 f8c5": ["c2c3:3", "e1g1:2", "d2d3:1.5"],
  "e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 c2c3": ["g8f6:3.5", "d7d6:1.5", "a7a6:1"],
  "e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 c2c3 g8f6": ["d2d3:3", "d2d4:2"],
  "e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 c2c3 g8f6 d2d3": ["d7d6:2.5", "a7a6:2", "b7b6:1"],
  "e2e4 e7e5 g1f3 b8c6 f1c4 g8f6": ["d2d3:2.5", "f3g5:1.5", "d2d4:2"],
  "e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 d2d3": ["f8c5:2", "f8e7:1", "d7d6:1", "b7b6:0.5"],
  "e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 f3g5": ["d7d5:3"],
  "e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 f3g5 d7d5": ["e4d5:3"],
  "e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 f3g5 d7d5 e4d5": ["f6d5:3"],
  "e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 f3g5 d7d5 e4d5 f6d5": ["g5f7:2", "d1f3:2", "e1g1:1"],
  "e2e4 e7e5 g1f3 b8c6 d2d4": ["e5d4:4", "c6d4:0.5"],
  "e2e4 e7e5 g1f3 b8c6 d2d4 e5d4": ["f3d4:4", "d1d4:0.5"],
  "e2e4 e7e5 g1f3 b8c6 d2d4 e5d4 f3d4": ["g8f6:3", "f8c5:1.5"],
  "e2e4 e7e5 g1f3 b8c6 d2d4 e5d4 f3d4 g8f6": ["b1c3:3", "d4c6:1"],
  "e2e4 e7e5 g1f3 b8c6 d2d4 e5d4 f3d4 g8f6 b1c3": ["f8b4:3", "f8c5:1"],
  "e2e4 e7e5 g1f3 g8f6": ["f3e5:2.5", "b1c3:1.5", "d2d3:1"],
  "e2e4 e7e5 g1f3 g8f6 f3e5": ["d7d5:3"],
  "e2e4 e7e5 g1f3 g8f6 f3e5 d7d5": ["e4d5:3"],
  "e2e4 e7e5 g1f3 g8f6 f3e5 d7d5 e4d5": ["f6d5:3"],
  "e2e4 e7e5 g1f3 g8f6 f3e5 d7d5 e4d5 f6d5": ["d2d4:2.5", "b1c3:2"],
  "e2e4 e7e5 b1c3": ["g8f6:3", "b8c6:2"],
  "e2e4 e7e5 b1c3 g8f6": ["f2f4:2.5", "g1f3:2", "f1c4:1"],
  "e2e4 e7e5 b1c3 g8f6 f2f4": ["e5f4:2.5", "d7d5:2", "f6e4:1.5"],

  // ── Sicilian ──
  "e2e4 c7c5": ["g1f3:4", "b1c3:2", "c2c3:1", "f2f4:0.5"],
  "e2e4 c7c5 g1f3": ["d7d6:3", "b8c6:3", "e7e6:2", "g7g6:1"],
  "e2e4 c7c5 g1f3 d7d6": ["d2d4:4"],
  "e2e4 c7c5 g1f3 d7d6 d2d4": ["c5d4:4"],
  "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4": ["f3d4:4"],
  "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4": ["g8f6:3", "a7a6:1.5", "e7e6:0.5"],
  "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6": ["b1c3:4"],
  "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3": ["a7a6:3", "g7g6:3", "e7e6:1", "b8c6:0.5"],
  "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6": ["c1g5:1.5", "c1e3:2.5", "f1e2:2"],
  "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 g7g6": ["c1e3:3", "f1e2:1.5", "f1c4:1"],
  "e2e4 c7c5 g1f3 b8c6": ["d2d4:4"],
  "e2e4 c7c5 g1f3 b8c6 d2d4": ["c5d4:4"],
  "e2e4 c7c5 g1f3 b8c6 d2d4 c5d4": ["f3d4:4"],
  "e2e4 c7c5 g1f3 b8c6 d2d4 c5d4 f3d4": ["g8f6:3", "g7g6:2"],
  "e2e4 c7c5 g1f3 b8c6 d2d4 c5d4 f3d4 g8f6": ["b1c3:4"],
  "e2e4 c7c5 g1f3 b8c6 d2d4 c5d4 f3d4 g8f6 b1c3": ["g7g6:3", "e7e6:2", "a7a6:0.5"],
  "e2e4 c7c5 b1c3": ["b8c6:2.5", "e7e6:2", "d7d6:1.5", "a7a6:1.5"],
  "e2e4 c7c5 c2c3": ["d7d5:2.5", "b8c6:2", "g8f6:2"],

  // ── French ──
  "e2e4 e7e6": ["d2d4:4", "b1c3:1.5"],
  "e2e4 e7e6 d2d4": ["d7d5:4"],
  "e2e4 e7e6 d2d4 d7d5": ["b1c3:2.5", "e4e5:2", "e4d5:1.5"],
  "e2e4 e7e6 d2d4 d7d5 b1c3": ["g8f6:3", "f8b4:2"],
  "e2e4 e7e6 d2d4 d7d5 e4e5": ["c7c5:4"],
  "e2e4 e7e6 d2d4 d7d5 e4e5 c7c5": ["c2c3:3", "g1f3:2"],
  "e2e4 e7e6 d2d4 d7d5 e4e5 c7c5 c2c3": ["b8c6:3.5", "g8f6:1"],
  "e2e4 e7e6 d2d4 d7d5 e4e5 c7c5 c2c3 b8c6": ["g1f3:4"],
  "e2e4 e7e6 d2d4 d7d5 e4e5 c7c5 c2c3 b8c6 g1f3": ["g8e7:2.5", "d8b6:1.5", "c8d7:1.5"],

  // ── Caro-Kann ──
  "e2e4 c7c6": ["d2d4:4", "b1c3:2.5"],
  "e2e4 c7c6 d2d4": ["d7d5:4"],
  "e2e4 c7c6 d2d4 d7d5": ["b1c3:4", "e4e5:1.5", "e4d5:1"],
  "e2e4 c7c6 d2d4 d7d5 b1c3": ["d5e4:4"],
  "e2e4 c7c6 d2d4 d7d5 b1c3 d5e4": ["c3e4:4"],
  "e2e4 c7c6 d2d4 d7d5 b1c3 d5e4 c3e4": ["c8f5:2.5", "b8d7:2.5", "g8f6:2"],
  "e2e4 c7c6 d2d4 d7d5 b1c3 d5e4 c3e4 c8f5": ["e4g3:3", "g1f3:1.5"],
  "e2e4 c7c6 d2d4 d7d5 b1c3 d5e4 c3e4 c8f5 e4g3": ["f5g6:3", "f5d7:1"],
  "e2e4 c7c6 d2d4 d7d5 e4e5": ["c6c5:3", "g8f6:2", "c8f5:1.5", "b8d7:1"],

  // ── Scandinavian ──
  "e2e4 d7d5": ["e4d5:4"],
  "e2e4 d7d5 e4d5": ["d8d5:3.5", "g8f6:2.5"],
  "e2e4 d7d5 e4d5 d8d5": ["b1c3:4"],
  "e2e4 d7d5 e4d5 d8d5 b1c3": ["d5a5:4"],
  "e2e4 d7d5 e4d5 d8d5 b1c3 d5a5": ["d2d4:3", "g1f3:2"],
  "e2e4 d7d5 e4d5 g8f6": ["c2c4:3", "d2d4:2", "b1c3:1.5"],
  "e2e4 d7d5 e4d5 g8f6 c2c4": ["e7e6:3", "c7c6:1.5"],
  "e2e4 d7d5 e4d5 g8f6 d2d4": ["f6d5:2.5", "g7g6:1.5", "e7e6:1.5", "c7c6:1.5"],

  // ── Pirc / Modern / Alekhine ──
  "e2e4 d7d6": ["d2d4:4", "b1c3:2"],
  "e2e4 d7d6 d2d4": ["g8f6:4"],
  "e2e4 d7d6 d2d4 g8f6": ["b1c3:4"],
  "e2e4 d7d6 d2d4 g8f6 b1c3": ["g7g6:4"],
  "e2e4 d7d6 d2d4 g8f6 b1c3 g7g6": ["g1f3:2.5", "f2f4:2", "c1e3:1.5", "f1e2:1.5"],
  "e2e4 g7g6": ["d2d4:4", "b1c3:1.5"],
  "e2e4 g7g6 d2d4": ["f8g7:4"],
  "e2e4 g7g6 d2d4 f8g7": ["b1c3:3.5", "g1f3:1.5"],
  "e2e4 g7g6 d2d4 f8g7 b1c3": ["d7d6:4"],
  "e2e4 g7g6 d2d4 f8g7 b1c3 d7d6": ["f2f4:2", "g1f3:2", "c1e3:1.5", "f1e2:1.5"],
  "e2e4 g8f6": ["e4e5:3.5", "b1c3:2.5", "d2d3:1"],
  "e2e4 g8f6 e4e5": ["f6d5:4"],
  "e2e4 g8f6 e4e5 f6d5": ["d2d4:3", "c2c4:2.5"],
  "e2e4 g8f6 e4e5 f6d5 c2c4": ["d7d6:2.5", "d5b6:2"],
  "e2e4 g8f6 e4e5 f6d5 d2d4": ["d7d6:3", "d5b6:2"],
  "e2e4 g8f6 e4e5 f6d5 c2c4 d7d6": ["e5d6:3"],
  "e2e4 g8f6 e4e5 f6d5 c2c4 d7d6 e5d6": ["c7d6:3", "d8d6:1"],

  // ── 1.d4 ──
  "d2d4": ["d7d5:3.5", "g8f6:2.5", "e7e6:0.5", "f7f5:0.5"],
  "d2d4 d7d5": ["c2c4:4", "g1f3:1.5", "c1f4:1.5"],
  "d2d4 d7d5 c2c4": ["e7e6:3", "c7c6:3", "d5c4:1.5", "g8f6:1.5"],
  "d2d4 d7d5 c2c4 e7e6": ["b1c3:3.5", "g1f3:2"],
  "d2d4 d7d5 c2c4 e7e6 b1c3": ["g8f6:4"],
  "d2d4 d7d5 c2c4 e7e6 b1c3 g8f6": ["c1g5:3", "g1f3:2.5", "c1f4:1.5"],
  "d2d4 d7d5 c2c4 e7e6 b1c3 g8f6 c1g5": ["f8e7:3.5", "h7h6:1"],
  "d2d4 d7d5 c2c4 e7e6 b1c3 g8f6 c1g5 f8e7": ["e2e3:3", "g1f3:2.5"],
  "d2d4 d7d5 c2c4 c7c6": ["g1f3:3", "b1c3:2.5"],
  "d2d4 d7d5 c2c4 c7c6 g1f3": ["g8f6:4"],
  "d2d4 d7d5 c2c4 c7c6 g1f3 g8f6": ["b1c3:4", "c1g5:1"],
  "d2d4 d7d5 c2c4 c7c6 g1f3 g8f6 b1c3": ["d5c4:2.5", "e7e6:1"],
  "d2d4 d7d5 c2c4 c7c6 g1f3 g8f6 b1c3 d5c4": ["a2a4:3", "e2e3:2"],
  "d2d4 d7d5 c2c4 c7c6 g1f3 g8f6 b1c3 d5c4 a2a4": ["c8g4:2.5", "e7e6:2", "c6c5:1"],
  "d2d4 d7d5 c2c4 d5c4": ["g1f3:3", "e2e3:2.5"],
  "d2d4 d7d5 c2c4 d5c4 g1f3": ["g8f6:4"],
  "d2d4 d7d5 c2c4 d5c4 g1f3 g8f6": ["e2e3:4"],
  "d2d4 d7d5 c2c4 d5c4 g1f3 g8f6 e2e3": ["e7e6:4"],
  "d2d4 d7d5 c2c4 d5c4 g1f3 g8f6 e2e3 e7e6": ["f1c4:4"],
  "d2d4 d7d5 c2c4 d5c4 g1f3 g8f6 e2e3 e7e6 f1c4": ["c7c5:3.5", "b8c6:1"],
  "d2d4 d7d5 c2c4 d5c4 g1f3 g8f6 e2e3 e7e6 f1c4 c7c5": ["e1g1:3", "d4c5:1.5", "b1d2:1"],

  // ── Indians ──
  "d2d4 g8f6": ["c2c4:3.5", "g1f3:1.5", "c1f4:1.5"],
  "d2d4 g8f6 c2c4": ["e7e6:3", "g7g6:3", "d7d5:1.5"],
  "d2d4 g8f6 c2c4 e7e6": ["b1c3:4", "g1f3:2"],
  "d2d4 g8f6 c2c4 e7e6 b1c3": ["f8b4:3", "d7d5:2"],
  "d2d4 g8f6 c2c4 e7e6 b1c3 f8b4": ["e2e3:2.5", "d1c2:2", "g1f3:1.5", "a2a3:1.5"],
  "d2d4 g8f6 c2c4 e7e6 b1c3 f8b4 e2e3": ["e8g8:2.5", "c7c5:2", "d7d5:1"],
  "d2d4 g8f6 c2c4 e7e6 b1c3 f8b4 d1c2": ["e8g8:2.5", "c7c5:1.5"],
  "d2d4 g8f6 c2c4 g7g6": ["b1c3:3.5", "g1f3:2", "e2e4:1"],
  "d2d4 g8f6 c2c4 g7g6 b1c3": ["f8g7:4"],
  "d2d4 g8f6 c2c4 g7g6 b1c3 f8g7": ["e2e4:4"],
  "d2d4 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4": ["d7d6:4"],
  "d2d4 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4 d7d6": ["g1f3:3.5", "f1e2:1.5"],
  "d2d4 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4 d7d6 g1f3": ["e8g8:4"],
  "d2d4 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4 d7d6 g1f3 e8g8": ["f1e2:3", "c1e3:1.5"],
  "d2d4 g8f6 c2c4 g7g6 b1c3 d7d5": ["c4d5:3", "g1f3:2"],
  "d2d4 g8f6 c2c4 g7g6 b1c3 d7d5 c4d5": ["f6d5:4"],
  "d2d4 g8f6 c2c4 g7g6 b1c3 d7d5 c4d5 f6d5": ["e2e4:4"],
  "d2d4 g8f6 c2c4 g7g6 b1c3 d7d5 c4d5 f6d5 e2e4": ["d5c3:3.5"],
  "d2d4 g8f6 c2c4 g7g6 b1c3 d7d5 c4d5 f6d5 e2e4 d5c3": ["b2c3:4"],
  "d2d4 g8f6 c2c4 g7g6 b1c3 d7d5 c4d5 f6d5 e2e4 d5c3 b2c3": ["f8g7:4"],
  "d2d4 g8f6 c2c4 g7g6 b1c3 d7d5 c4d5 f6d5 e2e4 d5c3 b2c3 f8g7": ["g1f3:2.5", "f1c4:2", "c1e3:1.5"],

  // ── London ──
  "d2d4 d7d5 c1f4": ["g8f6:3.5", "e7e6:1.5", "c7c5:1.5"],
  "d2d4 d7d5 c1f4 g8f6": ["e2e3:4"],
  "d2d4 d7d5 c1f4 g8f6 e2e3": ["e7e6:3", "c7c5:2"],
  "d2d4 d7d5 c1f4 g8f6 e2e3 e7e6": ["f1d3:3", "g1f3:2", "b1d2:1.5"],
  "d2d4 g8f6 c1f4": ["g7g6:3.5", "e7e6:1.5"],
  "d2d4 g8f6 c1f4 g7g6": ["e2e3:3.5"],
  "d2d4 g8f6 c1f4 g7g6 e2e3": ["f8g7:4"],
  "d2d4 g8f6 c1f4 g7g6 e2e3 f8g7": ["f1e2:3.5"],
  "d2d4 g8f6 c1f4 g7g6 e2e3 f8g7 f1e2": ["e8g8:4"],

  // ── English / Reti ──
  "c2c4": ["g8f6:2.5", "c7c5:2", "e7e5:2", "e7e6:1.5"],
  "c2c4 e7e5": ["b1c3:3.5", "g1f3:2"],
  "c2c4 e7e5 b1c3": ["b8c6:3.5", "g8f6:2"],
  "c2c4 e7e5 b1c3 b8c6": ["g1f3:4"],
  "c2c4 e7e5 b1c3 b8c6 g1f3": ["g8f6:4"],
  "c2c4 e7e5 b1c3 b8c6 g1f3 g8f6": ["g2g3:3.5"],
  "c2c4 c7c5": ["g1f3:3", "g2g3:2.5"],
  "c2c4 c7c5 g1f3": ["g8f6:3.5", "b8c6:2"],
  "c2c4 c7c5 g1f3 g8f6": ["g2g3:3.5", "b1c3:1.5"],
  "c2c4 c7c5 g1f3 g8f6 g2g3": ["b8c6:3", "e7e6:1.5", "g7g6:1.5"],
  "c2c4 c7c5 g1f3 g8f6 g2g3 b8c6": ["f1g2:4"],
  "c2c4 c7c5 g1f3 g8f6 g2g3 b8c6 f1g2": ["d7d5:2", "e7e6:1.5", "d7d6:1.5", "g7g6:1.5"],
  "c2c4 g8f6": ["b1c3:3.5", "g1f3:1.5", "d2d4:1"],
  "c2c4 g8f6 b1c3": ["g7g6:3", "e7e6:3"],
  "c2c4 g8f6 b1c3 e7e6": ["g1f3:3"],
  "c2c4 g8f6 b1c3 e7e6 g1f3": ["d7d5:3.5"],
  "c2c4 g8f6 b1c3 e7e6 g1f3 d7d5": ["d2d4:3", "c4d5:1.5"],
  "c2c4 g8f6 b1c3 g7g6": ["g2g3:3", "e2e4:2", "g1f3:1.5"],
  "c2c4 g8f6 b1c3 g7g6 g2g3": ["f8g7:4"],
  "c2c4 g8f6 b1c3 g7g6 g2g3 f8g7": ["f1g2:4"],
  "c2c4 g8f6 b1c3 g7g6 g2g3 f8g7 f1g2": ["e8g8:4"],
  "c2c4 g8f6 b1c3 g7g6 g2g3 f8g7 f1g2 e8g8": ["g1f3:3", "d2d3:2", "e2e4:1.5", "e2e3:1"],
  "g1f3 d7d5": ["c2c4:3", "g2g3:2", "d2d4:1.5"],
  "g1f3 d7d5 c2c4": ["g8f6:3", "e7e6:2", "c7c6:1.5", "d5c4:1"],
};

export interface BookChoice {
  move: string; // uci
  weight: number;
}

export function lookupBook(moveHistory: string[]): BookChoice[] | null {
  const key = moveHistory.join(" ");
  const entry = B[key];
  if (!entry) return null;
  const choices: BookChoice[] = [];
  for (const raw of entry) {
    const [uci, w] = raw.split(":");
    const weight = w ? Number(w) : 1;
    if (Number.isFinite(weight) && weight > 0 && /^[a-h][1-8][a-h][1-8][nbrq]?$/.test(uci)) {
      choices.push({ move: uci, weight });
    }
  }
  return choices.length ? choices : null;
}

export function pickBookMove(
  moveHistory: string[],
  rng: () => number
): string | null {
  const choices = lookupBook(moveHistory);
  if (!choices) return null;
  const total = choices.reduce((s, c) => s + c.weight, 0);
  let r = rng() * total;
  for (const c of choices) {
    r -= c.weight;
    if (r <= 0) return c.move;
  }
  return choices[choices.length - 1].move;
}

export const BOOK = B;
