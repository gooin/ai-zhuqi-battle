import type {
  ChessBoard,
  ChessCandidateMove,
  ChessCompactBoardText,
  ChessMove,
  ChessMoveResult,
  ChessPiece,
  ChessPieceKind,
  ChessSide,
} from "./types";
import { CHESS_COLS, CHESS_ROWS } from "./types";

export const WHITE_SIDE: ChessSide = "white";
export const BLACK_SIDE: ChessSide = "black";

const PIECE_VALUES: Record<ChessPieceKind, number> = {
  k: 100000,
  q: 900,
  r: 500,
  b: 325,
  n: 300,
  p: 100,
};

const ORTHOGONAL_DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

const DIAGONAL_DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

const QUEEN_DIRS: ReadonlyArray<readonly [number, number]> = [
  ...ORTHOGONAL_DIRS,
  ...DIAGONAL_DIRS,
];

const KNIGHT_PATTERNS: ReadonlyArray<readonly [number, number]> = [
  [-2, -1],
  [-2, 1],
  [2, -1],
  [2, 1],
  [-1, -2],
  [1, -2],
  [-1, 2],
  [1, 2],
];

// 坐标转换：数组索引(row, col) ↔ 代数记法(a1-h8)
// a1 = (row=0, col=0), h8 = (row=7, col=7)
export function toAlgebraic(row: number, col: number): string {
  const colChar = String.fromCharCode(97 + col); // a-h
  const rowNum = row + 1; // 1-8
  return `${colChar}${rowNum}`;
}

export function createInitialBoard(): ChessBoard {
  const board: ChessBoard = Array.from({ length: CHESS_ROWS }, () =>
    Array.from({ length: CHESS_COLS }, () => null as ChessPiece | null),
  );

  const put = (row: number, col: number, side: ChessSide, kind: ChessPieceKind) => {
    board[row][col] = { side, kind };
  };

  // 白方 (row 0-1) - a1在左下角
  put(0, 0, WHITE_SIDE, "r"); // a1
  put(0, 1, WHITE_SIDE, "n"); // b1
  put(0, 2, WHITE_SIDE, "b"); // c1
  put(0, 3, WHITE_SIDE, "q"); // d1
  put(0, 4, WHITE_SIDE, "k"); // e1
  put(0, 5, WHITE_SIDE, "b"); // f1
  put(0, 6, WHITE_SIDE, "n"); // g1
  put(0, 7, WHITE_SIDE, "r"); // h1
  for (let col = 0; col < 8; col++) {
    put(1, col, WHITE_SIDE, "p"); // 第2行
  }

  // 黑方 (row 6-7) - h8在右上角
  for (let col = 0; col < 8; col++) {
    put(6, col, BLACK_SIDE, "p"); // 第7行
  }
  put(7, 0, BLACK_SIDE, "r"); // a8
  put(7, 1, BLACK_SIDE, "n"); // b8
  put(7, 2, BLACK_SIDE, "b"); // c8
  put(7, 3, BLACK_SIDE, "q"); // d8
  put(7, 4, BLACK_SIDE, "k"); // e8
  put(7, 5, BLACK_SIDE, "b"); // f8
  put(7, 6, BLACK_SIDE, "n"); // g8
  put(7, 7, BLACK_SIDE, "r"); // h8

  return board;
}

export function cloneBoard(board: ChessBoard): ChessBoard {
  return board.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
}

export function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < CHESS_ROWS && col >= 0 && col < CHESS_COLS;
}

export function oppositeSide(side: ChessSide): ChessSide {
  return side === WHITE_SIDE ? BLACK_SIDE : WHITE_SIDE;
}

export function sideLabel(side: ChessSide): string {
  return side === WHITE_SIDE ? "白方" : "黑方";
}

export function pieceLabel(piece: ChessPiece): string {
  const whiteMap: Record<ChessPieceKind, string> = {
    k: "王",
    q: "后",
    r: "车",
    b: "象",
    n: "马",
    p: "兵",
  };
  const blackMap: Record<ChessPieceKind, string> = {
    k: "王",
    q: "后",
    r: "车",
    b: "象",
    n: "马",
    p: "兵",
  };
  return piece.side === WHITE_SIDE ? whiteMap[piece.kind] : blackMap[piece.kind];
}

export function formatMoveText(piece: ChessPiece, move: ChessMove): string {
  const from = toAlgebraic(move.fromRow, move.fromCol);
  const to = toAlgebraic(move.toRow, move.toCol);
  return `${pieceLabel(piece)}${from}→${to}`;
}

function canOccupy(board: ChessBoard, row: number, col: number, side: ChessSide): boolean {
  if (!inBounds(row, col)) {
    return false;
  }
  const target = board[row][col];
  return !target || target.side !== side;
}

function isSameMove(a: ChessMove, b: ChessMove): boolean {
  return (
    a.fromRow === b.fromRow &&
    a.fromCol === b.fromCol &&
    a.toRow === b.toRow &&
    a.toCol === b.toCol
  );
}

