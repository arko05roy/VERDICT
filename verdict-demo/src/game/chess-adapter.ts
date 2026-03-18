import { Chess, type Move, type Square, type PieceSymbol } from "chess.js";
import type { GameState, Position } from "./engine";

const PIECE_MAP: Record<string, number> = {
  p: 0,
  n: 1,
  b: 2,
  r: 3,
  q: 4,
  k: 5,
};

export function encodePieceAction(piece: string): number {
  return PIECE_MAP[piece.toLowerCase()] ?? 0;
}

export function moveToPosition(square: string): Position {
  const file = square.charCodeAt(0) - "a".charCodeAt(0);
  const rank = parseInt(square[1], 10) - 1;
  return { x: file, y: rank };
}

function getOpponentPieces(game: Chess, color: "w" | "b"): Position[] {
  const opponentColor = color === "w" ? "b" : "w";
  const enemies: Position[] = [];
  const board = game.board();
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (piece && piece.color === opponentColor) {
        enemies.push({ x: file, y: 7 - rank });
      }
    }
  }
  return enemies;
}

export function chessToVerdictState(
  game: Chess,
  move: Move,
  prevState: GameState | null
): GameState {
  const pos = moveToPosition(move.to);
  const fromPos = moveToPosition(move.from);
  const action = encodePieceAction(move.piece);
  const turnColor = move.color;

  const enemies = getOpponentPieces(game, turnColor);

  const prev = prevState ?? {
    player: fromPos,
    prevPos: fromPos,
    prevPrevPos: fromPos,
    enemies: [],
    tick: 100,
    isFirstMove: true,
    actionHistory: [0, 1, 2, 3, 0, 1, 2, 3],
    tickHistory: [10, 20, 30, 40, 50, 60, 70, 80],
    aimHistory: Array.from({ length: 8 }, () => ({ ...fromPos })),
    moveLog: [],
    sessionStarted: false,
  };

  const newTick = prev.tick + 10;

  const newAimHistory = [...prev.aimHistory.slice(1), pos];
  const newActionHistory = [...prev.actionHistory.slice(1), action];
  const newTickHistory = [...prev.tickHistory.slice(1), newTick];

  return {
    player: pos,
    prevPos: fromPos,
    prevPrevPos: prev.prevPos,
    enemies,
    tick: newTick,
    isFirstMove: prevState === null,
    actionHistory: newActionHistory,
    tickHistory: newTickHistory,
    aimHistory: newAimHistory,
    moveLog: prev.moveLog,
    sessionStarted: true,
  };
}
