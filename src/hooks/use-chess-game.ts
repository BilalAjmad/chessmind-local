"use client";
// ─── useChessGame: full game orchestration (moves, AI worker, clocks, ────────
// analysis, classification, ratings, persistence)

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Position } from "@/lib/chess/board";
import { moveToSan, buildPgn } from "@/lib/chess/san";
import {
  mFrom, mTo, mPromo, mFlags, moveToUci, FLAG_CAPTURE, FLAG_EP,
  FLAG_CASTLE_K, FLAG_CASTLE_Q, FLAG_PROMO, QUEEN,
  PAWN, KNIGHT, BISHOP, ROOK, KING,
  pieceType, pieceColor,
  START_FEN, type Color,
} from "@/lib/chess/types";
import { LEVELS, levelConfig } from "@/lib/chess/engine";
import { lookupBook } from "@/lib/chess/book";
import type { ChessEngine } from "@/lib/chess/engine";
import {
  loadLearning, saveLearning, createSession, observePlayerMove, consultMemory,
  memoryBadMoves, computeStyleBias, learnFromGame, resetLearning, pushInsight,
  sessionStats, type LearningState, type LearningSession,
} from "@/lib/chess/learning";
import { playSound, primeAudio } from "@/lib/sounds";
import { detectOpening } from "@/lib/openings";
import {
  DEFAULT_SETTINGS, loadSettings, saveSettings, loadProfile, saveProfile,
  loadGames, saveGames, updateRating,
  type GameSettings, type PlayerProfile, type GameRecord, type GameMode,
} from "@/lib/storage";

export type PlayerSide = "w" | "b";
export interface TimeControl { initialSec: number; incSec: number; label: string }
export type TimeControlOpt = TimeControl | null;

/** A live move suggestion from the engine — what to play and why. */
export interface HintInfo {
  from: number;
  to: number;
  san: string;
  why: string;
  /** engine eval from the PLAYER's viewpoint, centipawns */
  evalCp: number;
  /** mating distance in plies from the PLAYER's viewpoint (positive = you mate) */
  mateIn: number | null;
}

export interface GameConfig {
  level: number;
  playerColor: PlayerSide | "random";
  timeControl: TimeControlOpt;
  /** "ai" = vs MasterBot · "local" = pass & play a friend on this device */
  mode?: GameMode;
  /** pass & play: the two players' names */
  pnpNames?: { w: string; b: string };
}

export type MoveClass =
  | "best" | "excellent" | "good" | "book"
  | "inaccuracy" | "mistake" | "blunder";

export interface MoveRecord {
  san: string;
  uci: string;
  color: PlayerSide;
  evalWhite: number | null;
  mateIn: number | null;
  classification: MoveClass | null;
  timeSpentMs: number | null;
  isCapture: boolean;
  isCheck: boolean;
}

export interface GameOverInfo {
  winner: PlayerSide | null;
  reason: string;
  playerResult: "win" | "loss" | "draw";
  ratingDelta: number | null;
}

export interface AiThinkingInfo {
  depth: number;
  nodes: number;
  timeMs: number;
  scoreWhite: number | null;
  pvSan: string[];
}

interface WorkerResult {
  type: "result";
  id: number;
  uci: string;
  score: number;
  scoreWhite: number;
  mateIn: number | null;
  depth: number;
  nodes: number;
  timeMs: number;
  pv: string[];
  pvSan: string[];
  fromBook: boolean;
  fromMemory?: boolean;
}
interface WorkerAnalysis {
  type: "analysis";
  id: number;
  uci: string;
  scoreWhite: number;
  mateIn: number | null;
  depth: number;
  nodes: number;
  timeMs: number;
}
interface WorkerInfo {
  type: "info";
  id: number;
  depth: number;
  nodes: number;
  timeMs: number;
  score: number;
}
type WorkerMsg =
  | WorkerResult | WorkerAnalysis | WorkerInfo
  | { type: "pong" }
  | { type: "error"; id: number; message: string };

export const MATSq = (sq: number) =>
  `${String.fromCharCode(97 + (sq & 7))}${(sq >> 4) + 1}`;

