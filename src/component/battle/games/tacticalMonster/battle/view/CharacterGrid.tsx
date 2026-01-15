/**
 * Tactical Monster 角色网格视图
 */

import gsap from "gsap";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import usePlayPhase from "../animation/usePlayPhase";
import { useCombatManager } from "../service/CombatManager";
import useCombatActHandler from "../service/handler/useCombatActHandler";
import "../style.css";
import { MonsterSprite } from "../types/CombatTypes";
import { ASSET_TYPE } from "../types/monsterTypes";
import { coordToPixel } from "../utils/hexUtil";


import { ModelConfig } from "../config/modelConfig";

export interface ICharacterProps {
    character: MonsterSprite;
    width: number;
    height: number;
    onAnimatorReady?: (animator: { move: () => void; stand: () => void; attack?: () => void }) => void;
    overrideConfig?: Partial<ModelConfig>;  // 配置覆盖（用于编辑器实时预览）
    onConfigReady?: (config: ModelConfig) => void;  // 当配置加载完成时回调
    onPreviewSegment?: (clipName: string, segmentName: string, start: number, end: number) => void;  // 预览特定时间范围的动画片段
}

interface Props {
    assetType?: ASSET_TYPE;
    character: MonsterSprite;
}

const CharacterCell: React.FC<Props> = ({ character, assetType }) => {
    const { game, characters, hexCell, gridCells } = useCombatManager();
    const { playTurnOn } = usePlayPhase();
    const { attack } = useCombatActHandler();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const { map, currentRound } = game || {};
    useEffect(() => {
        if (!containerRef.current || hexCell.width === 0 || !map) return;
        console.log("character", character);
        const q = character.q ?? 0;
        const r = character.r ?? 0;
        const { x, y } = coordToPixel(q, r, hexCell, map);
        gsap.set(containerRef.current, { autoAlpha: 1, x, y, scaleX: character.scaleX ?? 1 });
    }, [character, hexCell, map]);

    useEffect(() => {
        if (!currentRound || !characters || !character || !gridCells) return;
        const currentTurn = currentRound.turns?.find((t: any) => t.status >= 0 && t.status <= 2);
        if (currentTurn && currentTurn.monsterId === character.monsterId && currentTurn.uid === character.uid) {
            playTurnOn(currentTurn, () => { console.log("playTurnOn", currentTurn) });
        }
    }, [character, characters, currentRound, gridCells, playTurnOn]);

    const loadContainer = useCallback(
        (ele: HTMLDivElement | null) => {
            containerRef.current = ele;
            character.container = ele ?? undefined;
        },
        [character]
    );
    const loadStand = useCallback(
        (ele: HTMLDivElement | null) => {
            character.standEle = ele ?? undefined;
        },
        [character]
    );
    const loadAttack = useCallback(
        (ele: HTMLDivElement | null) => {
            character.attackEle = ele ?? undefined;
        },
        [character]
    );

    const handleAttack = useCallback(() => {
        console.log("handleAttack", character);
        attack(character);
    }, [character, attack]);

    return (
        <>
            <div
                ref={loadContainer}
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: `${hexCell.width}px`,
                    height: `${hexCell.height}px`,
                    margin: 0,
                    padding: 0,
                    // opacity: 0,
                    // visibility: "hidden",
                    pointerEvents: "none",
                }}
            >
                <div ref={loadStand} className="character-stand-status" />
                {/* <div ref={loadAttack} className="character-attack-status" onClick={handleAttack} /> */}
                <div className="character-txt-container">{character.name}</div>
                {/* {assetType === ASSET_TYPE.SPINE && <CharacterSpine character={character} width={hexCell.width} height={hexCell.height} />}
                {assetType === ASSET_TYPE.FBX && <Character3D character={character} width={hexCell.width} height={hexCell.height} />} */}
            </div>
        </>
    );
};

const CharacterGrid: React.FC<{ position: { top: number, left: number, width: number, height: number }, assetType?: ASSET_TYPE }> = ({ position, assetType = ASSET_TYPE.TXT }) => {
    const { characters } = useCombatManager();
    const render = useMemo(() => {
        return (
            <div style={{ position: "absolute", top: position.top, left: position.left, width: position.width, height: position.height }}>
                {characters?.map((c, index) => (
                    <CharacterCell key={"character-" + c.uid + "_" + c.monsterId} character={c} assetType={assetType} />
                ))}
            </div>
        );
    }, [characters, position]);
    return <>{render}</>;
};

export default CharacterGrid;

