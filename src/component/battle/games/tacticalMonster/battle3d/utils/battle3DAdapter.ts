/**
 * MonsterSprite 与 3D 引用的适配器
 * 桥接 CombatManager 的 character 与 3D 场景中的 THREE.Group
 */

import type * as THREE from "three";
import type { MonsterSprite } from "../../types/CombatTypes";

export interface CharacterRef3D {
    character: MonsterSprite;
    groupRef: React.RefObject<THREE.Group | null>;
    /** 动画控制：move/stand/attack/hurt */
    playAnimation: (name: "idle" | "walk" | "attack" | "hurt" | "stand") => void;
}

export type CharacterRefsMap = Map<string, CharacterRef3D>;

/**
 * 获取角色的唯一标识（用于 refs 映射与 React key）
 * 使用 character_id 区分同 monsterId 的多个单位（如召唤物与队伍原成员）
 */
export const getCharacterKey = (c: MonsterSprite): string => {
    if (c.uid === "boss") return `boss_${(c as any).bossId ?? c.character_id}`;
    if ("minionId" in c && (c as any).minionId) return `minion_${(c as any).minionId}`;
    return `monster_${c.uid}_${c.character_id}`;
};
