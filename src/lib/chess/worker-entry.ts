/// <reference lib="webworker" />
// ─── Chess AI worker: runs engine searches off the main thread ──────────────
// Bundled to public/chess-worker.js (classic worker script, no imports).

import { ChessEngine } from "./engine";
import { moveToUci } from "./types";
import { Position } from "./board";
import { moveToSan } from "./san";

const ctx = self as unknown as {
  onmessage: (e: MessageEvent) => void;
  postMessage: (m: unknown) => void;
};

const engine = new ChessEngine();

interface SearchMsg {
  type: "search";
  id: number;
  fen: string;
  moves: string[];
  level: number;
  seed: number;
  maxTimeMs?: number;
  styleBias?: { aggression: number };
  bookAvoid?: string[];
}
interface AnalyzeMsg {
  type: "analyze";
  id: number;
  fen: string;
  moves: string[];
  depth: number;
}
type InMsg = SearchMsg | AnalyzeMsg | { type: "newGame" } | { type: "ping" };

ctx.onmessage = (e: MessageEvent) => {
  const msg = e.data as InMsg;
  try {
    switch (msg.type) {
      case "ping": {
        ctx.postMessage({ type: "pong" });
        break;
      }
      case "newGame": {
        engine.newGame();
        break;
      }
      case "search": {
        const s = msg as SearchMsg;
        const res = engine.findMove(s.fen, s.moves, {
          level: s.level,
          seed: s.seed,
          maxTimeMs: s.maxTimeMs,
          styleBias: s.styleBias,
          bookAvoid: s.bookAvoid,
          onInfo: (info) => {
            ctx.postMessage({
              type: "info",
              id: s.id,
              depth: info.depth,
              nodes: info.nodes,
              timeMs: info.timeMs,
              score: info.score,
            });
          },
        });
        // PV in SAN for display
        let pvSan: string[] = [];
        try {
          const p = new Position(s.fen);
          for (const u of s.moves) {
            const mm = p.findMove(u);
            if (!mm) break;
            p.makeMove(mm);
          }
          const legal = p.legalMoves();
          const first = p.findMove(res.uci);
          if (first && legal.includes(first)) {
            pvSan.push(moveToSan(p, first));
            p.makeMove(first);
            for (const u of res.pv.slice(1)) {
              const m = p.findMove(u);
              if (!m) break;
              pvSan.push(moveToSan(p, m));
              p.makeMove(m);
            }
          }
        } catch (err) {
          pvSan = [];
          console.error("pvSan error:", err);
        }
        ctx.postMessage({
          type: "result",
          id: s.id,
          ...res,
          pvSan,
        });
        break;
      }
      case "analyze": {
        const a = msg as AnalyzeMsg;
        const res = engine.analyze(a.fen, a.moves, a.depth);
        ctx.postMessage({ type: "analysis", id: a.id, ...res });
        break;
      }
    }
  } catch (err) {
    ctx.postMessage({
      type: "error",
      id: (msg as { id?: number }).id ?? -1,
      message: String(err),
    });
  }
};

export {};