export function useChessGame() {
  // ── persistent state ──
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [games, setGames] = useState<GameRecord[]>([]);

  // ── game state ──
  const posRef = useRef<Position>(new Position(START_FEN));
  const [status, setStatus] = useState<"setup" | "playing" | "over">("setup");
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [playerColor, setPlayerColor] = useState<PlayerSide>("w");
  const [snapshots, setSnapshots] = useState<Int8Array[]>(() => {
    const p = new Position(START_FEN);
    return [new Int8Array(p.squares)];
  });
  const [lastMoves, setLastMoves] = useState<{ from: number; to: number }[]>([]);
  const [checkSqs, setCheckSqs] = useState<number[]>([]);
  const [moves, setMoves] = useState<MoveRecord[]>([]);
  const [viewPly, setViewPly] = useState(0);
  const [gameOver, setGameOver] = useState<GameOverInfo | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [aiInfo, setAiInfo] = useState<AiThinkingInfo | null>(null);
  const [aiLevel, setAiLevel] = useState(2);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: number; to: number } | null>(null);
  const [hint, setHint] = useState<HintInfo | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [clocks, setClocks] = useState<{ w: number; b: number } | null>(null);
  const [drawOffered, setDrawOffered] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [flipBoard, setFlipBoard] = useState(false);
  const [evalDisplay, setEvalDisplay] = useState<{ cp: number | null; mateIn: number | null }>({ cp: null, mateIn: null });
  // ── pass & play state ──
  const [mode, setMode] = useState<GameMode>("ai");
  const [pnpNames, setPnpNames] = useState<{ w: string; b: string }>({ w: "White", b: "Black" });
  const modeRef = useRef<GameMode>("ai");
  const pnpNamesRef = useRef<{ w: string; b: string }>({ w: "White", b: "Black" });
  // ── live learning state ──
  const [learning, setLearning] = useState<LearningState | null>(null);
  const [lastReview, setLastReview] = useState<string[]>([]);
  const learningRef = useRef<LearningState | null>(null);
  const sessionRef = useRef<LearningSession | null>(null);

  // ── refs mirroring state for async flows ──
  const statusRef = useRef(status);
  const playerColorRef = useRef(playerColor);
  const movesRef = useRef(moves);
  const configRef = useRef(config);
  const settingsRef = useRef(settings);
  const gameOverRef = useRef(gameOver);
  const seedRef = useRef(1);
  const idCounter = useRef(0);
  const pendingSearchId = useRef(0);
  const pendingPreId = useRef(0);
  const pendingPreLen = useRef(0);
  const pendingPostId = useRef(0);
  const pendingHintId = useRef(0);
  const hintPlyRef = useRef(-1); // staleness marker for hint responses
  const turnStartRef = useRef(Date.now());
  const clockRef = useRef<{ w: number; b: number } | null>(null);
  // ── pass & play: two-tap confirmation for game-ending actions ──
  // one accidental tap (while handing the device over) must never end the game
  const armedActionRef = useRef<{ kind: "draw" | "resign"; until: number } | null>(null);
  const preAnalysisRef = useRef<{ evalWhite: number; bestMove: string; mateIn: number | null } | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const workerReadyRef = useRef(false);
  const localEngineRef = useRef<ChessEngine | null>(null);
  statusRef.current = status;
  playerColorRef.current = playerColor;
  movesRef.current = moves;
  configRef.current = config;
  settingsRef.current = settings;
  gameOverRef.current = gameOver;

  // late-bound action refs (break useCallback cycles)
  const requestAiMoveRef = useRef<() => void>(() => {});
  const requestPreAnalysisRef = useRef<() => void>(() => {});
  const requestPostAnalysisRef = useRef<() => void>(() => {});
  const applyMoveRef = useRef<(m: number) => void>(() => {});
  const finishGameRef = useRef<(winner: Color | null, reason: string) => void>(() => {});

  const ensureLocalEngine = useCallback(async () => {
    if (localEngineRef.current) return;
    try {
      const mod = await import("@/lib/chess/engine");
      localEngineRef.current = new mod.ChessEngine();
    } catch {
      localEngineRef.current = null;
    }
  }, []);

  const postToWorker = useCallback((m: unknown): boolean => {
    const w = workerRef.current;
    if (w && workerReadyRef.current) {
      w.postMessage(m);
      return true;
    }
    return false;
  }, []);

  // ── analysis & search requests ────────────────────────────────────────────
  const requestAiMove = useCallback(() => {
    // pass & play: there is no AI — both sides are human
    if (modeRef.current === "local") return;
    const pos = posRef.current;
    if (statusRef.current !== "playing") return;
    if (pos.side === (playerColorRef.current === "w" ? 0 : 1)) return;
    const id = ++idCounter.current;
    pendingSearchId.current = id;
    setAiThinking(true);
    setAiInfo(null);
    const moveList = movesRef.current.map((m) => m.uci);
    let maxTimeMs: number | undefined;
    if (clockRef.current) {
      const remain = clockRef.current[pos.side === 0 ? "w" : "b"];
      maxTimeMs = Math.max(80, Math.min(2200, Math.floor(remain / 6)));
    }
    const level = configRef.current?.level ?? 2;
    const seed = (seedRef.current + moveList.length) >>> 0;

    // ── live learning #1: replay memorized lines that historically beat you ──
    const learn = learningRef.current;
    const session = sessionRef.current;
    if (learn && session) {
      const consult = consultMemory(learn, moveList);
      const m = consult.move ? pos.findMove(consult.move) : 0;
      if (consult.move && m) {
        session.memoryHits++;
        learn.counters.memoryHits++;
        if (session.memoryHits === 1) {
          pushInsight(learn, "memory", consult.detail ?? "Playing from learned memory.");
          saveLearning(learn);
          setLearning({ ...learn });
        }
        const san = moveToSan(pos, m);
        handleWorkerMsg({
          type: "result", id, uci: consult.move, score: 0, scoreWhite: 0,
          mateIn: null, depth: 0, nodes: 0, timeMs: 0,
          pv: [consult.move], pvSan: [san], fromBook: true, fromMemory: true,
        });
        return;
      }
    }

    // ── live learning #2: adaptive style + opening avoid-list ──
    let styleBias: { aggression: number } | undefined;
    let bookAvoid: string[] | undefined;
    if (learn && session) {
      const bias = computeStyleBias(learn, levelConfig(level).temperature, session);
      if (bias) {
        styleBias = { aggression: bias.aggression };
        if (session.biasLabel !== bias.label) {
          const firstInGame = session.biasLabel === null;
          session.biasLabel = bias.label;
          session.biasAppliedAt = session.playerMoves;
          learn.counters.adaptations++;
          if (firstInGame) {
            pushInsight(learn, "adapt", `Adapting my play: ${bias.label.toLowerCase()}.`);
            saveLearning(learn);
            setLearning({ ...learn });
          }
        }
      }
      const bad = memoryBadMoves(learn, moveList);
      if (bad.size > 0) bookAvoid = [...bad];
    }

    const payload = {
      type: "search", id, fen: START_FEN, moves: moveList, level, seed, maxTimeMs,
      styleBias, bookAvoid,
    };
    if (!postToWorker(payload)) {
      void (async () => {
        await ensureLocalEngine();
        const eng = localEngineRef.current;
        if (!eng) return;
        const res = eng.findMove(START_FEN, moveList, { level, seed, maxTimeMs, styleBias, bookAvoid });
        handleWorkerMsg({
          type: "result", id, uci: res.uci, score: res.score,
          scoreWhite: res.scoreWhite, mateIn: res.mateIn, depth: res.depth,
          nodes: res.nodes, timeMs: res.timeMs, pv: res.pv, pvSan: [],
          fromBook: res.fromBook,
        });
      })();
    }
  }, [postToWorker, ensureLocalEngine]);

  const requestPreAnalysis = useCallback(() => {
    if (!settingsRef.current.liveAnalysis) return;
    const id = ++idCounter.current;
    pendingPreId.current = id;
    const moveList = movesRef.current.map((m) => m.uci);
    pendingPreLen.current = moveList.length;
    const payload = { type: "analyze", id, fen: START_FEN, moves: moveList, depth: 7 };
    if (!postToWorker(payload)) {
      void (async () => {
        await ensureLocalEngine();
        const eng = localEngineRef.current;
        if (!eng) return;
        const res = eng.analyze(START_FEN, moveList, 7);
        handleWorkerMsg({
          type: "analysis", id, uci: res.uci, scoreWhite: res.scoreWhite,
          mateIn: res.mateIn, depth: res.depth, nodes: res.nodes, timeMs: res.timeMs,
        });
      })();
    }
  }, [postToWorker, ensureLocalEngine]);

  const requestPostAnalysis = useCallback(() => {
    if (!settingsRef.current.liveAnalysis) return;
    if (statusRef.current !== "playing") return;
    const id = ++idCounter.current;
    pendingPostId.current = id;
    const moveList = movesRef.current.map((m) => m.uci);
    const payload = { type: "analyze", id, fen: START_FEN, moves: moveList, depth: 7 };
    if (!postToWorker(payload)) {
      void (async () => {
        await ensureLocalEngine();
        const eng = localEngineRef.current;
        if (!eng) return;
        const res = eng.analyze(START_FEN, moveList, 7);
        handleWorkerMsg({
          type: "analysis", id, uci: res.uci, scoreWhite: res.scoreWhite,
          mateIn: res.mateIn, depth: res.depth, nodes: res.nodes, timeMs: res.timeMs,
        });
      })();
    }
  }, [postToWorker, ensureLocalEngine]);

  // ── worker message dispatch ───────────────────────────────────────────────
  const handleWorkerMsg = useCallback((msg: WorkerMsg) => {
    switch (msg.type) {
      case "result": {
        if (msg.id !== pendingSearchId.current) return;
        applyAiResultImpl(msg);
        break;
      }
      case "analysis": {
        if (msg.id === pendingPreId.current) {
          preAnalysisRef.current = {
            evalWhite: msg.scoreWhite,
            bestMove: msg.uci,
            mateIn: msg.mateIn,
          };
          // only refresh the eval bar if the player hasn't moved yet
          if (movesRef.current.length === pendingPreLen.current) {
            setEvalDisplay({ cp: msg.scoreWhite, mateIn: msg.mateIn });
          }
        } else if (msg.id === pendingPostId.current) {
          applyPostAnalysisImpl(msg);
        } else if (msg.id === pendingHintId.current) {
          pendingHintId.current = 0; // answered — stop the fallback watchdog
          setHintLoading(false);
          const pos = posRef.current;
          // stale response (someone already moved)? drop it
          if (movesRef.current.length !== hintPlyRef.current) return;
          const m = pos.findMove(msg.uci);
          if (m) {
            const san = moveToSan(pos, m);
            const sign = modeRef.current === "local"
              ? (pos.side === 0 ? 1 : -1) // side-to-move POV
              : (playerColorRef.current === "w" ? 1 : -1);
            setHint({
              from: mFrom(m),
              to: mTo(m),
              san,
              why: explainMove(pos, m, san),
              evalCp: sign * msg.scoreWhite,
              mateIn: msg.mateIn === null ? null : sign * msg.mateIn,
            });
          }
        }
        break;
      }
      case "info": {
        if (msg.id !== pendingSearchId.current) return;
        const white = posRef.current.side === 0 ? clampScore(msg.score) : -clampScore(msg.score);
        setAiInfo((prev) => ({
          depth: msg.depth, nodes: msg.nodes, timeMs: msg.timeMs,
          scoreWhite: white, pvSan: prev?.pvSan ?? [],
        }));
        break;
      }
      case "error":
        console.warn("worker error:", msg.message);
        break;
    }
  }, []);

  // implementations used inside dispatch (declared later, hoisted via function)
  function applyAiResultImpl(msg: WorkerResult) {
    setAiThinking(false);
    setAiInfo({
      depth: msg.depth, nodes: msg.nodes, timeMs: msg.timeMs,
      scoreWhite: msg.scoreWhite, pvSan: msg.pvSan,
    });
    if (statusRef.current !== "playing") return;
    const pos = posRef.current;
    if (pos.side === (playerColorRef.current === "w" ? 0 : 1)) return; // stale
    const m = pos.findMove(msg.uci);
    if (!m) return;
    applyMoveRef.current(m);
    // enrich the AI move record with engine eval
    const cur = movesRef.current;
    if (cur.length > 0) {
      const idx = cur.length - 1;
      const updated = [...cur];
      updated[idx] = {
        ...updated[idx],
        evalWhite: msg.fromMemory ? null : msg.scoreWhite,
        mateIn: msg.fromMemory ? null : msg.mateIn,
        classification: msg.fromBook ? "book" : updated[idx].classification,
      };
      movesRef.current = updated;
      setMoves(updated);
    }
    if (!msg.fromMemory) setEvalDisplay({ cp: msg.scoreWhite, mateIn: msg.mateIn });
  }

  function applyPostAnalysisImpl(msg: WorkerAnalysis) {
    if (statusRef.current !== "playing") return;
    const cur = movesRef.current;
    if (cur.length === 0) return;
    const last = cur[cur.length - 1];
    // pass & play: BOTH players get their moves classified; vs AI: only yours
    const isAiMove = modeRef.current !== "local" && last.color !== playerColorRef.current;
    if (isAiMove || last.classification !== null) return;
    const pre = preAnalysisRef.current;
    const before = pre ? pre.evalWhite : null;
    const after = msg.scoreWhite;
    const isWhite = last.color === "w";
    let cls: MoveClass = "good";
    // player's move matching the opening book? → friendly "book" tag
    const movesBefore = cur.slice(0, -1).map((m) => m.uci);
    const bookChoices = lookupBook(movesBefore);
    const isBookMove = !!bookChoices?.some((c) => c.move === last.uci);
    if (isBookMove && !bookMoveIsBad(before, after, isWhite)) {
      cls = "book";
    } else if (before !== null && pre) {
      // loss in centipawns from the player's point of view
      const loss = isWhite ? before - after : after - before;
      if (last.uci === pre.bestMove) cls = "best";
      else if (loss <= 25) cls = "excellent";
      else if (loss <= 70) cls = "good";
      else if (loss <= 140) cls = "inaccuracy";
      else if (loss <= 280) cls = "mistake";
      else cls = "blunder";
    }
    const updated = [...cur];
    updated[updated.length - 1] = { ...last, classification: cls, evalWhite: after, mateIn: msg.mateIn };
    movesRef.current = updated;
    setMoves(updated);
    setEvalDisplay({ cp: after, mateIn: msg.mateIn });

    // ── live learning #3: study every classified player move in real time ──
    // (never in pass & play — there is no single "player" for the AI to model)
    const learn = learningRef.current;
    if (modeRef.current !== "local" && learn && sessionRef.current) {
      const newInsights = observePlayerMove(learn, sessionRef.current, {
        ply: cur.length,
        classification: cls,
        isCapture: last.isCapture,
        isCheck: last.isCheck,
        timeSpentMs: last.timeSpentMs,
      });
      if (newInsights.length > 0) saveLearning(learn);
      setLearning({ ...learn });
    }

    if (cls === "blunder" && pre) {
      setToast(`Blunder! Best was ${fmtUci(pre.bestMove)}.`);
      setTimeout(() => setToast(null), 2800);
    } else if (cls === "mistake") {
      setToast("Mistake — there was something better.");
      setTimeout(() => setToast(null), 2400);
    }
  }

  // ── finish game: ratings & records ────────────────────────────────────────
  const finishGame = useCallback((winner: Color | null, reason: string) => {
    if (statusRef.current === "over") return;
    const pc = playerColorRef.current;
    const isLocal = modeRef.current === "local";
    const names = isLocal ? (pnpNamesRef.current ?? { w: "White", b: "Black" }) : null;
    // pass & play: the result is reported from White's seat
    const playerResult: "win" | "loss" | "draw" =
      winner === null ? "draw" : (winner === 0) === (isLocal ? true : pc === "w") ? "win" : "loss";
    const winnerSide: PlayerSide | null = winner === null ? null : winner === 0 ? "w" : "b";
    const level = configRef.current?.level ?? 2;
    const levelElo = levelConfig(level).elo;

    let prof = loadProfile();
    let ratingDelta: number | null = null;
    if (!isLocal) {
      // rated play happens only against the AI — a friendly board game
      // between two humans never touches your rating or the AI's memory
      const actual = playerResult === "win" ? 1 : playerResult === "draw" ? 0.5 : 0;
      ratingDelta = updateRating(prof, levelElo, actual);
      prof.gamesPlayed++;
      if (playerResult === "win") { prof.wins++; prof.streak = Math.max(1, prof.streak + 1); }
      else if (playerResult === "loss") { prof.losses++; prof.streak = Math.min(-1, prof.streak - 1); }
      else { prof.draws++; }
      const lv = prof.perLevel[String(level)] ?? { w: 0, l: 0, d: 0 };
      if (playerResult === "win") lv.w++;
      else if (playerResult === "loss") lv.l++;
      else lv.d++;
      prof.perLevel[String(level)] = lv;
    }

    // accuracy from player move classifications
    const playerMoves = movesRef.current.filter((m) => m.color === pc);
    const classified = playerMoves.filter((m) => m.classification);
    let avgCpLoss: number | null = null;
    let accuracy: number | null = null;
    let blunders = 0, mistakes = 0;
    if (classified.length >= 4) {
      let total = 0;
      for (const m of classified) {
        switch (m.classification) {
          case "best": case "book": total += 0; break;
          case "excellent": total += 15; break;
          case "good": total += 45; break;
          case "inaccuracy": total += 90; break;
          case "mistake": total += 180; mistakes++; break;
          case "blunder": total += 350; blunders++; break;
        }
      }
      avgCpLoss = Math.round(total / classified.length);
      accuracy = Math.max(10, Math.min(99, Math.round(103 - 8.5 * Math.sqrt(avgCpLoss))));
    }
    const sans = movesRef.current.map((m) => m.san);
    const opening = detectOpening(sans.slice(0, 10));
    const pgn = buildPgn(sans, {
      white: isLocal
        ? (names?.w || "White")
        : pc === "w" ? "Player" : `MasterBot (${levelConfig(level).name})`,
      black: isLocal
        ? (names?.b || "Black")
        : pc === "b" ? "Player" : `MasterBot (${levelConfig(level).name})`,
      result: winner === null ? "1/2-1/2" : winner === 0 ? "1-0" : "0-1",
      termination: reasonText(reason),
      opening: opening || undefined,
    });
    const rec: GameRecord = {
      id: `g${Date.now()}`,
      date: Date.now(),
      level, playerColor: pc, result: playerResult, reason,
      moves: Math.ceil(sans.length / 2),
      pgn, opening, accuracy, avgCpLoss, blunders, mistakes,
      mode: isLocal ? "local" : "ai",
      players: isLocal ? names ?? undefined : undefined,
    };
    if (!isLocal) {
      prof.vsOpenings[opening] = (prof.vsOpenings[opening] ?? 0) + 1;
    }
    saveProfile(prof);
    setProfile({ ...prof });
    const allGames = [...loadGames(), rec];
    saveGames(allGames);
    setGames(allGames);

    // ── the AI learns from the finished game (memory book + player model) ──
    // (never in pass & play — there is no AI opponent to learn from)
    if (!isLocal) {
    const learn = learningRef.current;
    if (learn) {
      if (!sessionRef.current) sessionRef.current = createSession();
      const playerMovesArr = movesRef.current.filter((m) => m.color === pc);
      const avgMoveTimeMs = playerMovesArr.length
        ? playerMovesArr.reduce((a, m) => a + (m.timeSpentMs ?? 0), 0) / playerMovesArr.length
        : null;
      const reviewed = learnFromGame(learn, sessionRef.current, {
        uciMoves: movesRef.current.map((m) => m.uci),
        playerColor: pc,
        result: playerResult,
        opening: opening || "Irregular Opening",
        playerAccuracy: accuracy,
        blunders,
        mistakes,
        avgMoveTimeMs,
      });
      saveLearning(learn);
      setLearning({ ...learn });
      setLastReview(reviewed.map((r) => r.text));
    }
    }

    setStatus("over");
    statusRef.current = "over";
    const info: GameOverInfo = { winner: winnerSide, reason, playerResult, ratingDelta };
    setGameOver(info);
    gameOverRef.current = info;
    setAiThinking(false);
    playSound(
      playerResult === "win" ? "win" : playerResult === "loss" ? "lose" : "draw",
      settingsRef.current.soundOn
    );
  }, []);

  // ── applying a move (player or AI) ────────────────────────────────────────
  const applyMove = useCallback((m: number) => {
    const pos = posRef.current;
    const san = moveToSan(pos, m);
    const mover = pos.side === 0 ? "w" : "b";
    const flags = m & 0x3e0000;
    const isCapture = (flags & FLAG_CAPTURE) !== 0 || (flags & FLAG_EP) !== 0;
    const promo = mPromo(m);

    let timeSpent: number | null = null;
    if (clockRef.current) {
      const elapsed = Date.now() - turnStartRef.current;
      timeSpent = elapsed;
      const inc = (configRef.current?.timeControl?.incSec ?? 0) * 1000;
      clockRef.current[mover as "w" | "b"] = Math.max(0, clockRef.current[mover as "w" | "b"] - elapsed + inc);
      setClocks({ ...clockRef.current });
    }
    turnStartRef.current = Date.now();

    pos.makeMove(m);
    const givesCheck = pos.inCheck();
    const checkSq = givesCheck ? pos.kingSq[pos.side] : -1;

    const rec: MoveRecord = {
      san, uci: moveToUci(m), color: mover,
      evalWhite: null, mateIn: null, classification: null,
      timeSpentMs: timeSpent,
      isCapture, isCheck: givesCheck,
    };
    const nextMoves = [...movesRef.current, rec];
    movesRef.current = nextMoves;
    setMoves(nextMoves);
    setSnapshots((prev) => {
      const copy = new Int8Array(128);
      copy.set(pos.squares);
      return [...prev, copy];
    });
    setLastMoves((prev) => [...prev, { from: mFrom(m), to: mTo(m) }]);
    setCheckSqs((prev) => [...prev, checkSq]);
    setViewPly(nextMoves.length);
    setHint(null);
    armedActionRef.current = null; // a move on the board disarms any pending draw/resign confirm

    // sounds (priority: check > promo > castle > capture > move)
    if (givesCheck) playSound("check", settingsRef.current.soundOn);
    else if (promo) playSound("promote", settingsRef.current.soundOn);
    else if (flags & (FLAG_CASTLE_K | FLAG_CASTLE_Q)) playSound("castle", settingsRef.current.soundOn);
    else if (isCapture) playSound("capture", settingsRef.current.soundOn);
    else playSound("move", settingsRef.current.soundOn);

    const oc = pos.outcome();
    if (oc.over) {
      finishGameRef.current(oc.winner, oc.reason);
      return;
    }

    // queue follow-up engine work (worker is FIFO: post-analysis runs before AI search)
    if (modeRef.current !== "local" && pos.side !== (playerColorRef.current === "w" ? 0 : 1)) {
      requestPostAnalysisRef.current();
      requestAiMoveRef.current();
    } else {
      // human's turn next (or pass & play): classify the move, keep the eval fresh
      requestPostAnalysisRef.current();
      requestPreAnalysisRef.current();
    }
  }, []);

  // wire late-bound refs
  requestAiMoveRef.current = requestAiMove;
  requestPreAnalysisRef.current = requestPreAnalysis;
  requestPostAnalysisRef.current = requestPostAnalysis;
  applyMoveRef.current = applyMove;
  finishGameRef.current = finishGame;

  // ── game lifecycle ────────────────────────────────────────────────────────
  const newGame = useCallback((cfg: GameConfig) => {
    const color: PlayerSide =
      cfg.playerColor === "random" ? (Math.random() < 0.5 ? "w" : "b") : cfg.playerColor;
    const isLocal = cfg.mode === "local";
    const names = cfg.pnpNames ?? { w: "White", b: "Black" };
    modeRef.current = isLocal ? "local" : "ai";
    pnpNamesRef.current = names;
    setMode(isLocal ? "local" : "ai");
    setPnpNames(names);
    const pos = new Position(START_FEN);
    posRef.current = pos;
    seedRef.current = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
    idCounter.current++;
    pendingSearchId.current = 0;
    pendingPreId.current = 0;
    pendingPostId.current = 0;
    pendingHintId.current = 0;
    configRef.current = cfg;
    playerColorRef.current = color;
    statusRef.current = "playing";
    setConfig(cfg);
    setPlayerColor(color);
    setAiLevel(cfg.level);
    setSnapshots([new Int8Array(pos.squares)]);
    setLastMoves([]);
    setCheckSqs([]);
    movesRef.current = [];
    setMoves([]);
    setViewPly(0);
    gameOverRef.current = null;
    setGameOver(null);
    setAiThinking(false);
    setAiInfo(null);
    setPendingPromotion(null);
    setHint(null);
    armedActionRef.current = null;
    setDrawOffered(false);
    setEvalDisplay({ cp: null, mateIn: null });
    preAnalysisRef.current = null;
    sessionRef.current = createSession();
    setLastReview([]);
    if (cfg.timeControl) {
      const ms = cfg.timeControl.initialSec * 1000;
      clockRef.current = { w: ms, b: ms };
      setClocks({ w: ms, b: ms });
    } else {
      clockRef.current = null;
      setClocks(null);
    }
    setStatus("playing");
    turnStartRef.current = Date.now();
    postToWorker({ type: "newGame" });
    playSound("start", settingsRef.current.soundOn);
    if (!isLocal && color === "b") {
      // AI opens as white
      requestAiMoveRef.current();
    } else {
      requestPreAnalysisRef.current();
    }
  }, [postToWorker]);

  // ── worker lifecycle (single mount effect) ────────────────────────────────
  // The ?v= query busts browser + service-worker caches: a stale worker that
  // predates a protocol change would otherwise silently ignore new messages
  // (that exact bug once made the hint button look dead).
  const WORKER_PROTOCOL = 2;
  useEffect(() => {
    let w: Worker | null = null;
    let pingTimer: ReturnType<typeof setTimeout> | null = null;
    try {
      w = new Worker(`/chess-worker.js?v=${WORKER_PROTOCOL}`);
      workerRef.current = w;
      w.onmessage = (e: MessageEvent) => {
        const msg = e.data as WorkerMsg;
        if (msg.type === "pong") {
          workerReadyRef.current = true;
          return;
        }
        handleWorkerMsg(msg);
      };
      w.onerror = () => {
        workerReadyRef.current = false;
        void ensureLocalEngine();
      };
      w.postMessage({ type: "ping" });
      pingTimer = setTimeout(() => {
        if (!workerReadyRef.current) {
          try { w?.terminate(); } catch { /* noop */ }
          workerRef.current = null;
          void ensureLocalEngine();
        }
      }, 3000);
    } catch {
      workerRef.current = null;
      void ensureLocalEngine();
    }
    return () => {
      if (pingTimer) clearTimeout(pingTimer);
      try { w?.terminate(); } catch { /* noop */ }
      workerRef.current = null;
    };
  }, []);

  // ── load persisted data ──
  useEffect(() => {
    setSettings(loadSettings());
    setProfile(loadProfile());
    setGames(loadGames());
    const learn = loadLearning();
    learningRef.current = learn;
    setLearning(learn);
    sessionRef.current = createSession();
    primeAudio();
  }, []);

  // ── derived view state ──
  const livePly = moves.length;
  const isLive = viewPly === livePly;
  const viewSquares = snapshots[Math.min(viewPly, snapshots.length - 1)];
  const viewLastMove = viewPly > 0 ? lastMoves[viewPly - 1] : null;
  const viewCheckSq = viewPly > 0 ? (checkSqs[viewPly - 1] ?? -1) : -1;
  const turn: PlayerSide = posRef.current.side === 0 ? "w" : "b";
  const localMode = mode === "local";
  const playerTurn = status === "playing" && isLive && (localMode || turn === playerColor);
  const inCheckLive = status === "playing" && posRef.current.inCheck();
  const openingName = useMemo(
    () => (moves.length >= 2 ? detectOpening(moves.slice(0, 10).map((m) => m.san)) : ""),
    [moves]
  );

  // ── helpers exposed to UI ──
  const setSetting = useCallback(<K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      saveSettings(next);
      return next;
    });
  }, []);

  const targetsFrom = useCallback((from: number): number[] => {
    if (status !== "playing" || !isLive) return [];
    // pass & play: whoever's turn it is moves for their side
    if (modeRef.current !== "local" && posRef.current.side !== (playerColor === "w" ? 0 : 1)) return [];
    return posRef.current.movesFrom(from).map(mTo);
  }, [status, isLive, playerColor]);

  const needsPromotion = useCallback((from: number, to: number): boolean => {
    if (status !== "playing" || !isLive) return false;
    return posRef.current.movesFrom(from).some((m) => mTo(m) === to && mPromo(m) !== 0);
  }, [status, isLive]);

  const pieceAt = useCallback((sq: number): number => {
    return isLive ? posRef.current.squares[sq] : viewSquares[sq];
  }, [isLive, viewSquares]);

  // ── player move entry points ──
  const tryMove = useCallback((from: number, to: number): "ok" | "promo" | "illegal" => {
    if (status !== "playing" || !isLive) return "illegal";
    // pass & play: either side may move
    if (modeRef.current !== "local" && posRef.current.side !== (playerColor === "w" ? 0 : 1)) return "illegal";
    const candidates = posRef.current.movesFrom(from).filter((m) => mTo(m) === to);
    if (candidates.length === 0) return "illegal";
    const promos = candidates.filter((m) => mPromo(m) !== 0);
    if (promos.length > 0) {
      if (settings.autoQueen) {
        const q = promos.find((m) => mPromo(m) === QUEEN);
        if (q) { applyMoveRef.current(q); return "ok"; }
      }
      setPendingPromotion({ from, to });
      return "promo";
    }
    applyMoveRef.current(candidates[0]);
    return "ok";
  }, [status, isLive, playerColor, settings.autoQueen]);

  const resolvePromotion = useCallback((promoType: number) => {
    const pp = pendingPromotion;
    if (!pp) return;
    setPendingPromotion(null);
    const m = posRef.current
      .movesFrom(pp.from)
      .find((mm) => mTo(mm) === pp.to && mPromo(mm) === promoType);
    if (m) applyMoveRef.current(m);
  }, [pendingPromotion]);

  const cancelPromotion = useCallback(() => setPendingPromotion(null), []);

  const undo = useCallback((): boolean => {
    if (status !== "playing" || aiThinking) return false;
    if (!isLive) { setViewPly(moves.length); return false; }
    const pos = posRef.current;
    let plies = 0;
    if (modeRef.current === "local") {
      // pass & play: take back exactly the last move, whoever played it
      plies = movesRef.current.length >= 1 ? 1 : 0;
    } else if (pos.side === (playerColor === "w" ? 0 : 1)) {
      plies = movesRef.current.length >= 2 ? 2 : movesRef.current.length;
    } else {
      plies = 1;
    }
    if (plies === 0) return false;
    for (let i = 0; i < plies; i++) pos.undoMove();
    const next = movesRef.current.slice(0, movesRef.current.length - plies);
    movesRef.current = next;
    setMoves(next);
    setSnapshots((prev) => prev.slice(0, prev.length - plies));
    setLastMoves((prev) => prev.slice(0, prev.length - plies));
    setCheckSqs((prev) => prev.slice(0, prev.length - plies));
    setViewPly(next.length);
    preAnalysisRef.current = null;
    setAiInfo(null);
    setEvalDisplay({ cp: null, mateIn: null });
    playSound("click", settingsRef.current.soundOn);
    if (modeRef.current !== "local" && posRef.current.side !== (playerColorRef.current === "w" ? 0 : 1)) {
      // undid into AI's turn (e.g. AI's opening move) — let it move again
      requestAiMoveRef.current();
    } else {
      requestPreAnalysisRef.current();
    }
    return true;
  }, [status, aiThinking, isLive, moves.length, playerColor]);

  const hintRequest = useCallback(() => {
    // The hint button must ALWAYS respond — never silently do nothing.
    // Every early exit explains itself out loud.
    if (modeRef.current === "local") {
      setToast("Suggestions are off in 2-player mode — it's just you two.");
      setTimeout(() => setToast(null), 2400);
      return;
    }
    if (status !== "playing") {
      setToast("Start a game first — suggestions work during play.");
      setTimeout(() => setToast(null), 2400);
      return;
    }
    if (aiThinking) {
      setToast("MasterBot is thinking — suggestions resume on your turn.");
      setTimeout(() => setToast(null), 2400);
      return;
    }
    if (posRef.current.side !== (playerColor === "w" ? 0 : 1)) {
      setToast("It's MasterBot's move — wait for your turn.");
      setTimeout(() => setToast(null), 2400);
      return;
    }
    if (movesRef.current.length !== viewPly) {
      setToast("You're viewing an earlier position — jump back to the live one (End key).");
      setTimeout(() => setToast(null), 2800);
      return; // only suggest for the live position
    }
    const id = ++idCounter.current;
    pendingHintId.current = id;
    hintPlyRef.current = movesRef.current.length; // staleness marker
    setHint(null); // replace any old suggestion
    setHintLoading(true);
    const moveList = movesRef.current.map((m) => m.uci);

    // main-thread fallback: same engine, same answer — used when the worker
    // is unavailable OR when a stale cached worker swallowed the request
    const runLocal = () => {
      void (async () => {
        try {
          await ensureLocalEngine();
          const eng = localEngineRef.current;
          if (!eng || pendingHintId.current !== id) return;
          const res = eng.analyze(START_FEN, moveList, 10);
          handleWorkerMsg({
            type: "analysis", id, uci: res.uci, scoreWhite: res.scoreWhite,
            mateIn: res.mateIn, depth: res.depth, nodes: res.nodes, timeMs: res.timeMs,
          });
        } catch {
          if (pendingHintId.current === id) setHintLoading(false);
        }
      })();
    };

    if (!postToWorker({ type: "analyze", id, fen: START_FEN, moves: moveList, depth: 10 })) {
      runLocal();
    } else {
      // watchdog: a stale cached worker (old protocol) can silently swallow
      // the analyze message. If no answer arrives in time, rerun the analysis
      // on the main thread — the hint must NEVER silently do nothing.
      setTimeout(() => {
        if (pendingHintId.current === id) runLocal();
      }, 2800);
    }
    // safety valve: never spin forever — and never fail silently either.
    // If nothing produced a suggestion by now, say so clearly.
    setTimeout(() => {
      if (pendingHintId.current === id) {
        setHintLoading(false);
        setToast("Couldn't compute a suggestion — tap Hint again.");
        setTimeout(() => setToast(null), 2600);
      }
    }, 8000);
  }, [status, aiThinking, playerColor, viewPly, postToWorker, ensureLocalEngine]);

  const dismissHint = useCallback(() => {
    setHint(null);
  }, []);

  const resign = useCallback(() => {
    if (status !== "playing") return;
    if (modeRef.current === "local") {
      // pass & play: the side to move resigns (they're holding the device) —
      // but only after a second tap confirms it
      const sideName = posRef.current.side === 0 ? pnpNamesRef.current.w : pnpNamesRef.current.b;
      const armed = armedActionRef.current;
      if (!armed || armed.kind !== "resign" || Date.now() > armed.until) {
        armedActionRef.current = { kind: "resign", until: Date.now() + 6000 };
        setToast(`${sideName} wants to resign — tap Resign again to confirm.`);
        setTimeout(() => setToast(null), 3000);
        return;
      }
      armedActionRef.current = null;
      const winner: Color = posRef.current.side === 0 ? 1 : 0;
      finishGameRef.current(winner, "resign");
      return;
    }
    const winner: Color = playerColor === "w" ? 1 : 0;
    finishGameRef.current(winner, "resign");
  }, [status, playerColor]);

  const offerDraw = useCallback(() => {
    if (status !== "playing" || drawOffered) return;
    if (modeRef.current === "local") {
      // pass & play: both players are at the board — a draw needs BOTH taps
      const armed = armedActionRef.current;
      if (!armed || armed.kind !== "draw" || Date.now() > armed.until) {
        armedActionRef.current = { kind: "draw", until: Date.now() + 6000 };
        setToast("Draw offered — tap Offer draw again and both players agree.");
        setTimeout(() => setToast(null), 3000);
        return;
      }
      armedActionRef.current = null;
      finishGameRef.current(null, "agreement");
      return;
    }
    setDrawOffered(true);
    const evalW = evalDisplay.cp ?? 0;
    const aiSide = playerColor === "w" ? "b" : "w";
    const aiEval = aiSide === "w" ? evalW : -evalW;
    const plies = moves.length;
    if (aiEval <= -180 || (Math.abs(evalW) < 30 && plies > 80)) {
      finishGameRef.current(null, "agreement");
      setToast("MasterBot accepts your draw offer.");
    } else {
      setToast(aiEval > 120 ? "MasterBot declines — it likes its position." : "MasterBot declines. Play on!");
      setTimeout(() => setToast(null), 2600);
    }
  }, [status, drawOffered, evalDisplay.cp, playerColor, moves.length]);

  // ── history navigation ──
  const goToPly = useCallback((n: number) => {
    setViewPly((cur) => {
      const target = Math.max(0, Math.min(movesRef.current.length, n));
      return target;
    });
    setHint(null);
  }, []);
  const navigate = useCallback((delta: number) => goToPly(viewPly + delta), [goToPly, viewPly]);
  const goLive = useCallback(() => setViewPly(movesRef.current.length), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft") navigate(-1);
      else if (e.key === "ArrowRight") navigate(1);
      else if (e.key === "Home") goToPly(0);
      else if (e.key === "End") goLive();
      // pass & play: the board is fixed — flipping (F) is a vs-AI-only action
      else if ((e.key === "f" || e.key === "F") && modeRef.current !== "local") setFlipBoard((f) => !f);
      else if ((e.key === "h" || e.key === "H") && modeRef.current !== "local") hintRequest();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, goToPly, goLive, hintRequest]);

  // ── clock ticking ──
  const hasClock = clocks !== null && !!config?.timeControl;
  useEffect(() => {
    if (status !== "playing" || !hasClock) return;
    const timer = setInterval(() => {
      if (statusRef.current !== "playing" || !clockRef.current) return;
      const side = posRef.current.side === 0 ? "w" : "b";
      const elapsed = Date.now() - turnStartRef.current;
      const remain = Math.max(0, (clockRef.current[side] ?? 0) - elapsed);
      setClocks((prev) => (prev ? { ...prev, [side]: remain } : prev));
      if (remain <= 0) {
        const winner: Color = side === "w" ? 1 : 0;
        finishGameRef.current(winner, "timeout");
      } else if (remain < 30000 && (modeRef.current === "local" || side === playerColorRef.current) && Math.floor(remain / 1000) % 10 === 0) {
        playSound("tick", settingsRef.current.soundOn);
      }
    }, 250);
    return () => clearInterval(timer);
  }, [status, hasClock]);

  // ── PGN ──
  const getPgn = useCallback((): string => {
    const sans = moves.map((m) => m.san);
    const white = mode === "local"
      ? (pnpNames.w || "White")
      : playerColor === "w" ? "Player" : `MasterBot (${levelConfig(aiLevel).name})`;
    const black = mode === "local"
      ? (pnpNames.b || "Black")
      : playerColor === "b" ? "Player" : `MasterBot (${levelConfig(aiLevel).name})`;
    return buildPgn(sans, {
      white,
      black,
      result: gameOver
        ? gameOver.winner === null ? "1/2-1/2" : gameOver.winner === "w" ? "1-0" : "0-1"
        : "*",
      termination: gameOver ? reasonText(gameOver.reason) : undefined,
      opening: openingName || undefined,
    });
  }, [moves, mode, pnpNames, playerColor, aiLevel, gameOver, openingName]);

  const resetToSetup = useCallback(() => {
    statusRef.current = "setup";
    setStatus("setup");
    gameOverRef.current = null;
    setGameOver(null);
    movesRef.current = [];
    setMoves([]);
    setLastMoves([]);
    setCheckSqs([]);
    posRef.current = new Position(START_FEN);
    setSnapshots([new Int8Array(posRef.current.squares)]);
    setViewPly(0);
    setClocks(null);
    clockRef.current = null;
    sessionRef.current = null;
    setLastReview([]);
  }, []);

  // ── wipe the AI's learned memory (fresh start) ──
  const wipeMemory = useCallback(() => {
    const fresh = resetLearning();
    learningRef.current = fresh;
    setLearning({ ...fresh });
    sessionRef.current = createSession();
    setLastReview([]);
    setToast("MasterBot's memory wiped — it will learn you from scratch.");
    setTimeout(() => setToast(null), 2600);
  }, []);

  const ai = levelConfig(config?.level ?? aiLevel);

  return {
    status, config, playerColor, moves, viewPly, isLive, livePly,
    viewSquares, viewLastMove, viewCheckSq, gameOver, aiThinking, aiInfo,
    pendingPromotion, clocks, drawOffered, toast, settings, profile, games,
    flipBoard, setFlipBoard, openingName, evalDisplay,
    mode, localMode, pnpNames, turn,
    ai, aiLevel, playerTurn, inCheckLive,
    learning, lastReview, learningSession: sessionStats(sessionRef.current),
    hint, hintLoading, dismissHint, wipeMemory,
    newGame, tryMove, resolvePromotion, cancelPromotion, undo, hintRequest,
    resign, offerDraw, goToPly, navigate, goLive, setSetting, getPgn,
    resetToSetup,
    targetsFrom, needsPromotion, pieceAt,
  };
}

