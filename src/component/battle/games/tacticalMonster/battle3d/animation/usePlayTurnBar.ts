/**
 * 3D 行走动画 - GSAP 驱动 position + R3F 模型动画
 * 路径节点始终为逻辑坐标 (q,r)，直接用 hexTo3DCenter 算 3D 位置。
 */
import gsap from "gsap";
import { useCallback, useEffect, useRef } from "react";
import type { GameRound, GameTurn } from "../../types/gameTypes";
import { getPhaseEventKey } from "../../utils/turnBarQueueUtils";
import type { TurnOrderBarSprite } from "../../types/CombatTypes";
import type { TurnBarDimension, TurnBarItemSprite as TurnBarItem } from "../view/turnbar/TurnOrderBar";

/** 召唤等单位未及时渲染时，最多重试次数，超过后跳过以避免无限循环 */
const MAX_DEFER_RETRIES = 50;

interface UsePlayTurnBarOptions {
    dimension: TurnBarDimension | null;
    /** 轨道 ele、separator、itemsMap 均从此 ref 读取 */
    turnOrderBarSpriteRef: React.MutableRefObject<TurnOrderBarSprite | null>;
    playbackSpeed?: number;
}

type StartTurnPayload = {
    turn?: GameTurn;
    character_id?: string;
    currentRound?: GameRound;
};

// Turn bar animation helpers
const GAP = 4;
const CONVEYOR_DURATION_PER_STEP = 0.28;

const getTurnOrderByRound = (round: GameRound) => {
    const todos = round.turns?.filter((turn) => turn.status !== 2).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const dones = round.turns?.filter((turn) => turn.status === 2).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const turnOrders = [...(todos ?? []), ...(dones ?? [])];
    return turnOrders;
};
const clampSeparatorIndex = (index: number, total: number) =>
    total <= 0 ? index : Math.max(1, Math.min(index, total));

