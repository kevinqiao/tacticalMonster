/**
 * Tactical Monster AI 控制器
 * 实现 AI 控制逻辑（自动执行攻击、移动等）
 */

import {
    AttackableNode,
    CombatRound,
    GameCharacter,
    GameModel,
    GridCell
} from "../types/CombatTypes";
import { getAttackableNodes, getWalkableNodes } from "../utils/PathFind";

export class AIController {
    private gameState: GameModel;
    private gridCells: GridCell[][] | null;
    private currentRound: CombatRound | null;
    private playerUid: string;

    constructor(
        gameState: GameModel,
        gridCells: GridCell[][] | null,
        currentRound: CombatRound | null,
        playerUid: string
    ) {
        this.gameState = gameState;
        this.gridCells = gridCells;
        this.currentRound = currentRound;
        this.playerUid = playerUid;
    }

    /**
     * 获取 AI 的下一个动作
     * 简单的 AI 策略：攻击最近目标、移动到最佳位置等
     */
    getNextAction(character: GameCharacter): {
        type: "walk" | "attack" | "standby";
        data?: any;
    } | null {
        if (!this.gridCells || !this.currentRound) return null;

        // 检查是否是 AI 回合
        if (character.uid === this.playerUid) return null;

        const currentTurn = this.currentRound.turns.find(
            (t) => (t.status === 1 || t.status === 2) && t.uid === character.uid && t.character_id === character.character_id
        );
        if (!currentTurn) return null;

        // 获取可攻击目标
        const attackableTargets = this.getAttackableTargets(character);
        if (attackableTargets.length > 0) {
            // 攻击最近的敌人
            const nearestTarget = attackableTargets.reduce((nearest, target) => {
                if (!nearest) return target;
                return target.distance < nearest.distance ? target : nearest;
            });

            // 选择技能（如果有）
            const skill = character.skills?.[0] || null;

            return {
                type: "attack",
                data: {
                    attacker: {
                        uid: character.uid,
                        character_id: character.character_id,
                        skillSelect: skill?.id || ""
                    },
                    target: {
                        uid: nearestTarget.uid,
                        character_id: nearestTarget.character_id
                    }
                }
            };
        }

        // 如果没有可攻击目标，尝试移动到更接近敌人的位置
        const walkableTargets = this.getWalkableTargets(character);
        if (walkableTargets.length > 0) {
            // 找到最近的玩家角色
            const playerCharacters = this.gameState.characters.filter(
                (c) => c.uid === this.playerUid && (c.stats?.hp?.current ?? 0) > 0
            );
            if (playerCharacters.length > 0) {
                const nearestPlayer = playerCharacters.reduce((nearest, player) => {
                    if (!nearest) return player;
                    const nearestDist = Math.abs((nearest.q ?? 0) - (character.q ?? 0)) + Math.abs((nearest.r ?? 0) - (character.r ?? 0));
                    const playerDist = Math.abs((player.q ?? 0) - (character.q ?? 0)) + Math.abs((player.r ?? 0) - (character.r ?? 0));
                    return playerDist < nearestDist ? player : nearest;
                });

                // 找到最接近玩家的可移动位置
                const map = this.gameState.map;
                const targetCol = map.direction === 1 ? map.cols - (nearestPlayer.q ?? 0) - 1 : (nearestPlayer.q ?? 0);
                const targetPos = { q: targetCol, r: nearestPlayer.r ?? 0 };

                const nearestWalkable = walkableTargets.reduce((nearest, node) => {
                    if (!nearest) return node;
                    const nearestDist = Math.abs(nearest.x - targetPos.q) + Math.abs(nearest.y - targetPos.r);
                    const nodeDist = Math.abs(node.x - targetPos.q) + Math.abs(node.y - targetPos.r);
                    return nodeDist < nearestDist ? node : nearest;
                });

                if (nearestWalkable) {
                    return {
                        type: "walk",
                        data: {
                            uid: character.uid,
                            character_id: character.character_id,
                            to: { q: nearestWalkable.x, r: nearestWalkable.y }
                        }
                    };
                }
            }
        }

        // 没有可执行的动作，待命
        return {
            type: "standby",
            data: {
                uid: character.uid,
                character_id: character.character_id
            }
        };
    }

    /**
     * 获取可攻击目标
     */
    private getAttackableTargets(character: GameCharacter): AttackableNode[] {
        if (!this.gridCells || !this.currentRound) return [];

        const currentTurn = this.currentRound.turns.find(
            (t) => (t.status === 1 || t.status === 2) && t.uid === character.uid && t.character_id === character.character_id
        );
        if (!currentTurn) return [];

        const moveRange = currentTurn.status === 1 ? (character.move_range ?? 2) : 1;
        const attackRange = character.attack_range?.max ?? 1;
        const grid = this.gridCells.map((row) => row.map((cell) => ({ ...cell, walkable: true })));

        const enemies = this.gameState.characters
            .filter((c) => c.uid === this.playerUid && (c.stats?.hp?.current ?? 0) > 0)
            .map((c) => ({
                uid: c.uid,
                character_id: c.character_id,
                q: c.q ?? 0,
                r: c.r ?? 0
            }));

        return getAttackableNodes(
            grid,
            {
                q: character.q ?? 0,
                r: character.r ?? 0,
                uid: character.uid,
                character_id: character.character_id,
                moveRange,
                attackRange: character.attack_range ?? { min: 1, max: 1 }
            },
            enemies,
            null
        );
    }

    /**
     * 获取可移动目标
     */
    private getWalkableTargets(character: GameCharacter) {
        if (!this.gridCells || !this.currentRound) return [];

        const currentTurn = this.currentRound.turns.find(
            (t) => (t.status === 1 || t.status === 2) && t.uid === character.uid && t.character_id === character.character_id
        );
        if (!currentTurn) return [];

        const moveRange = currentTurn.status === 1 ? (character.move_range ?? 2) : 1;
        const grid = this.gridCells.map((row) =>
            row.map((cell) => {
                const char = this.gameState.characters.find((c) => c.q === cell.x && c.r === cell.y);
                return {
                    x: cell.x,
                    y: cell.y,
                    walkable: char ? false : cell.walkable
                };
            })
        );

        // 飞行单位可以忽略障碍物
        const isFlying = character.isFlying ?? false;
        const canIgnoreObstacles = character.canIgnoreObstacles ?? isFlying;
        return getWalkableNodes(grid, { x: character.q ?? 0, y: character.r ?? 0 }, moveRange, canIgnoreObstacles);
    }
}

export default AIController;

