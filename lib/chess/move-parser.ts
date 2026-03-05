import type { ChessParsedMove, ChessPieceKind } from "./types";

function parseJSON(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeThinking(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((item) => cleanText(item))
      .filter(Boolean)
      .join("；")
      .slice(0, 420);
  }
  return cleanText(value).slice(0, 420);
}

// 解析代数记法，如 "a1" → { row: 0, col: 0 }
function parseAlgebraic(alg: string): { row: number; col: number } | null {
  const s = alg.trim().toLowerCase();
  if (s.length < 2) {
    return null;
  }
  const colChar = s.charCodeAt(0);
  const rowChar = s.charAt(1);
  const col = colChar - 97; // a=0, b=1, ... h=7
  const row = parseInt(rowChar, 10) - 1; // 1=0, ... 8=7
  if (col >= 0 && col < 8 && row >= 0 && row < 8) {
    return { row, col };
  }
  return null;
}

function parseCoordPair(value: unknown): { row: number; col: number } | null {
  if (Array.isArray(value) && value.length >= 2) {
    const row = Number(value[0]);
    const col = Number(value[1]);
    if (Number.isInteger(row) && Number.isInteger(col)) {
      return { row, col };
    }
  }

  if (value && typeof value === "object") {
    const obj = value as { row?: unknown; col?: unknown };
    const row = Number(obj.row);
    const col = Number(obj.col);
    if (Number.isInteger(row) && Number.isInteger(col)) {
      return { row, col };
    }
  }

  if (typeof value === "string") {
    // 尝试代数记法
    const alg = parseAlgebraic(value);
    if (alg) {
      return alg;
    }
    // 尝试逗号分隔
    const match = value.match(/^\s*(\d+)\s*[,，]\s*(\d+)\s*$/);
    if (match) {
      const row = Number(match[1]);
      const col = Number(match[2]);
      if (Number.isInteger(row) && Number.isInteger(col)) {
        return { row, col };
      }
    }
  }

  return null;
}

export function parseChessMoveFromLLMText(rawText: string): ChessParsedMove | null {
  const cleaned = rawText
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "");

  const direct = parseJSON(cleaned);
  const source = direct || parseJSON(cleaned.match(/\{[\s\S]*\}/)?.[0] || "");
  if (!source || typeof source !== "object") {
    return null;
  }

  const payload = source as {
    fromRow?: unknown;
    fromCol?: unknown;
    toRow?: unknown;
    toCol?: unknown;
    from?: unknown;
    to?: unknown;
    reason?: unknown;
    thinking?: unknown;
    promotion?: unknown;
  };

  let fromRow: number | null = null;
  let fromCol: number | null = null;
  let toRow: number | null = null;
  let toCol: number | null = null;
  let promotion: ChessPieceKind | undefined = undefined;

  // 先尝试 fromRow/fromCol/toRow/toCol
  const numericFromRow = Number(payload.fromRow);
  const numericFromCol = Number(payload.fromCol);
  const numericToRow = Number(payload.toRow);
  const numericToCol = Number(payload.toCol);

  if (
    Number.isInteger(numericFromRow) &&
    Number.isInteger(numericFromCol) &&
    Number.isInteger(numericToRow) &&
    Number.isInteger(numericToCol)
  ) {
    fromRow = numericFromRow;
    fromCol = numericFromCol;
    toRow = numericToRow;
    toCol = numericToCol;
  } else {
    // 尝试 from/to 的代数记法或坐标对
    let fromPair: { row: number; col: number } | null = null;
    let toPair: { row: number; col: number } | null = null;

    if (typeof payload.from === "string") {
      fromPair = parseAlgebraic(payload.from);
    }
    if (!fromPair) {
      fromPair = parseCoordPair(payload.from);
    }

    if (typeof payload.to === "string") {
      // 处理包含升变信息的走法，如 a8q
      let toStr = payload.to;
      const promotionMatch = toStr.match(/[qrbn]$/);
      if (promotionMatch) {
        promotion = promotionMatch[0] as ChessPieceKind;
        toStr = toStr.slice(0, -1);
      }
      toPair = parseAlgebraic(toStr);
    }
    if (!toPair) {
      toPair = parseCoordPair(payload.to);
    }

    if (!fromPair || !toPair) {
      return null;
    }

    fromRow = fromPair.row;
    fromCol = fromPair.col;
    toRow = toPair.row;
    toCol = toPair.col;
  }

  // 解析王车易位记法
  if (fromRow === null && typeof payload.from === "string") {
    const fromStr = payload.from.toLowerCase();
    if (fromStr === "o-o" || fromStr === "0-0") {
      // 王翼易位
      fromRow = 0; // 默认白方
      fromCol = 4;
      toRow = 0;
      toCol = 6;
    } else if (fromStr === "o-o-o" || fromStr === "0-0-0") {
      // 后翼易位
      fromRow = 0; // 默认白方
      fromCol = 4;
      toRow = 0;
      toCol = 2;
    }
  }

  if (fromRow === null || fromCol === null || toRow === null || toCol === null) {
    return null;
  }

  // 处理 promotion 参数
  if (payload.promotion) {
    const promoStr = String(payload.promotion).toLowerCase().charAt(0);
    if (["q", "r", "b", "n"].includes(promoStr)) {
      promotion = promoStr as ChessPieceKind;
    }
  }

  return {
    fromRow,
    fromCol,
    toRow,
    toCol,
    promotion,
    reason: cleanText(payload.reason).slice(0, 120),
    thinking: normalizeThinking(payload.thinking),
  };
}
