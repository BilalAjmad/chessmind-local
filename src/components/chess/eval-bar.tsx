"use client";
// ─── Vertical evaluation bar (white advantage on bottom) ────────────────────

import { motion } from "framer-motion";

interface EvalBarProps {
  cp: number | null; // centipawns, white POV
  mateIn: number | null; // plies to mate (white mates if positive)
  flipped: boolean; // orientation is black
  compact?: boolean;
}

/** sigmoid-ish mapping of centipawns to 0..1 (white share) */
function cpToShare(cp: number): number {
  const c = Math.max(-1500, Math.min(1500, cp));
  return 1 / (1 + Math.exp(-c / 320));
}

export function EvalBar({ cp, mateIn, flipped, compact }: EvalBarProps) {
  let share = 0.5;
  let label = "0.0";
  if (mateIn !== null && mateIn !== undefined) {
    const whiteMates = mateIn > 0;
    share = whiteMates ? 1 : 0;
    label = `M${Math.ceil(Math.abs(mateIn) / 2)}`;
  } else if (cp !== null && cp !== undefined) {
    share = cpToShare(cp);
    label = (cp >= 0 ? "+" : "") + (cp / 100).toFixed(1);
  }
  const whitePct = Math.round(share * 100);

  return (
    <div
      className={`relative rounded-full overflow-hidden border border-border/60 bg-zinc-800 ${
        compact ? "w-2.5 h-full min-h-40" : "w-3 h-full min-h-56"
      }`}
      role="meter"
      aria-valuemin={-10}
      aria-valuemax={10}
      aria-valuenow={cp !== null ? Math.max(-10, Math.min(10, cp / 100)) : 0}
      aria-valuetext={label}
      aria-label="Position evaluation"
    >
      <div className="absolute inset-0 bg-zinc-900" />
      <motion.div
        className="absolute left-0 right-0 bg-stone-200"
        initial={false}
        animate={{ height: `${whitePct}%` }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
        style={flipped ? { top: 0 } : { bottom: 0 }}
      />
      <div
        className="absolute left-0 right-0 h-px bg-zinc-500/70"
        style={{ top: flipped ? `${whitePct}%` : `${100 - whitePct}%` }}
      />
      {!compact && (
        <div
          className={`absolute left-0 right-0 text-center text-[9px] font-bold tracking-tight ${
            flipped ? "text-amber-50" : "text-zinc-300"
          }`}
          style={
            flipped
              ? { top: 2 }
              : { bottom: 2 }
          }
        >
          {label}
        </div>
      )}
    </div>
  );
}
