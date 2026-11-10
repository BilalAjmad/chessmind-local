// ─── Local persistence: settings, player profile, game history ──────────────

/** who the opponent is */
export type GameMode = "ai" | "local";

export interface GameSettings {
  boardTheme: string;
  soundOn: boolean;
  showLegalMoves: boolean;
  showCoords: boolean;
  showEvalBar: boolean;
  showLastMove: boolean;
  autoQueen: boolean;
  liveAnalysis: boolean;
  animationMs: number;
}

export const DEFAULT_SETTINGS: GameSettings = {
  boardTheme: "walnut",
  soundOn: true,
  showLegalMoves: true,
  showCoords: true,
  showEvalBar: true,
  showLastMove: true,
  autoQueen: false,
  liveAnalysis: true,
  animationMs: 180,
};

export interface GameRecord {
  id: string;
  date: number;
  level: number;
  playerColor: "w" | "b";
  result: "win" | "loss" | "draw";
  reason: string;
  moves: number;
  pgn: string;
  opening: string;
  accuracy: number | null;
  avgCpLoss: number | null;
  blunders: number;
  mistakes: number;
  /** "local" = pass & play against a friend on this device */
  mode?: GameMode;
  /** pass & play: the two players' names */
  players?: { w: string; b: string };
}

export interface PlayerProfile {
  rating: number;
  peakRating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  streak: number; // current win streak (negative = losing streak)
  ratingHistory: { rating: number; date: number }[];
  perLevel: Record<string, { w: number; l: number; d: number }>;
  vsOpenings: Record<string, number>; // opening name → times played
}

export const DEFAULT_PROFILE: PlayerProfile = {
  rating: 1200,
  peakRating: 1200,
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  streak: 0,
  ratingHistory: [{ rating: 1200, date: Date.now() }],
  perLevel: {},
  vsOpenings: {},
};

const KEYS = {
  settings: "chessmaster.settings.v1",
  profile: "chessmaster.profile.v1",
  games: "chessmaster.games.v1",
  lastLevel: "chessmaster.lastLevel.v1",
  lastMode: "chessmaster.lastMode.v1",
  pnp: "chessmaster.pnp.v1",
};

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as T) };
  } catch {
    return fallback;
  }
}

export function loadSettings(): GameSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  return safeGet(KEYS.settings, DEFAULT_SETTINGS);
}

export function saveSettings(s: GameSettings): void {
  try {
    localStorage.setItem(KEYS.settings, JSON.stringify(s));
  } catch {
    /* storage unavailable */
  }
}

export function loadProfile(): PlayerProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  return safeGet(KEYS.profile, DEFAULT_PROFILE);
}

export function saveProfile(p: PlayerProfile): void {
  try {
    localStorage.setItem(KEYS.profile, JSON.stringify(p));
  } catch {
    /* storage unavailable */
  }
}

export function loadGames(): GameRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEYS.games);
    return raw ? (JSON.parse(raw) as GameRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveGames(games: GameRecord[]): void {
  try {
    // keep the most recent 50
    localStorage.setItem(KEYS.games, JSON.stringify(games.slice(-50)));
  } catch {
    /* storage unavailable */
  }
}

/** Elo update. actual: 1 win / 0.5 draw / 0 loss. Returns rating delta. */
export function updateRating(
  profile: PlayerProfile,
  opponentElo: number,
  actual: number
): number {
  const expected = 1 / (1 + Math.pow(10, (opponentElo - profile.rating) / 400));
  const k = profile.gamesPlayed < 30 ? 40 : profile.gamesPlayed < 100 ? 24 : 16;
  const delta = Math.round(k * (actual - expected));
  profile.rating = Math.max(400, profile.rating + delta);
  profile.peakRating = Math.max(profile.peakRating, profile.rating);
  profile.ratingHistory.push({ rating: profile.rating, date: Date.now() });
  if (profile.ratingHistory.length > 200) profile.ratingHistory.shift();
  return delta;
}

/** Suggest an AI level matching the player's rating (adaptive difficulty) */
export function suggestedLevel(rating: number): number {
  // level elos: Easy 800 · Medium 1400 · Ultra Hard 2000 · Master 2500
  const elos = [800, 1400, 2000, 2500];
  let best = 1;
  let bestDiff = Infinity;
  for (let i = 0; i < elos.length; i++) {
    const d = Math.abs(elos[i] - rating);
    if (d < bestDiff) {
      bestDiff = d;
      best = i + 1;
    }
  }
  return best;
}

/** The last level the PLAYER picked by hand (never auto-changed by the AI) */
export function loadLastLevel(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const n = parseInt(localStorage.getItem(KEYS.lastLevel) ?? "", 10);
    return Number.isFinite(n) && n >= 1 && n <= 4 ? n : null;
  } catch {
    return null;
  }
}

export function saveLastLevel(level: number): void {
  try {
    localStorage.setItem(KEYS.lastLevel, String(level));
  } catch {
    /* storage unavailable */
  }
}

/** The last game mode picked by hand (vs AI / 2 players) */
export function loadLastMode(): GameMode {
  if (typeof window === "undefined") return "ai";
  try {
    return localStorage.getItem(KEYS.lastMode) === "local" ? "local" : "ai";
  } catch {
    return "ai";
  }
}

export function saveLastMode(mode: GameMode): void {
  try {
    localStorage.setItem(KEYS.lastMode, mode);
  } catch {
    /* storage unavailable */
  }
}

export interface PnpDefaults {
  white: string;
  black: string;
}

export const DEFAULT_PNP: PnpDefaults = { white: "White", black: "Black" };

/** remembered pass & play names — the board itself is always fixed */
export function loadPnpDefaults(): PnpDefaults {
  if (typeof window === "undefined") return DEFAULT_PNP;
  return safeGet(KEYS.pnp, DEFAULT_PNP);
}

export function savePnpDefaults(p: PnpDefaults): void {
  try {
    localStorage.setItem(KEYS.pnp, JSON.stringify(p));
  } catch {
    /* storage unavailable */
  }
}