export const usePlayTurnBar = ({ dimension, turnOrderBarSpriteRef, playbackSpeed = 1.0 }: UsePlayTurnBarOptions) => {
    const deferRetryCountRef = useRef(0);
    const lastDeferredEventKeyRef = useRef<string>("");

    const getSortedTurnItems = useCallback((): TurnBarItem[] => {
        const items = Array.from(turnOrderBarSpriteRef.current?.itemsMap?.values() ?? []).filter((i: TurnBarItem) => i.order !== undefined && i.order >= 0);
        return items.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    }, [turnOrderBarSpriteRef]);

    const calcCoordX = useCallback(
        (index: number, totalItems: number, separatorIndex: number, isSeparator: boolean = false) => {
            const itemWidth = dimension?.itemWidth ?? 0;
            if (index < 0) return 0 - itemWidth - GAP;
            if (index === 0) return GAP / 2;
            if (isSeparator) {
                return separatorIndex < 1 ? separatorIndex * itemWidth : itemWidth * 1.2 + itemWidth * (separatorIndex - 1) + GAP * (separatorIndex - 1);
            }
            const offset = separatorIndex < 0 || separatorIndex > index ? 0 : itemWidth * 0.75 + GAP;
            return offset + itemWidth * 1.2 + itemWidth * (index - 1) + GAP * (index - 1);
        },
        [dimension]
    );
    const checkTurnItems = useCallback((turnOrder: GameTurn[]): TurnBarItem[] | null => {
        if (!dimension) return null;
        const turnItems = Array.from(turnOrderBarSpriteRef.current?.itemsMap?.values() ?? []);
        const renderCompleted = turnOrder.every((t, index) => {
            const item = turnItems.find(i => i.character_id === t.character_id);
            return item ? true : false;
        });
        if (!renderCompleted) {
            return null;
        }

        return turnItems;
    }, [turnOrderBarSpriteRef, dimension]);

    const syncItemsToCurrentLayout = useCallback(() => {
        const separator = turnOrderBarSpriteRef.current?.separator;
        if (!separator) return;
        const turnItems = Array.from(turnOrderBarSpriteRef.current?.itemsMap?.values() ?? []).filter((i: TurnBarItem) => i.order !== undefined && i.order >= 0);
        const size = turnItems.length;
        turnItems.forEach((item) => {
            if (item.ele) {
                gsap.set(item.ele, {
                    x: calcCoordX(item.index ?? 0, size, separator.index),
                    boxShadow: "none",
                    autoAlpha: 1,
                });
            }
        });
        const tl = gsap.timeline({ timeScale: playbackSpeed });
        turnItems.forEach((item) => {
            if (!item.ele) return;
            const isCurrent = (item.index ?? 0) === 0;
            tl.to(item.ele, {
                autoAlpha: 1,
                scale: isCurrent ? 1.2 : 1,
                boxShadow: isCurrent ? "0 0 0 2px white" : "none",
                duration: 0.5,
                ease: "power2.out",
                overwrite: "auto",
            }, "<");

        });
        if (separator.ele) {
            tl.to(separator.ele, {
                autoAlpha: 1,
                duration: 0.5,
                ease: "power2.out",
                overwrite: "auto",
            }, "<");
            gsap.set(separator.ele, { x: calcCoordX(separator.index, size, separator.index, true) });
        }
        tl.play();
    }, [calcCoordX, dimension, turnOrderBarSpriteRef, playbackSpeed]);



    const playAddRemoveTurn = useCallback(
        ({ turnOrder, turnItems, timeline }: { turnOrder: GameTurn[], turnItems: TurnBarItem[], timeline?: gsap.core.Timeline }) => {
            const separator = turnOrderBarSpriteRef.current?.separator;
            if (!separator) return;

            turnItems.forEach((item) => {
                const turn = turnOrder.find(t => t.character_id === item.character_id);
                if (turn) {
                    item.order = turn.order;
                } else {
                    item.order = item.order !== undefined && item.order >= 0 ? -1 : -2;
                }
            });
            const removes = turnItems.filter(i => i.order === -1);
            const adds = turnItems.filter(i => i.index === undefined);
            const isAddOrRemoved = removes.length > 0 || adds.length > 0;
            console.log("isAddOrRemoved", isAddOrRemoved);
            if (isAddOrRemoved) {
                const todos = turnItems.filter(i => i.order !== undefined && i.order >= 0 && i.status !== 2).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                const dones = turnItems.filter(i => i.order !== undefined && i.order >= 0 && i.status === 2).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                const turnOrderItems = [...todos, ...dones];
                separator.index = todos.length;
                const cl = gsap.timeline({
                    timeScale: playbackSpeed
                });
                turnOrderItems.forEach((t: TurnBarItem, index: number) => {
                    t.index = index;
                    if (t.ele) {
                        cl.to(t.ele, {
                            autoAlpha: 1,
                            x: calcCoordX(index, turnItems.length, separator.index),
                            duration: 0.5,
                            ease: "power2.out",
                            overwrite: "auto",
                        }, "<");
                    }
                });
                removes.forEach((d: TurnBarItem) => {
                    if (d.ele) {
                        cl.to(d.ele, { autoAlpha: 0, duration: 0.5, ease: "power2.out", overwrite: "auto" }, "<");
                    }
                });
                if (separator.ele) {
                    cl.to(separator.ele, {
                        x: calcCoordX(separator.index, turnItems.length, separator.index, true),
                        duration: 0.5,
                        ease: "power2.out",
                        overwrite: "auto",
                    }, "<");
                }
                timeline?.add(cl);
            }

        },
        [dimension, calcCoordX, turnOrderBarSpriteRef, playbackSpeed]
    );

    const playMoveTurn = useCallback(
        ({
            turnOrder,
            turnItems,
            timeline,
        }: {
            turnOrder: GameTurn[],
            turnItems: TurnBarItem[],
            timeline?: gsap.core.Timeline,
            animateHighlight?: boolean,
            showHighlight?: boolean
        }) => {
            const separator = turnOrderBarSpriteRef.current?.separator;
            if (!separator) return;

            const firstTurn = turnOrder[0];
            const firstItem = turnItems.find((t) => t.character_id === firstTurn?.character_id);
            const offsetSteps = firstItem?.index ?? 0;
            const moveOuts = turnItems.filter(i => i.index !== undefined && i.index < offsetSteps);
            console.log("moveOuts", moveOuts, offsetSteps, firstItem, turnItems.map((item) => item.character_id + ":" + item.index + ":" + item.status));
            // 先按 turnOrder 同步状态；后续无论是否位移，都要统一落位并重置/重建高亮。
            turnOrder.forEach((t: GameTurn, index: number) => {
                const item = turnItems.find(i => i.character_id === t.character_id);
                if (item) {
                    item.index = index;
                    item.status = t.status ?? 0;
                }
            });

            const previousSeparatorIndex = separator.index;
            const todosCount = turnOrder.filter((t) => (t.status ?? 0) !== 2).length;
            const shouldMoveTrack = offsetSteps > 0;
            // separator 的真实位置始终由未完成数量决定，避免 roundStart 后被旋转公式拉到左侧。
            separator.index = todosCount;
            const isNewRound = shouldMoveTrack && separator.index > previousSeparatorIndex;
            const trackEl = turnOrderBarSpriteRef.current?.ele ?? null;
            const tl = gsap.timeline({
                timeScale: playbackSpeed,
            });
            timeline?.add(tl, ">");

            if (trackEl && shouldMoveTrack) {

                const itemWidth = dimension?.itemWidth ?? 0;
                const totalDistance = isNewRound ? itemWidth * 0.75 + GAP + (itemWidth + GAP) * (offsetSteps - 1) : (itemWidth + GAP) * offsetSteps;
                const duration = CONVEYOR_DURATION_PER_STEP * offsetSteps;
                tl.to(trackEl, { x: -totalDistance, duration, ease: "none", overwrite: "auto" });

                tl.add(() => {
                    const size = turnItems.length;
                    if (trackEl) {
                        gsap.set(trackEl, { x: 0 });
                    }
                    turnItems.forEach((item) => {
                        if (item.ele) {
                            const isMoveOut = moveOuts.find(i => i.character_id === item.character_id);
                            const isFirstItem = firstItem?.character_id === item.character_id;
                            gsap.set(item.ele, {
                                autoAlpha: isMoveOut ? 0 : 1,
                                scale: isFirstItem ? 1.2 : 1,
                                x: calcCoordX(item.index ?? 0, size, separator.index),
                                boxShadow: "none",
                            });
                        }
                    });
                    if (separator.ele) {
                        gsap.set(separator.ele, { autoAlpha: isNewRound ? 0 : 1, x: calcCoordX(separator.index, size, separator.index, true) });
                    }
                }, ">");


                const ml = gsap.timeline({
                    timeScale: playbackSpeed, onComplete: () => {
                        console.log("move and back complete", moveOuts.map((item) => item.character_id + ":" + item.index));
                    }
                });
                moveOuts.forEach((item) => {
                    if (item.ele) {
                        ml.to(item.ele, { autoAlpha: 1, duration: 0.3, ease: "power2.out" }, "<");
                    }
                });
                if (separator.ele) {
                    ml.to(separator.ele, { autoAlpha: 1, duration: 0.3, ease: "power2.out" }, "<");
                }
                tl.add(ml, ">=+0.3");
                // if (firstItem?.ele) {
                //     tl.to(firstItem.ele, { scale: 1.2, duration: 0.3, ease: "power2.out" }, "<=+0.5");
                // }

            } else {
                // 无需移动轨道时，仍需确保最左侧（当前回合）元素有 1.2 缩放和高亮
                const size = turnItems.length;
                turnItems.forEach((item) => {
                    if (item.ele) {
                        const isFirstItem = firstItem?.character_id === item.character_id;
                        gsap.set(item.ele, {
                            scale: isFirstItem ? 1.2 : 1,
                            boxShadow: isFirstItem ? "0 0 0 2px white" : "none",
                            x: calcCoordX(item.index ?? 0, size, separator.index),
                        });
                    }
                });
            }

        },
        [dimension, calcCoordX, playbackSpeed, turnOrderBarSpriteRef]
    );
    const playStartTurn = useCallback((
        event: { status: number; phaseChangeEvent: { name: string; data: any } },
        timeline?: gsap.core.Timeline,
        options?: { animateHighlight?: boolean }
    ) => {

        const turnData = event.phaseChangeEvent.data as StartTurnPayload;
        const currentRound = turnData.currentRound;
        const turnOrder = getTurnOrderByRound(currentRound!!);
        console.log("turnOrder", turnOrder, currentRound);
        const turnItems = checkTurnItems(turnOrder);

        if (!turnItems || turnItems.length === 0) {
            const eventKey = getPhaseEventKey(event.phaseChangeEvent);
            const isSameDeferred = lastDeferredEventKeyRef.current === eventKey;
            if (isSameDeferred) {
                deferRetryCountRef.current += 1;
            } else {
                lastDeferredEventKeyRef.current = eventKey;
                deferRetryCountRef.current = 1;
            }
            if (deferRetryCountRef.current > MAX_DEFER_RETRIES) {
                console.warn("[usePlayTurnBar] turnStart deferred too long (e.g. summoned char not rendered), skipping to unblock queue");
                lastDeferredEventKeyRef.current = "";
                deferRetryCountRef.current = 0;
                event.status = 2;
            } else {
                event.status = 0;
            }
            timeline?.play();
            return;
        }
        lastDeferredEventKeyRef.current = "";
        deferRetryCountRef.current = 0;

        const cl = gsap.timeline({ timeScale: playbackSpeed });
        playAddRemoveTurn({ turnOrder, turnItems, timeline: cl });
        timeline?.add(cl, ">");
        const ml = gsap.timeline({ timeScale: playbackSpeed, onComplete: () => { event.status = 2; } });
        playMoveTurn({
            turnOrder,
            turnItems,
            timeline: ml,
            animateHighlight: options?.animateHighlight ?? true,
        });


        const firstItem = turnItems.find(t => t.character_id === turnOrder[0]?.character_id);
        if (firstItem && firstItem.ele) {
            console.log("firstItem", firstItem, event);
            ml.to(firstItem.ele, { boxShadow: "0 0 0 2px white", duration: 0, ease: "none" }, ">");
        }

        timeline?.add(ml, ">");
        timeline?.play();

    }, [dimension, turnOrderBarSpriteRef, playbackSpeed, playAddRemoveTurn, playMoveTurn]);
    const playStartRound = useCallback(
        (
            event: { status: number, phaseChangeEvent: { name: string, data: any } }, timeline?: gsap.core.Timeline
        ) => {
            const separator = turnOrderBarSpriteRef.current?.separator;
            if (!separator) {
                event.status = 2;
                timeline?.play();
                return;
            }
            const round = event.phaseChangeEvent.data.round;
            const roundNo = typeof round === "object" && round !== null && "no" in round ? (round as { no: number }).no : 1;
            separator.nextRound = roundNo;
            if (separator.txtEle) {
                separator.txtEle.textContent = String(roundNo);
            }
            const turnOrder = getTurnOrderByRound(round);
            const turnItems = Array.from(turnOrderBarSpriteRef.current?.itemsMap?.values() ?? []).filter((i: TurnBarItem) => i.order !== undefined && i.order >= 0);
            // turnItems.forEach((item) => {
            //     const turn = turnOrder.find(t => t.character_id === item.character_id);
            //     if (turn) {
            //         item.status = turn.status ?? 0;
            //     }
            // });
            const cl = gsap.timeline({ timeScale: playbackSpeed });
            playAddRemoveTurn({ turnOrder, turnItems, timeline: cl });
            timeline?.add(cl, ">");
            const ml = gsap.timeline({ timeScale: playbackSpeed, onComplete: () => { event.status = 2; } });
            playMoveTurn({ turnOrder, turnItems, timeline: ml, animateHighlight: false, showHighlight: false });

            // const firstItem = turnItems.find(t => t.character_id === turnOrder[0]?.character_id);
            // if (firstItem && firstItem.ele) {
            //     ml.to(firstItem.ele, { scale: 1.2, boxShadow: "none", duration: 0.5, ease: "power2.out", overwrite: "auto" }, "<");
            // }
            timeline?.add(ml, ">");
            timeline?.play();


        }, [dimension, turnOrderBarSpriteRef, playbackSpeed, playAddRemoveTurn, playMoveTurn]
    );


    const playInitTurn = useCallback(
        (
            turn: { status: number; phaseChangeEvent: { name: string; data: any } },
            timeline?: gsap.core.Timeline
        ) => {
            if (!dimension) {
                turn.status = 0;
                timeline?.play();
                return
            }
            const currentRound = turn.phaseChangeEvent.data as GameRound;
            const renderCompleted = currentRound.turns?.every((t, index) => {
                const item = turnOrderBarSpriteRef.current?.itemsMap?.get(t.character_id);
                return item ? true : false;
            });
            if (!renderCompleted) {
                const eventKey = getPhaseEventKey(turn.phaseChangeEvent);
                const isSameDeferred = lastDeferredEventKeyRef.current === eventKey;
                if (isSameDeferred) {
                    deferRetryCountRef.current += 1;
                } else {
                    lastDeferredEventKeyRef.current = eventKey;
                    deferRetryCountRef.current = 1;
                }
                if (deferRetryCountRef.current > MAX_DEFER_RETRIES) {
                    console.warn("[usePlayTurnBar] init deferred too long (e.g. summoned char not rendered), skipping to unblock queue");
                    lastDeferredEventKeyRef.current = "";
                    deferRetryCountRef.current = 0;
                    turn.status = 2;
                } else {
                    turn.status = 0;
                }
                timeline?.play();
                return;
            }
            lastDeferredEventKeyRef.current = "";
            deferRetryCountRef.current = 0;

            const separator = turnOrderBarSpriteRef.current?.separator;
            if (!separator) {
                turn.status = 0;
                timeline?.play();
                return;
            }

            Array.from(turnOrderBarSpriteRef.current?.itemsMap?.values() ?? []).forEach((item) => {
                const turn = currentRound.turns?.find(t => t.character_id === item.character_id);
                if (turn) {
                    item.status = turn.status ?? 0;
                    item.order = turn.order;
                } else {
                    item.order = -1;
                }
            });
            const turnItems = getSortedTurnItems();

            const todos = turnItems.filter(i => i.order !== undefined && i.order >= 0 && i.status < 2).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            const dones = turnItems.filter(i => i.order !== undefined && i.order >= 0 && i.status === 2).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            [...todos, ...dones].forEach((t: TurnBarItem, index: number) => {
                t.index = index;
            });
            separator.index = todos.length === 0 ? -1 : clampSeparatorIndex(todos.length, turnItems.length);

            const tl = gsap.timeline({
                timeScale: playbackSpeed,
                onComplete: () => {
                    console.log("init turn complete", turnOrderBarSpriteRef.current?.itemsMap);
                    turn.status = 2;
                    // syncItemsToCurrentLayout();
                }
            });

            turnItems.forEach((t: TurnBarItem) => {
                if (t.ele) {
                    const idx = t.index ?? 0;
                    const x = calcCoordX(idx, turnItems.length, separator.index);
                    tl.to(t.ele, {
                        x,
                        scale: 1,
                        boxShadow: "none",
                        duration: 0.5,
                        ease: "power2.out",
                        overwrite: "auto",
                    }, "<");
                }
            });
            if (separator.ele) {
                const x = calcCoordX(separator.index, turnItems.length, separator.index, true);
                gsap.set(separator.ele, { x, autoAlpha: 0 });
                tl.to(separator.ele, {
                    autoAlpha: 1,
                    duration: 0.5,
                    ease: "power2.out",
                    overwrite: "auto",
                }, ">");

            }
            const initFirstItemEle = turnItems.find((i) => (i.index ?? -1) === 0)?.ele;
            if (initFirstItemEle) {
                // init 阶段仅静态显示当前高亮，避免与随后的 turnStart 放大动画叠加成“双动画”。
                tl.add(() => {
                    gsap.set(initFirstItemEle, {
                        scale: 1.2,
                        boxShadow: "0 0 0 2px white",
                    });
                }, ">");
            }
            timeline?.add(tl, ">");

            timeline?.play();
        },
        [calcCoordX, dimension, turnOrderBarSpriteRef, playbackSpeed]
    );
    useEffect(() => {
        syncItemsToCurrentLayout();
    }, [syncItemsToCurrentLayout]);
    return { playStartTurn, playInitTurn, playStartRound, syncItemsToCurrentLayout };
};
