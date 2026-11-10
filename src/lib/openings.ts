// ─── Opening detection from move prefix ─────────────────────────────────────
// Maps SAN move sequences (first few plies) to opening names.

const OPENINGS: [string, string][] = [
  // e4 e5 open games
  ["e4 e5 Nf3 Nc6 Bb5", "Ruy Lopez"],
  ["e4 e5 Nf3 Nc6 Bb5 a6", "Ruy Lopez: Morphy Defense"],
  ["e4 e5 Nf3 Nc6 Bb5 Nf6", "Ruy Lopez: Berlin Defense"],
  ["e4 e5 Nf3 Nc6 Bc4", "Italian Game"],
  ["e4 e5 Nf3 Nc6 Bc4 Bc5", "Italian Game: Giuoco Piano"],
  ["e4 e5 Nf3 Nc6 Bc4 Nf6", "Italian Game: Two Knights Defense"],
  ["e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5", "Two Knights: Fried Liver Attack"],
  ["e4 e5 Nf3 Nc6 d4", "Scotch Game"],
  ["e4 e5 Nf3 Nc6 d4 exd4 Nxd4", "Scotch Game: Main Line"],
  ["e4 e5 Nf3 Nf6", "Petrov's Defense"],
  ["e4 e5 Nf3 d6", "Philidor Defense"],
  ["e4 e5 Nc3", "Vienna Game"],
  ["e4 e5 Nc3 Nf6 f4", "Vienna Gambit"],
  ["e4 e5 f4", "King's Gambit"],
  ["e4 e5 Bc4", "Bishop's Opening"],
  ["e4 e5", "Open Game"],
  // Sicilian
  ["e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6", "Sicilian: Najdorf"],
  ["e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6", "Sicilian: Dragon"],
  ["e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 e6", "Sicilian: Scheveningen"],
  ["e4 c5 Nf3 d6 d4 cxd4 Nxd4 g6", "Sicilian: Accelerated Dragon"],
  ["e4 c5 Nf3 Nc6", "Sicilian: Old Sicilian"],
  ["e4 c5 Nf3 e6", "Sicilian: French Variation"],
  ["e4 c5 Nc3", "Sicilian: Closed"],
  ["e4 c5 c3", "Sicilian: Alapin Variation"],
  ["e4 c5", "Sicilian Defense"],
  // French / Caro / others vs e4
  ["e4 e6 d4 d5", "French Defense"],
  ["e4 e6 d4 d5 e5", "French: Advance Variation"],
  ["e4 e6 d4 d5 Nc3 Bb4", "French: Winawer"],
  ["e4 e6 d4 d5 exd5", "French: Exchange Variation"],
  ["e4 c6 d4 d5 Nc3", "Caro-Kann Defense"],
  ["e4 c6 d4 d5 e5", "Caro-Kann: Advance Variation"],
  ["e4 c6 d4 d5 exd5", "Caro-Kann: Exchange Variation"],
  ["e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5", "Caro-Kann: Classical"],
  ["e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nd7", "Caro-Kann: Karpov Variation"],
  ["e4 d5", "Scandinavian Defense"],
  ["e4 d5 exd5 Qxd5", "Scandinavian: Main Line"],
  ["e4 d5 exd5 Nf6", "Scandinavian: Modern Variation"],
  ["e4 d6 d4 Nf6 Nc3 g6", "Pirc Defense"],
  ["e4 g6 d4 Bg7 Nc3 d6", "Modern Defense"],
  ["e4 Nf6", "Alekhine Defense"],
  ["e4 Nf6 e5 Nd5", "Alekhine Defense: Main Line"],
  ["e4 b6", "Owen Defense"],
  ["e4 g6", "Modern Defense"],
  ["e4", "King's Pawn Opening"],
  // d4 games
  ["d4 d5 c4", "Queen's Pawn Game"],
  ["d4 d5 c4 e6", "Queen's Gambit Declined"],
  ["d4 d5 c4 e6 Nc3 Nf6 Bg5", "QGD: Classical"],
  ["d4 d5 c4 c6", "Slav Defense"],
  ["d4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4", "Slav: Main Line"],
  ["d4 d5 c4 dxc4", "Queen's Gambit Accepted"],
  ["d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7", "QGD: Orthodox"],
  ["d4 d5 Bf4", "London System"],
  ["d4 Nf6 c4 e6 Nc3 Bb4", "Nimzo-Indian Defense"],
  ["d4 Nf6 c4 e6 Nf3", "Queen's Indian Defense"],
  ["d4 Nf6 c4 g6 Nc3 d5", "Grünfeld Defense"],
  ["d4 Nf6 c4 g6 Nc3 Bg7 e4 d6", "King's Indian Defense"],
  ["d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2", "KID: Classical"],
  ["d4 Nf6 c4 g6 g3", "King's Indian: Fianchetto"],
  ["d4 Nf6 Bf4", "London System"],
  ["d4 f5", "Dutch Defense"],
  ["d4 e6", "Horwitz Defense"],
  ["d4 d5", "Closed Game"],
  ["d4", "Queen's Pawn Opening"],
  // flank openings
  ["c4 e5", "English Opening: Reversed Sicilian"],
  ["c4 c5", "English Opening: Symmetrical"],
  ["c4 Nf6 Nc3 e6", "English: Aggressive Setup"],
  ["c4 Nf6 Nc3 g6", "English: King's Indian Setup"],
  ["c4 e6", "English Opening"],
  ["c4", "English Opening"],
  ["Nf3 d5", "Réti Opening"],
  ["Nf3 Nf6 c4", "Réti Opening: Main"],
  ["Nf3", "Zukertort Opening"],
  ["Nc3", "Dunst Opening"],
  ["f4", "Bird's Opening"],
  ["g3", "Benko Opening"],
  ["b3", "Nimzo-Larsen Attack"],
  ["b4", "Polish Opening"],
];

function normalizeMoves(sanMoves: string[]): string[] {
  return sanMoves.map((m) =>
    m.replace(/[+#!?]+/g, "").replace(/0-0-0/g, "O-O-O").replace(/0-0/g, "O-O")
  );
}

/** Detect opening name from SAN move list (longest prefix match) */
export function detectOpening(sanMoves: string[]): string {
  const norm = normalizeMoves(sanMoves);
  let best = "";
  let bestLen = -1;
  for (const [prefix, name] of OPENINGS) {
    const parts = prefix.split(" ");
    if (parts.length > norm.length) continue;
    let match = true;
    for (let i = 0; i < parts.length; i++) {
      if (norm[i] !== parts[i]) {
        match = false;
        break;
      }
    }
    if (match && parts.length > bestLen) {
      best = name;
      bestLen = parts.length;
    }
  }
  return best || "Irregular Opening";
}
