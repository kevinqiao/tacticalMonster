/**
 * 回合顺序条（先攻条）- Braveland 式全局排序展示
 * 左下角横排；展示 monsterId、血条、攻击范围；
 * 最左侧永远为当前 turn；完成时左移消失后在序列最右侧重新出现。
 * 动画由 GSAP 驱动，支持 playbackSpeed 同步。
 */

import gsap from "gsap";
import React, { useEffect, useMemo, useRef } from "react";
import { useCombatManager } from "../../../service/CombatManager";
import { usePlayTurnBar } from "../../animation/usePlayTurnBar";
import { SeparatorSprite } from "./SeparatorSprite";
import { TurnItemSprite } from "./TurnItemSprite";

export type TurnBarDimension = {
    itemWidth: number;
    itemHeight: number;
    separatorWidth: number;
};

export type TurnBarItem = {
    character_id: string;
    index?: number;
    ele?: HTMLDivElement;
    status?: number;
    turnKey?: string;
};

const getSeparatorIndexFromRound = (round: any): number => {
    const size = round?.turns?.length ?? 0;
    const todos = round?.turns
        ?.filter((turn: any) => turn.status !== 2)
        .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
    return (todos?.length === 0 || todos?.length === size) ? size : (todos?.length ?? 0);
};

export const TurnOrderBar: React.FC = () => {
    const { game, mapDimension, turnRound, characters, mode, playbackSpeed = 1.0 } = useCombatManager();
    const turnRoundQueueRef = useRef<{ status: number, turnRound: { name: string, data: any } }[]>([{ status: 0, turnRound: { name: "init", data: game?.currentRound } }]);
    const timelineRef = useRef<gsap.core.Timeline | null>(null);
    const turnBarItemsMapRef = useRef<Map<string, TurnBarItem>>(new Map());
    const dimension = useMemo(() => {
        if (!mapDimension) return null;
        const w = mapDimension.containerWidth / (8 + 1 + 0.5);
        const h = w * 1.2;
        const dh = ((mapDimension.containerHeight - mapDimension.height) / 2) + (mapDimension.topOffset ?? 0) - 10;
        const itemHeight = Math.min(dh, h);
        const itemWidth = itemHeight / 1.2;
        const separatorWidth = itemWidth * 0.3;
        return { itemWidth, itemHeight, separatorWidth };
    }, [mapDimension]);

    const separatorRef = useRef<{ ele: HTMLDivElement | null, nextRound: number, index: number }>({
        ele: null,
        nextRound: (game?.currentRound?.no ?? 0) + 1,
        index: getSeparatorIndexFromRound(game?.currentRound),
    });
    const separator = separatorRef.current;
    const trackRef = useRef<HTMLDivElement | null>(null);

    // 保持 separator 对象稳定，避免 render 时重建导致 index 提前跳到目标位
    useEffect(() => {
        separator.nextRound = (game?.currentRound?.no ?? 0) + 1;
    }, [game?.currentRound?.no, separator]);

    // 新对局初始化时重置 separator index
    useEffect(() => {
        separator.index = getSeparatorIndexFromRound(game?.currentRound);
    }, [game?.gameId, separator]);
    const { playInitTurn, playStartTurn, playStartRound } = usePlayTurnBar({
        dimension,
        itemsMapRef: turnBarItemsMapRef,
        separator,
        trackRef,
        playbackSpeed,
    });


    useEffect(() => {
        if (!turnRound) return;
        const shouldQueue =
            turnRound.name === "init" ||
            turnRound.name === "turnStart" ||
            turnRound.name === "roundEnd" ||
            (turnRound.name === "roundStart");
        if (shouldQueue) {
            turnRoundQueueRef.current.push({ status: 0, turnRound });
        }
    }, [turnRound, mode]);


    useEffect(() => {
        const processEvent = () => {
            if (turnRoundQueueRef.current.length > 0 && (timelineRef.current === null || !timelineRef.current?.isActive())) {
                const turn = turnRoundQueueRef.current[0];
                console.log("turn round queue", JSON.parse(JSON.stringify(turnRoundQueueRef.current)));
                if (turn.status === 2) {
                    turnRoundQueueRef.current.shift();
                    return;
                }

                if (turn.status === 0) {
                    turn.status = 1;
                    timelineRef.current = gsap.timeline({
                        onComplete: () => {
                            console.log("timeline complete");
                            timelineRef.current = null;
                        },

                    });
                    if (turn.turnRound.name === "init") {
                        playInitTurn(turn, timelineRef.current);
                        return;
                    }
                    if (turn.turnRound.name === "turnStart") {
                        playStartTurn(turn, timelineRef.current);
                        return;
                    }
                    if (turn.turnRound.name === "roundEnd") {

                        turn.status = 2;
                        return;
                    }
                    if (turn.turnRound.name === "roundStart") {
                        playStartRound(turn, timelineRef.current);
                        return;
                    }
                }
            }
        };
        processEvent();
        const intervalId = setInterval(processEvent, 500);
        return () => clearInterval(intervalId);
    }, [mode, playInitTurn, playStartTurn]);
    // useEffect(() => {
    //     console.log("characters", JSON.parse(JSON.stringify(characters)));
    //     turnRoundQueueRef.current.push({ status: 0, turnRound: { name: "reorder", data: game?.currentRound } });

    // }, [characters]);

    return (
        <div
            style={{
                position: "relative",
                width: "100%",
                height: dimension?.itemHeight ?? 1,
            }}
        >
            <div
                ref={trackRef}
                style={{ position: "absolute", left: 0, bottom: 0, width: "100%", height: "100%" }}
            >
                {characters?.map((char, index) =>
                    <TurnItemSprite
                        key={char.character_id}
                        character={char}
                        itemsMapRef={turnBarItemsMapRef}
                        dimension={dimension}
                    />
                )}
                <SeparatorSprite dimension={dimension} separator={separator} />
            </div>
        </div>
    );
};
