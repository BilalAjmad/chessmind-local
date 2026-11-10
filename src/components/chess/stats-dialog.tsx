"use client";
// ─── Player stats dialog: rating chart, record, openings, game history ──────

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, Target, Flame, BarChart3, History } from "lucide-react";
import type { PlayerProfile, GameRecord } from "@/lib/storage";
import { LEVELS, levelConfig } from "@/lib/chess/engine";

interface StatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: PlayerProfile | null;
  games: GameRecord[];
}

export function StatsDialog({ open, onOpenChange, profile, games }: StatsDialogProps) {
  if (!profile) return null;
  const winRate = profile.gamesPlayed
    ? Math.round((profile.wins / profile.gamesPlayed) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" /> Your Stats
          </DialogTitle>
          <DialogDescription>
            Your offline player profile — everything is stored locally in this browser.
          </DialogDescription>
        </DialogHeader>

        {/* summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatCard icon={<Target className="h-4 w-4 text-primary" />} value={profile.rating} label="Rating" />
          <StatCard icon={<Trophy className="h-4 w-4 text-amber-400" />} value={profile.peakRating} label="Peak" />
          <StatCard icon={<Flame className="h-4 w-4 text-orange-400" />} value={profile.streak > 0 ? `W${profile.streak}` : profile.streak < 0 ? `L${-profile.streak}` : "—"} label="Streak" />
          <StatCard icon={<BarChart3 className="h-4 w-4 text-emerald-400" />} value={`${winRate}%`} label="Win rate" />
        </div>

        <Tabs defaultValue="rating" className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="rating">Rating</TabsTrigger>
            <TabsTrigger value="record">Record</TabsTrigger>
            <TabsTrigger value="history">Games</TabsTrigger>
          </TabsList>

          <TabsContent value="rating" className="mt-2">
            <RatingChart history={profile.ratingHistory} />
          </TabsContent>

          <TabsContent value="record" className="mt-2">
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-4 text-sm font-semibold">
                <span className="text-emerald-400">{profile.wins} W</span>
                <span className="text-muted-foreground">{profile.draws} D</span>
                <span className="text-rose-400">{profile.losses} L</span>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-1.5">
                  vs each difficulty
                </h4>
                <div className="grid grid-cols-2 gap-1.5">
                  {LEVELS.map((l) => {
                    const rec = profile.perLevel[String(l.level)];
                    if (!rec) return null;
                    const total = rec.w + rec.l + rec.d;
                    return (
                      <div
                        key={l.level}
                        className="flex items-center justify-between rounded-lg border bg-muted/30 px-2.5 py-1.5 text-xs"
                      >
                        <span className="truncate">
                          <span className="font-bold">{l.name}</span>
                          <span className="text-muted-foreground"> · {l.title}</span>
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          {rec.w}W {rec.d}D {rec.l}L{" "}
                          <span className="font-semibold text-foreground">
                            {total ? Math.round((rec.w / total) * 100) : 0}%
                          </span>
                        </span>
                      </div>
                    );
                  })}
                  {Object.keys(profile.perLevel).length === 0 && (
                    <p className="text-xs text-muted-foreground col-span-2 py-3 text-center">
                      Play some games to build a record.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-2">
            <ScrollArea className="h-64 rounded-lg border">
              <div className="p-2 space-y-1">
                {games.length === 0 && (
                  <p className="text-xs text-muted-foreground py-6 text-center">
                    No games yet.
                  </p>
                )}
                {[...games].reverse().map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-muted/50"
                  >
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                        g.result === "win"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : g.result === "loss"
                            ? "bg-rose-500/20 text-rose-400"
                            : "bg-sky-500/20 text-sky-400"
                      }`}
                    >
                      {g.result === "win" ? "W" : g.result === "loss" ? "L" : "D"}
                    </span>
                    <span className="font-medium">
                      {g.mode === "local"
                        ? `${g.players?.w ?? "White"} vs ${g.players?.b ?? "Black"}`
                        : levelConfig(g.level).name}
                    </span>
                    <span className="text-muted-foreground truncate flex-1">
                      {g.mode === "local" ? <span className="italic">pass & play</span> : g.opening}
                    </span>
                    <span className="text-muted-foreground tabular-nums">{g.moves} mv</span>
                    {g.accuracy !== null && (
                      <span className="tabular-nums font-semibold">{g.accuracy}%</span>
                    )}
                    <span className="text-muted-foreground text-[10px] tabular-nums">
                      {new Date(g.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: React.ReactNode; label: string }) {
  return (
    <div className="rounded-xl border bg-muted/30 p-2.5 flex flex-col items-center gap-0.5">
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        {icon} {label}
      </div>
      <div className="text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}

function RatingChart({ history }: { history: { rating: number; date: number }[] }) {
  if (history.length < 2) {
    return (
      <p className="text-xs text-muted-foreground py-8 text-center">
        Your rating chart grows as you finish games.
      </p>
    );
  }
  const W = 560, H = 140, PAD = 8;
  const values = history.map((h) => h.rating);
  const min = Math.min(...values) - 25;
  const max = Math.max(...values) + 25;
  const xScale = (i: number) => PAD + (i / (history.length - 1)) * (W - 2 * PAD);
  const yScale = (v: number) => H - PAD - ((v - min) / (max - min)) * (H - 2 * PAD);
  let d = "";
  history.forEach((h, i) => {
    d += `${i === 0 ? "M" : "L"}${xScale(i).toFixed(1)},${yScale(h.rating).toFixed(1)} `;
  });
  const last = history[history.length - 1].rating;
  const first = history[0].rating;
  const up = last >= first;

  return (
    <div className="rounded-xl border bg-muted/20 p-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-36" role="img" aria-label="Rating history">
        <defs>
          <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={up ? "#10b981" : "#f43f5e"} stopOpacity="0.25" />
            <stop offset="100%" stopColor={up ? "#10b981" : "#f43f5e"} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${d} L${xScale(history.length - 1)},${H - PAD} L${xScale(0)},${H - PAD} Z`} fill="url(#rg)" />
        <path d={d} fill="none" stroke={up ? "#10b981" : "#f43f5e"} strokeWidth="2" strokeLinejoin="round" />
        <circle cx={xScale(history.length - 1)} cy={yScale(last)} r="3.5" fill={up ? "#10b981" : "#f43f5e"} />
      </svg>
      <div className="flex justify-between text-[10px] text-muted-foreground px-1">
        <span>start {first}</span>
        <span className={up ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
          now {last}
        </span>
      </div>
    </div>
  );
}
