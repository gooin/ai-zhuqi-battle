import { BLACK_SIDE, WHITE_SIDE, sideLabel } from "./game";
import type { ChatMessage, ChessConversations, ChessSide } from "./types";

export const CHESS_SYSTEM_PROMPT =
  "你是国际象棋引擎。必须仅输出JSON对象，禁止markdown、禁止额外说明、禁止自然语言前后缀。";

function roleBootstrap(side: ChessSide): ChatMessage {
  const self = sideLabel(side);
  const enemy = sideLabel(side === WHITE_SIDE ? BLACK_SIDE : WHITE_SIDE);
  return {
    role: "user",
    content: [
      `你在本局持续扮演${self}AI，对手是${enemy}。`,
      "这是同一局连续对话，每回合我会追加完整棋局上下文与候选走法。",
      "坐标使用代数记法：a1在左下角（白方车），h8在右上角（黑方车）。",
      "行：1-8（白方在第1行），列：a-h。",
      "严格返回 JSON，可使用代数记法：",
      '{"from":"a1","to":"a3","reason":"一句短理由","thinking":["步骤1","步骤2"]}',
    ].join("\n"),
  };
}

export function createInitialConversationFor(side: ChessSide): ChatMessage[] {
  return [
    {
      role: "system",
      content: CHESS_SYSTEM_PROMPT,
    },
    roleBootstrap(side),
  ];
}

export function createInitialConversations(): ChessConversations {
  return {
    white: createInitialConversationFor(WHITE_SIDE),
    black: createInitialConversationFor(BLACK_SIDE),
  };
}

export function sideToConversationKey(side: ChessSide): "white" | "black" {
  return side === WHITE_SIDE ? "white" : "black";
}
