/**
 * 行为树执行器
 * 解析和执行行为树配置
 */

import type { MapModel } from "../../../types/gameTypes";
import { pickBestNeighborTowardMelee } from "../../../utils/aiHexMovement";
import { SeededRandom } from "../../../utils/seededRandom";
import { BossState, Condition, ConditionEvaluator, GameState } from "./conditionEvaluator";
import { TargetCharacter, TargetSelector } from "./targetSelector";

export interface BehaviorTreeNode {
    type: "selector" | "sequence" | "condition" | "action";
    children?: BehaviorTreeNode[];
    condition?: Condition;
    action?: string;
    skillId?: string;
    target?: string;
    targetStrategy?: string;
}

export interface ExecutionContext {
    bossState: BossState;
    gameState: GameState;
    targets: TargetCharacter[];
    bossPosition: { q: number; r: number };
    rng: SeededRandom;
    /** 与 AI 寻路一致：地图障碍/禁区 + 占位 */
    map?: MapModel;
    occupiedCellKeys?: Set<string>;
    canIgnoreObstacles?: boolean;
}

export interface ActionResult {
    action: string;
    skillId?: string;
    target?: TargetCharacter;
    position?: { q: number; r: number };
    success: boolean;
}

export class BehaviorTreeExecutor {
    /**
     * 执行行为树
     */
    static execute(
        tree: BehaviorTreeNode,
        context: ExecutionContext
    ): ActionResult | null {
        if (!tree) {
            return null;
        }

        return this.executeNode(tree, context);
    }

    /**
     * 执行单个节点
     */
    private static executeNode(
        node: BehaviorTreeNode,
        context: ExecutionContext
    ): ActionResult | null {
        switch (node.type) {
            case "selector":
                return this.executeSelector(node, context);

            case "sequence":
                return this.executeSequence(node, context);

            case "condition":
                return this.executeCondition(node, context);

            case "action":
                return this.executeAction(node, context);

            default:
                return null;
        }
    }

    /**
     * 执行Selector节点（||逻辑）
     */
    private static executeSelector(
        node: BehaviorTreeNode,
        context: ExecutionContext
    ): ActionResult | null {
        if (!node.children || node.children.length === 0) {
            return null;
        }

        // 按顺序执行子节点，直到一个成功
        for (const child of node.children) {
            const result = this.executeNode(child, context);
            if (result && result.success) {
                return result;
            }
        }

        return { action: "standby", success: false };
    }

    /**
     * 执行Sequence节点（&&逻辑）
     */
    private static executeSequence(
        node: BehaviorTreeNode,
        context: ExecutionContext
    ): ActionResult | null {
        if (!node.children || node.children.length === 0) {
            return null;
        }

        // 所有子节点必须成功
        for (const child of node.children) {
            const result = this.executeNode(child, context);
            if (!result || !result.success) {
                return { action: "standby", success: false };
            }
        }

        return { action: "sequence_complete", success: true };
    }

    /**
     * 执行Condition节点
     */
    private static executeCondition(
        node: BehaviorTreeNode,
        context: ExecutionContext
    ): ActionResult | null {
        if (!node.condition) {
            return { action: "condition", success: false };
        }

        const result = ConditionEvaluator.evaluateCondition(
            node.condition,
            context.bossState,
            context.gameState,
            context.rng
        );

        return {
            action: "condition",
            success: result,
        };
    }

    /**
     * 执行Action节点
     */
    private static executeAction(
        node: BehaviorTreeNode,
        context: ExecutionContext
    ): ActionResult {
        const action = node.action || "standby";

        switch (action) {
            case "use_skill": {
                const skillId = node.skillId;
                const targetStrategy = node.targetStrategy || "nearest";
                const target = TargetSelector.selectTarget(
                    targetStrategy as any,
                    context.targets,
                    context.bossPosition,
                    context.rng
                );

                return {
                    action: "use_skill",
                    skillId,
                    target: target || undefined,
                    success: !!skillId && !!target,
                };
            }

            case "attack": {
                const targetStrategy = node.targetStrategy || "nearest";
                const target = TargetSelector.selectTarget(
                    targetStrategy as any,
                    context.targets,
                    context.bossPosition,
                    context.rng
                );

                return {
                    action: "attack",
                    target: target || undefined,
                    success: !!target,
                };
            }

            case "move_to": {
                // 移动到指定位置（需要从配置中获取）
                return {
                    action: "move",
                    position: node.target ? JSON.parse(node.target) : undefined,
                    success: !!node.target,
                };
            }

            case "move_to_best_position": {
                const bestPosition = this.calculateBestPosition(context);

                return {
                    action: "move",
                    position: bestPosition ?? undefined,  // 将 null 转换为 undefined
                    success: !!bestPosition,
                };
            }

            case "standby":
            default:
                return {
                    action: "standby",
                    success: true,
                };
        }
    }

    /**
     * 向最近敌人「最短步接敌」方向的下一格（与前端近战自动走位一致）
     */
    private static calculateBestPosition(context: ExecutionContext): { q: number; r: number } | null {
        const { targets, bossPosition, map, occupiedCellKeys, canIgnoreObstacles } = context;
        if (!targets || targets.length === 0) {
            return null;
        }

        const nearest = TargetSelector.selectTarget("nearest", targets, bossPosition);

        if (!nearest) {
            return null;
        }

        const cols = map?.cols ?? 20;
        const rows = map?.rows ?? 20;

        return pickBestNeighborTowardMelee({
            from: bossPosition,
            target: { q: nearest.q, r: nearest.r },
            cols,
            rows,
            map: map ?? undefined,
            occupiedCellKeys: occupiedCellKeys ?? new Set<string>(),
            actorFrom: bossPosition,
            canIgnoreObstacles: canIgnoreObstacles ?? false,
        });
    }
}

