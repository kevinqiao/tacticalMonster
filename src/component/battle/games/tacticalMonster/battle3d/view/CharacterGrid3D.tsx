/**
 * CharacterGrid3D - 所有战斗角色的 3D 渲染
 * 角色逻辑坐标通过 logicToView 转换为视图坐标后渲染
 */

import React, { useCallback, useContext, useMemo } from "react";
import { useCombatManager } from "../../battle/service/CombatManager";
import { logicToView } from "../../team/utils/coordinateUtils";
import { useBattleCharacterRefsContext } from "../BattleCharacterRefsContext";
import { BattleLoadingContext } from "../BattleLoadingContext";
import { getCharacterKey } from "../utils/battle3DAdapter";
import type { BattleMapDimension } from "../utils/coordinate3DUtils";
import { hexTo3DCenter } from "../utils/coordinate3DUtils";
import type { BattleCharacter3DRef } from "./components/BattleCharacter3D";
import { BattleCharacter3DWithSuspense } from "./components/BattleCharacter3D";

interface CharacterGrid3DProps {
    mapDimension: BattleMapDimension | null;
}

export const CharacterGrid3D: React.FC<CharacterGrid3DProps> = ({ mapDimension }) => {
    const { characters, activeCharacterKey } = useCombatManager();
    const loadingContext = useContext(BattleLoadingContext);
    const refsContext = useBattleCharacterRefsContext();

    const handleRefReady = useCallback(
        (key: string) => (ref: BattleCharacter3DRef) => {
            refsContext?.registerRef(key, ref);
        },
        [refsContext]
    );

    const characterElements = useMemo(() => {
        if (!characters || !mapDimension) return [];

        return characters
            .filter((c) => c.q != null && c.r != null)
            .map((character) => {
                const logicQ = character.q ?? 0;
                const logicR = character.r ?? 0;
                // 逻辑坐标 → 视图坐标（竖屏时旋转）
                const view = logicToView(logicQ, logicR, mapDimension);
                const pos = hexTo3DCenter(view.q, view.r, mapDimension, 0);
                if (!pos) return null;

                const key = getCharacterKey(character);
                const position: [number, number, number] = [pos.x, pos.y, pos.z];
                const facing = (character.scaleX ?? 1) >= 0 ? 1 : -1;
                const isActive = key === activeCharacterKey;
                if (isActive) {
                    console.log("[CharacterGrid3D] isActive=true for:", key, "activeCharacterKey:", activeCharacterKey);
                }

                return (
                    <BattleCharacter3DWithSuspense
                        key={key}
                        character={character}
                        position={position}
                        width={mapDimension.hexWidth}
                        height={mapDimension.hexHeight}
                        facing={facing}
                        isPortrait={mapDimension.isPortrait}
                        isActive={isActive}
                        onModelLoaded={loadingContext?.onModelLoaded}
                        onRefReady={handleRefReady(key)}
                    />
                );
            });
    }, [characters, mapDimension, activeCharacterKey, loadingContext?.onModelLoaded, handleRefReady]);

    return <group>{characterElements}</group>;
};
