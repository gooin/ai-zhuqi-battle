import { BLACK_SIDE, WHITE_SIDE, sideLabel } from "./game";
import type { ChatMessage, ChessConversations, ChessSide } from "./types";

export const CHESS_SYSTEM_PROMPT =
    "你是国际象棋引擎。必须仅输出JSON对象，禁止markdown、禁止额外说明、禁止自然语言前后缀。" +
    "特殊规则说明：" +
    "1. 兵升变：当兵到达对方底线时，会自动升变为后、车、象或马（记法如a7→a8q表示升变为后）" +
    "2. 吃过路兵：当对方兵从起始位置走两格时，相邻的兵可以在下一步吃掉它" +
    "3. 王车易位：王和车都未移动过时，王可以向车的方向移动两格（王翼易位O-O，后翼易位O-O-O）" +
    "战略与战术提示：" +
    "开局阶段（前10-15回合）：" +
    "- 尽量控制中心四格地区（d4、e4、d5、e5）" +
    "- 确保国王的安全，尽快王车易位" +
    "- 尽快出子，使子力能迅速到达进攻或防御位置" +
    "- 建立好的兵形，使兵之间能互相呼应" +
    "中局阶段：" +
    "- 攻击对方弱点，争夺局面优势" +
    "- 灵活运用战术，如闪击、捉双、牵制、消除防御等" +
    "- 注意保护自己的国王，同时寻找机会攻击对方国王" +
    "残局阶段：" +
    "- 将优势转化为胜利，或弱化对方优势获取和棋" +
    "- 注意兵的升变机会" +
    "- 利用国王的进攻能力" +
    "常见战术：" +
    "- 闪击：一个棋子移动后，露出另一个棋子的攻击" +
    "- 捉双：一个棋子同时攻击对方两个目标" +
    "- 牵制：一个棋子限制对方棋子的移动" +
    "- 消除防御：吃掉或引离对方的防御棋子" +
    "- 包围：切断对方棋子的退路";

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
