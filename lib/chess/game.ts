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

import type { ChessGameState } from "./types";

// 创建初始游戏状态
export function createInitialGameState(): ChessGameState {
  return {
    enPassantTarget: null,
    whiteKingMoved: false,
    blackKingMoved: false,
    whiteRookLeftMoved: false,
    whiteRookRightMoved: false,
    blackRookLeftMoved: false,
    blackRookRightMoved: false,
  };
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

// 暂时存储游戏状态的全局变量，用于伪移动生成
let currentGameState: ChessGameState | null = null;

// 设置当前游戏状态（用于移动生成时获取吃过路兵信息）
export function setCurrentGameState(state: ChessGameState) {
  currentGameState = state;
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

    // 王车易位
    if (currentGameState) {
      const hasKingMoved = piece.side === WHITE_SIDE
        ? currentGameState.whiteKingMoved
        : currentGameState.blackKingMoved;

      if (!hasKingMoved) {
        const kingRow = piece.side === WHITE_SIDE ? 0 : 7;
        const kingCol = 4;

        // 检查王是否在正确的位置
        if (row === kingRow && col === kingCol) {
          // 王翼易位 (Kingside)
          const kingsideRookCol = 7;
          const kingsideRookHasMoved = piece.side === WHITE_SIDE
            ? currentGameState.whiteRookRightMoved
            : currentGameState.blackRookRightMoved;

          if (!kingsideRookHasMoved &&
              !board[kingRow][5] && !board[kingRow][6] && // 王和车之间无棋子
              !isSquareAttacked(board, kingRow, kingCol, oppositeSide(piece.side)) && // 王未被将军
              !isSquareAttacked(board, kingRow, 5, oppositeSide(piece.side)) && // 经过格子未被攻击
              !isSquareAttacked(board, kingRow, 6, oppositeSide(piece.side))) { // 目标格子未被攻击
            moves.push({ fromRow: row, fromCol: col, toRow: kingRow, toCol: 6 });
          }

          // 后翼易位 (Queenside)
          const queensideRookCol = 0;
          const queensideRookHasMoved = piece.side === WHITE_SIDE
            ? currentGameState.whiteRookLeftMoved
            : currentGameState.blackRookLeftMoved;

          if (!queensideRookHasMoved &&
              !board[kingRow][1] && !board[kingRow][2] && !board[kingRow][3] && // 王和车之间无棋子
              !isSquareAttacked(board, kingRow, kingCol, oppositeSide(piece.side)) && // 王未被将军
              !isSquareAttacked(board, kingRow, 3, oppositeSide(piece.side)) && // 经过格子未被攻击
              !isSquareAttacked(board, kingRow, 2, oppositeSide(piece.side))) { // 目标格子未被攻击
            moves.push({ fromRow: row, fromCol: col, toRow: kingRow, toCol: 2 });
          }
        }
      }
    }
  } else if (piece.kind === "p") {
    // 兵：白方向上(row增加)，黑方向下(row减少)
    const forward = piece.side === WHITE_SIDE ? 1 : -1;
    const startRow = piece.side === WHITE_SIDE ? 1 : 6;

    // 向前1格
    const toRow1 = row + forward;
    if (inBounds(toRow1, col) && !board[toRow1][col]) {
      // 检查是否需要升变
      if (toRow1 === (piece.side === WHITE_SIDE ? 7 : 0)) {
        // 到达底线，必须升变
        for (const promotion of ["q", "r", "b", "n"] as ChessPieceKind[]) {
          moves.push({ fromRow: row, fromCol: col, toRow: toRow1, toCol: col, promotion });
        }
      } else {
        moves.push({ fromRow: row, fromCol: col, toRow: toRow1, toCol: col });
      }

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
          // 检查是否需要升变
          if (toRow1 === (piece.side === WHITE_SIDE ? 7 : 0)) {
            for (const promotion of ["q", "r", "b", "n"] as ChessPieceKind[]) {
              moves.push({ fromRow: row, fromCol: col, toRow: toRow1, toCol, promotion });
            }
          } else {
            moves.push({ fromRow: row, fromCol: col, toRow: toRow1, toCol });
          }
        }
      }
    }

    // 吃过路兵
    if (currentGameState?.enPassantTarget) {
      const { row: targetRow, col: targetCol } = currentGameState.enPassantTarget;
      if (toRow1 === targetRow && col + 1 === targetCol) {
        moves.push({ fromRow: row, fromCol: col, toRow: targetRow, toCol: targetCol });
      }
      if (toRow1 === targetRow && col - 1 === targetCol) {
        moves.push({ fromRow: row, fromCol: col, toRow: targetRow, toCol: targetCol });
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
  let captured = next[move.toRow][move.toCol];

  // 处理王车易位
  if (piece.kind === "k" && Math.abs(move.toCol - move.fromCol) === 2) {
    const kingRow = move.fromRow;
    if (move.toCol > move.fromCol) {
      // 王翼易位 (Kingside)
      next[kingRow][5] = next[kingRow][7]; // 车移动到 f1/f8
      next[kingRow][7] = null;
    } else {
      // 后翼易位 (Queenside)
      next[kingRow][3] = next[kingRow][0]; // 车移动到 d1/d8
      next[kingRow][0] = null;
    }
  }

  // 处理吃过路兵
  if (piece.kind === "p" && !captured && move.toCol !== move.fromCol) {
    // 兵斜走但目标格子没有棋子，说明是吃过路兵
    const capturedRow = piece.side === WHITE_SIDE ? move.toRow - 1 : move.toRow + 1;
    captured = next[capturedRow][move.toCol];
    if (captured && captured.side !== piece.side && captured.kind === "p") {
      next[capturedRow][move.toCol] = null;
    }
  }

  // 处理兵升变
  if (piece.kind === "p" && move.promotion) {
    // 只能升变为后、车、象、马
    const validPromotions = ["q", "r", "b", "n"];
    if (validPromotions.includes(move.promotion)) {
      next[move.toRow][move.toCol] = { side: piece.side, kind: move.promotion };
    } else {
      // 默认升变为后
      next[move.toRow][move.toCol] = { side: piece.side, kind: "q" };
    }
  } else {
    next[move.toRow][move.toCol] = { ...piece };
  }

  next[move.fromRow][move.fromCol] = null;

  return {
    board: next,
    captured: captured ? { ...captured } : null,
  };
}

export function isLegalMove(board: ChessBoard, move: ChessMove, side: ChessSide, state: ChessGameState): boolean {
  if (!inBounds(move.fromRow, move.fromCol) || !inBounds(move.toRow, move.toCol)) {
    return false;
  }

  const piece = board[move.fromRow][move.fromCol];
  if (!piece || piece.side !== side) {
    return false;
  }

  // 设置当前游戏状态以用于伪移动生成
  setCurrentGameState(state);
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

// 更新游戏状态
export function updateGameState(
  state: ChessGameState,
  move: ChessMove,
  piece: ChessPiece,
): ChessGameState {
  const newState = { ...state };

  // 更新吃过路兵目标
  newState.enPassantTarget = null;
  if (piece.kind === "p") {
    const isDoubleStep = piece.side === WHITE_SIDE
      ? (move.fromRow === 1 && move.toRow === 3)
      : (move.fromRow === 6 && move.toRow === 4);
    if (isDoubleStep) {
      newState.enPassantTarget = {
        row: (move.fromRow + move.toRow) / 2,
        col: move.fromCol,
      };
    }
  }

  // 更新王车易位状态
  if (piece.kind === "k") {
    if (piece.side === WHITE_SIDE) {
      newState.whiteKingMoved = true;
    } else {
      newState.blackKingMoved = true;
    }
  } else if (piece.kind === "r") {
    const row = move.fromRow;
    const col = move.fromCol;

    if (piece.side === WHITE_SIDE && row === 0) {
      if (col === 0) {
        newState.whiteRookLeftMoved = true;
      } else if (col === 7) {
        newState.whiteRookRightMoved = true;
      }
    } else if (piece.side === BLACK_SIDE && row === 7) {
      if (col === 0) {
        newState.blackRookLeftMoved = true;
      } else if (col === 7) {
        newState.blackRookRightMoved = true;
      }
    }
  }

  return newState;
}

export function applyMove(
  board: ChessBoard,
  move: ChessMove,
  side: ChessSide,
  state: ChessGameState,
): { result: ChessMoveResult | null; newState: ChessGameState } {
  if (!isLegalMove(board, move, side, state)) {
    return { result: null, newState: state };
  }

  const piece = board[move.fromRow][move.fromCol];
  if (!piece) {
    return { result: null, newState: state };
  }

  const result = applyMoveUnchecked(board, move);
  const newState = updateGameState(state, move, piece);

  return { result, newState };
}

export function generateLegalMoves(board: ChessBoard, side: ChessSide, state: ChessGameState): ChessMove[] {
  const moves: ChessMove[] = [];

  setCurrentGameState(state);
  for (let row = 0; row < CHESS_ROWS; row += 1) {
    for (let col = 0; col < CHESS_COLS; col += 1) {
      const piece = board[row][col];
      if (!piece || piece.side !== side) {
        continue;
      }

      const pseudo = generatePseudoMovesForPiece(board, row, col, piece);
      for (const move of pseudo) {
        if (isLegalMove(board, move, side, state)) {
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

    // 兵升变奖励
    if (move.toRow === (side === WHITE_SIDE ? 7 : 0)) {
      const promotionValue = move.promotion ? PIECE_VALUES[move.promotion] : PIECE_VALUES["q"];
      score += promotionValue * 5; // 升变奖励非常重要
    }
  }

  // 将军奖励
  if (isInCheck(result.board, oppositeSide(side))) {
    score += 60;
  }

  // 吃王（赢棋）
  if (result.captured?.kind === "k") {
    score += 1_000_000;
  }

  // 王车易位奖励
  if (movingPiece.kind === "k" && Math.abs(move.toCol - move.fromCol) === 2) {
    score += 100; // 易位奖励
  }

  // 吃过路兵奖励
  if (movingPiece.kind === "p" && result.captured && result.captured.kind === "p" &&
      move.toCol !== move.fromCol && !board[move.toRow][move.toCol]) {
    score += 30; // 吃过路兵奖励
  }

  return score;
}

export function generateCandidateMoves(
  board: ChessBoard,
  side: ChessSide,
  state: ChessGameState,
  limit = 24,
): ChessCandidateMove[] {
  const legal = generateLegalMoves(board, side, state);
  const scored = legal.map((move) => ({
    ...move,
    score: evaluateMove(board, move, side),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

export function resolveWinner(board: ChessBoard, sideToMove: ChessSide, state: ChessGameState): ChessSide | "draw" | null {
  const whiteKing = findKing(board, WHITE_SIDE);
  const blackKing = findKing(board, BLACK_SIDE);

  if (!whiteKing) {
    return BLACK_SIDE;
  }
  if (!blackKing) {
    return WHITE_SIDE;
  }

  const legal = generateLegalMoves(board, sideToMove, state);
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
