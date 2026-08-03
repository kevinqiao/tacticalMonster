/**
 * 技能目标计算服务
 * 负责根据技能范围和类型自动计算目标
 */

import { getSkillConfig, skillExists } from "../../data/skillConfigs";
import type { GameModel } from "../../types/gameTypes";
import { GameBoss, GameMinion, GameMonster } from "../../types/monsterTypes";
import { SkillEffectType } from "../../types/skillTypes";
import {
    getAliveAllies,
    getAliveEnemies,
    getMinStepsBetween,
    getReachableCells,
    isCellBlocked,
} from "../../utils/boardReachability";
import { getOffsetNeighbors, HexCoord, offsetHexDistance } from "../../utils/hexUtils";
import { CharacterQueryService } from "./characterQueryService";

function isSameBattleInstance(a: GameMonster, b: GameMonster): boolean {
    if (a.uid !== b.uid) return false;
    const aid =
        (a as GameMonster & { character_id?: string }).character_id ??
        (a as GameBoss).bossId ??
        (a as GameMinion).minionId ??
        a.monsterId;
    const bid =
        (b as GameMonster & { character_id?: string }).character_id ??
        (b as GameBoss).bossId ??
        (b as GameMinion).minionId ??
        b.monsterId;
    return aid === bid;
}

/** PVE：玩家侧 vs Boss 侧（与 skillRangeUtils.isSameBattleSide 一致） */
function isSameBattleSide(a: GameMonster, b: GameMonster): boolean {
    return (a.uid === "boss" && b.uid === "boss") || (a.uid !== "boss" && b.uid !== "boss");
}

function getTargetCandidatesForSide(
    game: GameModel,
    caster: GameMonster,
    targetSide: "friend" | "foe" | "all"
): GameMonster[] {
    if (targetSide === "foe") return getAliveEnemies(game);
    if (targetSide === "friend") {
        return getAliveAllies(game).filter((m) => isSameBattleSide(m, caster));
    }
    const all = [...getAliveAllies(game), ...getAliveEnemies(game)];
    return all.filter((m) => !isSameBattleInstance(m, caster));
}

/**
 * 选技 / 棋盘可达校验：哪些效果类型意味着必须在战场上有可选目标（含护盾、增益等）。
 * 需与 SkillManager.useSkill 的 needsTarget 保持同类效果覆盖；SUMMON 仍排除（由召唤逻辑单独处理）。
 */
function skillEffectsNeedTarget(skill: NonNullable<ReturnType<typeof getSkillConfig>>): boolean {
    const effects = skill.effects || [];
    return effects.some((effect) => {
        if (effect.type === SkillEffectType.SUMMON) return false;
        return (
            effect.type === SkillEffectType.DAMAGE ||
            effect.type === SkillEffectType.HEAL ||
            effect.type === SkillEffectType.CLEANSE ||
            effect.type === SkillEffectType.DEBUFF ||
            effect.type === SkillEffectType.STUN ||
            effect.type === SkillEffectType.MP_DRAIN ||
            effect.type === SkillEffectType.SHIELD ||
            effect.type === SkillEffectType.BUFF ||
            effect.type === SkillEffectType.HOT ||
            effect.type === SkillEffectType.DOT ||
            effect.type === SkillEffectType.MP_RESTORE
        );
    });
}

/** 与前端 resolveAttackProfile 一致：技能未配置 distance 时用施法者 attack_range.max */
function getEffectiveSkillMaxDistance(
    skill: NonNullable<ReturnType<typeof getSkillConfig>>,
    caster: GameMonster
): number {
    const range = skill.range;
    if (!range) return 1;
    return (
        range.distance ??
        range.max_distance ??
        (caster as GameMonster & { attack_range?: { min?: number; max?: number } }).attack_range?.max ??
        1
    );
}

export class SkillTargetService {
    constructor(
        private characterQueryService: CharacterQueryService
    ) {}

