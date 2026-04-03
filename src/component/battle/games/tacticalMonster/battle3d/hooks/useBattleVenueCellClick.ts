import { useCallback } from "react";
import { useCombatManager } from "../../service/CombatManager";
import type { MonsterSprite } from "../../types/CombatTypes";
import type { PedagogyGuideNotifyEvent } from "../../utils/pedagogyGuideFlow";
import { resolveAttackProfile } from "../../utils/skillRangeUtils";
import { canPerformAction } from "../../utils/validationUtils";
import type { UseBattleGridStateReturn } from "../handler/useBattleGridState";

export function useBattleVenueCellClick({
    gridState,
    walk,
    attack,
    useSkill,
    notifyPedagogyGuide,
    enforceMoveStep,
    enforceCastStep,
    enforceSkillSelectStepBoss2,
    handleSkillErrorToast,
}: {
    gridState: UseBattleGridStateReturn | null;
    walk: (pos: { q: number; r: number }) => Promise<unknown>;
    attack: (enemy: MonsterSprite) => Promise<unknown>;
    useSkill: (skillId: string, target?: MonsterSprite) => Promise<unknown>;
    notifyPedagogyGuide: (event: PedagogyGuideNotifyEvent) => void;
    enforceMoveStep: boolean;
    enforceCastStep: boolean;
    enforceSkillSelectStepBoss2: boolean;
    handleSkillErrorToast: (message: string) => void;
}) {
    const { mapDimension, mode, game, characters } = useCombatManager();
    const handleCellClick = useCallback(
        (logicQ: number, logicR: number) => {
            if (!gridState || !mapDimension || mode !== "play") return;
            const effectiveGame = game;
            const validation = canPerformAction(mode, effectiveGame, characters);
            if (!validation.can || !validation.character) {
                gridState.clearAll();
                return;
            }
            const cellState = gridState.getCellState(logicQ, logicR);
            if (cellState === "walkable") {
                if (enforceCastStep) {
                    handleSkillErrorToast("先完成攻击步骤，再移动");
                    return;
                }
                gridState.clearAll();
                walk({ q: logicQ, r: logicR })
                    .then(() => {
                        notifyPedagogyGuide({ type: "move" });
                    })
                    .catch((err: unknown) => {
                        const message = String((err as { message?: string })?.message ?? err ?? "");
                        const expectedDuringTransition =
                            message.includes("Walk action in progress") ||
                            message.includes("no active turn") ||
                            message.includes("turn changed before request") ||
                            message.includes("不是当前回合");
                        if (!expectedDuringTransition) {
                            console.error("[handleCellClick] walk error:", err);
                        }
                    });
            } else if (cellState === "attackable") {
                if (enforceMoveStep) {
                    handleSkillErrorToast("先移动到蓝色高亮格子");
                    return;
                }
                const enemy = characters?.find((c) => c.q === logicQ && c.r === logicR);
                if (enemy) {
                    const selectedSkillId = effectiveGame?.currentRound?.turns?.find((t: { status?: number }) => t.status === 1)
                        ?.skillSelect;
                    if (enforceSkillSelectStepBoss2 && !selectedSkillId) {
                        handleSkillErrorToast("先在技能栏选择技能，再点击目标");
                        return;
                    }
                    const attacker = validation.character;
                    const attackSkillId = resolveAttackProfile(attacker as MonsterSprite).skillId;
                    if (selectedSkillId) {
                        gridState.clearAll();
                        useSkill(selectedSkillId, enemy)
                            .then(() => {
                                notifyPedagogyGuide({ type: "cast", skillId: selectedSkillId });
                            })
                            .catch((err: unknown) => console.error("[handleCellClick] useSkill error:", err));
                    } else {
                        attack(enemy)
                            .then(() => {
                                notifyPedagogyGuide({ type: "cast", skillId: attackSkillId });
                            })
                            .catch((err: unknown) => console.error("[handleCellClick] attack error:", err));
                    }
                }
            }
        },
        [
            mapDimension,
            mode,
            gridState,
            walk,
            attack,
            useSkill,
            characters,
            game,
            notifyPedagogyGuide,
            enforceMoveStep,
            enforceCastStep,
            enforceSkillSelectStepBoss2,
            handleSkillErrorToast,
        ]
    );

    return { handleCellClick };
}
