/**
 * 目标选择器
 * 根据策略选择攻击目标
 */

import { SeededRandom } from "../../../utils/seededRandom";
import { HexCoord, hexDistance } from "../../../utils/hexUtils";

export interface TargetCharacter {
    uid: string;
    character_id: string;
    q: number;
    r: number;
    currentHp: number;
    maxHp: number;
    totalDamage?: number;  // 造成的总伤害
    threatValue?: number;  // 威胁值
}

export type TargetStrategy = 
    | "nearest" 
    | "lowest_hp" 
    | "highest_damage" 
    | "highest_threat" 
    | "furthest" 
    | "random";

export class TargetSelector {
    /**
     * 根据策略选择目标
     */
    static selectTarget(
        strategy: TargetStrategy,
        targets: TargetCharacter[],
        bossPosition: HexCoord,
        rng?: SeededRandom
    ): TargetCharacter | null {
        if (!targets || targets.length === 0) {
            return null;
        }

        // 过滤掉已死亡的敌人
        const aliveTargets = targets.filter(t => t.currentHp > 0);

        if (aliveTargets.length === 0) {
            return null;
        }

        switch (strategy) {
            case "nearest":
                return this.selectNearest(aliveTargets, bossPosition);

            case "lowest_hp":
                return this.selectLowestHp(aliveTargets);

            case "highest_damage":
                return this.selectHighestDamage(aliveTargets);

            case "highest_threat":
                return this.selectHighestThreat(aliveTargets, bossPosition);

            case "furthest":
                return this.selectFurthest(aliveTargets, bossPosition);

            case "random":
                if (!rng) {
                    rng = new SeededRandom(`target_${Date.now()}`);
                }
                return rng.choice(aliveTargets);

            default:
                return this.selectNearest(aliveTargets, bossPosition);
        }
    }

    /**
     * 选择最近的敌人
     */
    private static selectNearest(
        targets: TargetCharacter[],
        bossPosition: HexCoord
    ): TargetCharacter {
        return targets.reduce((nearest, target) => {
            if (!nearest) return target;

            const nearestDist = hexDistance(
                { q: nearest.q, r: nearest.r },
                bossPosition
            );
            const targetDist = hexDistance(
                { q: target.q, r: target.r },
                bossPosition
            );

            return targetDist < nearestDist ? target : nearest;
        });
    }

    /**
     * 选择血量最低的敌人
     */
    private static selectLowestHp(targets: TargetCharacter[]): TargetCharacter {
        return targets.reduce((lowest, target) => {
            if (!lowest) return target;
            return target.currentHp < lowest.currentHp ? target : lowest;
        });
    }

    /**
     * 选择造成伤害最高的敌人
     */
    private static selectHighestDamage(
        targets: TargetCharacter[]
    ): TargetCharacter {
        return targets.reduce((highest, target) => {
            if (!highest) return target;

            const highestDamage = highest.totalDamage || 0;
            const targetDamage = target.totalDamage || 0;

            return targetDamage > highestDamage ? target : highest;
        });
    }

    /**
     * 选择威胁值最高的敌人
     */
    private static selectHighestThreat(
        targets: TargetCharacter[],
        bossPosition: HexCoord
    ): TargetCharacter {
        // 计算威胁值
        const targetsWithThreat = targets.map(target => ({
            ...target,
            threatValue: this.calculateThreat(target, bossPosition),
        }));

        return targetsWithThreat.reduce((highest, target) => {
            if (!highest) return target;

            const highestThreat = highest.threatValue || 0;
            const targetThreat = target.threatValue || 0;

            return targetThreat > highestThreat ? target : highest;
        });
    }

    /**
     * 选择最远的敌人
     */
    private static selectFurthest(
        targets: TargetCharacter[],
        bossPosition: HexCoord
    ): TargetCharacter {
        return targets.reduce((furthest, target) => {
            if (!furthest) return target;

            const furthestDist = hexDistance(
                { q: furthest.q, r: furthest.r },
                bossPosition
            );
            const targetDist = hexDistance(
                { q: target.q, r: target.r },
                bossPosition
            );

            return targetDist > furthestDist ? target : furthest;
        });
    }

    /**
     * 计算威胁值
     */
    static calculateThreat(
        character: TargetCharacter,
        bossPosition: HexCoord
    ): number {
        let threat = 0;

        // 伤害输出权重
        threat += (character.totalDamage || 0) * 2;

        // 剩余HP权重（HP越多威胁越大）
        const hpPercentage = character.currentHp / character.maxHp;
        threat += hpPercentage * 50;

        // 距离权重（越近威胁越大）
        const distance = hexDistance(
            { q: character.q, r: character.r },
            bossPosition
        );
        threat += (10 - distance) * 3;

        // 低血量威胁（残血敌人优先击杀）
        if (hpPercentage < 0.3) {
            threat += 30;
        }

        return threat;
    }
}

