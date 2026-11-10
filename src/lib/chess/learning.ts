// ─── Real-time live learning system ──────────────────────────────────────────
// MasterBot studies you WHILE you play:
//   • Memory book  — opening lines that beat you get replayed, losing lines
//                    get avoided (persisted across sessions in localStorage).
//   • Player model — running read of your aggression, blunder rate, speed and
//                    accuracy, updated after every single classified move.
//   • Style bias   — the model changes how the engine picks moves RIGHT NOW
//                    (sharper play vs a shaky opponent, quieter play vs a
//                    solid one). Wired through engine styleBias.
//   • Insights     — human-readable "what I just learned" feed for the UI.

// ── types ────────────────────────────────────────────────────────────────────

export interface LearnedMoveStats {
  w: number; // AI wins with this move (vs this browser's player)
  l: number; // AI losses
  d: number; // draws
}

export interface PlayerModel {
  games: number;
  wins: number;
  losses: number;
  draws: number;
  aggression: number; // 0..1 EWMA — how capture/check-happy the player is
  blunderRate: number; // 0..1 EWMA — blunders per player move
  mistakeRate: number; // 0..1 EWMA
  accuracy: number; // 0..100 EWMA
  avgMoveTimeMs: number; // EWMA
  openingPlays: Record<string, number>;
  lastUpdated: number;
}

export type InsightKind =
  | "pattern" // spotted something about the player mid-game
  | "memory" // used / stored a memorized line
  | "adapt" // changed its own playing style
  | "review" // post-game learning
  | "profile"; // cross-session memory notes

export interface LearningInsight {
  id: string;
  ts: number;
  kind: InsightKind;
  text: string;
}

export interface LearningState {
  v: 1;
  /** learned book: "e2e4 e7e5 …" prefix (AI to move) → move → stats */
  book: Record<string, Record<string, LearnedMoveStats>>;
  player: PlayerModel;
  /** newest first */
  insights: LearningInsight[];
  counters: {
    memoryHits: number; // times a game move came straight from memory
    adaptations: number; // times the style bias changed mid-match
    learnedGames: number;
  };
}

/** per-game in-memory session (not persisted) */
export interface LearningSession {
  playerMoves: number;
  blunders: number;
  mistakes: number;
  captures: number;
  checks: number;
  fastMoves: number; // moves played under 2.5s
  fastBlunders: number; // blunders played under 2.5s
  memoryHits: number;
  biasLabel: string | null;
  biasAppliedAt: number; // player-move count when bias last changed
  openingNoted: boolean;
}

export interface PlayerMoveEvent {
  ply: number; // plies after the move (1-based)
  classification: string; // best|excellent|good|book|inaccuracy|mistake|blunder
  isCapture: boolean;
  isCheck: boolean;
  timeSpentMs: number | null;
}

export interface GameSummary {
  uciMoves: string[];
  playerColor: "w" | "b";
  result: "win" | "loss" | "draw"; // player POV
  opening: string;
  playerAccuracy: number | null;
  blunders: number;
  mistakes: number;
  avgMoveTimeMs: number | null;
}

export interface StyleBiasConfig {
  aggression: number; // -1..1
  label: string;
}

export interface MemoryConsult {
  move: string | null;
  detail: string | null;
}

// ── persistence ──────────────────────────────────────────────────────────────

const KEY = "chessmaster.learning.v1";
const INSIGHT_CAP = 40;
const LEARN_PLY_LIMIT = 16;

export function newLearningState(): LearningState {
  return {
    v: 1,
    book: {},
    player: {
      games: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      aggression: 0.5,
      blunderRate: 0.08,
      mistakeRate: 0.12,
      accuracy: 70,
      avgMoveTimeMs: 8000,
      openingPlays: {},
      lastUpdated: Date.now(),
    },
    insights: [],
    counters: { memoryHits: 0, adaptations: 0, learnedGames: 0 },
  };
}

export function loadLearning(): LearningState {
  if (typeof window === "undefined") return newLearningState();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return newLearningState();
    const parsed = JSON.parse(raw) as LearningState;
    if (!parsed || parsed.v !== 1 || !parsed.player || !parsed.book) {
      return newLearningState();
    }
    return {
      ...newLearningState(),
      ...parsed,
      player: { ...newLearningState().player, ...parsed.player },
      counters: { ...newLearningState().counters, ...parsed.counters },
      insights: Array.isArray(parsed.insights) ? parsed.insights.slice(0, INSIGHT_CAP) : [],
    };
  } catch {
    return newLearningState();
  }
}

