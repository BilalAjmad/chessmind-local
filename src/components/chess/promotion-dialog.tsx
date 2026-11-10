"use client";
// ─── Promotion piece picker ─────────────────────────────────────────────────

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChessPieceSvg, type PieceCode } from "./pieces";

interface PromotionDialogProps {
  open: boolean;
  color: "w" | "b";
  onPick: (promoType: number) => void; // 2=N 3=B 4=R 5=Q
  onCancel: () => void;
}

export function PromotionDialog({ open, color, onPick, onCancel }: PromotionDialogProps) {
  const options: { type: number; code: PieceCode; label: string }[] = [
    { type: 5, code: `${color}Q` as PieceCode, label: "Queen" },
    { type: 4, code: `${color}R` as PieceCode, label: "Rook" },
    { type: 3, code: `${color}B` as PieceCode, label: "Bishop" },
    { type: 2, code: `${color}N` as PieceCode, label: "Knight" },
  ];
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-xs" showCloseButton={false} aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="text-center text-base">Promote your pawn</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-4 gap-2">
          {options.map((o) => (
            <button
              key={o.type}
              type="button"
              onClick={() => onPick(o.type)}
              className="flex flex-col items-center gap-1 rounded-xl border border-border p-2.5 hover:border-primary hover:bg-primary/10 transition-all active:scale-95"
              aria-label={`Promote to ${o.label}`}
            >
              <ChessPieceSvg piece={o.code} className="w-12 h-12" />
              <span className="text-[10px] text-muted-foreground">{o.label}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
