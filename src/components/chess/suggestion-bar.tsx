"use client";
// ─── Suggestion bar: "which move should I play?" — ask, and get told ────────
// Sits right under the board. One click runs the engine on the current
// position and answers in plain words: the move, why, and the eval.

import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, X, Loader2, Crosshair } from "lucide-react";
import type { HintInfo } from "@/hooks/use-chess-game";
import { cn } from "@/lib/utils";

interface SuggestionBarProps {
  hint: HintInfo | null;
  loading: boolean;
  canRequest: boolean; // player's turn & live view
  active: boolean; // a game is in progress → render the bar at all
  /** who is ahead / behind in the eval chip (pass & play: player names) */
  aheadLabel?: string;
  behindLabel?: string;
  onRequest: () => void;
  onDismiss: () => void;
}

export function SuggestionBar({
  hint, loading, canRequest, active, aheadLabel = "You", behindLabel = "AI",
  onRequest, onDismiss,
}: SuggestionBarProps) {
  if (!active) return null;

  return (
    <div className="min-h-[3.25rem] flex items-center">
      <AnimatePresence mode="wait" initial={false}>
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="w-full rounded-xl border bg-muted/40 px-3 py-2.5 flex items-center gap-2 text-sm text-muted-foreground"
          >
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            Engine is finding your best move…
          </motion.div>
        ) : hint ? (
          <motion.div
            key="hint"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="w-full rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 flex items-center gap-2.5"
            role="status"
          >
            <Crosshair className="h-4 w-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-sm font-bold leading-none">
                  Play{" "}
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                    {hint.san}
                  </span>
                </span>
                <EvalChip evalCp={hint.evalCp} mateIn={hint.mateIn} aheadLabel={aheadLabel} behindLabel={behindLabel} />
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                {hint.why} <span className="text-emerald-600/80 dark:text-emerald-400/80">The green arrow shows it on the board.</span>
              </p>
            </div>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss suggestion"
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ) : canRequest ? (
          <motion.button
            key="ask"
            type="button"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            onClick={onRequest}
            className="w-full rounded-xl border border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 px-3 py-2.5 flex items-center justify-center gap-2 text-sm font-medium transition-colors group"
          >
            <Lightbulb className="h-4 w-4 text-amber-400 group-hover:scale-110 transition-transform" />
            Which move should I play?
            <kbd className="ml-1 hidden sm:inline-flex items-center rounded border bg-muted px-1.5 py-px text-[9px] font-semibold text-muted-foreground">
              H
            </kbd>
          </motion.button>
        ) : (
          <motion.div
            key="wait"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="w-full text-center text-[11px] text-muted-foreground/80 py-2.5"
          >
            <Lightbulb className="inline h-3 w-3 mr-1 -mt-px opacity-60" />
            Move suggestions appear here when it&rsquo;s your turn
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EvalChip({
  evalCp, mateIn, aheadLabel = "You", behindLabel = "AI",
}: {
  evalCp: number;
  mateIn: number | null;
  aheadLabel?: string;
  behindLabel?: string;
}) {
  let text: string;
  let cls: string;
  if (mateIn !== null && mateIn > 0) {
    text = `Mate in ${Math.ceil(mateIn / 2)}`;
    cls = "border-emerald-400/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
  } else if (mateIn !== null && mateIn < 0) {
    text = `Mate in ${Math.ceil(-mateIn / 2)} against you`;
    cls = "border-rose-400/40 bg-rose-500/15 text-rose-500 dark:text-rose-400";
  } else if (Math.abs(evalCp) < 30) {
    text = "Balanced";
    cls = "border-border bg-muted text-muted-foreground";
  } else if (evalCp > 0) {
    text = `${aheadLabel} +${(evalCp / 100).toFixed(1)}`;
    cls = "border-emerald-400/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
  } else {
    text = `${behindLabel} +${(-evalCp / 100).toFixed(1)}`;
    cls = "border-rose-400/40 bg-rose-500/15 text-rose-500 dark:text-rose-400";
  }
  return (
    <span className={cn("text-[10px] font-bold rounded-full border px-1.5 py-px tabular-nums leading-none", cls)}>
      {text}
    </span>
  );
}
