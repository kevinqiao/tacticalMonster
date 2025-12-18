/**
 * Tactical Monster 关卡类型定义
 */
export interface Stage {
    stageId: string;                    // 唯一标识
    bossId: string;                     // 选定的 Boss ID
    map: {
        rows: number;
        cols: number;
        obstacles: Array<{
            type: number;
            asset: string;
            q: number;
            r: number;
        }>;
        disables: Array<{
            q: number;
            r: number;
        }>;
    };                    // 生成的地图 ID
    difficulty: number;                 // Boss Power / Player Team Power 比率（缩放后）
    seed: string;                       // 随机种子
    attempts?: number;                   // 尝试次数
    createdAt?: string;                  // 创建时间
}
export interface Boss {
    monsterId: string;
    hp: number;
    damage: number;
    defense: number;
    speed: number;
    position: {
        q: number;
        r: number;
    };
    minions: Array<{  // 小怪数据
        monsterId: string;
        hp: number;
        damage: number;
        defense: number;
        speed: number;
        position: {
            q: number;
            r: number;
        };
    }>;
}

