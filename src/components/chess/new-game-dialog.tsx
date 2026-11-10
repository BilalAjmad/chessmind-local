"use client";
// ─── New game dialog: side, manual level picker + on-demand advice ───────────
// The AI NEVER picks the level for you. It only advises when you ask.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Crown, Swords, Timer, Bot, Users, Smile, Flame, Lightbulb, Sparkles, X } from "lucide-react";
import { LEVELS } from "@/lib/chess/engine";
import {
  suggestedLevel, loadLastLevel, saveLastLevel,
  loadLastMode, saveLastMode, loadPnpDefaults, savePnpDefaults,
  type GameMode,
} from "@/lib/storage";
import type { PlayerProfile, GameRecord } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { GameConfig, TimeControlOpt } from "@/hooks/use-chess-game";

const TIME_CONTROLS: TimeControlOpt[] = [
  null,
  { initialSec: 180, incSec: 2, label: "3 + 2 Blitz" },
  { initialSec: 300, incSec: 0, label: "5 min Blitz" },
  { initialSec: 600, incSec: 0, label: "10 min Rapid" },
  { initialSec: 900, incSec: 10, label: "15 + 10 Classical" },
];

const LEVEL_ICONS: Record<number, { icon: React.ReactNode; ring: string; text: string }> = {
  1: { icon: <Smile className="h-4 w-4" />, ring: "border-emerald-400/60 bg-emerald-500/10", text: "text-emerald-500 dark:text-emerald-400" },
  2: { icon: <Swords className="h-4 w-4" />, ring: "border-amber-400/60 bg-amber-500/10", text: "text-amber-500 dark:text-amber-400" },
  3: { icon: <Flame className="h-4 w-4" />, ring: "border-orange-400/60 bg-orange-500/10", text: "text-orange-500 dark:text-orange-400" },
  4: { icon: <Crown className="h-4 w-4" />, ring: "border-rose-400/60 bg-rose-500/10", text: "text-rose-500 dark:text-rose-400" },
};

interface LevelSuggestion {
  level: number;
  headline: string;
  why: string;
}

/** Build the "which level should I play?" advice from the player's local history. */
function buildSuggestion(
  profile: PlayerProfile | null | undefined,
  games: GameRecord[]
): LevelSuggestion {
  const rating = profile?.rating ?? 1200;
  const played = profile?.gamesPlayed ?? 0;
  const byRating = suggestedLevel(rating);
  const fit = LEVELS[byRating - 1];

  // No history yet → go by rating only
  if (played === 0) {
    return {
      level: byRating,
      headline: `Start with ${fit.name}`,
      why: `You have no rated games here yet, so I'm going by your ${rating} rating — ${fit.name} (~${fit.elo} Elo) is the closest fight. Too easy or too hard? Just pick another, it's always your choice.`,
    };
  }

  const streak = profile?.streak ?? 0;

  // On a losing streak → advise an easier ride
  if (streak <= -2) {
    const lastLevel = games.length ? games[games.length - 1].level : byRating;
    const lower = Math.max(1, lastLevel - 1);
    const lcfg = LEVELS[lower - 1];
    const lastCfg = LEVELS[Math.min(4, Math.max(1, lastLevel)) - 1];
    return {
      level: lower,
      headline: `Take ${lcfg.name} for now`,
      why: `You've lost ${-streak} in a row — the recent ones at ${lastCfg.name}. ${lcfg.name} will be a fairer fight: rebuild the rhythm there, then climb straight back up.`,
    };
  }

  // Dominating a level → advise stepping up
  const perLevel = profile?.perLevel ?? {};
  for (let lv = LEVELS.length; lv >= 1; lv--) {
    const rec = perLevel[String(lv)];
    if (!rec || lv >= LEVELS.length) continue;
    const total = rec.w + rec.l + rec.d;
    if (total >= 3 && rec.w / total >= 0.65) {
      const up = LEVELS[lv]; // one higher
      return {
        level: up.level,
        headline: `You're ready for ${up.name}`,
        why: `You win ${Math.round((rec.w / total) * 100)}% of your games at ${LEVELS[lv - 1].name} (${rec.w}W ${rec.l}L ${rec.d}D) — you've outgrown it. ${up.name} (~${up.elo} Elo) is your next proper fight.`,
      };
    }
  }

  // Otherwise → fair fight by rating
  const hot = streak >= 3 ? ` And you're on a ${streak}-win streak — feeling bold? Go one higher.` : "";
  return {
    level: byRating,
    headline: `${fit.name} is a fair fight`,
    why: `Your ${rating} rating sits closest to ${fit.name} (~${fit.elo} Elo) — you should get a real game out of it.${hot}`,
  };
}

