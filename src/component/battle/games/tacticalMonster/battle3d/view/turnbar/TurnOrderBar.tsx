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
import { SeparatorSprite } from "./SeparatorSprite";
import { TurnItemSprite } from "./TurnItemSprite";
const GAP = 4;
export type TurnBarDimension = {
    itemWidth: number;
    itemHeight: number;
    separatorWidth: number;
}
export const TurnOrderBar: React.FC = () => {
    const turnRoundQueueRef = useRef<{ status: number, turnRound: { name: string, data: any } }[]>([{ status: 0, turnRound: { name: "init", data: null } }]);
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

    const separator: { ele: HTMLDivElement | null, nextRound: number, index: number } = useMemo(() => {
        const size = game?.currentRound?.turns?.length ?? 0;
        const todos = game?.currentRound?.turns?.filter((turn) => turn.status !== 2).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const index = (todos?.length === 0 || todos?.length === size) ? size : (todos?.length ?? 0);
        return {
            ele: null,
            nextRound: (game?.currentRound?.no ?? 0) + 1,
            index
        };
    }, [game]);

    const turnItems: { character?: MonsterSprite, index?: number, ele?: HTMLDivElement, status?: number }[] = useMemo(() => {
        if (!characters || !game) return [];
        const todos = game?.currentRound?.turns?.filter((turn) => turn.status !== 2).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const dones = game?.currentRound?.turns?.filter((turn) => turn.status === 2).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const turnOrders = [...(todos ?? []), ...(dones ?? [])];
        return turnOrders?.map((turn, index) => {
            const character_id = turn.uid === "boss" ? (turn.bossId ?? turn.minionId) : turn.monsterId;
            const character = characters?.find((c) => c.character_id === character_id);
            return {
                character,
                index,
            };
        });
    }, [characters, game, separator]);



    const coordX = useCallback((index: number, isSeparator: boolean = false) => {
        if (index < 0) return 0 - (dimension?.itemWidth ?? 0) * 1.2 - GAP;
        if (index === 0) return GAP / 2;
        if (isSeparator) return (dimension?.itemWidth ?? 0) * 1.2 + (dimension?.itemWidth ?? 0) * (index - 1) + GAP * (index - 1);
        const offset = separator.index > index || separator.index === 0 ? 0 : (dimension?.itemWidth ?? 0) * 0.75 + GAP;
        return offset + (dimension?.itemWidth ?? 0) * 1.2 + (dimension?.itemWidth ?? 0) * (index - 1) + GAP * (index - 1);
    }, [dimension, separator]);



    const playTurnChange = useCallback((onComplete: () => void) => {


        const todos = game?.currentRound?.turns?.filter((turn) => turn.status !== 2).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const dones = game?.currentRound?.turns?.filter((turn) => turn.status === 2).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const turnOrders = [...(todos ?? []), ...(dones ?? [])];
        const activeCharacterId = turnOrders[0].uid === "boss" ? (turnOrders[0].bossId ?? turnOrders[0].minionId) : turnOrders[0].monsterId;
        const turnItem = turnItems.sort((a, b) => (a.index ?? 0) - (b.index ?? 0)).find((item) => item.character?.character_id === activeCharacterId);
        let offset = turnItem?.index ?? 0;
        const tl = gsap.timeline(
            {
                onComplete: () => {
                    // if (!turnItem?.ele) return;
                    // gsap.set(turnItem?.ele, { boxShadow: "0 0 0 2px white", border: "none" });
                    onComplete();
                }
            }
        );
        if (offset > 0) {
            turnItems.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
            const sl = gsap.timeline();
            tl.add(sl, ">");
            if (separator.ele) {
                separator.index--;
                if (separator.index === 0) {
                    sl.to(separator.ele, {
                        autoAlpha: 0,
                        x: coordX(separator.index, true),
                        duration: 0.3,
                        ease: "power2.out",
                        onComplete: () => {
                            separator.index = turnItems.length;
                            gsap.set(separator.ele, { autoAlpha: 1, x: coordX(separator.index, true) });
                        }
                    }, "<");
                } else {
                    sl.to(separator.ele, {
                        x: coordX(separator.index, true),
                        duration: 0.3,
                        ease: "power2.out",
                    }, "<");
                }
            }

            turnItems.forEach((item) => {
                if (!item.ele || item.index === undefined) return;
                item.index -= 1;
                if (item.index < 0) {
                    sl.to(item.ele, {
                        autoAlpha: 0,
                        duration: 0.3,
                        ease: "power2.out",
                        onComplete: () => {
                            item.index = turnItems.length + (item.index ?? 0);
                            console.log("onComplete item", item)
                            if (!item.ele) return;
                            gsap.set(item.ele, { scale: 1, boxShadow: "none", x: coordX(item.index) });
                            gsap.to(item.ele, { autoAlpha: 1, duration: 1.8, ease: "power2.out" })
                        }
                    }, "<");
                } else {
                    sl.to(item.ele, {
                        scale: item.index === 0 ? 1.2 : 1,
                        boxShadow: item.index === 0 ? "0 0 0 2px white" : "none",
                        x: coordX(item.index),
                        duration: 0.3,
                        ease: "power2.out",
                    }, "<");
                }
            });

        }

        tl.play();

    }, [game, turnItems, separator, dimension]);
    const playTurnInit = useCallback((onComplete: () => void) => {
        console.log("playTurnInit")
        turnItems.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
        const tl = gsap.timeline(
            {
                onComplete
            }
        );
        const targets: HTMLDivElement[] = [];
        const xValues: number[] = [];

        turnItems.forEach((item, index) => {
            if (separator.index === index) {
                if (separator.ele) {
                    gsap.set(separator.ele, { autoAlpha: 1 });
                    targets.push(separator.ele);
                    xValues.push(coordX(index, true));
                }
            }
            if (item?.ele) {
                targets.push(item.ele);
                item.index = index;
                xValues.push(coordX(index));
            }

        });

        if (targets.length > 0) {
            gsap.set(targets, { x: 0, autoAlpha: 0, force3D: true });
            tl.to(targets, {
                x: (i: number) => xValues[i],
                autoAlpha: 1,
                duration: 0.45,
                ease: "expo.out",
                stagger: {
                    each: 0.04,
                    from: "start",
                    ease: "power2.out",
                },
                force3D: true,
                overwrite: "auto",
            }, "<");
        }
        if (turnItems[0]?.ele) {
            tl.to(turnItems[0]?.ele, {
                scale: 1.2,
                boxShadow: "0 0 0 2px white",
                duration: 0.45,
                ease: "power4.out",
                force3D: true,
                overwrite: "auto",
            }, "<");
        }
        if (separator.index === turnItems.length) {
            gsap.set(separator.ele, { x: coordX(separator.index, true) });
            tl.to(separator.ele, {
                autoAlpha: 1,
                duration: 0.5,
                ease: "power2.out",
            }, "<");
        }
        // console.log("init turnItems", turnItems)
        tl.play();
    }, [game, turnItems, dimension, separator]);

    useEffect(() => {
        if (!turnRound) return;
        if (turnRound.name === "init" || turnRound.name === "turnStart") {
            turnRoundQueueRef.current.push({ status: 0, turnRound });
            // console.log("turnRoundQueueRef", JSON.parse(JSON.stringify(turnRoundQueueRef.current)))
        }
    }, [turnRound, game]);
    useEffect(() => {
        if (turnRoundQueueRef.current.length === 0) {
            turnItems.forEach((item) => {
                if (item.ele) {
                    gsap.set(item.ele, { x: coordX(item.index ?? 0) });
                }
            });
            if (separator.ele) {
                gsap.set(separator.ele, { x: coordX(separator.index, true) });
            }
        }
    }, [dimension, turnItems]);

    useEffect(() => {
        const processEvent = () => {

            // console.log("turnQueues", turnQueues.length);
            if (turnRoundQueueRef.current.length > 0) {
                console.log("processQueue", JSON.parse(JSON.stringify(turnRoundQueueRef.current)))
                const turn = turnRoundQueueRef.current[0];
                if (turn.status === 2) {
                    turnRoundQueueRef.current.shift();
                    return;
                } else if (turn.status === 0) {
                    turn.status = 1;
                    if (turn.turnRound.name === "init") {
                        playTurnInit(() => {
                            turn.status = 2;
                        });
                    } else if (turn.turnRound.name === "turnStart") {
                        console.log("turnStart turn:" + JSON.stringify(turn.turnRound.data))
                        playTurnChange(() => {
                            turn.status = 2;
                        });
                    }
                    return;
                }
            }
        }
        const intervalId = setInterval(processEvent, 500);
        return () => clearInterval(intervalId);
    }, [playTurnInit, playTurnChange]);


    return (
        <div
            style={{
                position: "relative",
                width: "100%",
                height: dimension?.itemHeight ?? 1,
            }}
        >
            <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%" }}>
                {turnItems.map((item) =>
                    <TurnItemSprite key={item.character?.character_id} turnItem={item} dimension={dimension} />
                )}
                <SeparatorSprite dimension={dimension} separator={separator} />
            </div>
        </div>
    );
};
