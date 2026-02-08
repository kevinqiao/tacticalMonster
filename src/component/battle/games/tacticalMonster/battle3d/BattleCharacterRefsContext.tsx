/**
 * 战斗角色 3D 引用上下文 - 供动画系统获取角色 ref
 */

import React, { createContext, useCallback, useContext, useRef } from "react";
import type { MonsterSprite } from "../types/CombatTypes";
import { getCharacterKey } from "./utils/battle3DAdapter";
import type { BattleCharacter3DRef } from "./view/components/BattleCharacter3D";

interface BattleCharacterRefsContextValue {
    registerRef: (key: string, ref: BattleCharacter3DRef) => void;
    unregisterRef: (key: string) => void;
    getRef: (character: MonsterSprite) => BattleCharacter3DRef | undefined;
}

const BattleCharacterRefsContext = createContext<BattleCharacterRefsContextValue | null>(null);

export const useBattleCharacterRefsContext = () => useContext(BattleCharacterRefsContext);

export const BattleCharacterRefsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

    const value = React.useMemo(
        () => ({ registerRef, unregisterRef, getRef }),
        [registerRef, unregisterRef, getRef]
    );

    return (
        <BattleCharacterRefsContext.Provider value={value}>
            {children}
        </BattleCharacterRefsContext.Provider>
    );
};
