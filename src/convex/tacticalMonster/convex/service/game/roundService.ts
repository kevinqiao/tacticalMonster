/**
 * 回合管理服务
 * 负责回合的创建、结束和管理
 */
import { GameModel, GameTurn } from "../../types/gameTypes";
import { GameMonster } from "../../types/monsterTypes";


export class RoundService {
    private dbCtx: any;

    constructor(dbCtx: any) {
        this.dbCtx = dbCtx;
    }

    /**
     * 创建新回合
     * Braveland 式全局回合顺序：收集所有存活角色（玩家+Boss+小怪），按 speed 降序排序；
     * 同速时玩家优先，同队内按 monsterId 稳定排序。生成的 turns[].order 用于整轮执行顺序。
     */
    async createRound(
        gameId: string,
        roundNumber: number,
        game: GameModel
    ): Promise<boolean> {
        // 收集所有角色（玩家队伍 + Boss + 小怪）
        const allCharacters: Array<{
            uid: string;
            monsterId: string;
            bossId?: string;    // Boss主体的bossId（可选）
            minionId?: string; // 小怪的minionId（可选，用于区分相同monsterId的小怪）
            speed: number;
            team: 'player' | 'boss';
        }> = [];

        // 1. 添加玩家队伍角色（过滤已死亡的）
        game.team.forEach((monster: GameMonster) => {
            const currentHp = monster.stats?.hp?.current ?? 0;
            if (currentHp > 0) {
                allCharacters.push({
                    uid: monster.uid,
                    monsterId: monster.monsterId,
                    speed: monster.stats.speed,
                    team: 'player',
                });
            }
        });

        // 2. 添加Boss本体（过滤已死亡的）
        const bossHp = game.boss.stats?.hp?.current ?? 0;
        if (bossHp > 0) {
            allCharacters.push({
                uid: 'boss',
                monsterId: game.boss.monsterId,
                bossId: game.boss.bossId, // ✅ 添加 bossId 用于区分
                speed: game.boss.stats.speed,
                team: 'boss',
            });
        }

        // 3. 添加小怪（过滤已死亡的）
        game.boss.minions.forEach((minion) => {
            const minionHp = minion.stats?.hp?.current ?? 0;
            if (minionHp > 0) {
                allCharacters.push({
                    uid: 'boss',
                    monsterId: minion.monsterId,
                    minionId: minion.minionId, // ✅ 添加 minionId 用于区分相同 monsterId 的小怪
                    speed: minion.stats.speed,
                    team: 'boss',
                });
            }
        });

        // 4. 按速度排序，速度相同时玩家优先
        allCharacters.sort((a, b) => {
            // 先按速度降序排序
            if (a.speed !== b.speed) {
                return b.speed - a.speed;
            }
            // 速度相同时，玩家优先（PVE中玩家应该有一定优势）
            if (a.team === 'player' && b.team === 'boss') {
                return -1; // a（玩家）排在前面
            }
            if (a.team === 'boss' && b.team === 'player') {
                return 1; // b（玩家）排在前面
            }
            // 同队内速度相同时，按monsterId排序（保证排序稳定性）
            return a.monsterId.localeCompare(b.monsterId);
        });

        // 5. 转换为 GameTurn 数组（添加 order 属性标识次序）
        const turns: GameTurn[] = allCharacters.map((char, index) => ({
            uid: char.uid,
            monsterId: char.monsterId,
            ...(char.bossId ? { bossId: char.bossId } : {}), // ✅ 如果是Boss主体，添加 bossId
            ...(char.minionId ? { minionId: char.minionId } : {}), // ✅ 如果是小怪，添加 minionId
            status: 0, // 0: open (等待中)
            order: index + 1, // 次序（从 1 开始）
        }));

        // 6. 创建回合记录
        const roundObj = {
            gameId,
            no: roundNumber,
            status: 0,
            turns,
        };

        await this.dbCtx.db.insert("mr_game_round", roundObj);
        return true;
    }

    /**
     * 结束回合
     * 标记当前回合为已完成
     */
    async endRound(gameId: string, roundNumber: number): Promise<boolean> {
        const roundDoc = await this.dbCtx.db
            .query("mr_game_round")
            .withIndex("by_game_round", (q: any) =>
                q.eq("gameId", gameId).eq("no", roundNumber)
            )
            .unique();

        if (roundDoc) {
            await this.dbCtx.db.patch(roundDoc._id, {
                status: 2,
                endTime: Date.now(),
            });
            return true;
        }

        return false;
    }

    /**
     * 获取当前回合
     */
    async getCurrentRound(gameId: string, roundNumber: number): Promise<{
        roundDoc: any;
        currentTurn: GameTurn | null;
    } | null> {
        const roundDoc = await this.dbCtx.db
            .query("mr_game_round")
            .withIndex("by_game_round", (q: any) =>
                q.eq("gameId", gameId).eq("no", roundNumber)
            )
            .unique();

        if (!roundDoc) {
            return null;
        }

        const currentTurn = roundDoc.turns?.find(
            (turn: GameTurn) => turn.status === 1
        ) || null;

        return {
            roundDoc,
            currentTurn,
        };
    }
}

