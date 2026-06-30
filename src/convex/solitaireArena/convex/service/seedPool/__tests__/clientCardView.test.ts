import { describe, expect, it } from "vitest";

import { toClientCard, toClientCardPatches, toClientRevealCard } from "../../clientCardView";
import { ZoneType } from "../../../types/SoloTypes";

describe("clientCardView", () => {
    it("redacts hidden cards", () => {
        const hidden = toClientCard({
            id: "c1",
            suit: "hearts",
            rank: "A",
            value: 1,
            isRed: true,
            isRevealed: false,
            zone: ZoneType.TABLEAU,
            zoneId: "tableau-0",
            zoneIndex: 2,
        });
        expect(hidden).toEqual({
            id: "c1",
            isRevealed: false,
            zone: ZoneType.TABLEAU,
            zoneId: "tableau-0",
            zoneIndex: 2,
        });
        expect(hidden.rank).toBeUndefined();
        expect(hidden.suit).toBeUndefined();
    });

    it("passes through revealed cards", () => {
        const revealed = toClientRevealCard({
            id: "c2",
            suit: "spades",
            rank: "K",
            value: 13,
            isRed: false,
            isRevealed: true,
            zone: ZoneType.TABLEAU,
            zoneId: "tableau-1",
            zoneIndex: 0,
        });
        expect(revealed.rank).toBe("K");
        expect(revealed.suit).toBe("spades");
    });

    it("patches flip payloads with identity", () => {
        const [flip] = toClientCardPatches([
            {
                id: "c3",
                suit: "clubs",
                rank: "7",
                value: 7,
                isRed: false,
                isRevealed: true,
                zone: ZoneType.TABLEAU,
                zoneId: "tableau-2",
                zoneIndex: 4,
            },
        ]);
        expect(flip.rank).toBe("7");
        expect(flip.isRevealed).toBe(true);
    });
});
