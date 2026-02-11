/**
 * Tactical Monster 角色网格视图
 */

import gsap from "gsap";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { MonsterSprite } from "../../types/CombatTypes";
import { ASSET_TYPE } from "../../types/monsterTypes";
import { useCombatManager } from "../service/CombatManager";
import useCombatActHandler from "../service/handler/useCombatActHandler";
import "../style.css";
import { coordToPixel } from "../utils/hexUtil";
import { updateHPMPDisplay } from "../utils/hpmpDisplayUpdater";


import { ModelConfig } from "../../config/modelConfig";

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
    const { game, mapDimension } = useCombatManager();
    const { attack } = useCombatActHandler();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const hpBarRef = useRef<HTMLDivElement | null>(null);
    const mpBarRef = useRef<HTMLDivElement | null>(null);
    const hpTextRef = useRef<HTMLDivElement | null>(null);
    const mpTextRef = useRef<HTMLDivElement | null>(null);
    const { map, currentRound } = game || {};

    useEffect(() => {
        if (!containerRef.current || !mapDimension || !map) return;
        const q = character.q ?? 0;
        const r = character.r ?? 0;
        const hexCell = { width: mapDimension.hexWidth, height: mapDimension.hexHeight };
        const { x, y } = coordToPixel(q, r, hexCell, map);
        gsap.set(containerRef.current, { autoAlpha: 1, x, y, scaleX: character.scaleX ?? 1 });
    }, [character, mapDimension, map]);

    // ✅ 组件挂载后，设置 DOM 元素引用并初始化 HP/MP 显示
    useEffect(() => {
        if (character) {
            // 设置 DOM 元素引用
            character.hpBarElement = hpBarRef.current ?? undefined;
            character.mpBarElement = mpBarRef.current ?? undefined;
            character.hpTextElement = hpTextRef.current ?? undefined;
            character.mpTextElement = mpTextRef.current ?? undefined;

            // ✅ 初始化 HP/MP 显示（确保显示正确）
            if (character.stats) {
                updateHPMPDisplay(
                    character,
                    character.stats.hp?.current,
                    character.stats.mp?.current
                );
            }
        }
    }, []);  // 只在首次挂载时执行

    // ✅ 移除 playTurnOn 调用，统一在 handlePhaseChanges 中处理
    // 避免重复调用和职责混乱

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


    return (
        <>
            <div
                ref={loadContainer}
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: `${mapDimension?.hexWidth ?? 0}px`,
                    height: `${mapDimension?.hexHeight ?? 0}px`,
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

                {/* ✅ HP/MP 显示元素（通过 GSAP 更新，避免 React 重新渲染） */}
                {character.stats && (
                    <div className="character-hp-mp-container" style={{
                        position: "absolute",
                        bottom: -40,
                        left: 0,
                        width: "100%",
                        height: "40px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                        pointerEvents: "none",
                    }}>
                        {/* HP 条 */}
                        <div style={{
                            position: "relative",
                            width: "100%",
                            height: "8px",
                            background: "rgba(0,0,0,0.5)",
                            borderRadius: "4px",
                            overflow: "hidden",
                        }}>
                            <div
                                ref={hpBarRef}
                                className="hp-bar"
                                style={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    height: "100%",
                                    width: `${character.stats.hp ? ((character.stats.hp.current / character.stats.hp.max) * 100) : 0}%`,
                                    background: "linear-gradient(90deg, #ff4444 0%, #ff6666 100%)",
                                    transition: "none", // GSAP 会处理动画
                                }}
                            />
                        </div>

                        {/* HP 文字 */}
                        <div
                            ref={hpTextRef}
                            className="hp-text"
                            style={{
                                fontSize: "10px",
                                color: "#fff",
                                textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
                                textAlign: "center",
                                lineHeight: "1",
                            }}
                        >
                            {character.stats.hp ? `${character.stats.hp.current} / ${character.stats.hp.max}` : "0 / 0"}
                        </div>

                        {/* MP 条（如果存在） */}
                        {character.stats.mp && (
                            <>
                                <div style={{
                                    position: "relative",
                                    width: "100%",
                                    height: "6px",
                                    background: "rgba(0,0,0,0.5)",
                                    borderRadius: "3px",
                                    overflow: "hidden",
                                }}>
                                    <div
                                        ref={mpBarRef}
                                        className="mp-bar"
                                        style={{
                                            position: "absolute",
                                            top: 0,
                                            left: 0,
                                            height: "100%",
                                            width: `${(character.stats.mp.current / character.stats.mp.max) * 100}%`,
                                            background: "linear-gradient(90deg, #4444ff 0%, #6666ff 100%)",
                                            transition: "none", // GSAP 会处理动画
                                        }}
                                    />
                                </div>

                                {/* MP 文字 */}
                                <div
                                    ref={mpTextRef}
                                    className="mp-text"
                                    style={{
                                        fontSize: "9px",
                                        color: "#fff",
                                        textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
                                        textAlign: "center",
                                        lineHeight: "1",
                                    }}
                                >
                                    {character.stats.mp ? `${character.stats.mp.current} / ${character.stats.mp.max}` : "0 / 0"}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* {assetType === ASSET_TYPE.SPINE && <CharacterSpine character={character} width={hexCell.width} height={hexCell.height} />}
                {assetType === ASSET_TYPE.FBX && <Character3D character={character} width={hexCell.width} height={hexCell.height} />} */}
            </div>
        </>
    );
};

const CharacterGrid: React.FC<{ assetType?: ASSET_TYPE }> = ({ assetType = ASSET_TYPE.TXT }) => {
    const { characters } = useCombatManager();
    const render = useMemo(() => {
        return (
            <div style={{ position: "absolute", width: "100%", height: "100%" }}>
                {characters?.map((c, index) => (
                    <CharacterCell key={"character-" + c.uid + "_" + c.monsterId} character={c} assetType={assetType} />
                ))}
            </div>
        );
    }, [characters]);
    return <>{render}</>;
};

export default CharacterGrid;

