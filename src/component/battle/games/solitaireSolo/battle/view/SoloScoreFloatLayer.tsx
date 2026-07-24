/**
 * 棋盘落点加减分飘字（大号，锚定 foundation / tableau / waste / talon）
 */
import React, { useMemo } from "react";
import { CARD_SUITS, type SoloBoardDimension } from "../types/SoloTypes";
import type { SoloScoreFloat } from "../service/GameManager";

function resolveAnchor(
    bd: SoloBoardDimension,
    zoneId?: string
): { x: number; y: number } {
    const cw = bd.cardWidth;
    const ch = bd.cardHeight;
    if (!zoneId) {
        return { x: bd.width * 0.5, y: bd.height * 0.28 };
    }
    if (zoneId === "waste") {
        return {
            x: bd.zones.waste.x + bd.zones.waste.width / 2,
            y: bd.zones.waste.y + ch * 0.45,
        };
    }
    if (zoneId === "talon") {
        return {
            x: bd.zones.talon.x + cw / 2,
            y: bd.zones.talon.y + ch * 0.45,
        };
    }
    if (zoneId.startsWith("foundation-")) {
        const suit = zoneId.slice("foundation-".length);
        const idx = CARD_SUITS.indexOf(suit as (typeof CARD_SUITS)[number]);
        const x =
            idx >= 0 && idx < bd.foundationColX.length
                ? bd.foundationColX[idx]!
                : bd.zones.foundations.x;
        return {
            x: x + cw / 2,
            y: bd.zones.foundations.y + ch * 0.42,
        };
    }
    if (zoneId.startsWith("tableau-")) {
        const col = Number.parseInt(zoneId.split("-")[1] ?? "0", 10);
        const x =
            Number.isInteger(col) && col >= 0 && col < bd.tableauColX.length
                ? bd.tableauColX[col]!
                : bd.zones.tableau.x;
        return {
            x: x + cw / 2,
            y: bd.zones.tableau.y + ch * 0.35,
        };
    }
    return { x: bd.width * 0.5, y: bd.height * 0.28 };
}

export function SoloScoreFloatLayer({
    floats,
    boardDimension,
}: {
    floats: SoloScoreFloat[];
    boardDimension: SoloBoardDimension | null;
}) {
    const items = useMemo(() => {
        if (!boardDimension || floats.length === 0) return [];
        return floats.map((f) => {
            const { x, y } = resolveAnchor(boardDimension, f.anchorZoneId);
            return { ...f, x, y };
        });
    }, [floats, boardDimension]);

    if (!boardDimension || items.length === 0) return null;

    return (
        <div className="solo-score-float-layer" aria-hidden>
            {items.map((f) => (
                <span
                    key={f.id}
                    className={
                        f.delta > 0
                            ? "solo-board-score-float solo-board-score-float--plus"
                            : "solo-board-score-float solo-board-score-float--minus"
                    }
                    style={{ left: f.x, top: f.y }}
                >
                    {f.delta > 0 ? `+${f.delta}` : `${f.delta}`}
                </span>
            ))}
        </div>
    );
}