export function saveLearning(s: LearningState): void {
  try {
    s.insights = s.insights.slice(0, INSIGHT_CAP);
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable */
  }
}

export function resetLearning(): LearningState {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
  const fresh = newLearningState();
  pushInsight(fresh, "profile", "Memory wiped — I'm starting to learn you from scratch.");
  saveLearning(fresh);
  return fresh;
}

// ── helpers ──────────────────────────────────────────────────────────────────

let insightSeq = 0;
export function pushInsight(
  s: LearningState,
  kind: InsightKind,
  text: string
): LearningInsight {
  const ins: LearningInsight = {
    id: `i${Date.now().toString(36)}${(insightSeq++).toString(36)}`,
    ts: Date.now(),
    kind,
    text,
  };
  s.insights.unshift(ins);
  if (s.insights.length > INSIGHT_CAP) s.insights.length = INSIGHT_CAP;
  return ins;
}

export function createSession(): LearningSession {
  return {
    playerMoves: 0,
    blunders: 0,
    mistakes: 0,
    captures: 0,
    checks: 0,
    fastMoves: 0,
    fastBlunders: 0,
    memoryHits: 0,
    biasLabel: null,
    biasAppliedAt: 0,
    openingNoted: false,
  };
}

export function memoryLineCount(s: LearningState): number {
  return Object.keys(s.book).length;
}

function ewma(prev: number, next: number, alpha = 0.25): number {
  return prev * (1 - alpha) + next * alpha;
}

// ── real-time: observe a classified player move ─────────────────────────────

/**
 * Called after every player move gets its classification. Mutates both the
 * persisted model (EWMA update) and the session. Returns insights worth
 * surfacing right now.
 */
export function observePlayerMove(
  s: LearningState,
  session: LearningSession,
  ev: PlayerMoveEvent
): LearningInsight[] {
  session.playerMoves++;
  const fast = ev.timeSpentMs !== null && ev.timeSpentMs < 2500;
  if (fast) session.fastMoves++;
  if (ev.isCapture) session.captures++;
  if (ev.isCheck) session.checks++;

  const out: LearningInsight[] = [];

  // session counters + pattern detection (visible live learning)
  if (ev.classification === "blunder") {
    session.blunders++;
    if (fast) session.fastBlunders++;
    if (session.blunders === 3) {
      out.push(
        pushInsight(
          s,
          "pattern",
          "Pattern spotted: three slips this game. I'm hunting for tactics now."
        )
      );
    } else if (session.blunders === 5) {
      out.push(
        pushInsight(
          s,
          "pattern",
          "Five slips now — switching to full punishment mode."
        )
      );
    }
    if (fast && session.fastBlunders === 2) {
      out.push(
        pushInsight(
          s,
          "pattern",
          "Noted: your quick replies tend to leak material. I'll keep the pressure on."
        )
      );
    }
  } else if (ev.classification === "mistake") {
    session.mistakes++;
  }

  // aggression read: captures + checks vs move count
  const sessionAggression =
    session.playerMoves > 0
      ? Math.min(1, (session.captures * 0.6 + session.checks * 0.4) / Math.max(4, session.playerMoves * 0.5))
      : 0.5;
  if (session.playerMoves >= 8 && !session.openingNoted) {
    session.openingNoted = true;
    const aggressive = sessionAggression > 0.62;
    const quiet = sessionAggression < 0.25;
    if (aggressive) {
      out.push(
        pushInsight(
          s,
          "pattern",
          "Read your style: you're attacking early. Tightening up my formation."
        )
      );
    } else if (quiet) {
      out.push(
        pushInsight(
          s,
          "pattern",
          "Read your style: careful, positional play. I'll create complications."
        )
      );
    }
  }

  // EWMA model update (cross-game memory of the player)
  const p = s.player;
  p.aggression = ewma(p.aggression, Math.min(1, sessionAggression), 0.08);
  p.blunderRate = ewma(
    p.blunderRate,
    session.blunders / Math.max(1, session.playerMoves),
    0.1
  );
  p.mistakeRate = ewma(
    p.mistakeRate,
    session.mistakes / Math.max(1, session.playerMoves),
    0.1
  );
  if (ev.timeSpentMs !== null && ev.timeSpentMs > 0 && ev.timeSpentMs < 600000) {
    p.avgMoveTimeMs = ewma(p.avgMoveTimeMs, ev.timeSpentMs, 0.08);
  }
  p.lastUpdated = Date.now();

  return out;
}

