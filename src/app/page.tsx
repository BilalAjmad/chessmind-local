"use client";
// ─── MasterBot Chess — offline chess vs a powerful built-in AI ───────────────
// Design language: "tournament hall". Flat paper, ink, hairline rules, one
// accent. No gradients, no glass, no glow, no icon-in-a-box filler — the
// board is the hero, everything else steps back and gets out of the way.

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Settings2, BarChart3, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

import { ChessBoard } from "@/components/chess/board";
import { EvalBar } from "@/components/chess/eval-bar";
import { MoveList, EvalGraph } from "@/components/chess/move-list";
import { PlayerBar } from "@/components/chess/player-bar";
import { GameControls } from "@/components/chess/game-controls";
import { NewGameDialog } from "@/components/chess/new-game-dialog";
import { GameOverDialog } from "@/components/chess/game-over-dialog";
import { PromotionDialog } from "@/components/chess/promotion-dialog";
import { StatsDialog } from "@/components/chess/stats-dialog";
import { SettingsDialog } from "@/components/chess/settings-dialog";
import { EnginePanel } from "@/components/chess/engine-panel";
import { SuggestionBar } from "@/components/chess/suggestion-bar";
import { KnightMark } from "@/components/chess/brand";

import { useChessGame, reasonText } from "@/hooks/use-chess-game";
import type { GameConfig, MoveRecord } from "@/hooks/use-chess-game";

/** Accuracy/blunder stats for ONE side — used by the game-over dialog. */
function sideStats(moves: MoveRecord[], color: "w" | "b") {
  const ms = moves.filter((m) => m.color === color);
  const blunders = ms.filter((m) => m.classification === "blunder").length;
  const mistakes = ms.filter((m) => m.classification === "mistake").length;
  const classified = ms.filter((m) => m.classification);
  const accuracy =
    classified.length >= 4 && ms.some((m) => m.classification)
      ? Math.max(
          10,
          Math.min(
            99,
            Math.round(
              103 -
                8.5 *
                  Math.sqrt(
                    classified.reduce((acc, m) => {
                      switch (m.classification) {
                        case "best": case "book": return acc;
                        case "excellent": return acc + 15;
                        case "good": return acc + 45;
                        case "inaccuracy": return acc + 90;
                        case "mistake": return acc + 180;
                        case "blunder": return acc + 350;
                        default: return acc;
                      }
                    }, 0) / Math.max(1, classified.length)
                  )
            )
          )
        )
      : null;
  return { accuracy, blunders, mistakes };
}

// ─── Route: straight into the game — no launch film, one click to play ──────
export default function Page() {
  return <ChessPage />;
}

