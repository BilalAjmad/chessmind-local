"use client";
// ─── Interactive chess board: click, drag & drop, animations, highlights ────

import { useCallback, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChessPieceSvg, type PieceCode } from "./pieces";
import { pieceColor, type Color } from "@/lib/chess/types";

export interface BoardTheme {
  key: string;
  name: string;
  className: string;
  swatch: [string, string];
}

export const BOARD_THEMES: BoardTheme[] = [
  { key: "walnut", name: "Classic Walnut", className: "board-walnut", swatch: ["#EBD9B4", "#A97A50"] },
  { key: "emerald", name: "Tournament Green", className: "board-emerald", swatch: ["#EFEEDB", "#6E9B58"] },
  { key: "slate", name: "Slate & Stone", className: "board-slate", swatch: ["#D8DEE4", "#7B8794"] },
  { key: "midnight", name: "Midnight Neon", className: "board-midnight", swatch: ["#4A4E69", "#22223B"] },
  { key: "coral", name: "Coral Beach", className: "board-coral", swatch: ["#FBEFD8", "#D98E73"] },
  { key: "cherry", name: "Cherry Wood", className: "board-cherry", swatch: ["#F0D9B5", "#9C5242"] },
];

const PIECE_LETTERS = ["", "P", "N", "B", "R", "Q", "K"];
export function pieceCodeString(code: number): PieceCode | null {
  if (code === 0) return null;
  const color = code >> 3 ? "b" : "w";
  const type = code & 7;
  return `${color}${PIECE_LETTERS[type]}` as PieceCode;
}

interface PieceEntry {
  sq: number;
  code: number;
  id: number;
}

/**
 * Tracks stable piece identities across positions so pieces animate
 * smoothly when they move (framer-motion key stability).
 * Uses the documented "adjust state when props change" pattern.
 */
function usePieceTracking(squares: Int8Array, lastMove: { from: number; to: number } | null) {
  const [state, setState] = useState<{
    prev: Int8Array | null;
    ids: Map<number, number>;
    counter: number;
    entries: PieceEntry[];
  }>(() => ({ prev: null, ids: new Map(), counter: 100, entries: [] }));

  if (state.prev !== squares) {
    const prev = state.prev;
    const prevIds = state.ids;
    const nextIds = new Map<number, number>();
    let counter = state.counter;
    const entries: PieceEntry[] = [];

    if (prev && prev.length === 128) {
      // pieces that did not move keep their identity
      for (let s = 0; s < 128; s++) {
        if (s & 0x88) continue;
        if (squares[s] !== 0 && squares[s] === prev[s]) {
          const id = prevIds.get(s);
          if (id !== undefined) nextIds.set(s, id);
        }
      }
      // the moved piece inherits the id of its origin square
      if (lastMove) {
        const { from, to } = lastMove;
        if (squares[to] !== 0 && !nextIds.has(to)) {
          const id = prevIds.get(from);
          if (id !== undefined) nextIds.set(to, id);
        }
        // castling rook (king moved two files)
        const fd = Math.abs((to & 7) - (from & 7));
        const piece = squares[to];
        if (fd === 2 && (piece & 7) === 6 && (to >> 4) === (from >> 4)) {
          const rank = from >> 4;
          const kingSide = (to & 7) === 6;
          const rookFrom = rank * 16 + (kingSide ? 7 : 0);
          const rookTo = rank * 16 + (kingSide ? 5 : 3);
          if (squares[rookTo] !== 0 && !nextIds.has(rookTo)) {
            const rid = prevIds.get(rookFrom);
            if (rid !== undefined) nextIds.set(rookTo, rid);
          }
        }
      }
    }
    // assign fresh ids to anything new
    for (let s = 0; s < 128; s++) {
      if (s & 0x88) continue;
      const code = squares[s];
      if (code === 0) continue;
      if (!nextIds.has(s)) nextIds.set(s, counter++);
      entries.push({ sq: s, code, id: nextIds.get(s)! });
    }
    const next = { prev: squares, ids: nextIds, counter, entries };
    setState(next);
    return next;
  }
  return state;
}

interface BoardProps {
  squares: Int8Array; // 0x88 layout
  orientation: "w" | "b";
  interactive: boolean;
  /** which side's pieces can be moved: 0 = white, 1 = black, -1 = both (pass & play) */
  movableColor: Color | -1;
  onTargets: (from: number) => number[];
  onMove: (from: number, to: number) => void;
  lastMove: { from: number; to: number } | null;
  checkSq: number; // -1 = none
  hint: { from: number; to: number } | null;
  animate: boolean;
  showCoords: boolean;
  showLegalMoves: boolean;
  showLastMove: boolean;
  theme: string;
}

