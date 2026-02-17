/**
 * 回合顺序条（先攻条）- Braveland 式全局排序展示
 * 从 game.currentRound.turns 按 order 展示本 round 行动顺序，高亮当前行动单位
 */

import React, { useMemo } from "react";
import { useCombatManager } from "../../service/CombatManager";
import type { GameTurn } from "../../types/gameTypes";

const statusLabel = (status?: number): string => {
    if (status === 0) return "待";
    if (status === 1) return "中";
    if (status === 2) return "完";
    return "?";
};

const getTurnLabel = (turn: GameTurn): string => {
    if (turn.uid === "boss") {
        if (turn.minionId) return `小怪`;
        return "Boss";
    }
    return `P-${turn.monsterId?.slice(0, 6) ?? ""}`;
};

export const TurnOrderBar: React.FC = () => {
    const { game } = useCombatManager();

    const sortedTurns = useMemo(() => {
        const turns = game?.currentRound?.turns ?? [];
        return [...turns].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }, [game?.currentRound?.turns]);

    if (sortedTurns.length === 0) return null;

    return (
        <div
            style={{
                position: "absolute",
                top: 8,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 10,
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 8px",
                background: "rgba(0,0,0,0.6)",
                borderRadius: 8,
                fontSize: 12,
            }}
        >
            {sortedTurns.map((turn) => {
                const isCurrent = turn.status === 1;
                const isBoss = turn.uid === "boss";
                return (
                    <div
                        key={`${turn.uid}-${turn.monsterId}-${turn.bossId ?? ""}-${turn.minionId ?? ""}-${turn.order ?? 0}`}
                        title={`${getTurnLabel(turn)} (${statusLabel(turn.status)})`}
                        style={{
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: isCurrent ? "rgba(74, 158, 255, 0.8)" : "rgba(255,255,255,0.1)",
                            color: isBoss ? "#ffa07a" : "#e0e0e0",
                            fontWeight: isCurrent ? 600 : 400,
                            border: isCurrent ? "1px solid rgba(255,255,255,0.8)" : "1px solid transparent",
                        }}
                    >
                        {turn.order ?? "?"}. {getTurnLabel(turn)}
                    </div>
                );
            })}
        </div>
    );
};
