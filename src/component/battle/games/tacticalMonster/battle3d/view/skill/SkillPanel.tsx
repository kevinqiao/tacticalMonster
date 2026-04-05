/**
 * 技能面板 - 显示当前角色的主动技能，支持选择技能并执行
 * 使用本地乐观状态：点击技能后立即显示选中与「使用」按钮，不等待后端 skillSelect 推送
 */

import React, { useEffect, useMemo, useState } from "react";
import { MONSTER_CONFIGS_MAP } from "../../../config/monsterConfigs";
import { SKILL_CONFIGS } from "../../../config/skillConfigs";
import { getStageRuleConfig } from "../../../config/stageRuleConfigs";
import { useCombatManager } from "../../../service/CombatManager";
import type { MonsterSprite } from "../../../types/CombatTypes";
import type { MonsterSkill } from "../../../types/skillTypes";
import type { PedagogyGuideNotifyEvent } from "../../../utils/pedagogyGuideFlow";
import { filterSkillIdsForPedagogy } from "../../../utils/pedagogySkillFilter";
import {
    hasAttackableTargetsForSkill,
    isSkillCarriedByCharacter,
    isSkillLevelLocked,
    skillEffectsNeedBoardTarget,
} from "../../../utils/skillPanelAvailability";
import { canPerformAction } from "../../../utils/validationUtils";

