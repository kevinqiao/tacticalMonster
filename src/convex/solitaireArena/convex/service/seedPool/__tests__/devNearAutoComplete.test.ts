import { describe, expect, it } from "vitest";
import { createZones, SoloGameEngine } from "../../SoloGameEngine";
import { SoloRuleManager } from "../../SoloRuleManager";
import { GameInteractionPhase, SoloGameStatus } from "../../../types/SoloTypes";

describe("dev near auto-complete layout", () => {
    it("greedy foundation moves clear the board", () => {
        const game = SoloGameEngine.createGame("dev-test");
        // createGame 已是完整 52 张（含 suit/rank）；deal() 只返回 tableau patch
        const layout = SoloGameEngine.buildDevNearAutoCompleteLayout(game.cards);
        expect(layout).not.toBeNull();
        expect(layout!.length).toBe(52);

        const state = {
            ...game,
            cards: layout!,
            zones: createZones(),
            status: SoloGameStatus.PLAYING,
            gameId: "test",
        };
        expect(SoloGameEngine.canAutoCompleteWithFoundationOnly(state)).toBe(true);

        const sim = { ...state, cards: state.cards.map((c) => ({ ...c })) };
        for (let i = 0; i < 20; i++) {
            const next = SoloGameEngine.findNextFoundationMove(sim);
            if (!next) break;
            const res = SoloGameEngine.moveCard(sim, next.card, next.toZoneId);
            expect(res.ok).toBe(true);
        }
        expect(new SoloRuleManager(sim, GameInteractionPhase.idle).isGameWon()).toBe(true);
    });
});