    /**
     * 根据技能范围和类型自动计算目标
     * @param caster 施法者
     * @param skillId 技能ID
     * @param primaryTarget 主要目标（可选，用于 single 和 line 类型）
     * @returns 目标角色数组
     */
    calculateTargetsBySkillRange(
        caster: GameMonster,
        skillId: string,
        primaryTarget?: { uid: string; monsterId: string }
    ): Array<{ uid: string; monsterId: string }> {
        // 通过 characterQueryService 获取游戏状态
        // 注意：需要确保 characterQueryService 已经设置了 game
        if (!this.characterQueryService) return [];

        // 获取技能配置
        if (!skillExists(skillId)) {
            return primaryTarget ? [primaryTarget] : [];
        }

        const skill = getSkillConfig(skillId);
        if (!skill || !skill.range) {
            // 如果没有范围配置，返回主要目标或空数组
            return primaryTarget ? [primaryTarget] : [];
        }

        const range = skill.range;
        const casterPos: HexCoord = {
            q: caster.q ?? 0,
            r: caster.r ?? 0,
        };

        // 获取所有可攻击的角色
        const allCharacters = this.characterQueryService.getAllCharacters();
        const targets: Array<{ uid: string; monsterId: string }> = [];

        // 辅助函数：获取角色的标识符（用于targets数组）
        const getCharacterIdentifier = (char: GameMonster): string => {
            if (char.uid === "boss") {
                // Boss主体：返回bossId
                if ((char as GameBoss).bossId) {
                    return (char as GameBoss).bossId;
                }
                // 小怪：返回minionId
                if ((char as GameMinion).minionId) {
                    return (char as GameMinion).minionId;
                }
            }
            // 玩家角色：返回monsterId
            return char.monsterId;
        };

        // 辅助函数：检查是否是同一个角色
        const isSameCharacter = (char1: GameMonster, char2: GameMonster): boolean => {
            if (char1.uid !== char2.uid) return false;

            if (char1.uid === "boss") {
                // Boss主体：比较bossId
                const char1BossId = (char1 as GameBoss).bossId;
                const char2BossId = (char2 as GameBoss).bossId;
                if (char1BossId && char2BossId) {
                    return char1BossId === char2BossId;
                }
                // 小怪：比较minionId（小怪的monsterId可能重复，必须使用minionId）
                const char1MinionId = (char1 as GameMinion).minionId;
                const char2MinionId = (char2 as GameMinion).minionId;
                if (char1MinionId && char2MinionId) {
                    return char1MinionId === char2MinionId;
                }
                // 如果一个是Boss主体一个是小怪，它们肯定不同
                if ((char1BossId && char2MinionId) || (char1MinionId && char2BossId)) {
                    return false;
                }
                // 向后兼容：如果都没有bossId/minionId，回退到monsterId比较
                return char1.monsterId === char2.monsterId;
            }

            // 玩家角色：比较monsterId（玩家队伍中的monster不会重复）
            return char1.monsterId === char2.monsterId;
        };

        // 辅助函数：检查是否同一方（玩家队伍 vs Boss方）
        const isSameSide = (casterChar: GameMonster, targetChar: GameMonster): boolean =>
            (casterChar.uid === "boss" && targetChar.uid === "boss") ||
            (casterChar.uid !== "boss" && targetChar.uid !== "boss");

        switch (range.area_type) {
            case "single":
                // 单体目标：需要提供主要目标
                if (primaryTarget) {
                    const distance = getEffectiveSkillMaxDistance(skill, caster);
                    const targetId = (primaryTarget as any).character_id ?? primaryTarget.monsterId;
                    const targetParams = this.characterQueryService.getCharacterParams(primaryTarget.uid, targetId);
                    const targetChar = this.characterQueryService.getCharacter(targetParams.monsterId, targetParams.bossId, targetParams.minionId);
                    if (targetChar) {
                        const targetPos: HexCoord = {
                            q: targetChar.q ?? 0,
                            r: targetChar.r ?? 0,
                        };
                        if (offsetHexDistance(casterPos, targetPos) <= distance) {
                            targets.push(primaryTarget);
                        }
                    }
                }
                break;

            case "circle":
                // 圆形范围：以施法者为中心
                const circleRadius = range.max_distance ?? range.distance ?? 1;
                for (const char of allCharacters) {
                    // 排除自己（除非是BUFF技能）
                    if (isSameCharacter(char, caster)) {
                        continue;
                    }

                    const charPos: HexCoord = {
                        q: char.q ?? 0,
                        r: char.r ?? 0,
                    };
                    if (offsetHexDistance(casterPos, charPos) <= circleRadius) {
                        targets.push({
                            uid: char.uid,
                            monsterId: getCharacterIdentifier(char),  // 使用正确的标识符
                        });
                    }
                }
                break;

            case "line":
                // 直线范围：需要提供主要目标来确定方向
                if (primaryTarget) {
                    const lineDistance = range.distance ?? range.max_distance ?? 999;
                    const primaryTargetId = (primaryTarget as any).character_id ?? primaryTarget.monsterId;
                    const primaryTargetParams = this.characterQueryService.getCharacterParams(primaryTarget.uid, primaryTargetId);
                    const primaryTargetChar = this.characterQueryService.getCharacter(primaryTargetParams.monsterId, primaryTargetParams.bossId, primaryTargetParams.minionId);
                    if (!primaryTargetChar) break;

                    const primaryTargetPos: HexCoord = {
                        q: primaryTargetChar.q ?? 0,
                        r: primaryTargetChar.r ?? 0,
                    };

                    // 计算方向向量（简化实现：获取从施法者到主要目标方向上的所有角色）
                    for (const char of allCharacters) {
                        const charPos: HexCoord = {
                            q: char.q ?? 0,
                            r: char.r ?? 0,
                        };

                        // 检查是否在直线上（简化：检查是否在从施法者到主要目标的路径上）
                        const distToCaster = offsetHexDistance(casterPos, charPos);
                        const distToPrimary = offsetHexDistance(primaryTargetPos, charPos);
                        const distCasterToPrimary = offsetHexDistance(casterPos, primaryTargetPos);

                        // 如果角色在从施法者到主要目标的路径上，且在范围内
                        if (distToCaster <= lineDistance && distToCaster + distToPrimary <= distCasterToPrimary + 1) {
                            targets.push({
                                uid: char.uid,
                                monsterId: getCharacterIdentifier(char),  // 使用正确的标识符
                            });
                        }
                    }
                }
                break;

            default:
                // 默认：返回主要目标
                if (primaryTarget) {
                    targets.push(primaryTarget);
                }
                break;
        }

        // 按 target_side 过滤：friend=仅友方，foe=仅敌方，all 或未配置=不过滤
        const targetSide = range.target_side ?? "all";
        if (targetSide !== "all") {
            const filtered: Array<{ uid: string; monsterId: string }> = [];
            for (const t of targets) {
                const targetId = (t as any).character_id ?? t.monsterId;
                const params = this.characterQueryService.getCharacterParams(t.uid, targetId);
                const targetChar = this.characterQueryService.getCharacter(params.monsterId, params.bossId, params.minionId);
                if (targetChar && (targetSide === "friend" ? isSameSide(caster, targetChar) : !isSameSide(caster, targetChar))) {
                    filtered.push(t);
                }
            }
            return filtered;
        }

        return targets;
    }

