/**
 * Tactical Monster 战斗规则管理器
 * 基于 solitaireSolo 的 SoloRuleManager 设计模式
 */

import { Skill } from "../types/CharacterTypes";
import {
    AttackableNode,
    CombatRound,
    CombatRule,
    GameCharacter,
    GameModel,
    GridCell,
    MapModel,
    WalkableNode
} from "../types/CombatTypes";
import { findPath, getAttackableNodes, getWalkableNodes } from "../utils/PathFind";

export class CombatRuleManager implements CombatRule {
    private gameState: GameModel;
    private gridCells: GridCell[][] | null;
    private currentRound: CombatRound | null;

    constructor(gameState: GameModel, gridCells: GridCell[][] | null, currentRound: CombatRound | null) {
        this.gameState = gameState;
        this.gridCells = gridCells;
        this.currentRound = currentRound;
    }

    /**
     * 检查角色是否可以移动到指定位置
     */
    canWalk(character: GameCharacter, to: { q: number; r: number }): boolean {
        if (!this.gridCells || !this.currentRound) return false;

        // 检查是否是当前回合的角色
        const currentTurn = this.currentRound.turns.find(
            (t) => (t.status === 1 || t.status === 2) && t.uid === character.uid && t.character_id === character.character_id
        );
        if (!currentTurn) return false;

        // 检查角色状态
        if (character.status === 'stunned') return false;

        // 检查目标位置是否在网格范围内
        const map = this.gameState.map;
        const col = map.direction === 1 ? map.cols - to.q - 1 : to.q;
        if (to.r < 0 || to.r >= map.rows || col < 0 || col >= map.cols) return false;

        // 检查目标位置是否可走
        if (!this.gridCells[to.r] || !this.gridCells[to.r][col] || !this.gridCells[to.r][col].walkable) {
            return false;
        }

        // 检查目标位置是否有其他角色
        const existingCharacter = this.gameState.characters.find(
            (c) => c.q === col && c.r === to.r && c.character_id !== character.character_id
        );
        if (existingCharacter) return false;

        // 检查是否在移动范围内
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

        const walkableNodes = getWalkableNodes(
            grid,
            { x: character.q ?? 0, y: character.r ?? 0 },
            moveRange
        );

        const targetNode = walkableNodes.find((node) => node.x === col && node.y === to.r);
        return targetNode !== undefined;
    }

    /**
     * 检查是否可以攻击目标
     */
    canAttack(attacker: GameCharacter, target: GameCharacter, skill?: Skill | null): boolean {
        if (!this.gridCells || !this.currentRound) return false;

        // 检查是否是当前回合的角色
        const currentTurn = this.currentRound.turns.find(
            (t) => (t.status === 1 || t.status === 2) && t.uid === attacker.uid && t.character_id === attacker.character_id
        );
        if (!currentTurn) return false;

        // 检查角色状态
        if (attacker.status === 'stunned') return false;
        if (target.status === 'stunned') return true; // 可以攻击眩晕的目标

        // 检查是否是敌人
        if (attacker.uid === target.uid) return false;

        // 检查技能冷却
        if (skill && attacker.skillCooldowns?.[skill.id] !== undefined) {
            const cooldown = attacker.skillCooldowns[skill.id];
            if (cooldown > 0) return false;
        }

        // 检查资源消耗
        if (skill && skill.resource_cost) {
            const stats = attacker.stats;
            if (skill.resource_cost.mp && (stats?.mp?.current ?? 0) < skill.resource_cost.mp) {
                return false;
            }
            if (skill.resource_cost.hp && (stats?.hp?.current ?? 0) < skill.resource_cost.hp) {
                return false;
            }
            if (skill.resource_cost.stamina && (stats?.stamina ?? 0) < skill.resource_cost.stamina) {
                return false;
            }
        }

        // 检查攻击范围
        const moveRange = currentTurn.status === 1 ? (attacker.move_range ?? 2) : 1;
        const attackRange = skill?.range?.max_distance ?? attacker.attack_range?.max ?? 1;
        const grid = this.gridCells.map((row) => row.map((cell) => ({ ...cell, walkable: true })));

        const enemies = this.gameState.characters
            .filter((c) => c.uid !== attacker.uid)
            .map((c) => ({
                uid: c.uid,
                character_id: c.character_id,
                q: c.q ?? 0,
                r: c.r ?? 0
            }));

        const attackableNodes = getAttackableNodes(
            grid,
            {
                q: attacker.q ?? 0,
                r: attacker.r ?? 0,
                uid: attacker.uid,
                character_id: attacker.character_id,
                moveRange,
                attackRange: attacker.attack_range ?? { min: 1, max: 1 }
            },
            enemies,
            skill ?? null
        );

        const targetNode = attackableNodes.find(
            (node) => node.uid === target.uid && node.character_id === target.character_id
        );
        return targetNode !== undefined;
    }

