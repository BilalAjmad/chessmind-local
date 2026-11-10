"use client";
// ─── Game over dialog: result, stats, rating change, rematch ────────────────

import { motion } from "framer-motion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy, Flag, Handshake, RotateCcw, TrendingUp, TrendingDown, Copy } from "lucide-react";
import { toast } from "sonner";
import type { GameOverInfo } from "@/hooks/use-chess-game";
import { reasonText } from "@/hooks/use-chess-game";

interface GameOverDialogProps {
  info: GameOverInfo | null;
  playerColor: "w" | "b";
  moves: number;
  accuracy: number | null;
  blunders: number;
  mistakes: number;
  opening: string;
  onRematch: () => void;
  onNewGame: () => void;
  onCopyPgn: () => string;
  /** pass & play: show the players' names instead of You/MasterBot */
  localNames?: { w: string; b: string } | null;
  /** pass & play: per-player stats (accuracy/blunders/mistakes for each side) */
  localStats?: { w: SideStats; b: SideStats } | null;
}

interface SideStats {
  accuracy: number | null;
  blunders: number;
  mistakes: number;
}

export function GameOverDialog({
  info, playerColor, moves, accuracy, blunders, mistakes, opening,
  onRematch, onNewGame, onCopyPgn, localNames = null, localStats = null,
}: GameOverDialogProps) {
  if (!info) return null;
  const won = info.playerResult === "win";
  const draw = info.playerResult === "draw";

  const icon = won ? <Trophy className="h-12 w-12 text-amber-400" /> :
    draw ? <Handshake className="h-12 w-12 text-sky-400" /> :
      <Flag className="h-12 w-12 text-rose-400" />;

  const title = localNames
    ? draw ? "Draw" : `${info.winner === "w" ? localNames.w : localNames.b} won!`
    : won ? "You won!" : draw ? "Draw" : "You lost";
  const subtitle =
    info.reason === "checkmate"
      ? `by ${reasonText(info.reason)}`
      : `by ${reasonText(info.reason)}`;

  return (
    <Dialog open={!!info}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="items-center text-center space-y-2">
          <motion.div
            initial={{ scale: 0.5, rotate: -10, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
          >
            {icon}
          </motion.div>
          <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
          <DialogDescription className="text-sm">
            {subtitle} · {moves} moves {opening && opening !== "Irregular Opening" && `· ${opening}`}
          </DialogDescription>
        </DialogHeader>

        {localStats && localNames ? (
          /* pass & play: each player gets their own labeled stats */
          <div className="grid grid-cols-2 gap-2">
            <PlayerStatBlock name={localNames.w} glyph="♔" stats={localStats.w} />
            <PlayerStatBlock name={localNames.b} glyph="♚" stats={localStats.b} />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border bg-muted/30 p-2.5">
              <div className="text-xl font-bold tabular-nums">
                {accuracy !== null ? `${accuracy}%` : "—"}
              </div>
              <div className="text-[10px] text-muted-foreground">Accuracy</div>
            </div>
            <div className="rounded-xl border bg-muted/30 p-2.5">
              <div className="text-xl font-bold tabular-nums text-orange-400">{mistakes}</div>
              <div className="text-[10px] text-muted-foreground">Mistakes</div>
            </div>
            <div className="rounded-xl border bg-muted/30 p-2.5">
              <div className="text-xl font-bold tabular-nums text-red-500">{blunders}</div>
              <div className="text-[10px] text-muted-foreground">Blunders</div>
            </div>
          </div>
        )}

        {info.ratingDelta !== null && (
          <div className="flex items-center justify-center gap-1.5 text-sm font-semibold">
            {info.ratingDelta >= 0 ? (
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            ) : (
              <TrendingDown className="h-4 w-4 text-rose-400" />
            )}
            <span className={info.ratingDelta >= 0 ? "text-emerald-400" : "text-rose-400"}>
              {info.ratingDelta >= 0 ? "+" : ""}
              {info.ratingDelta} Elo
            </span>
            <span className="text-muted-foreground font-normal text-xs">
              {localNames
                ? `${localNames.w} vs ${localNames.b} — friendly game`
                : `(playing as ${playerColor === "w" ? "White" : "Black"})`}
            </span>
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <div className="flex gap-2 w-full">
            <Button className="flex-1 font-semibold" onClick={onRematch}>
              <RotateCcw className="h-4 w-4 mr-1.5" /> Rematch
            </Button>
            <Button variant="outline" className="flex-1" onClick={onNewGame}>
              New settings
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              navigator.clipboard
                ?.writeText(onCopyPgn())
                .then(() => toast.success("PGN copied"))
                .catch(() => toast.error("Copy failed"));
            }}
          >
            <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy game PGN
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** pass & play: one player's stat card — name, accuracy, mistakes, blunders */
function PlayerStatBlock({ name, glyph, stats }: { name: string; glyph: string; stats: SideStats }) {
  return (
    <div className="rounded-xl border bg-muted/30 p-2.5 text-center min-w-0">
      <div className="flex items-center justify-center gap-1 mb-1.5 min-w-0">
        <span className="text-sm leading-none">{glyph}</span>
        <span className="text-xs font-semibold truncate">{name}</span>
      </div>
      <div className="text-xl font-bold tabular-nums leading-none mb-1.5">
        {stats.accuracy !== null ? `${stats.accuracy}%` : "—"}
        <span className="block text-[9px] font-normal text-muted-foreground mt-0.5">accuracy</span>
      </div>
      <div className="flex items-center justify-center gap-2 text-[10px] tabular-nums">
        <span className="text-orange-400 font-semibold">{stats.mistakes} <span className="text-muted-foreground font-normal">mist.</span></span>
        <span className="text-red-500 font-semibold">{stats.blunders} <span className="text-muted-foreground font-normal">blund.</span></span>
      </div>
    </div>
  );
}