function ChessPage() {
  const g = useChessGame();
  const [newGameOpen, setNewGameOpen] = useState(true);
  const [statsOpen, setStatsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // toast hook messages
  useEffect(() => {
    if (g.toast) toast(g.toast, { duration: 2600 });
  }, [g.toast]);

  // Pass & play: the board is FIXED — White at the bottom, Black at the top,
  // for the whole game. No auto-flip between turns, no rotation. Only vs-AI
  // mode may be flipped (to view the board from your own side).
  const orientation = g.localMode
    ? "w"
    : g.flipBoard
      ? g.playerColor === "w" ? "b" : "w"
      : g.playerColor;

  const onMove = useCallback(
    (from: number, to: number) => {
      const r = g.tryMove(from, to);
      if (r === "illegal") {
        // could be clicking around; ignore silently
      }
    },
    [g]
  );

  const aiName = g.ai.name;
  // pass & play: the two humans; vs AI: you and the bot
  const bottomSide = orientation === "w" ? "w" : "b";
  const topSide = orientation === "w" ? "b" : "w";
  const bottomName = g.localMode
    ? (bottomSide === "w" ? g.pnpNames.w : g.pnpNames.b)
    : "You";
  const topName = g.localMode
    ? (topSide === "w" ? g.pnpNames.w : g.pnpNames.b)
    : aiName;
  const startGame = useCallback(
    (cfg: GameConfig) => {
      g.newGame(cfg);
      setNewGameOpen(false);
    },
    [g]
  );

  const rematch = useCallback(() => {
    if (g.config) {
      g.newGame(g.config);
    }
  }, [g]);

  const lastMoveWasBook =
    g.moves.length > 0 && g.moves[g.moves.length - 1].classification === "book";

  // stats for the game-over dialog — per player in pass & play, yours vs AI
  const aiModeStats = sideStats(g.moves, g.playerColor);
  const localStats = g.localMode
    ? { w: sideStats(g.moves, "w"), b: sideStats(g.moves, "b") }
    : null;

  return (
    <TooltipProvider delayDuration={250}>
      <div className="min-h-screen flex flex-col bg-background">
        {/* header — flat, one hairline, the knight and the name */}
        <header className="border-b bg-background sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2 flex items-center gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <KnightMark size={32} className="shrink-0" />
              <div className="min-w-0 leading-none">
                <h1 className="font-bold text-[15px] tracking-tight truncate">
                  MasterBot Chess
                </h1>
                <p className="text-[10px] text-muted-foreground mt-1 hidden sm:block">
                  offline engine · 4 levels · learns you live
                </p>
              </div>
            </div>
            <div className="flex-1" />
            {g.profile && (
              <span className="text-sm font-semibold tabular-nums border px-2 py-1 hidden sm:inline-block">
                {g.profile.rating}
                <span className="text-muted-foreground font-normal ml-1 text-[10px] uppercase tracking-wide">
                  elo
                </span>
              </span>
            )}
            <Button variant="ghost" size="icon" onClick={() => setStatsOpen(true)} aria-label="Statistics">
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} aria-label="Settings">
              <Settings2 className="h-4 w-4" />
            </Button>
            <Button size="sm" className="font-semibold" onClick={() => setNewGameOpen(true)}>
              <Plus className="h-4 w-4 mr-0.5" /> New
            </Button>
          </div>
        </header>

        {/* main */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          {g.status === "setup" ? (
            <SetupSplash onStart={() => setNewGameOpen(true)} />
          ) : (
            <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-4 sm:gap-6 items-start">
              {/* board column — the board must FIT the viewport: on short
                  screens an uncapped board pushes rank 1 and the bottom
                  player bar below the fold (moves from rank-1 pieces then
                  need scrolling mid-game). Cap the row by remaining height:
                  ≈296px of chrome (header + main padding + both player
                  bars + suggestion bar + gaps) */}
              <div className="flex gap-2 sm:gap-3 mx-auto w-full max-w-[min(calc(100dvh-296px),72vh,640px)] lg:max-w-[min(calc(100dvh-296px),100%)]">
                {g.settings.showEvalBar && (
                  <div className="pt-12 pb-12 self-stretch flex">
                    <EvalBar
                      cp={g.evalDisplay.cp}
                      mateIn={g.evalDisplay.mateIn}
                      flipped={orientation === "b"}
                      compact
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0 space-y-2">
                  <PlayerBar
                    kind={g.localMode ? "player" : "ai"}
                    name={topName}
                    subtitle={
                      g.localMode
                        ? `${topSide === "w" ? "White" : "Black"} · ${g.openingName || "opening…"}`
                        : `${g.ai.title} · ${g.openingName || "opening…"}`
                    }
                    level={g.localMode ? undefined : g.ai.level}
                    active={g.turn === topSide && g.status === "playing"}
                    thinking={g.localMode ? false : g.aiThinking}
                    clockMs={g.clocks ? g.clocks[topSide as "w" | "b"] : null}
                    lowTime={!!g.clocks && g.clocks[topSide as "w" | "b"] < 30000}
                    squares={g.viewSquares}
                    playerColor={g.playerColor}
                    isBottom={false}
                  />
                  <ChessBoard
                    squares={g.viewSquares}
                    orientation={orientation}
                    interactive={g.playerTurn && !g.pendingPromotion}
                    movableColor={g.localMode ? -1 : g.playerColor === "w" ? 0 : 1}
                    onTargets={g.targetsFrom}
                    onMove={onMove}
                    lastMove={g.viewLastMove}
                    checkSq={g.viewCheckSq}
                    hint={g.hint}
                    animate={g.settings.animationMs > 0 && g.isLive}
                    showCoords={g.settings.showCoords}
                    showLegalMoves={g.settings.showLegalMoves}
                    showLastMove={g.settings.showLastMove}
                    theme={g.settings.boardTheme}
                  />
                  <SuggestionBar
                    hint={g.hint}
                    loading={g.hintLoading}
                    canRequest={g.playerTurn && g.isLive && !g.pendingPromotion}
                    active={g.status === "playing" && !g.localMode}
                    onRequest={g.hintRequest}
                    onDismiss={g.dismissHint}
                  />
                  <PlayerBar
                    kind="player"
                    name={bottomName}
                    subtitle={
                      g.status === "playing"
                        ? g.localMode
                          ? g.turn === bottomSide
                            ? `${bottomName}'s move`
                            : "…"
                          : g.playerTurn
                            ? "Your move"
                            : g.aiThinking
                              ? "MasterBot is thinking…"
                              : "…"
                        : undefined
                    }
                    active={g.turn === bottomSide && g.status === "playing"}
                    clockMs={g.clocks ? g.clocks[bottomSide as "w" | "b"] : null}
                    lowTime={!!g.clocks && g.clocks[bottomSide as "w" | "b"] < 30000}
                    squares={g.viewSquares}
                    playerColor={g.playerColor}
                    isBottom
                  />
                </div>
              </div>

              {/* side column */}
              <div className="space-y-3 lg:sticky lg:top-20">
                {/* the AI identity panel only exists when there IS an AI —
                    pass & play never shows a fake opponent */}
                {!g.localMode && (
                  <EnginePanel
                    ai={g.ai}
                    thinking={g.aiThinking}
                    info={g.aiInfo}
                    fromBook={lastMoveWasBook}
                  />
                )}

                <div className="rounded-xl border bg-card overflow-hidden">
                  <div className="px-3 pt-2.5 pb-1.5 flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      {g.openingName || "Game"}
                    </h2>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {Math.ceil(g.moves.length / 2)} moves
                      {!g.isLive && (
                        <span className="ml-1.5 text-primary font-medium">
                          · viewing {g.viewPly}/{g.moves.length}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-16 px-2 pb-1 border-b">
                    <EvalGraph
                      moves={g.moves}
                      viewPly={g.viewPly}
                      onSelect={g.goToPly}
                    />
                  </div>
                  <div className="h-64 sm:h-72 lg:h-[26rem] px-1.5 py-1.5">
                    <MoveList
                      moves={g.moves}
                      viewPly={g.viewPly}
                      onSelect={g.goToPly}
                      showEval={g.settings.showEvalBar}
                    />
                  </div>
                </div>

                <GameControls
                  canUndo={g.status === "playing" && g.moves.length > 0 && !g.aiThinking && g.isLive}
                  canHint={g.playerTurn && g.isLive}
                  showHint={!g.localMode}
                  showFlip={!g.localMode}
                  canDraw={g.status === "playing" && !g.drawOffered}
                  canResign={g.status === "playing"}
                  gameActive={g.status === "playing"}
                  isLive={g.isLive}
                  onUndo={() => {
                    if (!g.undo()) toast("Nothing to take back right now");
                  }}
                  onHint={g.hintRequest}
                  onDraw={g.offerDraw}
                  onResign={g.resign}
                  onFlip={() => g.setFlipBoard(!g.flipBoard)}
                  onNewGame={() => setNewGameOpen(true)}
                  onPgn={g.getPgn}
                  viewPly={g.viewPly}
                  totalPlies={g.moves.length}
                  onNavigate={g.navigate}
                  onGoEnd={g.goLive}
                  onGoStart={() => g.goToPly(0)}
                />
              </div>
            </div>
          )}
        </main>

        {/* footer */}
        <footer className="mt-auto border-t bg-background">
          <div className="max-w-6xl mx-auto px-4 py-3 text-center text-[11px] text-muted-foreground">
            A complete chess engine — α-β search, quiescence, transposition tables,
            opening book — running entirely in this page. No servers, no accounts,
            no API keys. <span className="hidden sm:inline">Pieces: cburnett (CC-BY-SA).</span>
          </div>
        </footer>
      </div>

      {/* dialogs */}
      <NewGameDialog
        open={newGameOpen}
        onOpenChange={(o) => {
          // don't allow closing into nothing when no game exists
          if (!o && g.status === "setup") return;
          setNewGameOpen(o);
        }}
        onStart={startGame}
        profile={g.profile}
        games={g.games}
        canResume={g.status !== "setup"}
        onResume={() => setNewGameOpen(false)}
      />
      <GameOverDialog
        info={g.gameOver}
        playerColor={g.playerColor}
        localNames={g.localMode ? g.pnpNames : null}
        moves={Math.ceil(g.moves.length / 2)}
        accuracy={localStats ? null : aiModeStats.accuracy}
        blunders={localStats ? 0 : aiModeStats.blunders}
        mistakes={localStats ? 0 : aiModeStats.mistakes}
        localStats={localStats}
        opening={g.openingName}
        onRematch={rematch}
        onNewGame={() => {
          g.resetToSetup();
          setNewGameOpen(true);
        }}
        onCopyPgn={g.getPgn}
      />
      <PromotionDialog
        open={!!g.pendingPromotion}
        color={g.localMode ? g.turn : g.playerColor}
        onPick={g.resolvePromotion}
        onCancel={g.cancelPromotion}
      />
      <StatsDialog
        open={statsOpen}
        onOpenChange={setStatsOpen}
        profile={g.profile}
        games={g.games}
      />
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={g.settings}
        onChange={g.setSetting}
        onWipeMemory={g.wipeMemory}
      />
    </TooltipProvider>
  );
}

function SetupSplash({ onStart }: { onStart: () => void }) {
  // One mark, one wordmark, one promise, one button. The board does the talking.
  const specs: [string, string][] = [
    ["Engine", "α-β + quiescence + transposition tables, in a web worker"],
    ["Levels", "Easy 800 · Medium 1400 · Ultra Hard 2000 · Master 2500"],
    ["Coach", "live hints, move ratings, eval graph — on your side"],
    ["Privacy", "no servers, no accounts, no keys — everything stays here"],
  ];

  return (
    <div className="max-w-md mx-auto py-14 sm:py-20 flex flex-col items-center text-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <KnightMark size={72} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut", delay: 0.08 }}
        className="mt-5"
      >
        <h2 className="text-2xl font-bold tracking-tight">MasterBot Chess</h2>
        <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
          A genuinely strong chess AI that lives entirely in this page.
          It studies your game while you play — and remembers you next time.
        </p>
      </motion.div>

      <motion.dl
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.16 }}
        className="mt-8 w-full border-t text-left"
      >
        {specs.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[92px_1fr] gap-3 border-b py-2.5 items-baseline">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {k}
            </dt>
            <dd className="text-xs text-muted-foreground leading-relaxed">{v}</dd>
          </div>
        ))}
      </motion.dl>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.24 }}
        className="mt-8"
      >
        <Button size="lg" className="font-bold text-base px-10" onClick={onStart}>
          Play now
        </Button>
      </motion.div>
    </div>
  );
}
