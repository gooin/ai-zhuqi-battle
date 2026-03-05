import { pieceLabel, WHITE_SIDE } from "./game";
import type { ChessBoard, ChessSide } from "./types";

export const CHESS_CANVAS_SIZE = 720;

const BOARD_PADDING = 40;
const CELL = (CHESS_CANVAS_SIZE - BOARD_PADDING * 2) / 8;

export interface ChessBoardMove {
    fromRow: number;
    fromCol: number;
    toRow: number;
    toCol: number;
    side: ChessSide;
}

// 棋盘坐标转换：a1在左下角
// 数组 row=0 → canvas y=CELL*7 (最下方)
// 数组 row=7 → canvas y=0 (最上方)
function boardX(col: number): number {
    return BOARD_PADDING + col * CELL + CELL / 2;
}

function boardY(row: number): number {
    // 反转row，让a1在底部
    return BOARD_PADDING + (7 - row) * CELL + CELL / 2;
}

function getPieceUnicode(piece: { side: ChessSide; kind: string }): string {
    const whiteMap: Record<string, string> = {
        k: "♚",
        q: "♛",
        r: "♜",
        b: "♝",
        n: "♞",
        p: "♟",
    };
    const blackMap: Record<string, string> = {
        k: "♚",
        q: "♛",
        r: "♜",
        b: "♝",
        n: "♞",
        p: "♟",
    };
    return piece.side === WHITE_SIDE
        ? whiteMap[piece.kind]
        : blackMap[piece.kind];
}

export function drawChessBoard(
    ctx: CanvasRenderingContext2D,
    board: ChessBoard,
    lastMove: ChessBoardMove | null,
): void {
    ctx.clearRect(0, 0, CHESS_CANVAS_SIZE, CHESS_CANVAS_SIZE);

    // 背景
    const grad = ctx.createLinearGradient(
        0,
        0,
        CHESS_CANVAS_SIZE,
        CHESS_CANVAS_SIZE,
    );
    grad.addColorStop(0, "#e8d4b0");
    grad.addColorStop(1, "#d4bc9a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CHESS_CANVAS_SIZE, CHESS_CANVAS_SIZE);

    drawSquares(ctx);
    drawCoordinates(ctx);
    drawPieces(ctx, board);
    if (lastMove) {
        drawMoveMarker(ctx, lastMove);
    }
    drawBorder(ctx);
}

function drawSquares(ctx: CanvasRenderingContext2D): void {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const isLight = (row + col) % 2 === 0;
            ctx.fillStyle = isLight ? "#f0d9b5" : "#b58863";
            ctx.fillRect(
                BOARD_PADDING + col * CELL,
                BOARD_PADDING + row * CELL,
                CELL,
                CELL,
            );
        }
    }
}

function drawCoordinates(ctx: CanvasRenderingContext2D): void {
    ctx.font = '600 14px "Segoe UI", sans-serif';
    ctx.fillStyle = "#5a3a1a";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // 列标 (a-h) - 底部
    for (let col = 0; col < 8; col++) {
        const x = BOARD_PADDING + col * CELL + CELL / 2;
        const y = BOARD_PADDING + 8 * CELL + 18;
        ctx.fillText(String.fromCharCode(97 + col), x, y);
    }

    // 行标 (1-8) - 右侧
    ctx.textAlign = "right";
    for (let row = 0; row < 8; row++) {
        const x = BOARD_PADDING - 12;
        const y = BOARD_PADDING + row * CELL + CELL / 2;
        ctx.fillText(String(8 - row), x, y);
    }
}

function drawBorder(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = "#5a3a1a";
    ctx.lineWidth = 4;
    ctx.strokeRect(
        BOARD_PADDING - 2,
        BOARD_PADDING - 2,
        CELL * 8 + 4,
        CELL * 8 + 4,
    );
}

function drawPieces(ctx: CanvasRenderingContext2D, board: ChessBoard): void {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let row = 0; row < board.length; row++) {
        for (let col = 0; col < board[row].length; col++) {
            const piece = board[row][col];
            if (!piece) {
                continue;
            }

            const x = boardX(col);
            const y = boardY(row);

            ctx.save();
            ctx.font = `700 ${CELL * 0.95}px "Segoe UI Symbol", "Noto Sans Symbols", sans-serif`;

            // 阴影
            ctx.fillStyle = piece.side === WHITE_SIDE ? "#ffffff" : "#1a1a1a";
            ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
            ctx.shadowBlur = 8;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;

            const symbol = getPieceUnicode(piece);
            ctx.fillText(symbol, x, y);

            ctx.restore();
        }
    }
}

function drawMoveMarker(
    ctx: CanvasRenderingContext2D,
    move: ChessBoardMove,
): void {
    const fromX = boardX(move.fromCol);
    const fromY = boardY(move.fromRow);
    const toX = boardX(move.toCol);
    const toY = boardY(move.toRow);

    ctx.strokeStyle = move.side === WHITE_SIDE ? "#4a9eff" : "#ff6b4a";
    ctx.lineWidth = 3;
    ctx.fillStyle =
        move.side === WHITE_SIDE
            ? "rgba(74, 158, 255, 0.25)"
            : "rgba(255, 107, 74, 0.25)";

    // 绘制起点和终点的方块标记
    const markerSize = CELL * 0.85;
    const offset = markerSize / 2;

    for (const [x, y] of [
        [fromX, fromY],
        [toX, toY],
    ] as const) {
        ctx.beginPath();
        ctx.rect(x - offset, y - offset, markerSize, markerSize);
        ctx.fill();
        ctx.stroke();
    }
}