interface NewGameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (cfg: GameConfig) => void;
  profile?: PlayerProfile | null;
  games?: GameRecord[];
  canResume?: boolean;
  onResume?: () => void;
}

export function NewGameDialog({
  open, onOpenChange, onStart, profile, games = [], canResume, onResume,
}: NewGameDialogProps) {
  // the player's own last choice — restored directly (dialog content is
  // portal-rendered, so there is no SSR output to mismatch)
  const [level, setLevel] = useState<number>(() => loadLastLevel() ?? 2);
  const [side, setSide] = useState<"w" | "b" | "random">("w");
  const [tc, setTc] = useState<TimeControlOpt>(null);
  const [suggestion, setSuggestion] = useState<LevelSuggestion | null>(null);
  // ── pass & play: mode + remembered player names ──
  const [mode, setMode] = useState<GameMode>(() => loadLastMode());
  const pnpDefaults = loadPnpDefaults();
  const [whiteName, setWhiteName] = useState(pnpDefaults.white);
  const [blackName, setBlackName] = useState(pnpDefaults.black);
  const isLocal = mode === "local";

  const cfg = LEVELS[Math.max(1, Math.min(LEVELS.length, level)) - 1];
  const rating = profile?.rating ?? 1200;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto nice-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Swords className="h-5 w-5 text-primary" /> New Game
          </DialogTitle>
          <DialogDescription>
            Play the built-in AI at four honest levels — or pass & play a friend
            on this device. Not sure which level? Tap
            <span className="font-medium text-foreground"> Suggest for me</span> — it only
            advises; the choice is always yours.
          </DialogDescription>
        </DialogHeader>

        {/* mode: vs the AI or a friend on this device */}
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Game mode">
          {([
            { v: "ai" as GameMode, icon: <Bot className="h-4 w-4" />, label: "vs AI", sub: "MasterBot · 4 levels" },
            { v: "local" as GameMode, icon: <Users className="h-4 w-4" />, label: "2 Players", sub: "pass & play a friend" },
          ]).map((o) => (
            <button
              key={o.v}
              type="button"
              role="radio"
              aria-checked={mode === o.v}
              onClick={() => setMode(o.v)}
              className={cn(
                "rounded-xl border p-2.5 text-left transition-all flex items-start gap-2.5",
                mode === o.v
                  ? "border-primary bg-primary/10 ring-1 ring-primary"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              )}
            >
              <span className={cn(
                "w-8 h-8 rounded-lg border flex items-center justify-center shrink-0",
                mode === o.v ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground"
              )}>
                {o.icon}
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-sm leading-none">{o.label}</span>
                <span className="block text-[10px] text-muted-foreground mt-1 leading-tight">{o.sub}</span>
              </span>
            </button>
          ))}
        </div>

        {/* pass & play: player names */}
        {isLocal && (
          <div className="rounded-xl border bg-muted/30 p-3 space-y-2.5">
            <div className="text-xs font-semibold flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-primary" /> Players
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[10px] text-muted-foreground">♔ White</span>
                <Input
                  value={whiteName}
                  onChange={(e) => setWhiteName(e.target.value.slice(0, 14))}
                  placeholder="White"
                  className="h-8 mt-0.5"
                />
              </label>
              <label className="block">
                <span className="text-[10px] text-muted-foreground">♚ Black</span>
                <Input
                  value={blackName}
                  onChange={(e) => setBlackName(e.target.value.slice(0, 14))}
                  placeholder="Black"
                  className="h-8 mt-0.5"
                />
              </label>
            </div>
            <p className="text-[10px] text-muted-foreground leading-snug">
              One device, one fixed board: White sits at the bottom the whole
              game — just pass the device after each move. Nothing here counts
              toward your rating — it's just chess with a friend.
            </p>
          </div>
        )}

        {/* difficulty (vs AI only — a friend game has no level) */}
        {!isLocal && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <Bot className="h-4 w-4 text-primary" /> AI Difficulty
            </h3>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => setSuggestion(buildSuggestion(profile, games))}
            >
              <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
              Suggest for me
            </Button>
          </div>

          {/* the advice — shown only when asked for, never applied automatically */}
          <AnimatePresence initial={false}>
            {suggestion && (
              <motion.div
                key="level-suggestion"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-2.5">
                  <div className="flex items-center gap-1.5">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 leading-tight">
                      {suggestion.headline}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">— your call</span>
                    <button
                      type="button"
                      onClick={() => setSuggestion(null)}
                      aria-label="Dismiss suggestion"
                      className="ml-auto text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug mt-1">
                    {suggestion.why}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="AI difficulty">
            {LEVELS.map((l) => {
              const deco = LEVEL_ICONS[l.level] ?? LEVEL_ICONS[1];
              const selected = level === l.level;
              const isSuggested = suggestion?.level === l.level;
              return (
                <button
                  key={l.level}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setLevel(l.level)}
                  className={cn(
                    "rounded-xl border p-2.5 text-left transition-all",
                    selected
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : isSuggested
                        ? "border-amber-400/60 bg-amber-500/5 ring-1 ring-amber-400/30 hover:bg-amber-500/10"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={cn("w-6 h-6 rounded-lg border flex items-center justify-center shrink-0", deco.ring, deco.text)}>
                      {deco.icon}
                    </span>
                    <span className="font-semibold text-sm leading-none">{l.name}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground tabular-nums shrink-0">
                      ~{l.elo}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="text-[10px] text-muted-foreground leading-snug line-clamp-2 flex-1">
                      {l.title}
                    </div>
                    {isSuggested && (
                      <span className="shrink-0 inline-flex items-center gap-0.5 rounded-full border border-amber-400/40 bg-amber-500/15 px-1.5 py-px text-[9px] font-bold text-amber-600 dark:text-amber-400">
                        <Sparkles className="h-2.5 w-2.5" /> for you
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="rounded-xl border bg-muted/30 p-3">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">{cfg.name}</span>
              <span className="text-xs text-muted-foreground">~{cfg.elo} Elo</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{cfg.blurb}</p>
            <div className="mt-2 flex gap-3 text-[10px] text-muted-foreground">
              <span>Depth {cfg.depth}</span>
              <span>~{(cfg.timeMs / 1000).toFixed(1)}s/move</span>
              <span>Book {cfg.bookDepth} plies</span>
            </div>
          </div>
        </div>
        )}

        {/* side (vs AI only) */}
        {!isLocal && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Crown className="h-4 w-4 text-amber-400" /> Your Side
          </h3>
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                { v: "w", label: "White", glyph: "♔" },
                { v: "b", label: "Black", glyph: "♚" },
                { v: "random", label: "Random", glyph: "⚄" },
              ] as const
            ).map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => setSide(o.v)}
                className={cn(
                  "rounded-lg border py-2 flex flex-col items-center gap-0.5 transition-all",
                  side === o.v
                    ? "border-primary bg-primary/10 ring-1 ring-primary"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                <span className="text-2xl leading-none">{o.glyph}</span>
                <span className="text-xs font-medium">{o.label}</span>
              </button>
            ))}
          </div>
        </div>
        )}

        {/* time control */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Timer className="h-4 w-4 text-teal-400" /> Time Control
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {TIME_CONTROLS.map((t, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setTc(t)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-all",
                  JSON.stringify(tc) === JSON.stringify(t)
                    ? "border-primary bg-primary/10 ring-1 ring-primary font-medium"
                    : "border-border hover:border-primary/50"
                )}
              >
                {t ? t.label : "Unlimited"}
              </button>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {canResume && onResume && (
            <Button variant="outline" onClick={onResume}>
              Keep playing current game
            </Button>
          )}
          <Button
            className="font-semibold"
            onClick={() => {
              // remember YOUR choices for next time
              if (!isLocal) saveLastLevel(level);
              saveLastMode(mode);
              if (isLocal) {
                savePnpDefaults({
                  white: whiteName.trim() || "White",
                  black: blackName.trim() || "Black",
                });
              }
              onStart({
                level,
                playerColor: isLocal ? "w" : side,
                timeControl: tc,
                mode,
                pnpNames: isLocal
                  ? { w: whiteName.trim() || "White", b: blackName.trim() || "Black" }
                  : undefined,
              });
              onOpenChange(false);
            }}
          >
            <Swords className="h-4 w-4 mr-1.5" /> Start Game
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