    /**
     * 检查是否可以选择技能
     */
    canSelectSkill(character: GameCharacter, skill: Skill): boolean {
        if (!this.currentRound) return false;

        // 检查是否是当前回合的角色
        const currentTurn = this.currentRound.turns.find(
            (t) => (t.status === 1 || t.status === 2) && t.uid === character.uid && t.character_id === character.character_id
        );
        if (!currentTurn) return false;

        // 检查角色状态
        if (character.status === 'stunned') return false;

        // 检查技能是否可用
        if (!character.skills || !character.skills.find((s) => s.id === skill.id)) {
            return false;
        }

        // 检查技能冷却
        if (character.skillCooldowns?.[skill.id] !== undefined) {
            const cooldown = character.skillCooldowns[skill.id];
            if (cooldown > 0) return false;
        }

        // 检查资源消耗
        if (skill.resource_cost) {
            const stats = character.stats;
            if (skill.resource_cost.mp && (stats?.mp?.current ?? 0) < skill.resource_cost.mp) {
                return false;
            }
            if (skill.resource_cost.hp && (stats?.hp?.current ?? 0) < skill.resource_cost.hp) {
                return false;
            }
            if (skill.resource_cost.stamina && (stats?.stamina ?? 0) < skill.resource_cost.stamina) {
                return false;
            }
        }

        return true;
    }

    /**
     * 获取可移动的目标位置
     */
    getWalkableTargets(character: GameCharacter): WalkableNode[] {
        if (!this.gridCells || !this.currentRound) return [];

        const currentTurn = this.currentRound.turns.find(
            (t) => (t.status === 1 || t.status === 2) && t.uid === character.uid && t.character_id === character.character_id
        );
        if (!currentTurn) return [];

        if (character.status === 'stunned') return [];

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

        return getWalkableNodes(grid, { x: character.q ?? 0, y: character.r ?? 0 }, moveRange);
    }

    /**
     * 获取可攻击的目标
     */
    getAttackableTargets(attacker: GameCharacter, skill?: Skill | null): AttackableNode[] {
        if (!this.gridCells || !this.currentRound) return [];

        const currentTurn = this.currentRound.turns.find(
            (t) => (t.status === 1 || t.status === 2) && t.uid === attacker.uid && t.character_id === attacker.character_id
        );
        if (!currentTurn) return [];

        if (attacker.status === 'stunned') return [];

        const moveRange = currentTurn.status === 1 ? (attacker.move_range ?? 2) : 1;
        const attackRange = skill?.range?.max_distance ?? attacker.attack_range?.max ?? 1;
        const grid = this.gridCells.map((row) => row.map((cell) => ({ ...cell, walkable: true })));

        const enemies = this.gameState.characters
            .filter((c) => c.uid !== attacker.uid)
            .map((c) => ({
                uid: c.uid,
                character_id: c.character_id,
                q: c.q ?? 0,
                r: c.r ?? 0
            }));

        return getAttackableNodes(
            grid,
            {
                q: attacker.q ?? 0,
                r: attacker.r ?? 0,
                uid: attacker.uid,
                character_id: attacker.character_id,
                moveRange,
                attackRange: attacker.attack_range ?? { min: 1, max: 1 }
            },
            enemies,
            skill ?? null
        );
    }

    /**
     * 检查游戏是否结束
     */
    isGameOver(): boolean {
        if (!this.gameState.characters || this.gameState.characters.length === 0) return false;

        // 检查是否有玩家的所有角色都死亡
        const challengerChars = this.gameState.characters.filter(
            (c) => c.uid === this.gameState.challenger
        );
        const challengeeChars = this.gameState.characters.filter(
            (c) => c.uid === this.gameState.challengee
        );

        const challengerAlive = challengerChars.some(
            (c) => (c.stats?.hp?.current ?? 0) > 0
        );
        const challengeeAlive = challengeeChars.some(
            (c) => (c.stats?.hp?.current ?? 0) > 0
        );

        return !challengerAlive || !challengeeAlive;
    }
}

export default CombatRuleManager;

