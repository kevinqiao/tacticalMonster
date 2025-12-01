/**
 * 阶段管理器
 * 负责Boss阶段的检测和转换
 */

import { BossPhase } from "../../../data/bossConfigs";

export interface PhaseCheckResult {
    shouldTransition: boolean;
    newPhase?: string;
    phaseConfig?: BossPhase;
}

export class PhaseManager {
    /**
     * 检查并获取当前阶段
     */
    static getCurrentPhase(
        currentHp: number,
        maxHp: number,
        phases: BossPhase[],
        currentPhaseName?: string
    ): { phaseName: string; phaseConfig: BossPhase | null } {
        if (!phases || phases.length === 0) {
            return { phaseName: "phase1", phaseConfig: null };
        }

        const hpPercentage = currentHp / maxHp;

        // 按HP阈值从高到低排序
        const sortedPhases = [...phases].sort((a, b) => b.hpThreshold - a.hpThreshold);

        // 找到当前HP对应的阶段
        for (const phase of sortedPhases) {
            if (hpPercentage <= phase.hpThreshold) {
                return {
                    phaseName: phase.phaseName,
                    phaseConfig: phase,
                };
            }
        }

        // 如果HP高于所有阶段阈值，返回第一个阶段
        return {
            phaseName: sortedPhases[sortedPhases.length - 1]?.phaseName || "phase1",
            phaseConfig: sortedPhases[sortedPhases.length - 1] || null,
        };
    }

    /**
     * 检查是否需要阶段转换
     */
    static checkPhaseTransition(
        currentHp: number,
        maxHp: number,
        phases: BossPhase[],
        currentPhaseName?: string
    ): PhaseCheckResult {
        const { phaseName, phaseConfig } = this.getCurrentPhase(
            currentHp,
            maxHp,
            phases,
            currentPhaseName
        );

        if (currentPhaseName && currentPhaseName === phaseName) {
            return { shouldTransition: false };
        }

        return {
            shouldTransition: true,
            newPhase: phaseName,
            phaseConfig: phaseConfig || undefined,
        };
    }
}

