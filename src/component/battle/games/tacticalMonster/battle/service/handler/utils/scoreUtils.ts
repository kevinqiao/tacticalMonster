/**
 * 得分计算工具函数
 */

import { MonsterSprite } from "../../../../types/CombatTypes";

/**
 * 计算击杀得分
 */
export const calculateKillScore = (
    characters: MonsterSprite[] | undefined,
    target: MonsterSprite,
    beforeHp: number,
    afterHp: number,
    skillId: string,
    calculateActionScore: (params: any) => number
) => {
    if (beforeHp <= 0 || afterHp > 0 || !characters) return 0;

    if (target.uid === "boss") {
        const bossCharacters = characters.filter(c => c.uid === "boss");
        const isBoss = bossCharacters[0]?.character_id === target.character_id;
        return calculateActionScore({
            actionType: skillId === "basic_attack" ? 'attack' : 'skill',
            killed: true,
            killedType: isBoss ? 'boss' : 'minion',
            skillId: skillId === "basic_attack" ? undefined : skillId
        });
    }
    return 0;
};

