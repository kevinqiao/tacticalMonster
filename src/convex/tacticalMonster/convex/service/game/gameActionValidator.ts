/**
 * 游戏操作验证器
 * 负责验证游戏操作的有效性（游戏状态、回合、权限、位置等）
 */

import { GameMonster } from "../../types/monsterTypes";
import { hexDistance } from "../../utils/hexUtils";
import { CharacterIdentifier, GameModel } from "./gameService";
import { RoundService } from "./roundService";

/**
 * 验证结果
 */
export interface ValidationResult {
    valid: boolean;
    message?: string;
}

/**
 * 角色获取器接口
 * 用于验证器获取角色信息
 */
export interface CharacterGetter {
    getCharacter(
        monsterId?: string,
        bossId?: string,
        minionId?: string
    ): GameMonster | null;
    getAllCharacters(): GameMonster[];
}

/**
 * 游戏操作验证器
 */
export class GameActionValidator {
    private dbCtx: any;
    private game: GameModel | null;
    private characterGetter: CharacterGetter;
    private roundService: RoundService;

    constructor(
        dbCtx: any,
        game: GameModel | null,
        characterGetter: CharacterGetter
    ) {
        this.dbCtx = dbCtx;
        this.game = game;
        this.characterGetter = characterGetter;
        this.roundService = new RoundService(dbCtx);
    }

    /**
     * 验证游戏状态是否允许操作
     */
    validateGameStatus(): ValidationResult {
        if (!this.game) {
            return { valid: false, message: "游戏不存在" };
        }

        // 游戏状态：0: waiting/in_progress, 1: won, 2: lost, 3: game over
        if (this.game.status !== 0) {
            return { valid: false, message: "游戏已结束，无法执行操作" };
        }

        return { valid: true };
    }

    /**
     * 验证操作是否属于当前回合
     */
    async validateTurn(characterIdentifier: CharacterIdentifier): Promise<ValidationResult> {
        if (!this.game || this.game.round === undefined) {
            return { valid: false, message: "游戏回合信息不存在" };
        }

        const game = this.game; // 保存引用以避免重复检查

        // 使用回合服务获取当前回合
        const roundInfo = await this.roundService.getCurrentRound(game.gameId, game.round ?? 0);
        if (!roundInfo) {
            return { valid: false, message: "当前回合不存在" };
        }

        const { currentTurn } = roundInfo;

        if (!currentTurn) {
            return { valid: false, message: "当前没有进行中的回合" };
        }

        // 验证角色是否匹配当前回合
        const character = this.characterGetter.getCharacter(
            characterIdentifier.monsterId,
            characterIdentifier.bossId,
            characterIdentifier.minionId
        );

        if (!character) {
            return { valid: false, message: "角色不存在" };
        }

        // 验证 UID 和 monsterId 是否匹配当前回合
        if (currentTurn.uid !== character.uid || currentTurn.monsterId !== character.monsterId) {
            return { valid: false, message: "不是当前回合，无法执行操作" };
        }

        // 验证回合状态（如果已完成，不允许再次操作）
        if (currentTurn.status === 2) {
            return { valid: false, message: "当前回合已完成，无法执行操作" };
        }

        return { valid: true };
    }

    /**
     * 验证操作者权限
     */
    validatePermission(characterIdentifier: CharacterIdentifier): ValidationResult {
        if (!this.game) {
            return { valid: false, message: "游戏不存在" };
        }

        const character = this.characterGetter.getCharacter(
            characterIdentifier.monsterId,
            characterIdentifier.bossId,
            characterIdentifier.minionId
        );

        if (!character) {
            return { valid: false, message: "角色不存在" };
        }

        // 验证操作者是否为游戏参与者
        // 玩家角色：uid 必须匹配游戏创建者
        // Boss角色：uid 必须是 "boss"
        if (character.uid !== this.game.uid && character.uid !== "boss") {
            return { valid: false, message: "无权操作该角色" };
        }

        return { valid: true };
    }

