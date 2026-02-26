/**
 * 管理 3D 角色引用 - 供动画系统 (usePlayWalk3D, usePlaySkill3D) 使用
 */

import { useCallback, useRef } from "react";
import type { MonsterSprite } from "../../types/CombatTypes";
import { getCharacterKey } from "../utils/battle3DAdapter";
import type { BattleCharacter3DRef } from "../view/components/BattleCharacter3D";

export const useBattleCharacterRefs = () => {
    const refsMapRef = useRef<Map<string, BattleCharacter3DRef>>(new Map());

    const registerRef = useCallback((key: string, ref: BattleCharacter3DRef) => {
        refsMapRef.current.set(key, ref);
    }, []);

    const unregisterRef = useCallback((key: string) => {
        refsMapRef.current.delete(key);
    }, []);

    const getRef = useCallback((character: MonsterSprite): BattleCharacter3DRef | undefined => {
        return refsMapRef.current.get(getCharacterKey(character));
    }, []);

    return {
        registerRef,
        unregisterRef,
        getRef,
        refsMap: refsMapRef.current,
    };
};