function generateSlidingMoves(
  board: ChessBoard,
  row: number,
  col: number,
  piece: ChessPiece,
  dirs: ReadonlyArray<readonly [number, number]>,
): ChessMove[] {
  const moves: ChessMove[] = [];
  for (const [dr, dc] of dirs) {
    let r = row + dr;
    let c = col + dc;
    while (inBounds(r, c)) {
      const target = board[r][c];
      if (!target) {
        moves.push({ fromRow: row, fromCol: col, toRow: r, toCol: c });
      } else {
        if (target.side !== piece.side) {
          moves.push({ fromRow: row, fromCol: col, toRow: r, toCol: c });
        }
        break;
      }
      r += dr;
      c += dc;
    }
  }
  return moves;
}

export function generatePseudoMovesForPiece(
  board: ChessBoard,
  row: number,
  col: number,
  piece: ChessPiece,
): ChessMove[] {
  const moves: ChessMove[] = [];

  if (piece.kind === "r") {
    // 车：横竖
    moves.push(...generateSlidingMoves(board, row, col, piece, ORTHOGONAL_DIRS));
  } else if (piece.kind === "b") {
    // 象：斜线
    moves.push(...generateSlidingMoves(board, row, col, piece, DIAGONAL_DIRS));
  } else if (piece.kind === "q") {
    // 后：8方向
    moves.push(...generateSlidingMoves(board, row, col, piece, QUEEN_DIRS));
  } else if (piece.kind === "n") {
    // 马：L形跳跃
    for (const [dr, dc] of KNIGHT_PATTERNS) {
      const toRow = row + dr;
      const toCol = col + dc;
      if (canOccupy(board, toRow, toCol, piece.side)) {
        moves.push({ fromRow: row, fromCol: col, toRow, toCol });
      }
    }
  } else if (piece.kind === "k") {
    // 王：8方向走1格
    for (const [dr, dc] of QUEEN_DIRS) {
      const toRow = row + dr;
      const toCol = col + dc;
      if (canOccupy(board, toRow, toCol, piece.side)) {
        moves.push({ fromRow: row, fromCol: col, toRow, toCol });
      }
    }
  } else if (piece.kind === "p") {
    // 兵：白方向上(row增加)，黑方向下(row减少)
    const forward = piece.side === WHITE_SIDE ? 1 : -1;
    const startRow = piece.side === WHITE_SIDE ? 1 : 6;

    // 向前1格
    const toRow1 = row + forward;
    if (inBounds(toRow1, col) && !board[toRow1][col]) {
      moves.push({ fromRow: row, fromCol: col, toRow: toRow1, toCol: col });

      // 首步可走2格
      if (row === startRow) {
        const toRow2 = row + 2 * forward;
        if (inBounds(toRow2, col) && !board[toRow2][col]) {
          moves.push({ fromRow: row, fromCol: col, toRow: toRow2, toCol: col });
        }
      }
    }

    // 斜吃
    for (const dc of [-1, 1] as const) {
      const toCol = col + dc;
      if (inBounds(toRow1, toCol)) {
        const target = board[toRow1][toCol];
        if (target && target.side !== piece.side) {
          moves.push({ fromRow: row, fromCol: col, toRow: toRow1, toCol });
        }
      }
    }
  }

  return moves;
}

function findKing(board: ChessBoard, side: ChessSide): { row: number; col: number } | null {
  for (let row = 0; row < CHESS_ROWS; row += 1) {
    for (let col = 0; col < CHESS_COLS; col += 1) {
      const piece = board[row][col];
      if (piece && piece.side === side && piece.kind === "k") {
        return { row, col };
      }
    }
  }
  return null;
}

function isSquareAttacked(
  board: ChessBoard,
  targetRow: number,
  targetCol: number,
  attacker: ChessSide,
): boolean {
  for (let row = 0; row < CHESS_ROWS; row += 1) {
    for (let col = 0; col < CHESS_COLS; col += 1) {
      const piece = board[row][col];
      if (!piece || piece.side !== attacker) {
        continue;
      }
      const pseudo = generatePseudoMovesForPiece(board, row, col, piece);
      if (pseudo.some((move) => move.toRow === targetRow && move.toCol === targetCol)) {
        return true;
      }
    }
  }
  return false;
}

export function isInCheck(board: ChessBoard, side: ChessSide): boolean {
  const king = findKing(board, side);
  if (!king) {
    return true;
  }
  return isSquareAttacked(board, king.row, king.col, oppositeSide(side));
}

function applyMoveUnchecked(board: ChessBoard, move: ChessMove): ChessMoveResult | null {
  if (!inBounds(move.fromRow, move.fromCol) || !inBounds(move.toRow, move.toCol)) {
    return null;
  }

  const piece = board[move.fromRow][move.fromCol];
  if (!piece) {
    return null;
  }

  const next = cloneBoard(board);
  const captured = next[move.toRow][move.toCol];
  next[move.toRow][move.toCol] = { ...piece };
  next[move.fromRow][move.fromCol] = null;

  return {
    board: next,
    captured: captured ? { ...captured } : null,
  };
}