    /**
     * 验证位置是否有效（在地图范围内）
     */
    validatePosition(pos: { q: number; r: number }): ValidationResult {
        if (!this.game || !this.game.map) {
            return { valid: false, message: "地图信息不存在" };
        }

        const { cols, rows } = this.game.map;

        // 验证坐标是否在地图范围内
        // 注意：q 的范围需要考虑地图方向（direction）
        // 这里简化处理，假设 q 的范围是 0 到 cols-1
        if (pos.q < 0 || pos.q >= cols || pos.r < 0 || pos.r >= rows) {
            return { valid: false, message: `位置超出地图范围: q=${pos.q}, r=${pos.r}, cols=${cols}, rows=${rows}` };
        }

        // 验证位置是否在禁用区域
        const isDisabled = this.game.map.disables?.some(
            (disable) => disable.q === pos.q && disable.r === pos.r
        );
        if (isDisabled) {
            return { valid: false, message: "目标位置在禁用区域" };
        }

        // 验证位置是否被障碍物占用
        const isObstacle = this.game.map.obstacles?.some(
            (obstacle) => obstacle.q === pos.q && obstacle.r === pos.r
        );
        if (isObstacle) {
            return { valid: false, message: "目标位置被障碍物占用" };
        }

        return { valid: true };
    }

    /**
     * 验证移动位置是否可到达
     */
    validateWalkable(
        character: GameMonster,
        from: { q: number; r: number },
        to: { q: number; r: number }
    ): ValidationResult {
        if (!this.game) {
            return { valid: false, message: "游戏不存在" };
        }

        // 验证目标位置是否有效
        const positionValidation = this.validatePosition(to);
        if (!positionValidation.valid) {
            return positionValidation;
        }

        // 计算移动距离
        const distance = hexDistance(from, to);
        const moveRange = character.move_range ?? 3;

        // 验证移动距离是否在范围内
        if (distance > moveRange) {
            return { valid: false, message: `移动距离 ${distance} 超出移动范围 ${moveRange}` };
        }

        // 如果是飞行单位，可以忽略障碍物，直接允许
        if (character.canIgnoreObstacles || character.isFlying) {
            return { valid: true };
        }

        // 对于非飞行单位，需要检查路径上是否有障碍物
        // 这里简化处理：只检查目标位置是否有障碍物（已在 validatePosition 中检查）
        // 如果需要更严格的路径验证，可以使用路径查找算法

        // 检查目标位置是否被其他角色占用
        const allCharacters = this.characterGetter.getAllCharacters();
        const isOccupied = allCharacters.some((char) => {
            if (char.uid === character.uid && char.monsterId === character.monsterId) {
                return false; // 排除自己
            }
            return char.q === to.q && char.r === to.r;
        });

        if (isOccupied) {
            return { valid: false, message: "目标位置已被其他角色占用" };
        }

        return { valid: true };
    }

    /**
     * 验证所有操作前置条件（组合验证）
     * 用于 attack、walk、useSkill 等操作的统一验证
     */
    async validateAction(
        characterIdentifier: CharacterIdentifier,
        options?: {
            validateTurn?: boolean;
            validatePosition?: { from: { q: number; r: number }; to: { q: number; r: number } };
        }
    ): Promise<ValidationResult> {
        // 1. 游戏状态验证
        const gameStatusResult = this.validateGameStatus();
        if (!gameStatusResult.valid) {
            return gameStatusResult;
        }

        // 2. 权限验证
        const permissionResult = this.validatePermission(characterIdentifier);
        if (!permissionResult.valid) {
            return permissionResult;
        }

        // 3. 回合验证（如果启用）
        if (options?.validateTurn !== false) {
            const turnResult = await this.validateTurn(characterIdentifier);
            if (!turnResult.valid) {
                return turnResult;
            }
        }

        // 4. 位置验证（如果提供）
        if (options?.validatePosition) {
            const character = this.characterGetter.getCharacter(
                characterIdentifier.monsterId,
                characterIdentifier.bossId,
                characterIdentifier.minionId
            );
            if (!character) {
                return { valid: false, message: "角色不存在" };
            }
            const walkableResult = this.validateWalkable(
                character,
                options.validatePosition.from,
                options.validatePosition.to
            );
            if (!walkableResult.valid) {
                return walkableResult;
            }
        }

        return { valid: true };
    }
}