// ── real-time: consult the learned memory book ───────────────────────────────

/**
 * The AI's move lookup against its learned book BEFORE any search. It replays
 * lines that historically beat this player and avoids lines it lost.
 */
export function consultMemory(
  s: LearningState,
  uciMoves: string[],
  opts?: { minSample?: number; minScore?: number }
): MemoryConsult {
  if (uciMoves.length >= LEARN_PLY_LIMIT) return { move: null, detail: null };
  const minSample = opts?.minSample ?? 2;
  const minScore = opts?.minScore ?? 0.34;
  const key = uciMoves.join(" ");
  const entry = s.book[key];
  if (!entry) return { move: null, detail: null };

  let best: string | null = null;
  let bestScore = -Infinity;
  let bestTotal = 0;
  for (const [move, st] of Object.entries(entry)) {
    const total = st.w + st.l + st.d;
    if (total < minSample) continue;
    const score = (st.w - 1.2 * st.l + 0.25 * st.d) / total;
    if (score > bestScore) {
      bestScore = score;
      best = move;
      bestTotal = total;
    }
  }
  if (!best || bestScore < minScore) return { move: null, detail: null };

  const st = entry[best];
  const detail =
    `From memory: ${st.w}W ${st.d}D ${st.l}L with this line against you — replaying it.`;
  return { move: best, detail };
}

/** avoid-list: learned moves that historically LOST for the AI */
export function memoryBadMoves(s: LearningState, uciMoves: string[]): Set<string> {
  const bad = new Set<string>();
  if (uciMoves.length >= LEARN_PLY_LIMIT) return bad;
  const entry = s.book[uciMoves.join(" ")];
  if (!entry) return bad;
  for (const [move, st] of Object.entries(entry)) {
    const total = st.w + st.l + st.d;
    if (total >= 2 && (st.w - 1.2 * st.l) / total <= -0.5) bad.add(move);
  }
  return bad;
}

// ── real-time: adaptive style bias ───────────────────────────────────────────

/**
 * Turns the player model + live session into an engine style bias. Only used
 * for levels that allow move variety (temperature > 0) — Master always plays
 * its strongest chess and adapts purely through memorized lines.
 */
export function computeStyleBias(
  s: LearningState,
  temperature: number,
  session: LearningSession
): StyleBiasConfig | null {
  if (temperature <= 0) return null;

  const p = s.player;
  // live in-game blunder pressure outweighs the long-term model
  const liveBlunderRate =
    session.playerMoves >= 6
      ? session.blunders / session.playerMoves
      : null;
  const effectiveBlunderRate =
    liveBlunderRate !== null
      ? liveBlunderRate * 0.7 + p.blunderRate * 0.3
      : p.blunderRate;

  let aggression = 0;
  let label: string;

  if (effectiveBlunderRate > 0.14) {
    // shaky opponent → sharper, more tactical play
    aggression = Math.min(0.9, (effectiveBlunderRate - 0.1) * 3.2);
    label = `Sharper play — you're at ${Math.round(effectiveBlunderRate * 100)}% blunder rate`;
  } else if (effectiveBlunderRate < 0.045 && p.aggression > 0.6) {
    // solid + aggressive opponent → quieter, tougher positions
    aggression = -0.3;
    label = "Solid opponent — playing tighter positions";
  } else if (p.games >= 3 && p.aggression < 0.3) {
    // very quiet opponent → create complications
    aggression = 0.25;
    label = "Quiet opponent — stirring up complications";
  } else if (p.games >= 3) {
    aggression = 0.12;
    label = "Balanced adaptation";
  } else {
    return null; // not enough read on the player yet
  }

  return { aggression, label };
}

// ── post-game: learn the opening line + update the profile ──────────────────

/**
 * After a finished game: store every opening-phase AI move with the result,
 * update the player model aggregates, and produce review insights.
 */