export function isLegalMove(board: ChessBoard, move: ChessMove, side: ChessSide): boolean {
  if (!inBounds(move.fromRow, move.fromCol) || !inBounds(move.toRow, move.toCol)) {
    return false;
  }

  const piece = board[move.fromRow][move.fromCol];
  if (!piece || piece.side !== side) {
    return false;
  }

  const pseudo = generatePseudoMovesForPiece(board, move.fromRow, move.fromCol, piece);
  if (!pseudo.some((m) => isSameMove(m, move))) {
    return false;
  }

  const result = applyMoveUnchecked(board, move);
  if (!result) {
    return false;
  }

  return !isInCheck(result.board, side);
}

export function applyMove(
  board: ChessBoard,
  move: ChessMove,
  side: ChessSide,
): ChessMoveResult | null {
  if (!isLegalMove(board, move, side)) {
    return null;
  }
  return applyMoveUnchecked(board, move);
}

export function generateLegalMoves(board: ChessBoard, side: ChessSide): ChessMove[] {
  const moves: ChessMove[] = [];

  for (let row = 0; row < CHESS_ROWS; row += 1) {
    for (let col = 0; col < CHESS_COLS; col += 1) {
      const piece = board[row][col];
      if (!piece || piece.side !== side) {
        continue;
      }

      const pseudo = generatePseudoMovesForPiece(board, row, col, piece);
      for (const move of pseudo) {
        if (isLegalMove(board, move, side)) {
          moves.push(move);
        }
      }
    }
  }

  return moves;
}

function evaluateMove(board: ChessBoard, move: ChessMove, side: ChessSide): number {
  const movingPiece = board[move.fromRow][move.fromCol];
  if (!movingPiece) {
    return -Infinity;
  }

  const result = applyMoveUnchecked(board, move);
  if (!result) {
    return -Infinity;
  }

  let score = 0;

  // 吃子价值
  const capturedValue = result.captured ? PIECE_VALUES[result.captured.kind] : 0;
  score += capturedValue * 3;

  // 位置奖励：控制中心 (d4, e4, d5, e5 即 row3-4, col3-4)
  const centerDist = Math.abs(move.toRow - 3.5) + Math.abs(move.toCol - 3.5);
  score += (7 - centerDist) * 8;

  // 兵前进奖励
  if (movingPiece.kind === "p") {
    const progress = side === WHITE_SIDE ? move.toRow : 7 - move.toRow;
    score += progress * 6;
  }

  // 将军奖励
  if (isInCheck(result.board, oppositeSide(side))) {
    score += 60;
  }

  // 吃王（赢棋）
  if (result.captured?.kind === "k") {
    score += 1_000_000;
  }

  return score;
}

export function generateCandidateMoves(
  board: ChessBoard,
  side: ChessSide,
  limit = 24,
): ChessCandidateMove[] {
  const legal = generateLegalMoves(board, side);
  const scored = legal.map((move) => ({
    ...move,
    score: evaluateMove(board, move, side),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

export function resolveWinner(board: ChessBoard, sideToMove: ChessSide): ChessSide | "draw" | null {
  const whiteKing = findKing(board, WHITE_SIDE);
  const blackKing = findKing(board, BLACK_SIDE);

  if (!whiteKing) {
    return BLACK_SIDE;
  }
  if (!blackKing) {
    return WHITE_SIDE;
  }

  const legal = generateLegalMoves(board, sideToMove);
  if (legal.length === 0) {
    if (isInCheck(board, sideToMove)) {
      // 被将死
      return oppositeSide(sideToMove);
    }
    // 无子可动，和棋
    return "draw";
  }

  return null;
}

export function boardToMatrixText(board: ChessBoard): string {
  // 显示时反转行，让a1在左下角
  const displayRows = [];
  for (let row = 7; row >= 0; row--) {
    const text = board[row]
      .map((piece) => {
        if (!piece) {
          return "--";
        }
        return `${piece.side === WHITE_SIDE ? "w" : "b"}${piece.kind}`;
      })
      .join(" ");
    displayRows.push(`${String(row + 1).padStart(2, "0")}: ${text}`);
  }
  return displayRows.join("\n");
}

export function boardToCompactText(board: ChessBoard): ChessCompactBoardText {
  const white: string[] = [];
  const black: string[] = [];

  for (let row = 0; row < CHESS_ROWS; row += 1) {
    for (let col = 0; col < CHESS_COLS; col += 1) {
      const piece = board[row][col];
      if (!piece) {
        continue;
      }
      const alg = toAlgebraic(row, col);
      const text = `${pieceLabel(piece)}(${alg})`;
      if (piece.side === WHITE_SIDE) {
        white.push(text);
      } else {
        black.push(text);
      }
    }
  }

  return {
    white: white.join(" "),
    black: black.join(" "),
  };
}
