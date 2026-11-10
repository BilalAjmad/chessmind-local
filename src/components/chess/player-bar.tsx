"use client";
// ─── Player bar: avatar, name, level, captured pieces, material, clock ──────

import { Bot, User, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChessPieceSvg, type PieceCode } from "./pieces";

const PIECE_LETTERS = ["", "P", "N", "B", "R", "Q", "K"];
const VALS = [0, 1, 3, 3, 5, 9, 0];

export function fmtClock(ms: number): string {
  const s = Math.max(0, ms) / 1000;
  if (s < 20) {
    const ss = Math.floor(s);
    const tenths = Math.floor((s - ss) * 10);
    return `${ss}.${tenths}`;
  }
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/** compute captured pieces (what `byColor` captured) + material diff */
export function captureInfo(squares: Int8Array) {
  const startCounts = { P: 8, N: 2, B: 2, R: 2, Q: 1, K: 1 };
  const counts = {
    w: { P: 0, N: 0, B: 0, R: 0, Q: 0, K: 0 },
    b: { P: 0, N: 0, B: 0, R: 0, Q: 0, K: 0 },
  };
  for (let s = 0; s < 128; s++) {
    if (s & 0x88) continue;
    const c = squares[s];
    if (c === 0) continue;
    const col = c >> 3 ? "b" : "w";
    counts[col][PIECE_LETTERS[c & 7] as "P"]++;
  }
  const capturedByW: string[] = [];
  const capturedByB: string[] = [];
  let matW = 0, matB = 0;
  for (const t of ["P", "N", "B", "R", "Q"] as const) {
    const missingB = startCounts[t] - counts.b[t];
    const missingW = startCounts[t] - counts.w[t];
    for (let i = 0; i < missingB; i++) capturedByW.push(t);
    for (let i = 0; i < missingW; i++) capturedByB.push(t);
  }
  for (const t of ["P", "N", "B", "R", "Q"] as const) {
    matW += counts.w[t] * VALS[PIECE_LETTERS.indexOf(t)];
    matB += counts.b[t] * VALS[PIECE_LETTERS.indexOf(t)];
  }
  return { capturedByW, capturedByB, matDiff: matW - matB };
}

export function CapturedRow({
  pieces, color,
}: {
  pieces: string[];
  color: "w" | "b";
}) {
  if (pieces.length === 0) return <div className="h-5" aria-hidden="true" />;
  const order = { Q: 0, R: 1, B: 2, N: 3, P: 4 };
  const sorted = [...pieces].sort((a, b) => order[a as "Q"] - order[b as "Q"]);
  return (
    <div className="flex items-center h-5 -space-x-1.5 overflow-hidden" aria-label="captured pieces">
      {sorted.map((t, i) => (
        <ChessPieceSvg
          key={i}
          piece={`${color}${t}` as PieceCode}
          className="w-4 h-4 opacity-80"
        />
      ))}
    </div>
  );
}

interface PlayerBarProps {
  kind: "ai" | "player";
  name: string;
  subtitle?: string;
  level?: number;
  active: boolean;
  thinking?: boolean;
  clockMs: number | null;
  lowTime?: boolean;
  squares: Int8Array;
  playerColor: "w" | "b";
  isBottom: boolean;
}

export function PlayerBar({
  kind, name, subtitle, level, active, thinking, clockMs, lowTime,
  squares, playerColor, isBottom,
}: PlayerBarProps) {
  const { capturedByW, capturedByB, matDiff } = captureInfo(squares);
  // this bar's side: bottom = the human player, top = the AI
  const shownColor: "w" | "b" = isBottom ? playerColor : playerColor === "w" ? "b" : "w";
  const captured = shownColor === "w" ? capturedByW : capturedByB; // enemy piece types this side captured
  const diff = shownColor === "w" ? matDiff : -matDiff;
  const barColor = shownColor === "w" ? "w" : "b";

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-xl border transition-colors",
        active ? "border-primary/60 bg-primary/5" : "border-border bg-card"
      )}
    >
      <div
        className={cn(
          "relative shrink-0 w-10 h-10 rounded-full flex items-center justify-center border",
          kind === "ai" ? "bg-muted" : "bg-background"
        )}
      >
        {kind === "ai" ? <Bot className="w-5 h-5 text-foreground/80" /> : <User className="w-5 h-5 text-foreground/80" />}
        {level !== undefined && (
          <span className="absolute -bottom-1.5 -right-1.5 text-[9px] font-bold bg-background border rounded-full px-1 py-px tabular-nums">
            L{level}
          </span>
        )}
        {thinking && (
          <span
            className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 border border-background animate-pulse"
            aria-label="thinking"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm truncate">{name}</span>
          {active && thinking && (
            <span className="flex items-center gap-1 text-[10px] text-amber-500 font-medium">
              <Zap className="w-3 h-3" /> thinking…
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 min-h-5">
          {subtitle && <span className="text-[10px] text-muted-foreground truncate">{subtitle}</span>}
          <CapturedRow pieces={captured} color={barColor === "w" ? "b" : "w"} />
          {diff > 0 && (
            <span className="text-[10px] font-bold text-emerald-400">+{diff}</span>
          )}
        </div>
      </div>

      {clockMs !== null && (
        <div
          className={cn(
            "px-2.5 py-1 rounded-lg font-mono font-bold tabular-nums text-sm border",
            lowTime
              ? "bg-red-500/15 text-red-400 border-red-500/40 animate-pulse"
              : active
                ? "bg-primary/10 text-primary border-primary/40"
                : "bg-muted/50 text-muted-foreground border-border"
          )}
          aria-label="clock"
        >
          {fmtClock(clockMs)}
        </div>
      )}
    </div>
  );
}
