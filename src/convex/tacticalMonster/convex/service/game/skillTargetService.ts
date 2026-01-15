/**
 * 技能目标计算服务
 * 负责根据技能范围和类型自动计算目标
 */

import { getSkillConfig, skillExists } from "../../data/skillConfigs";
import { GameBoss, GameMinion, GameMonster } from "../../types/monsterTypes";
import { HexCoord, hexDistance } from "../../utils/hexUtils";
import { CharacterQueryService } from "./characterQueryService";

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

        switch (range.area_type) {
            case "single":
                // 单体目标：需要提供主要目标
                if (primaryTarget) {
                    const distance = range.distance ?? 999;
                    const targetParams = this.characterQueryService.getCharacterParams(primaryTarget.uid, primaryTarget.monsterId);
                    const targetChar = this.characterQueryService.getCharacter(targetParams.monsterId, targetParams.bossId, targetParams.minionId);
                    if (targetChar) {
                        const targetPos: HexCoord = {
                            q: targetChar.q ?? 0,
                            r: targetChar.r ?? 0,
                        };
                        if (hexDistance(casterPos, targetPos) <= distance) {
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
                    if (hexDistance(casterPos, charPos) <= circleRadius) {
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
                    const primaryTargetParams = this.characterQueryService.getCharacterParams(primaryTarget.uid, primaryTarget.monsterId);
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
                        const distToCaster = hexDistance(casterPos, charPos);
                        const distToPrimary = hexDistance(primaryTargetPos, charPos);
                        const distCasterToPrimary = hexDistance(casterPos, primaryTargetPos);

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

        return targets;
    }
}