export const SkillPanel: React.FC<{
    selectSkill: (skill: MonsterSkill) => void | Promise<void>;
    useSkill: (skillId: string, target?: MonsterSprite) => Promise<void>;
    surrender: () => void;
    defend: () => void;
    clearGrid: () => void;
    onPedagogyNotify?: (event: PedagogyGuideNotifyEvent) => void;
    disableDefend?: boolean;
    /** 首关引导：移动步未完成前禁止点技能栏（与格子半强制一致） */
    tutorialLockSkillPanel?: boolean;
    onTutorialSkillPanelBlocked?: () => void;
    onTutorialNudge?: (message: string) => void;
    /** 首关引导：高亮目标技能（如 basic_attack） */
    tutorialHighlightSkillId?: string | null;
    tutorialHintText?: string;
}> = ({
    selectSkill,
    useSkill,
    surrender,
    defend,
    clearGrid,
    onPedagogyNotify,
    disableDefend,
    tutorialLockSkillPanel,
    onTutorialSkillPanelBlocked,
    onTutorialNudge,
    tutorialHighlightSkillId,
    tutorialHintText,
}) => {
    const { game, mode, characters, groundCells } = useCombatManager();
    const validation = canPerformAction(mode ?? "play", game, characters);
    const { can, currentTurn, character } = validation;

    const [localSelectedSkillId, setLocalSelectedSkillId] = useState<string | null>(null);
    const turnKey = `${currentTurn?.uid ?? ""}-${currentTurn?.character_id ?? ""}-${game?.currentRound?.no ?? 0}`;

    useEffect(() => {
        setLocalSelectedSkillId(null);
    }, [turnKey]);
    useEffect(() => {
        // 引导步切换时清掉旧选择，避免第1步残留 selection 干扰第2步理解
        setLocalSelectedSkillId(null);
    }, [tutorialLockSkillPanel, tutorialHighlightSkillId]);

    const selectedSkillId = localSelectedSkillId ?? currentTurn?.skillSelect ?? null;
    const selectedSkill = selectedSkillId ? SKILL_CONFIGS[selectedSkillId] : null;
    const isNoTargetSkill =
        selectedSkill?.effects?.some(
            (e: any) => e.type === "summon" && e.summonConfig?.position_mode === "caster_adjacent"
        ) ?? false;

    const rawSkillIds =
        character?.skills?.length
            ? character.skills
            : (character as any)?.unlockSkills?.length
                ? (character as any).unlockSkills
                : (character as any)?.monsterId
                    ? (MONSTER_CONFIGS_MAP[(character as any).monsterId]?.skillIds ?? ["basic_attack"])
                    : ["basic_attack"];
    const ruleKey = (game as { ruleId?: string; stageId?: string })?.ruleId ?? game?.stageId;
    const skillIds = filterSkillIdsForPedagogy(ruleKey, Array.isArray(rawSkillIds) ? rawSkillIds : ["basic_attack"]);
    const activeSkills = (Array.isArray(skillIds) ? skillIds : [])
        .map((id: string) => ({ id, skill: SKILL_CONFIGS[id] }))
        .filter(({ skill }: { skill: any }) => skill && (skill.type === "active" || skill.type === "master" || skill.type === "ultimate"));

    const mp = (character as any)?.stats?.mp?.current ?? 100;
    const energy = (character as any)?.stats?.energy?.current ?? 0;
    const energyMax = (character as any)?.stats?.energy?.max ?? 100;
    const cooldowns = (character as any)?.skillCooldowns ?? {};
    const charLevel = (character as { level?: number })?.level ?? 1;
    /** 与后端 SkillManager.checkSkillAvailability 一致：unlockSkills 显式授予的技能跳过等级门槛 */
    const unlockSkillIds = new Set((character as { unlockSkills?: string[] })?.unlockSkills ?? []);
    const pedagogyAllowedSkillIds = useMemo(() => {
        const key = (game as { ruleId?: string; stageId?: string })?.ruleId ?? game?.stageId;
        return key ? getStageRuleConfig(key)?.pedagogy?.allowedSkillIds : undefined;
    }, [game?.ruleId, game?.stageId]);
    const remainingMoveSteps = useMemo(() => {
        const mr = character?.move_range ?? 3;
        const used = currentTurn?.stepsUsed ?? 0;
        return Math.max(0, mr - used);
    }, [character?.move_range, currentTurn?.stepsUsed]);
    const isLevelLockedForSkill = (skillId: string, requiredLevel: number | undefined) =>
        isSkillLevelLocked(skillId, requiredLevel, charLevel, unlockSkillIds, pedagogyAllowedSkillIds);

    if (mode === "watch" || mode === "replay") {
        return (
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 4 }}>
                <div className="action-panel-item" onClick={() => surrender()}>GAME OVER</div>
            </div>
        );
    }
    if (!can) {
        return (
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 4, fontSize: 12, color: "rgba(255,255,255,0.8)" }}>
                <span>{validation.reason ?? "等待回合..."}</span>
                <div className="action-panel-item" onClick={() => surrender()}>GAME OVER</div>
            </div>
        );
    }

    const handleSkillClick = async (skill: any, isTutorialTarget: boolean) => {
        if (tutorialLockSkillPanel) {
            onTutorialSkillPanelBlocked?.();
            return;
        }
        if (tutorialHighlightSkillId && !isTutorialTarget) {
            const targetName = SKILL_CONFIGS[tutorialHighlightSkillId]?.name ?? tutorialHighlightSkillId;
            onTutorialNudge?.(`当前推荐先选择「${targetName}」`);
        }
        setLocalSelectedSkillId(skill.id);
        await Promise.resolve(selectSkill(skill));
        onPedagogyNotify?.({ type: "skillSelect", skillId: skill.id });
    };

    const handleUseNoTarget = () => {
        if (tutorialLockSkillPanel) {
            onTutorialSkillPanelBlocked?.();
            return;
        }
        if (!selectedSkillId || !isNoTargetSkill) return;
        const cooldown = cooldowns[selectedSkillId] ?? 0;
        const mpCost = selectedSkill?.resource_cost?.mp ?? 0;
        const reqLevel = selectedSkill?.unlockConditions?.level;
        const levelLocked = isLevelLockedForSkill(selectedSkillId, reqLevel);
        if (levelLocked || cooldown > 0 || mp < mpCost) return; // 等级/冷却/MP 不足时不再发起请求
        setLocalSelectedSkillId(null);
        clearGrid();
        useSkill(selectedSkillId)
            .then(() => {
                onPedagogyNotify?.({ type: "cast", skillId: selectedSkillId });
            })
            .catch((err: any) => console.error("[SkillPanel] useSkill error:", err));
    };

    return (
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center", gap: 4 }}>
            {energyMax > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginRight: 4 }}>
                    <span style={{ fontSize: 11 }}>能量</span>
                    <div style={{ width: 60, height: 8, background: "#333", borderRadius: 4, overflow: "hidden" }}>
                        <div
                            style={{
                                width: `${Math.min(100, (energy / energyMax) * 100)}%`,
                                height: "100%",
                                background: "linear-gradient(90deg, #ffd700, #ff8c00)",
                                transition: "width 0.2s",
                            }}
                        />
                    </div>
                    <span style={{ fontSize: 10 }}>{energy}/{energyMax}</span>
                </div>
            )}
            {activeSkills.map(({ id, skill }: { id: string; skill: any }) => {
                const cooldown = cooldowns[id] ?? 0;
                const mpCost = skill.resource_cost?.mp ?? 0;
                const energyCost = skill.resource_cost?.energy ?? 0;
                const requiredLevel = skill.unlockConditions?.level;
                const notCarried =
                    character && !isSkillCarriedByCharacter(character, id, ruleKey ?? undefined);
                const levelLocked = isLevelLockedForSkill(id, requiredLevel);
                const needsBoardTarget = skillEffectsNeedBoardTarget(skill);
                const noTargets =
                    !!character &&
                    needsBoardTarget &&
                    !notCarried &&
                    !levelLocked &&
                    (!groundCells?.length ||
                        !hasAttackableTargetsForSkill(
                            groundCells ?? null,
                            characters ?? [],
                            character,
                            skill as MonsterSkill,
                            remainingMoveSteps
                        ));
                const disabled =
                    notCarried ||
                    levelLocked ||
                    noTargets ||
                    cooldown > 0 ||
                    (mpCost > 0 && mp < mpCost) ||
                    (energyCost > 0 && energy < energyCost);
                const isSelected = selectedSkillId === id;
                const isTutorialTarget = !!tutorialHighlightSkillId && tutorialHighlightSkillId === id;
                const isTutorialSecondary = !!tutorialHighlightSkillId && !isTutorialTarget;
                const titleParts = [skill.name];
                if (tutorialLockSkillPanel) titleParts.unshift("请先移动到蓝色格子");
                if (isTutorialTarget && tutorialHintText) titleParts.unshift(tutorialHintText);
                if (isTutorialSecondary) {
                    const targetName = SKILL_CONFIGS[tutorialHighlightSkillId!]?.name ?? tutorialHighlightSkillId!;
                    titleParts.unshift(`建议优先选择：${targetName}`);
                }
                if (notCarried) titleParts.push("未携带该技能");
                if (levelLocked) titleParts.push(`需要等级 ${requiredLevel}`);
                if (noTargets) titleParts.push("当前站位无可选目标");
                if (cooldown > 0) titleParts.push(`(冷却${cooldown})`);
                if (energyCost > 0) titleParts.push(`消耗能量${energyCost}`);
                return (
                    <div
                        key={id}
                        className={`action-panel-item ${isSelected ? "action-panel-item--selected" : ""}`}
                        style={{
                            opacity: disabled || tutorialLockSkillPanel ? 0.55 : isTutorialSecondary ? 0.42 : 1,
                            pointerEvents: disabled || tutorialLockSkillPanel ? "none" : "auto",
                            border: isSelected ? "2px solid #fff" : undefined,
                            boxShadow: isTutorialTarget ? "0 0 0 2px rgba(255,214,10,0.95), 0 0 14px rgba(255,214,10,0.9)" : undefined,
                            background: isTutorialTarget
                                ? "linear-gradient(135deg, rgba(255,193,7,0.85), rgba(255,87,34,0.85))"
                                : undefined,
                            fontWeight: isTutorialTarget ? 700 : undefined,
                        }}
                        onClick={() => !disabled && handleSkillClick(skill, isTutorialTarget)}
                        title={titleParts.join(" ")}
                    >
                        {skill.name}
                        {cooldown > 0 && <span style={{ fontSize: 10, marginLeft: 2 }}>CD{cooldown}</span>}
                        {isTutorialTarget && (
                            <span style={{ fontSize: 10, marginLeft: 4, color: "#ffe082" }}>推荐</span>
                        )}
                    </div>
                );
            })}
            {!!tutorialHintText && !!tutorialHighlightSkillId && !tutorialLockSkillPanel && (
                <div
                    style={{
                        flexBasis: "100%",
                        textAlign: "right",
                        fontSize: 11,
                        color: "rgba(255,230,140,0.98)",
                        textShadow: "0 1px 2px rgba(0,0,0,0.55)",
                    }}
                >
                    {tutorialHintText}
                </div>
            )}
            {isNoTargetSkill && (() => {
                const cd = cooldowns[selectedSkillId ?? ""] ?? 0;
                const cost = selectedSkill?.resource_cost?.mp ?? 0;
                const reqLvl = selectedSkill?.unlockConditions?.level;
                const lvlLocked =
                    selectedSkillId != null ? isLevelLockedForSkill(selectedSkillId, reqLvl) : reqLvl != null && charLevel < reqLvl;
                const useDisabled = lvlLocked || cd > 0 || mp < cost || !!tutorialLockSkillPanel;
                return (
                    <div
                        className="action-panel-item"
                        style={{
                            backgroundColor: "rgb(34, 139, 34)",
                            border: "2px solid #fff",
                            opacity: useDisabled ? 0.6 : 1,
                            pointerEvents: useDisabled && !tutorialLockSkillPanel ? "none" : "auto",
                        }}
                        onClick={handleUseNoTarget}
                        title={
                            tutorialLockSkillPanel
                                ? "请先移动到蓝色格子"
                                : useDisabled
                                    ? lvlLocked
                                        ? `需要等级 ${reqLvl}`
                                        : cd > 0
                                            ? `技能冷却中，剩余 ${cd} 回合`
                                            : "MP 不足"
                                    : "使用"
                        }
                    >
                        使用
                    </div>
                );
            })()}
            <div
                className="action-panel-item"
                onClick={() => {
                    if (disableDefend) return;
                    clearGrid();
                    defend();
                }}
                style={{
                    backgroundColor: "rgb(70, 130, 180)",
                    opacity: disableDefend ? 0.55 : 1,
                    pointerEvents: disableDefend ? "none" : "auto",
                }}
                title="防守"
            >
                防守
            </div>
            <div className="action-panel-item" onClick={surrender}>
                GAME OVER
            </div>
        </div >
    );
};
