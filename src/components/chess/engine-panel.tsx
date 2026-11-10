"use client";
// ─── Engine panel: AI identity, thinking info, principal variation ──────────

import { Cpu, BookOpen, Layers, Zap } from "lucide-react";
import type { LevelConfig } from "@/lib/chess/engine";
import type { AiThinkingInfo } from "@/hooks/use-chess-game";
import { cn } from "@/lib/utils";

interface EnginePanelProps {
  ai: LevelConfig;
  thinking: boolean;
  info: AiThinkingInfo | null;
  fromBook: boolean;
  className?: string;
}

export function EnginePanel({ ai, thinking, info, fromBook, className }: EnginePanelProps) {
  const nps = info && info.timeMs > 0 ? Math.round(info.nodes / (info.timeMs / 1000)) : null;

  return (
    <div className={cn("rounded-xl border bg-card p-3 space-y-2.5", className)}>
      <div className="flex items-center gap-2">
        <div className="relative w-8 h-8 rounded-lg bg-muted border flex items-center justify-center">
          <Cpu className="w-4 h-4 text-foreground/80" />
          {thinking && (
            <span
              className="absolute -inset-0.5 rounded-lg border-2 border-amber-500/50 animate-pulse"
              aria-label="searching"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm truncate">{ai.name}</span>
            <span className="text-[9px] font-bold bg-primary/10 text-primary rounded-full px-1.5 py-px tabular-nums">
              L{ai.level}
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground">
            {ai.title} · ~{ai.elo} Elo
          </div>
        </div>
        {fromBook && !thinking && (
          <span className="flex items-center gap-1 text-[10px] text-amber-400 font-medium shrink-0">
            <BookOpen className="h-3 w-3" /> book
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-1.5 text-center">
        <Stat
          icon={<Layers className="h-3 w-3" />}
          value={info ? `${info.depth}` : "—"}
          label="depth"
        />
        <Stat
          icon={<Zap className="h-3 w-3" />}
          value={info ? fmtNodes(info.nodes) : "—"}
          label="nodes"
        />
        <Stat
          icon={<Cpu className="h-3 w-3" />}
          value={nps ? `${fmtNodes(nps)}/s` : "—"}
          label="speed"
        />
      </div>

      {(thinking || info) && (
        <div className="min-h-[2.2rem]">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-0.5">
            Engine line {info?.scoreWhite !== null && info?.scoreWhite !== undefined && (
              <span className={cn("ml-1 font-bold", evalCls(info.scoreWhite))}>
                {evalText(info.scoreWhite)}
              </span>
            )}
          </div>
          <div className="text-xs font-mono leading-snug text-muted-foreground break-words line-clamp-2">
            {thinking && (!info || info.pvSan.length === 0)
              ? "searching…"
              : info?.pvSan.slice(0, 8).join(" ") || "—"}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-lg bg-muted/40 px-1 py-1.5">
      <div className="flex items-center justify-center gap-1 text-sm font-bold tabular-nums">
        {icon} {value}
      </div>
      <div className="text-[9px] text-muted-foreground">{label}</div>
    </div>
  );
}

function fmtNodes(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return `${n}`;
}

function evalText(cp: number): string {
  const v = cp / 100;
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}`;
}
function evalCls(cp: number): string {
  return cp > 30 ? "text-emerald-400" : cp < -30 ? "text-rose-400" : "text-muted-foreground";
}
