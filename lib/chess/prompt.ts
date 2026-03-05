import { boardToMatrixText, sideLabel, toAlgebraic } from "./game";
import type { BuildChessPromptParams } from "./types";

function formatMove(
    rowA: number,
    colA: number,
    rowB: number,
    colB: number,
): string {
    return `${toAlgebraic(rowA, colA)}→${toAlgebraic(rowB, colB)}`;
}

export function buildChessMovePrompt(params: BuildChessPromptParams): string {
    const { board, side, moveHistory, candidates } = params;
    const last = moveHistory[moveHistory.length - 1];
    const lastText = last
        ? `第${last.turn}手 ${sideLabel(last.side)} ${formatMove(
              last.fromRow,
              last.fromCol,
              last.toRow,
              last.toCol,
          )}`
        : "无";

    const candidateText = candidates.length
        ? candidates
              .slice(0, 18)
              .map((move) => {
                  let moveStr = formatMove(
                      move.fromRow,
                      move.fromCol,
                      move.toRow,
                      move.toCol,
                  );
                  if (move.promotion) {
                      const promotionChar = { q: "q", r: "r", b: "b", n: "n" };
                      moveStr +=
                          promotionChar[
                              move.promotion as "q" | "r" | "b" | "n"
                          ];
                  }
                  return `${moveStr} score=${Math.round(move.score)}`;
              })
              .join(" ")
        : "无可用合法走法";

    return [
        `回合更新：当前你执${sideLabel(side)}，第 ${moveHistory.length + 1} 手。`,
        "请只从候选走法中选择一手（除非候选为空）。",
        `上一手：${lastText}`,
        "棋盘矩阵（--为空；wk/wq/...是白方；bk/bq/...是黑方）：",
        "行号 8-1，列号 a-h，a1 在左下角：",
        boardToMatrixText(board),
        `候选走法：${candidateText}`,
        '只返回JSON，from/to使用代数记法如"a1"，或使用fromRow/fromCol/toRow/toCol：',
        '{"from":"a1","to":"a3","reason":"一句短理由","thinking":["步骤1","步骤2"]}',
    ].join("\n");
}
