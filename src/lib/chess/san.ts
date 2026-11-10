// ─── SAN generation & parsing, PGN export ──────────────────────────────────
import { Position } from "./board";
import {
  FILE, RANK, mFrom, mTo, mPromo,
  FLAG_CASTLE_K, FLAG_CASTLE_Q, FLAG_EP,
  sqToAlg, pieceType, pieceColor, PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING,
  type Color,
} from "./types";

const PIECE_LETTER: Record<number, string> = {
  [KNIGHT]: "N", [BISHOP]: "B", [ROOK]: "R", [QUEEN]: "Q", [KING]: "K",
};

/** Generate SAN for a legal move in the current position */
export function moveToSan(pos: Position, m: number): string {
  const from = mFrom(m), to = mTo(m), promo = mPromo(m);
  const flags = m & 0x3e0000;
  const pc = pos.pieceAt(from);
  const ty = pieceType(pc);
  const us = pos.side;
  let san = "";

  if (flags & FLAG_CASTLE_K) san = "O-O";
  else if (flags & FLAG_CASTLE_Q) san = "O-O-O";
  else {
    const isCapture = pos.pieceAt(to) !== 0 || (flags & FLAG_EP) !== 0;
    if (ty === PAWN) {
      if (isCapture) san += String.fromCharCode(97 + FILE(from)) + "x";
      san += sqToAlg(to);
      if (promo) san += "=" + PIECE_LETTER[promo];
    } else {
      san += PIECE_LETTER[ty];
      // disambiguation: find other legal moves of same piece type to same square
      const others = pos.legalMoves().filter((om) => {
        if (om === m) return false;
        if (mTo(om) !== to) return false;
        const opc = pos.pieceAt(mFrom(om));
        return opc === pc;
      });
      if (others.length > 0) {
        const sameFile = others.some((om) => FILE(mFrom(om)) === FILE(from));
        const sameRank = others.some((om) => RANK(mFrom(om)) === RANK(from));
        if (!sameFile) san += String.fromCharCode(97 + FILE(from));
        else if (!sameRank) san += String(1 + RANK(from));
        else san += sqToAlg(from);
      }
      if (isCapture) san += "x";
      san += sqToAlg(to);
    }
  }

  pos.makeMove(m);
  if (pos.inCheck()) {
    san += pos.legalMoves().length === 0 ? "#" : "+";
  }
  pos.undoMove();
  void us;
  return san;
}

const cleanSan = (san: string) =>
  san.replace(/[+#!?]+/g, "").replace(/0/g, "O").replace(/e\.p\./, "").trim();

/** Find the legal move matching a SAN string (robust: compares generated SANs) */
export function sanToMove(pos: Position, san: string): number {
  const target = cleanSan(san);
  const legal = pos.legalMoves();
  // exact match first
  for (const m of legal) {
    if (cleanSan(moveToSan(pos, m)) === target) return m;
  }
  // lenient fallbacks
  for (const m of legal) {
    const s = cleanSan(moveToSan(pos, m)).replace(/[x=]/g, "");
    const t = target.replace(/[x=]/g, "");
    if (s === t) return m;
  }
  return 0;
}

/** Build a full SAN line from a list of legal uci moves */
export function sanLine(startPos: Position, uciMoves: string[]): string[] {
  const pos = startPos.clone();
  const sans: string[] = [];
  for (const uci of uciMoves) {
    const m = pos.findMove(uci);
    if (!m) break;
    sans.push(moveToSan(pos, m));
    pos.makeMove(m);
  }
  return sans;
}

export interface PgnHeaders {
  event?: string;
  site?: string;
  white?: string;
  black?: string;
  result: "1-0" | "0-1" | "1/2-1/2" | "*";
  opening?: string;
  timeControl?: string;
  termination?: string;
  date?: string;
}

export function buildPgn(
  sanMoves: string[],
  headers: PgnHeaders,
  startPlyFromWhite = true
): string {
  const d = headers.date ?? new Date().toISOString().slice(0, 10).replace(/-/g, ".");
  const lines = [
    `[Event "${headers.event ?? "Casual Game"}"]`,
    `[Site "${headers.site ?? "MasterBot Offline Chess"}"]`,
    `[Date "${d}"]`,
    `[White "${headers.white ?? "Player"}"]`,
    `[Black "${headers.black ?? "MasterBot"}"]`,
    `[Result "${headers.result}"]`,
  ];
  if (headers.opening) lines.push(`[Opening "${headers.opening}"]`);
  if (headers.timeControl) lines.push(`[TimeControl "${headers.timeControl}"]`);
  if (headers.termination) lines.push(`[Termination "${headers.termination}"]`);

  let body = "";
  let moveNo = startPlyFromWhite ? 1 : 1;
  for (let i = 0; i < sanMoves.length; i++) {
    const isWhitePly = i % 2 === 0;
    if (isWhitePly) body += `${moveNo}. `;
    body += sanMoves[i] + " ";
    if (!isWhitePly) moveNo++;
  }
  body += headers.result;
  return lines.join("\n") + "\n\n" + body.trim() + "\n";
}