    /**
     * 当前棋盘下是否存在「剩余步数内可站位的某一格 + 技能距离」能命中的合法目标（与前端选技能高亮一致）。
     * 用于 selectSkill：避免 basic_attack 等单体在无目标时仍写入 skillSelect。
     */
    hasSelectableTargetForSkill(
        game: GameModel,
        caster: GameMonster,
        skillId: string,
        remainingMoveSteps: number
    ): boolean {
        this.characterQueryService.setGame(game);
        if (!skillExists(skillId)) return false;
        const skill = getSkillConfig(skillId);
        if (!skill?.range) return true;
        if (!skillEffectsNeedTarget(skill)) return true;

        const range = skill.range;
        const targetSide = (range.target_side ?? "foe") as "friend" | "foe" | "all";

        const candidates = getTargetCandidatesForSide(game, caster, targetSide);
        if (candidates.length === 0) return false;

        const startQ = caster.q ?? 0;
        const startR = caster.r ?? 0;
        const casterPos = { q: startQ, r: startR };
        const canFly = caster.isFlying ?? caster.canIgnoreObstacles ?? false;
        const passOpts = { ignoreTerrainObstacles: !!canFly };

        const standPositions: { q: number; r: number }[] = [{ q: startQ, r: startR }];
        const reachable = getReachableCells(
            game,
            casterPos,
            remainingMoveSteps,
            caster,
            passOpts
        );
        for (const cell of reachable) {
            standPositions.push({ q: cell.q, r: cell.r });
        }

        const areaType = range.area_type ?? "single";
        const maxDist = getEffectiveSkillMaxDistance(skill, caster);

        if (areaType === "circle") {
            const radius = range.max_distance ?? range.distance ?? maxDist;
            for (const pos of standPositions) {
                for (const t of candidates) {
                    const d = offsetHexDistance(pos, { q: t.q ?? 0, r: t.r ?? 0 });
                    if (d <= radius) return true;
                }
            }
            return false;
        }

        if (areaType === "line") {
            for (const pos of standPositions) {
                const casterAt = { ...caster, q: pos.q, r: pos.r } as GameMonster;
                for (const primary of candidates) {
                    const primaryId =
                        primary.uid === "boss"
                            ? (primary as GameBoss).bossId ??
                              (primary as GameMinion).minionId ??
                              primary.monsterId
                            : (primary as GameMonster & { character_id?: string }).character_id ??
                              primary.monsterId;
                    const list = this.calculateTargetsBySkillRange(casterAt, skillId, {
                        uid: primary.uid,
                        monsterId: primaryId,
                    });
                    if (list.length > 0) return true;
                }
            }
            return false;
        }

        // single / default：与 PathFind.getAttackableNodes 一致
        // - 近战 maxDist===1：可移动后再攻；敌方邻格须可站立且本回合内可走达；飞行可越地形障碍
        // - 远程 maxDist>1：仅当前站位判距（不预览走后再打）
        if (maxDist === 1) {
            const { cols, rows } = game.map;
            for (const enemy of candidates) {
                const enemyPos = { q: enemy.q ?? 0, r: enemy.r ?? 0 };
                if (offsetHexDistance(casterPos, enemyPos) <= 1) {
                    return true;
                }
                const neighbors = getOffsetNeighbors(enemyPos, cols, rows);
                for (const n of neighbors) {
                    if (isCellBlocked(game, n, caster, passOpts)) continue;
                    const steps = getMinStepsBetween(game, casterPos, n, caster, remainingMoveSteps, passOpts);
                    if (steps <= remainingMoveSteps) return true;
                }
            }
            return false;
        }

        for (const t of candidates) {
            if (offsetHexDistance(casterPos, { q: t.q ?? 0, r: t.r ?? 0 }) <= maxDist) return true;
        }
        return false;
    }
}