function clampScore(s: number): number {
  return Math.max(-2000, Math.min(2000, s));
}

// ─── move suggestion explanations ────────────────────────────────────────────

const PIECE_NAMES: Record<number, string> = {
  [PAWN]: "pawn", [KNIGHT]: "knight", [BISHOP]: "bishop",
  [ROOK]: "rook", [QUEEN]: "queen", [KING]: "king",
};
const PIECE_VALUES: Record<number, number> = {
  [PAWN]: 1, [KNIGHT]: 3, [BISHOP]: 3, [ROOK]: 5, [QUEEN]: 9, [KING]: 0,
};

/**
 * Turn an engine move into a short human explanation of WHY it is the pick.
 * `pos` is the position BEFORE the move is played.
 */
function explainMove(pos: Position, m: number, san: string): string {
  const from = mFrom(m);
  const to = mTo(m);
  const flags = mFlags(m);
  const mover = pos.pieceAt(from);
  if (!mover) return "The engine's strongest move in this position.";

  const mt = pieceType(mover);
  const moverName = PIECE_NAMES[mt] ?? "piece";
  const isCap = (flags & (FLAG_CAPTURE | FLAG_EP)) !== 0;

  // 1. does it end the game on the spot?
  const after = pos.clone();
  after.makeMove(m);
  const oc = after.outcome();
  if (oc.over && oc.reason === "checkmate") {
    return `Checkmate — play ${san} and the game is won on the spot.`;
  }
  if (oc.over && oc.reason === "stalemate") {
    return `Careful: ${san} is stalemate — the game would end as a draw.`;
  }

  const parts: string[] = [];

  // 2. resolving a check against you
  if (pos.inCheck()) parts.push("gets your king out of check");

  // 3. capture — and what it means materially
  if (isCap) {
    const capSq = (flags & FLAG_EP) !== 0 ? to + (pieceColor(mover) === 0 ? -16 : 16) : to;
    const captured = pos.pieceAt(capSq);
    if (captured) {
      const capName = PIECE_NAMES[pieceType(captured)] ?? "piece";
      const capVal = PIECE_VALUES[pieceType(captured)];
      const movVal = PIECE_VALUES[mt];
      // can the enemy recapture on the landing square?
      const recapturable = after.isSquareAttacked(to, pieceColor(mover) === 0 ? 1 : 0);
      if (!recapturable) parts.push(`grabs the ${capName} for free — nothing takes back`);
      else if (capVal > movVal) parts.push(`captures the ${capName} — clean material win`);
      else if (capVal === movVal) parts.push(`trades off the ${capName}`);
      else parts.push(`sacrifices material for a much stronger attack — trust the engine on this one`);
    }
  }

  // 4. castling / promotion
  if (flags & (FLAG_CASTLE_K | FLAG_CASTLE_Q)) {
    parts.push("castles — king to safety, rook into the game");
  }
  if (flags & FLAG_PROMO) {
    parts.push(`the pawn promotes to a ${PIECE_NAMES[mPromo(m)] ?? "queen"}`);
  }

  // 5. check to the enemy king
  if (parts.length === 0 && pos.moveGivesCheck(m)) {
    parts.push("puts the enemy king in check");
  }

  // 6. positional reasons when nothing tactical applies
  if (parts.length === 0) {
    const toFile = to & 7;
    const toRank = to >> 4;
    const central = (toFile === 3 || toFile === 4) && (toRank === 3 || toRank === 4);
    const semiCentral = toFile >= 2 && toFile <= 5 && toRank >= 2 && toRank <= 5;
    const homeRank = pieceColor(mover) === 0 ? 0 : 7;

    if ((mt === KNIGHT || mt === BISHOP) && (from >> 4) === homeRank && semiCentral) {
      parts.push(`develops the ${moverName} toward the center`);
    } else if (mt === PAWN && central) {
      parts.push("stakes a claim in the center");
    } else if (mt === ROOK) {
      let openFile = true;
      for (let r = 0; r < 8; r++) {
        const p = after.pieceAt(toFile + r * 16);
        if (p && pieceType(p) === PAWN) { openFile = false; break; }
      }
      parts.push(openFile
        ? `seizes the open ${String.fromCharCode(97 + toFile)}-file`
        : `brings the rook into the game`);
    } else if (mt === QUEEN) {
      parts.push("moves the queen toward the action");
    } else if (mt === KING) {
      parts.push("improves the king's position");
    } else {
      parts.push(`the engine's best move — it strengthens your position the most`);
    }
  }

  return `${capitalize(joinList(parts))}.`;
}

function joinList(parts: string[]): string {
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** a book move is still "book" unless it loses ≥ 180cp (rare trap lines) */
function bookMoveIsBad(before: number | null, after: number, isWhite: boolean): boolean {
  if (before === null) return false;
  const loss = isWhite ? before - after : after - before;
  return loss >= 180;
}

function fmtUci(uci: string): string {
  return `${uci.slice(0, 2)}–${uci.slice(2, 4)}`;
}

export function reasonText(reason: string): string {
  switch (reason) {
    case "checkmate": return "checkmate";
    case "stalemate": return "stalemate";
    case "fifty-move": return "the fifty-move rule";
    case "repetition": return "threefold repetition";
    case "insufficient-material": return "insufficient material";
    case "resign": return "resignation";
    case "timeout": return "time running out";
    case "agreement": return "mutual agreement";
    default: return reason;
  }
}
