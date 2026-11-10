"use client";
// ─── Game control buttons (new, undo, hint, flip, draw, resign, pgn) ────────

import {
  Undo2, Lightbulb, Flag, Handshake, RefreshCw, Download, Copy,
  ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Repeat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ControlsProps {
  canUndo: boolean;
  canHint: boolean;
  /** pass & play has no hints — the lightbulb is hidden entirely there */
  showHint?: boolean;
  /** pass & play: the board never flips — the rotate button is hidden too */
  showFlip?: boolean;
  canDraw: boolean;
  canResign: boolean;
  gameActive: boolean;
  isLive: boolean;
  onUndo: () => void;
  onHint: () => void;
  onDraw: () => void;
  onResign: () => void;
  onFlip: () => void;
  onNewGame: () => void;
  onPgn: () => string;
  viewPly: number;
  totalPlies: number;
  onNavigate: (delta: number) => void;
  onGoEnd: () => void;
  onGoStart: () => void;
}

function CtrlBtn({
  label, onClick, disabled, children, variant = "ghost", className,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: "ghost" | "default" | "secondary";
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={variant}
          size="icon"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          className={cn("h-9 w-9", className)}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function GameControls({
  canUndo, canHint, showHint = true, showFlip = true, canDraw, canResign, gameActive, isLive,
  onUndo, onHint, onDraw, onResign, onFlip, onNewGame, onPgn,
  viewPly, totalPlies, onNavigate, onGoEnd, onGoStart,
}: ControlsProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      <CtrlBtn label="New game" onClick={onNewGame}>
        <RefreshCw className="h-4 w-4" />
      </CtrlBtn>
      <CtrlBtn label="Undo move" onClick={onUndo} disabled={!canUndo}>
        <Undo2 className="h-4 w-4" />
      </CtrlBtn>
      {showHint && (
        <CtrlBtn label="Suggest move (H)" onClick={onHint} disabled={!canHint}>
          <Lightbulb className="h-4 w-4" />
        </CtrlBtn>
      )}
      <CtrlBtn label="Offer draw" onClick={onDraw} disabled={!canDraw}>
        <Handshake className="h-4 w-4" />
      </CtrlBtn>
      <CtrlBtn label="Resign" onClick={onResign} disabled={!canResign}>
        <Flag className="h-4 w-4" />
      </CtrlBtn>
      {showFlip && (
        <CtrlBtn label="Flip board (F)" onClick={onFlip}>
          <Repeat className="h-4 w-4" />
        </CtrlBtn>
      )}
      <CtrlBtn
        label="Copy PGN"
        onClick={() => {
          onPgnCopy(onPgn);
        }}
      >
        <Copy className="h-4 w-4" />
      </CtrlBtn>
      <CtrlBtn
        label="Download PGN"
        onClick={() => {
          onPgnDownload(onPgn);
        }}
      >
        <Download className="h-4 w-4" />
      </CtrlBtn>

      <span className="mx-1 h-6 w-px bg-border" aria-hidden="true" />

      <CtrlBtn label="First move (Home)" onClick={onGoStart} disabled={viewPly === 0}>
        <ChevronsLeft className="h-4 w-4" />
      </CtrlBtn>
      <CtrlBtn label="Previous (←)" onClick={() => onNavigate(-1)} disabled={viewPly === 0}>
        <ChevronLeft className="h-4 w-4" />
      </CtrlBtn>
      <CtrlBtn label="Next (→)" onClick={() => onNavigate(1)} disabled={viewPly >= totalPlies}>
        <ChevronRight className="h-4 w-4" />
      </CtrlBtn>
      <CtrlBtn label="Live position (End)" onClick={onGoEnd} disabled={isLive}>
        <ChevronsRight className="h-4 w-4" />
      </CtrlBtn>
    </div>
  );
}

function onPgnCopy(getPgn: () => string) {
  const pgn = getPgn();
  navigator.clipboard
    ?.writeText(pgn)
    .then(() => toast.success("PGN copied to clipboard"))
    .catch(() => toast.error("Could not copy PGN"));
}

function onPgnDownload(getPgn: () => string) {
  const pgn = getPgn();
  const blob = new Blob([pgn], { type: "application/x-chess-pgn" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `masterbot-game-${new Date().toISOString().slice(0, 10)}.pgn`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("PGN downloaded");
}
