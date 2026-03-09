/**
 * CharacterGrid3D - 所有战斗角色的 3D 渲染
 * 角色始终用逻辑坐标 (q,r) 通过 hexTo3DCenter 算 3D 位置，横竖屏同一场景。
 */

import React, { useContext, useMemo } from "react";
import { useCombatManager } from "../../service/CombatManager";
import { BattleLoadingContext } from "../BattleLoadingContext";
import { getCharacterKey } from "../utils/battle3DAdapter";
import type { BattleMapDimension } from "../utils/coordinate3DUtils";
import { hexTo3DCenter } from "../utils/coordinate3DUtils";
import { BattleCharacter3DWithSuspense } from "./components/BattleCharacter3D";

interface CharacterGrid3DProps {
    mapDimension: BattleMapDimension | null;
}

export const CharacterGrid3D: React.FC<CharacterGrid3DProps> = ({ mapDimension }) => {
    const { characters, activeCharacterKey, animating } = useCombatManager();
    const loadingContext = useContext(BattleLoadingContext);

    const characterElements = useMemo(() => {
        if (!characters || !mapDimension) return [];

        const { cols, rows } = mapDimension;

        return characters.map((character, index) => {
            // 确保每个角色都有坐标（无则用索引占位），保证每个角色都挂载并注册 ref，行走时能按 key 取到
            const logicQ = character.q ?? index % Math.max(1, cols);
            const logicR = character.r ?? Math.floor(index / Math.max(1, cols)) % Math.max(1, rows);
            const pos = hexTo3DCenter(logicQ, logicR, mapDimension, 0);
            if (!pos) return null;

            const key = getCharacterKey(character);
            // 动画中角色使用稳定 position，避免重渲染覆盖 GSAP 控制的 position
            const position: [number, number, number] =
                animating?.key === key ? animating.position : [pos.x, pos.y, pos.z];
            const facing = (character.scaleX ?? 1) >= 0 ? 1 : -1;
            const isActive = key === activeCharacterKey;

            return (
                <BattleCharacter3DWithSuspense
                    key={key}
                    character={character}
                    position={position}
                    animatingCharacterKey={animating?.key ?? null}
                    width={mapDimension.hexWidth}
                    height={mapDimension.hexHeight}
                    facing={facing}
                    isPortrait={mapDimension.isPortrait}
                    isActive={isActive}
                    onModelLoaded={loadingContext?.onModelLoaded}
                />
            );
        });
    }, [characters, mapDimension, activeCharacterKey, animating, loadingContext?.onModelLoaded]);

    return <group>{characterElements}</group>;
};
