/**
 * 回合顺序条（先攻条）- Braveland 式全局排序展示
 * 左下角横排；展示 monsterId、血条、攻击范围；
 * 最左侧永远为当前 turn；完成时左移消失后在序列最右侧重新出现。
 * 动画由 GSAP 驱动，支持 playbackSpeed 同步。
 */

import gsap from "gsap";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { useCombatManager } from "../../../service/CombatManager";
import { MonsterSprite } from "../../../types/CombatTypes";
import { GameRound } from "../../../types/gameTypes";
import { TurnItemSprite } from "./TurnItemSprite";
const GAP = 4;
export const TurnOrderBar: React.FC = () => {
    const turnRoundQueueRef = useRef<{ status: number, turnRound: { name: string, data: any } }[]>([]);
    const { game, mapDimension, turnRound, characters, playbackSpeed = 1.0 } = useCombatManager();
    // const { containerRef, dimension } = useTurnOrderBarDimension({ itemCount: 5, hasSeparator: true })
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
    const turnItems: { character: MonsterSprite, initCompleted?: boolean, ele?: HTMLDivElement }[] = useMemo(() => {
        if (!characters) return [];
        return characters?.map((character) => {
            return {
                character,
            };
        });
    }, [characters]);


    const coordX = useCallback((index: number) => {
        console.log("coordX", index, dimension?.itemWidth, GAP);
        return (dimension?.itemWidth ?? 0) * index + GAP * index;
    }, [dimension]);


    const playTurnChange = useCallback((turnRound: { status: number, round: GameRound }) => {
        console.log("playTurnChange", turnRound);
        const tl = gsap.timeline({
            onComplete: () => {
                turnRound.status = 2;
            },
        });
        const todos = turnRound.round.turns.filter((turn) => turn.status !== 2).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        // console.log("todos", todos);
        todos.forEach((turn, index) => {
            const characterId = turn.uid === "boss" ? (turn.bossId ?? turn.minionId) : turn.monsterId;
            const item = turnItems.find((item) => item.character.character_id === characterId);
            if (item?.ele) {
                console.log("item", item, index);
                tl.to(item.ele, {
                    x: coordX(index),
                    duration: item.initCompleted ? 0.3 : 0,
                    ease: "power2.out",
                    onComplete: () => {
                        item.initCompleted = true;
                    },
                }, "<");
            }
        });
        const completeds = turnRound.round.turns.filter((turn) => turn.status === 2).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        // console.log("completeds", completeds);
        if (completeds.length > 0) {

            completeds.forEach((turn, index) => {
                const characterId = turn.uid === "boss" ? (turn.bossId ?? turn.minionId) : turn.monsterId;
                const item = turnItems.find((item) => item.character.character_id === characterId);
                if (item?.ele) {
                    if (index === completeds.length - 1) {
                        tl.to(item.ele, {
                            x: coordX(-1),
                            duration: 0.3,
                            ease: "power2.out",
                            onComplete: () => {
                                if (item.ele) {
                                    item.ele.style.opacity = "0";
                                }
                            },
                        }, "<");
                    } else {
                        tl.to(item.ele, {
                            x: coordX(todos.length + index),
                            duration: item.initCompleted ? 0.3 : 0,
                            ease: "power2.out",
                            onStart: () => {
                                console.log("item start", item);
                                item.initCompleted = true;
                            },
                        }, "<");
                    }
                }
            });
            const lastTurn = completeds[completeds.length - 1];
            const lastCharacterId = lastTurn.uid === "boss" ? (lastTurn.bossId ?? lastTurn.minionId) : lastTurn.monsterId;
            const lastItem = turnItems.find((item) => item.character.character_id === lastCharacterId);
            if (lastItem?.ele) {
                tl.to(lastItem.ele, {
                    x: coordX(todos.length + completeds.length - 1),
                    duration: 0,
                }, ">");
                tl.to(lastItem.ele, {
                    autoAlpha: 1,
                    duration: 0.6,
                    ease: "power2.out",
                }, ">");
            }

        }
        tl.play();

    }, [turnItems, dimension]);
    useEffect(() => {
        if (!turnRound) return;
        console.log("turnRound", turnRound, game?.currentRound);
        turnRoundQueueRef.current.push({ status: 0, turnRound });
    }, [turnRound, game]);

    useEffect(() => {
        const processEvent = () => {
            const turnQueues = turnRoundQueueRef.current;
            // console.log("turnQueues", turnQueues.length);
            if (turnQueues.length > 0) {
                if (turnQueues[0].status === 2) {
                    console.log("pop", JSON.parse(JSON.stringify(turnRoundQueueRef.current)));
                    const done = turnRoundQueueRef.current.pop();
                    console.log("done", done);
                    return;
                } else if (turnQueues[0].status === 0) {
                    turnQueues[0].status = 1;
                    // playTurnChange(turnQueues[0]);
                    return;
                }

            }
        }
        const intervalId = setInterval(processEvent, 10000);
        return () => clearInterval(intervalId);
    }, [dimension]);



    return (
        <div
            style={{
                position: "relative",
                width: "100%",
                height: dimension?.itemHeight ?? 1,
            }}
        >
            <div style={{ position: "absolute", left: "50%", top: 0, width: turnItems.length * (dimension?.itemWidth ?? 0), height: "100%", transform: "translate(-50%,0)" }}>
                {turnItems.map((item) =>
                    <TurnItemSprite key={item.character.uid + "_" + item.character.character_id} turnItem={item} dimension={dimension} />
                )}
            </div>
        </div>
    );
};
