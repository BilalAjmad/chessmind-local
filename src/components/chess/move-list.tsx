"use client";
// ─── Move list with coach classifications + evaluation graph ────────────────

import { useEffect, useRef } from "react";
import type { MoveRecord } from "@/hooks/use-chess-game";
import { cn } from "@/lib/utils";

const CLASS_META: Record<
  string,
  { label: string; symbol: string; cls: string; title: string }
> = {
  best: { label: "Best", symbol: "★", cls: "text-emerald-400", title: "Engine's best move" },
  excellent: { label: "Excellent", symbol: "!", cls: "text-emerald-300", title: "Excellent move" },
  good: { label: "Good", symbol: "✓", cls: "text-lime-300", title: "Good move" },
  book: { label: "Book", symbol: "≡", cls: "text-amber-300", title: "Opening book move" },
  inaccuracy: { label: "Inaccuracy", symbol: "?!", cls: "text-yellow-400", title: "Inaccuracy" },
  mistake: { label: "Mistake", symbol: "?", cls: "text-orange-400", title: "Mistake" },
  blunder: { label: "Blunder", symbol: "??", cls: "text-red-500", title: "Blunder" },
};

interface MoveListProps {
  moves: MoveRecord[];
  viewPly: number;
  onSelect: (ply: number) => void; // ply = move index + 1 (position after that move)
  showEval: boolean;
}

export function MoveList({ moves, viewPly, onSelect, showEval }: MoveListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [moves.length]);

  if (moves.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm py-10">
        Moves will appear here
      </div>
    );
  }

  const rows: { no: number; white?: MoveRecord; black?: MoveRecord; wPly: number; bPly: number }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    rows.push({
      no: i / 2 + 1,
      white: moves[i],
      black: moves[i + 1],
      wPly: i + 1,
      bPly: i + 2,
    });
  }

  return (
    <div ref={scrollRef} className="max-h-full overflow-y-auto nice-scrollbar text-sm">
      <table className="w-full border-collapse">
        <tbody>
          {rows.map((r) => (
            <tr key={r.no} className="hover:bg-muted/40">
              <td className="py-0.5 pr-1 text-right text-muted-foreground tabular-nums w-8 select-none">
                {r.no}.
              </td>
              <MoveCell move={r.white} ply={r.wPly} viewPly={viewPly} onSelect={onSelect} showEval={showEval} />
              <MoveCell move={r.black} ply={r.bPly} viewPly={viewPly} onSelect={onSelect} showEval={showEval} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MoveCell({
  move, ply, viewPly, onSelect, showEval,
}: {
  move?: MoveRecord;
  ply: number;
  viewPly: number;
  onSelect: (ply: number) => void;
  showEval: boolean;
}) {
  if (!move) return <td className="py-0.5" />;
  const active = viewPly === ply;
  const meta = move.classification ? CLASS_META[move.classification] : null;
  const evalText =
    showEval && move.evalWhite !== null
      ? move.mateIn !== null && move.mateIn !== undefined
        ? `M${Math.ceil(Math.abs(move.mateIn) / 2)}`
        : (move.evalWhite >= 0 ? "+" : "") + (move.evalWhite / 100).toFixed(1)
      : null;
  return (
    <td className="py-0.5">
      <button
        type="button"
        onClick={() => onSelect(ply)}
        className={cn(
          "px-1.5 py-0.5 rounded font-medium tabular-nums transition-colors text-left inline-flex items-center gap-1",
          active ? "bg-primary text-primary-foreground" : "hover:bg-muted"
        )}
        title={meta?.title}
      >
        <span>{move.san}</span>
        {meta && <span className={cn("text-[11px] font-bold", active ? "" : meta.cls)}>{meta.symbol}</span>}
        {evalText !== null && (
          <span className={cn("text-[10px] tabular-nums opacity-70")}>{evalText}</span>
        )}
      </button>
    </td>
  );
}

/** Evaluation sparkline graph (white POV per ply) */
export function EvalGraph({
  moves, viewPly, onSelect, height = 72,
}: {
  moves: MoveRecord[];
  viewPly: number;
  onSelect: (ply: number) => void;
  height?: number;
}) {
  const evals = moves.map((m) =>
    m.mateIn !== null && m.mateIn !== undefined ? Math.sign(m.mateIn) * 1500 :
    m.evalWhite !== null ? Math.max(-1500, Math.min(1500, m.evalWhite)) : null
  );
  const points = evals.map((e, i) => ({ x: i + 1, y: e === null ? null : e }));
  const width = 300;
  const W = Math.max(points.length, 10);
  const xScale = (x: number) => ((x - 1) / (W - 1)) * (width - 8) + 4;
  const yScale = (y: number) => height / 2 - (y / 1500) * (height / 2 - 4);

  let d = "";
  let started = false;
  for (const p of points) {
    if (p.y === null) continue;
    const cmd = started ? "L" : "M";
    d += `${cmd}${xScale(p.x).toFixed(1)},${yScale(p.y).toFixed(1)} `;
    started = true;
  }

  return (
    <div className="relative w-full" style={{ height }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full cursor-pointer"
        preserveAspectRatio="none"
        onClick={(e) => {
          const rect = (e.target as SVGElement).closest("svg")!.getBoundingClientRect();
          const frac = (e.clientX - rect.left) / rect.width;
          const ply = Math.max(1, Math.min(points.length, Math.round(frac * (W)) + 0));
          onSelect(ply);
        }}
        role="img"
        aria-label="Evaluation graph"
      >
        <rect x="0" y="0" width={width} height={height} fill="transparent" />
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="currentColor" strokeWidth="0.5" opacity="0.25" />
        {d && <path d={d} fill="none" stroke="currentColor" strokeWidth="1.6" className="text-foreground/80" />}
        {points.map((p) =>
          p.y !== null ? (
            <circle
              key={p.x}
              cx={xScale(p.x)}
              cy={yScale(p.y)}
              r={viewPly === p.x ? 3 : 0}
              className="fill-primary"
            />
          ) : null
        )}
      </svg>
    </div>
  );
}
