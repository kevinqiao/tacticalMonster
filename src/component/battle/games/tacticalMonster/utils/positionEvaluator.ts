/**
 * 位置评估工具
 * 用于评估移动位置的有利程度，支持自动/手动移动选择
 */

import { GridCellSprite, MonsterSprite } from "../types/CombatTypes";
import { getAllAllies, getAllEnemies } from "./characterFilterUtils";
import { getNeighbors, offsetHexDistance } from "./hexUtil";
import { buildWalkGridForMovement, findPath } from "./PathFind";

/**
 * 评估位置的有利程度
 * @param position - 待评估的位置
 * @param character - 攻击者
 * @param target - 目标
 * @param gridCells - 地图格子
 * @param characters - 所有角色列表
 * @param strategy - 移动策略（aggressive/defensive/balanced）
 * @returns 评分（0-100，越高越有利）
 */
export function evaluatePosition(
    position: { q: number; r: number },
    character: MonsterSprite,
    target: MonsterSprite,
    gridCells: GridCellSprite[][],
    characters: MonsterSprite[],
    strategy: 'aggressive' | 'defensive' | 'balanced' = 'balanced'
): number {
    let score = 0;
    const attackRange = character.attack_range?.max || 1;

    // 1. 距离目标的位置（越近越好，但要在攻击范围内）
    const distanceToTarget = offsetHexDistance(position, { q: target.q ?? 0, r: target.r ?? 0 });
    if (distanceToTarget > attackRange) {
        return 0;  // 不在攻击范围内，直接返回0
    }
    const distanceScore = (attackRange - distanceToTarget) / attackRange * 30;  // 最多30分
    score += distanceScore;

    // 2. 威胁评估（是否在敌人的攻击范围内）
    const threatScore = evaluateThreat(position, character, characters);
    if (strategy === 'defensive') {
        score += threatScore * 0.5;  // 防御策略：更重视安全
    } else if (strategy === 'aggressive') {
        score += threatScore * 0.2;  // 激进策略：不太重视安全
    } else {
        score += threatScore * 0.35;  // 平衡策略
    }

    // 3. 支援评估（是否在友军的保护范围内）
    const supportScore = evaluateSupport(position, character, characters);
    if (strategy === 'defensive') {
        score += supportScore * 0.3;  // 防御策略：更重视支援
    } else if (strategy === 'aggressive') {
        score += supportScore * 0.1;  // 激进策略：不太重视支援
    } else {
        score += supportScore * 0.2;  // 平衡策略
    }

    // 4. 地形优势（如高地、障碍物保护等）
    const terrainScore = evaluateTerrain(position, gridCells);
    score += terrainScore * 0.15;  // 地形优势占15%

    return Math.max(0, Math.min(100, score));  // 限制在 0-100 之间
}

/**
 * 评估威胁程度（是否在敌人的攻击范围内）
 * @param position - 待评估的位置
 * @param character - 攻击者
 * @param characters - 所有角色列表
 * @returns 威胁评分（负数，绝对值越大越危险）
 */
function evaluateThreat(
    position: { q: number; r: number },
    character: MonsterSprite,
    characters: MonsterSprite[]
): number {
    let threatScore = 0;
    const enemies = getAllEnemies(character, characters);

    for (const enemy of enemies) {
        const distance = offsetHexDistance(position, { q: enemy.q ?? 0, r: enemy.r ?? 0 });
        const enemyAttackRange = enemy.attack_range?.max || 1;

        // 如果在敌人的攻击范围内，扣分
        if (distance <= enemyAttackRange) {
            const threatLevel = (enemyAttackRange - distance) / enemyAttackRange;
            threatScore -= threatLevel * 20;  // 最多扣20分
        }
    }

    return threatScore;  // 负数，绝对值越大越危险
}

/**
 * 评估支援程度（是否在友军的保护范围内）
 * @param position - 待评估的位置
 * @param character - 攻击者
 * @param characters - 所有角色列表
 * @returns 支援评分（正数，越大越好）
 */
function evaluateSupport(
    position: { q: number; r: number },
    character: MonsterSprite,
    characters: MonsterSprite[]
): number {
    let supportScore = 0;
    const allies = getAllAllies(character, characters);

    for (const ally of allies) {
        const distance = offsetHexDistance(position, { q: ally.q ?? 0, r: ally.r ?? 0 });

        // 如果友军可以支援（在友军的攻击范围内），加分
        const allyAttackRange = ally.attack_range?.max || 1;
        if (distance <= allyAttackRange * 2) {  // 支援范围通常是攻击范围的2倍
            const supportLevel = 1 - (distance / (allyAttackRange * 2));
            supportScore += supportLevel * 15;  // 最多加15分
        }
    }

    return supportScore;  // 正数，越大越好
}

/**
 * 评估地形优势
 * @param position - 待评估的位置
 * @param gridCells - 地图格子
 * @returns 地形评分（0-100）
 */
