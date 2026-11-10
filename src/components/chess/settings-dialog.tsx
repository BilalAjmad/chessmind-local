"use client";
// ─── Settings dialog: board theme, toggles, animation ───────────────────────

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Palette, Volume2, Eye, Gauge, Brain, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BOARD_THEMES } from "./board";
import type { GameSettings } from "@/lib/storage";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: GameSettings;
  onChange: <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => void;
  onWipeMemory?: () => void;
}

export function SettingsDialog({ open, onOpenChange, settings, onChange, onWipeMemory }: SettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto nice-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" /> Settings
          </DialogTitle>
          <DialogDescription>Appearance and gameplay preferences (saved locally).</DialogDescription>
        </DialogHeader>

        {/* board theme */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Board theme</h3>
          <div className="grid grid-cols-3 gap-2">
            {BOARD_THEMES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => onChange("boardTheme", t.key)}
                className={cn(
                  "rounded-xl border p-2 transition-all",
                  settings.boardTheme === t.key
                    ? "border-primary ring-1 ring-primary"
                    : "border-border hover:border-primary/50"
                )}
                aria-label={`Theme ${t.name}`}
              >
                <div className="grid grid-cols-4 grid-rows-2 rounded-md overflow-hidden h-12">
                  {Array.from({ length: 8 }, (_, i) => (
                    <div
                      key={i}
                      style={{
                        background: (i + Math.floor(i / 4)) % 2 === 0 ? t.swatch[1] : t.swatch[0],
                      }}
                    />
                  ))}
                </div>
                <div className="text-[10px] mt-1 font-medium truncate">{t.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* toggles */}
        <div className="space-y-3">
          <Toggle
            icon={<Volume2 className="h-4 w-4" />}
            label="Sound effects"
            desc="Moves, captures, checks and results"
            checked={settings.soundOn}
            onChange={(v) => onChange("soundOn", v)}
          />
          <Toggle
            icon={<Eye className="h-4 w-4" />}
            label="Show legal moves"
            desc="Dots on squares the selected piece can reach"
            checked={settings.showLegalMoves}
            onChange={(v) => onChange("showLegalMoves", v)}
          />
          <Toggle
            icon={<Eye className="h-4 w-4" />}
            label="Board coordinates"
            desc="File letters and rank numbers on the board"
            checked={settings.showCoords}
            onChange={(v) => onChange("showCoords", v)}
          />
          <Toggle
            icon={<Eye className="h-4 w-4" />}
            label="Evaluation bar"
            desc="Live engine assessment beside the board"
            checked={settings.showEvalBar}
            onChange={(v) => onChange("showEvalBar", v)}
          />
          <Toggle
            icon={<Eye className="h-4 w-4" />}
            label="Highlight last move"
            desc="Tint the from/to squares of the last move"
            checked={settings.showLastMove}
            onChange={(v) => onChange("showLastMove", v)}
          />
          <Toggle
            icon={<Gauge className="h-4 w-4" />}
            label="Live coach analysis"
            desc="Classify your moves and warn about blunders"
            checked={settings.liveAnalysis}
            onChange={(v) => onChange("liveAnalysis", v)}
          />
          <Toggle
            icon={<Gauge className="h-4 w-4" />}
            label="Auto-promote to queen"
            desc="Skip the promotion picker"
            checked={settings.autoQueen}
            onChange={(v) => onChange("autoQueen", v)}
          />
        </div>

        {/* animation speed */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Piece animation</Label>
            <span className="text-xs text-muted-foreground tabular-nums">
              {settings.animationMs === 0 ? "Off" : `${settings.animationMs} ms`}
            </span>
          </div>
          <Slider
            value={[settings.animationMs]}
            min={0}
            max={400}
            step={20}
            onValueChange={([v]) => onChange("animationMs", v)}
            aria-label="Animation duration"
          />
        </div>

        {/* AI memory */}
        {onWipeMemory && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/5 px-3 py-2.5">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <Brain className="h-4 w-4 text-rose-400" /> AI memory
              </div>
              <div className="text-[11px] text-muted-foreground">
                Wipe what MasterBot learned about you (lines, style, habits)
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-rose-500/40 text-rose-500 hover:bg-rose-500/10 hover:text-rose-400 shrink-0"
              onClick={onWipeMemory}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Wipe
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Toggle({
  icon, label, desc, checked, onChange,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/20 px-3 py-2.5">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          {icon} {label}
        </div>
        <div className="text-[11px] text-muted-foreground truncate">{desc}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}