export function ChessBoard({
  squares, orientation, interactive, movableColor, onTargets, onMove,
  lastMove, checkSq, hint, animate, showCoords, showLegalMoves, showLastMove,
  theme,
}: BoardProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ from: number; x: number; y: number; size: number } | null>(null);
  const [hoverSq, setHoverSq] = useState<number | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ from: number; x: number; y: number; size: number } | null>(null);

  // selection is only meaningful while interactive (derived, no effect needed)
  const effSelected = interactive ? selected : null;

  const targets = useMemo(
    () => (effSelected !== null && interactive ? onTargets(effSelected) : []),
    [effSelected, interactive, onTargets]
  );

  const { entries: pieceEntries } = usePieceTracking(squares, lastMove);

  // ── helpers ──
  const viewPos = useCallback(
    (sq: number): { file: number; rank: number } => {
      const f = sq & 7;
      const r = sq >> 4;
      return orientation === "w"
        ? { file: f, rank: 7 - r }
        : { file: 7 - f, rank: r };
    },
    [orientation]
  );

  const squareFromClient = useCallback(
    (clientX: number, clientY: number): number | null => {
      const el = boardRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      let x = (clientX - rect.left) / rect.width;
      let y = (clientY - rect.top) / rect.height;
      if (x < 0 || x >= 1 || y < 0 || y >= 1) return null;
      if (orientation === "b") { x = 1 - x; y = 1 - y; }
      const file = Math.min(7, Math.max(0, Math.floor(x * 8)));
      const rank = Math.min(7, Math.max(0, Math.floor((1 - y) * 8)));
      return rank * 16 + file;
    },
    [orientation]
  );

  // ── pointer handling (click + drag unified) ──
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!interactive) return;
      const sq = squareFromClient(e.clientX, e.clientY);
      if (sq === null) return;
      const piece = squares[sq];
      // move via click if clicking a target square
      if (selected !== null && targets.includes(sq)) {
        onMove(selected, sq);
        setSelected(null);
        return;
      }
      if (piece !== 0 && (movableColor < 0 || pieceColor(piece) === movableColor)) {
        setSelected(sq);
        const rect = boardRef.current?.getBoundingClientRect();
        const size = rect ? rect.width / 8 : 64;
        const d = { from: sq, x: e.clientX, y: e.clientY, size };
        dragRef.current = d;
        setDrag(d);
        setHoverSq(sq);
        try {
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        } catch { /* ignore */ }
        e.preventDefault();
      } else {
        setSelected(null);
      }
    },
    [interactive, squares, selected, targets, onMove, movableColor, squareFromClient]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const nd = { ...d, x: e.clientX, y: e.clientY };
      dragRef.current = nd;
      setDrag(nd);
      const sq = squareFromClient(e.clientX, e.clientY);
      setHoverSq(sq);
    },
    [squareFromClient]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      setHoverSq(null);
      if (!d) return;
      const sq = squareFromClient(e.clientX, e.clientY);
      if (sq !== null && sq !== d.from) {
        onMove(d.from, sq);
        setSelected(null);
      }
      // else: keep selection for click-click moves
    },
    [squareFromClient, onMove]
  );

  const dragPiece = drag ? squares[drag.from] : 0;
  const themeCls = BOARD_THEMES.find((t) => t.key === theme)?.className ?? "board-walnut";

  const coordLabels = useMemo(() => {
    if (!showCoords) return null;
    const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const ranks = ["1", "2", "3", "4", "5", "6", "7", "8"];
    const fileOrder = orientation === "w" ? files : [...files].reverse();
    const rankOrder = orientation === "w" ? [...ranks].reverse() : ranks;
    return { fileOrder, rankOrder };
  }, [showCoords, orientation]);

  return (
    <div className="relative w-full select-none" style={{ aspectRatio: "1 / 1", touchAction: "none" }}>
      <div
        ref={boardRef}
        className={`absolute inset-0 grid grid-cols-8 grid-rows-8 overflow-hidden rounded-lg shadow-2xl ${themeCls}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="grid"
        aria-label="Chess board"
      >
        {/* squares */}
        {Array.from({ length: 64 }, (_, i) => {
          const file = i % 8;
          const rank = Math.floor(i / 8);
          const actualFile = orientation === "w" ? file : 7 - file;
          const actualRank = orientation === "w" ? 7 - rank : rank;
          const sq = actualRank * 16 + actualFile;
          const isDark = (actualFile + actualRank) % 2 === 0;
          const isTarget = targets.includes(sq);
          const isCaptureTarget = isTarget && squares[sq] !== 0;
          const isLast = showLastMove && lastMove && (lastMove.from === sq || lastMove.to === sq);
          const isCheck = checkSq === sq;
          const isHover = !!drag && hoverSq === sq;
          const isSelected = effSelected === sq;
          return (
            <div
              key={i}
              className={[
                "relative",
                isDark ? "sq-dark" : "sq-light",
                isHover ? "sq-hover" : "",
              ].join(" ")}
              role="gridcell"
              aria-label={`square ${String.fromCharCode(97 + actualFile)}${actualRank + 1}`}
            >
              {isLast && <div className="absolute inset-0 sq-last" />}
              {isSelected && <div className="absolute inset-0 sq-selected" />}
              {isCheck && <div className="absolute inset-0 sq-check" />}
              {isTarget && showLegalMoves && !isCaptureTarget && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[30%] h-[30%] rounded-full sq-dot" />
                </div>
              )}
              {isTarget && showLegalMoves && isCaptureTarget && (
                <div className="absolute inset-[6%] rounded-full sq-capture-ring pointer-events-none" />
              )}
              {/* coordinates */}
              {coordLabels && file === 0 && (
                <span className="sq-coord coord-rank">{coordLabels.rankOrder[rank]}</span>
              )}
              {coordLabels && rank === 7 && (
                <span className="sq-coord coord-file">{coordLabels.fileOrder[file]}</span>
              )}
            </div>
          );
        })}

        {/* pieces */}
        {pieceEntries.map(({ sq, code, id }) => {
          const { file, rank } = viewPos(sq);
          const isDragging = drag?.from === sq;
          const pc = pieceCodeString(code);
          if (!pc) return null;
          return (
            <motion.div
              key={id}
              className="absolute top-0 left-0 w-[12.5%] h-[12.5%] pointer-events-none z-10 flex items-center justify-center"
              initial={false}
              animate={{
                x: `${file * 100}%`,
                y: `${rank * 100}%`,
                opacity: isDragging ? 0.35 : 1,
                scale: isDragging ? 0.9 : 1,
              }}
              transition={
                animate
                  ? { type: "spring", stiffness: 700, damping: 46, mass: 0.9 }
                  : { duration: 0 }
              }
            >
              <ChessPieceSvg piece={pc} className="w-[88%] h-[88%] drop-shadow-sm" />
            </motion.div>
          );
        })}

        {/* hint arrow — pulses while the suggestion is active */}
        {hint && (
          <svg viewBox="0 0 8 8" className="absolute inset-0 w-full h-full pointer-events-none z-20">
            <defs>
              <marker id="ah" markerWidth="4" markerHeight="4" refX="2.6" refY="2" orient="auto">
                <path d="M0,0 L4,2 L0,4 z" fill="#22c55e" />
              </marker>
            </defs>
            {(() => {
              const a = viewPos(hint.from);
              const b = viewPos(hint.to);
              const x1 = a.file + 0.5, y1 = a.rank + 0.5;
              const x2 = b.file + 0.5, y2 = b.rank + 0.5;
              const dx = x2 - x1, dy = y2 - y1;
              const len = Math.hypot(dx, dy) || 1;
              const sx = x1 + (dx / len) * 0.35, sy = y1 + (dy / len) * 0.35;
              const ex = x2 - (dx / len) * 0.45, ey = y2 - (dy / len) * 0.45;
              return (
                <line
                  x1={sx} y1={sy} x2={ex} y2={ey}
                  stroke="#22c55e" strokeWidth="0.18" strokeLinecap="round"
                  markerEnd="url(#ah)"
                >
                  <animate attributeName="opacity" values="0.9;0.45;0.9" dur="1.6s" repeatCount="indefinite" />
                </line>
              );
            })()}
          </svg>
        )}
      </div>

      {/* floating dragged piece */}
      {drag && dragPiece !== 0 && (() => {
        const pc = pieceCodeString(dragPiece);
        if (!pc) return null;
        return (
          <div
            className="fixed z-50 pointer-events-none"
            style={{
              left: drag.x - drag.size / 2,
              top: drag.y - drag.size / 2,
              width: drag.size,
              height: drag.size,
            }}
          >
            <ChessPieceSvg piece={pc} className="w-full h-full drop-shadow-lg" />
          </div>
        );
      })()}
    </div>
  );
}