function evaluateTerrain(
    position: { q: number; r: number },
    gridCells: GridCellSprite[][]
): number {
    const cell = gridCells[position.r]?.[position.q];
    if (!cell) return 0;

    let terrainScore = 50;  // 基础分数

    // 检查是否有障碍物保护（侧面有障碍物）
    const hasObstacleProtection = checkObstacleProtection(position, gridCells);
    if (hasObstacleProtection) {
        terrainScore += 20;  // 有障碍物保护，加分
    }

    // 检查是否在危险区域（如火焰、毒气等）
    // 这里可以根据实际需求扩展
    if (cell.disable) {
        terrainScore -= 30;  // 在禁用区域，扣分
    }

    return Math.max(0, Math.min(100, terrainScore));
}

/**
 * 检查位置是否有障碍物保护
 * @param position - 待检查的位置
 * @param gridCells - 地图格子
 * @returns 是否有障碍物保护
 */
function checkObstacleProtection(
    position: { q: number; r: number },
    gridCells: GridCellSprite[][]
): boolean {
    // 轴向 6 邻格（与后端 hexUtils.getNeighbors 一致，不区分奇偶行）
    const directions = [
        { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
        { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
    ];

    let obstacleCount = 0;
    for (const dir of directions) {
        const neighborQ = position.q + dir.q;
        const neighborR = position.r + dir.r;
        const neighborCell = gridCells[neighborR]?.[neighborQ];
        if (neighborCell?.disable) {
            obstacleCount++;
        }
    }

    // 如果有2个或更多障碍物，认为有保护
    return obstacleCount >= 2;
}

/**
 * 检查位置是否被占用
 * @param position - 待检查的位置
 * @param characters - 所有角色列表
 * @returns 是否被占用
 */
function isPositionOccupied(
    position: { q: number; r: number },
    characters: MonsterSprite[]
): boolean {
    return characters.some(char => char.q === position.q && char.r === position.r);
}

/**
 * 获取所有可能的移动位置（在攻击范围内）
 * @param character - 攻击者
 * @param target - 目标
 * @param attackRange - 攻击范围
 * @param moveRange - 移动范围
 * @param gridCells - 地图格子
 * @param characters - 所有角色列表
 * @returns 所有可能的移动位置列表（先按最少行走步数，再按战术评分）
 */
export function getMeleePossiblePositions(
    character: MonsterSprite,
    target: MonsterSprite,
    attackRange: number,
    moveRange: number,
    gridCells: GridCellSprite[][],
    characters: MonsterSprite[],
    strategy: 'aggressive' | 'defensive' | 'balanced' = 'balanced',
    mapObstacles?: Array<{ q: number; r: number }>
): Array<{ q: number; r: number; score: number }> {
    /** 含 pathSteps 仅用于排序：优先最少步数（与高亮「近亮远暗」一致，避免绕远接敌） */
    const candidates: Array<{ q: number; r: number; score: number; pathSteps: number }> = [];

    // 1. 获取目标周围的所有位置（在攻击范围内）
    // console.log("attackRange", attackRange, " moveRange", moveRange);
    const targetNeighbors = getNeighbors({ q: target.q ?? 0, r: target.r ?? 0 }, characters, gridCells);

    const isNeighbor = targetNeighbors.some((pos) => pos.q === character.q && pos.r === character.r);
    if (isNeighbor) {
        return [{ q: character.q ?? 0, r: character.r ?? 0, score: 100 }];
    }

    const canIgnoreObstacles = character.canIgnoreObstacles ?? character.isFlying ?? false;
    const walkGrid = buildWalkGridForMovement(
        gridCells,
        characters,
        character,
        canIgnoreObstacles,
        mapObstacles
    );

    // 2. 过滤出可到达的位置（与 walkAndAttack / 后端 walk 使用同一套 walkable 与步数）
    for (const pos of targetNeighbors) {
        const isOccupied = characters.find((char) => char.q === pos.q && char.r === pos.r);
        if (isOccupied) {
            continue;
        }
        const path = findPath(
            walkGrid,
            { q: character.q ?? 0, r: character.r ?? 0 },
            { q: pos.q, r: pos.r },
            canIgnoreObstacles
        );
        const last = path[path.length - 1];
        const reached = last !== undefined && last.q === pos.q && last.r === pos.r;
        const pathSteps = path.length - 1;
        if (!reached || pathSteps > moveRange) {
            continue;
        }

        const score = evaluatePosition(
            pos,
            character,
            target,
            gridCells,
            characters,
            strategy
        );

        if (score > 0) {
            candidates.push({ ...pos, score, pathSteps });
        }
    }

    // 3. 先按实际行走步数升序（最近/最亮格优先），同步数再按战术评分降序
    return candidates
        .sort((a, b) =>
            a.pathSteps !== b.pathSteps ? a.pathSteps - b.pathSteps : b.score - a.score
        )
        .map(({ q, r, score }) => ({ q, r, score }));
}