export function learnFromGame(
  s: LearningState,
  session: LearningSession,
  g: GameSummary
): LearningInsight[] {
  const out: LearningInsight[] = [];
  const p = s.player;
  p.games++;
  if (g.result === "win") p.wins++;
  else if (g.result === "loss") p.losses++;
  else p.draws++;
  if (g.opening) p.openingPlays[g.opening] = (p.openingPlays[g.opening] ?? 0) + 1;
  if (session.playerMoves > 0) {
    const sessionAggression = Math.min(
      1,
      (session.captures * 0.6 + session.checks * 0.4) /
        Math.max(4, session.playerMoves * 0.5)
    );
    p.aggression = ewma(p.aggression, sessionAggression, 0.15);
  }
  if (g.playerAccuracy !== null) {
    p.accuracy = ewma(p.accuracy, g.playerAccuracy, 0.3);
  }
  if (g.avgMoveTimeMs !== null && g.avgMoveTimeMs > 0) {
    p.avgMoveTimeMs = ewma(p.avgMoveTimeMs, g.avgMoveTimeMs, 0.2);
  }
  p.blunderRate = ewma(
    p.blunderRate,
    g.blunders / Math.max(1, session.playerMoves),
    0.3
  );
  p.mistakeRate = ewma(
    p.mistakeRate,
    g.mistakes / Math.max(1, session.playerMoves),
    0.3
  );
  p.lastUpdated = Date.now();
  s.counters.learnedGames++;

  // ── memorize the line (from the AI's point of view) ──
  const aiWon = g.result === "loss"; // player lost ⇒ AI won
  const aiLost = g.result === "win";
  const aiColorNum = g.playerColor === "w" ? 1 : 0;
  const moves = g.uciMoves.slice(0, LEARN_PLY_LIMIT);
  for (let ply = 0; ply < moves.length; ply++) {
    const moverIsAi = (ply % 2 === 0 ? 0 : 1) === aiColorNum;
    if (!moverIsAi) continue;
    const prefix = moves.slice(0, ply).join(" ");
    const move = moves[ply];
    const entry = (s.book[prefix] ??= {});
    const st = (entry[move] ??= { w: 0, l: 0, d: 0 });
    if (aiWon) st.w++;
    else if (aiLost) st.l++;
    else st.d++;
  }

  // ── review insights ──
  const lineCount = memoryLineCount(s);
  if (aiWon) {
    out.push(
      pushInsight(
        s,
        "review",
        `Stored this win: the ${g.opening || "opening"} line worked against you. Expect to see it again.`
      )
    );
  } else if (aiLost) {
    out.push(
      pushInsight(
        s,
        "review",
        `You beat me in the ${g.opening || "opening"}. That line goes on my avoid-list — I'll steer differently next time.`
      )
    );
  } else {
    out.push(
      pushInsight(s, "review", `Draw in the ${g.opening || "opening"} — filed away for the rematch.`)
    );
  }

  // accuracy trend (needs a previous read)
  if (g.playerAccuracy !== null && p.games >= 2) {
    if (g.playerAccuracy >= p.accuracy + 8) {
      out.push(
        pushInsight(
          s,
          "review",
          `Your accuracy jumped to ${g.playerAccuracy}% — you're getting sharper. Raising my respect.`
        )
      );
    } else if (g.playerAccuracy <= p.accuracy - 12) {
      out.push(
        pushInsight(
          s,
          "review",
          `Accuracy dipped to ${g.playerAccuracy}% today. I'll test your defense early.`
        )
      );
    }
  }

  // blunder-heavy games
  if (g.blunders >= 3) {
    out.push(
      pushInsight(
        s,
        "review",
        `${g.blunders} blunders this game — my tactical radar will be on from move one next time.`
      )
    );
  }

  // memory milestone
  if (lineCount > 0 && lineCount % 25 === 0) {
    out.push(
      pushInsight(
        s,
        "memory",
        `Memory now holds ${lineCount} learned positions from our games.`
      )
    );
  }

  return out;
}

// ── read-outs for the UI ─────────────────────────────────────────────────────

export function sessionStats(session: LearningSession | null): {
  moves: number;
  blunders: number;
  captures: number;
  checks: number;
  memoryHits: number;
  biasLabel: string | null;
} {
  if (!session) {
    return { moves: 0, blunders: 0, captures: 0, checks: 0, memoryHits: 0, biasLabel: null };
  }
  return {
    moves: session.playerMoves,
    blunders: session.blunders,
    captures: session.captures,
    checks: session.checks,
    memoryHits: session.memoryHits,
    biasLabel: session.biasLabel,
  };
}
