/**
 * 3D 行走动画 - GSAP 驱动 position + R3F 模型动画
 * 路径节点始终为逻辑坐标 (q,r)，直接用 hexTo3DCenter 算 3D 位置。
 */
import gsap from "gsap";
import { useCallback, useEffect } from "react";
import type { GameRound, GameTurn } from "../../types/gameTypes";
import type { TurnBarDimension, TurnBarItem } from "../view/turnbar/TurnOrderBar";

interface UsePlayTurnBarOptions {
    dimension: TurnBarDimension | null;
    itemsMapRef: React.RefObject<Map<string, TurnBarItem>>;
    separator: { ele: HTMLDivElement | null, txtEle: HTMLDivElement | null, nextRound: number, index: number };
    trackRef?: React.RefObject<HTMLDivElement | null>;
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
const getRotatedSeparatorIndex = (base: number, offsetSteps: number, total: number) =>
    (((base - 1 - offsetSteps) % total) + total) % total + 1;

export const usePlayTurnBar = ({ dimension, itemsMapRef, separator, trackRef, playbackSpeed = 1.0 }: UsePlayTurnBarOptions) => {

    const getSortedTurnItems = useCallback((): TurnBarItem[] => {
        const items = Array.from(itemsMapRef.current?.values() ?? []).filter((i: TurnBarItem) => i.order !== undefined && i.order >= 0);
        return items.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    }, [itemsMapRef]);

    const calcCoordX = useCallback(
        (index: number, totalItems: number, separatorIndex: number, isSeparator: boolean = false) => {
            const itemWidth = dimension?.itemWidth ?? 0;
            if (index < 0) return 0 - itemWidth * 1.2 - GAP;
            if (index === 0) return GAP / 2;
            if (isSeparator) {
                const s = clampSeparatorIndex(index, totalItems);
                return itemWidth * 1.2 + itemWidth * (s - 1) + GAP * (s - 1);
            }
            const s = clampSeparatorIndex(separatorIndex, totalItems);
            const offset = s > index ? 0 : itemWidth * 0.75 + GAP;
            return offset + itemWidth * 1.2 + itemWidth * (index - 1) + GAP * (index - 1);
        },
        [dimension]
    );

    const syncItemsToCurrentLayout = useCallback(() => {
        const turnItems = Array.from(itemsMapRef.current?.values() ?? []).filter((i: TurnBarItem) => i.order !== undefined && i.order >= 0);
        const size = turnItems.length;
        turnItems.forEach((item) => {
            if (!item.ele) return;
            const isCurrent = (item.index ?? 0) === 0;
            const x = calcCoordX(item.index ?? 0, size, separator.index);
            gsap.set(item.ele, {
                x,
                scale: isCurrent ? 1.2 : 1,
                boxShadow: isCurrent ? "0 0 0 2px white" : "none",
                autoAlpha: 1,
            });
        });
        if (separator.ele) {
            gsap.set(separator.ele, { x: calcCoordX(separator.index, size, separator.index, true) });
        }
    }, [calcCoordX, dimension, itemsMapRef, separator]);



    const applyRoundLayoutByIds = useCallback((orderIds: string[], separatorIndex?: number) => {
        const size = orderIds.length;
        if (size <= 0) return;
        orderIds.forEach((characterId, index) => {
            const item = itemsMapRef.current?.get(characterId);
            if (item) item.index = index;
        });
        if (separatorIndex !== undefined) {
            separator.index = clampSeparatorIndex(separatorIndex, size);
        }
    }, [itemsMapRef, separator]);

    const highlightCurrentItem = useCallback((item?: TurnBarItem, timeline?: gsap.core.Timeline) => {
        if (!item?.ele) {
            if (timeline) {
                timeline.add(() => {
                    syncItemsToCurrentLayout();
                }, ">");
                return;
            }
            syncItemsToCurrentLayout();
            return;
        }
        const target = item.ele;
        const tweenVars: gsap.TweenVars = {
            scale: 1.2,
            boxShadow: "0 0 0 2px white",
            duration: 0.2,
            ease: "power2.out",
            overwrite: "auto",
            onComplete: () => {
                syncItemsToCurrentLayout();
            },
        };
        if (timeline) {
            timeline.to(target, tweenVars, ">");
            return;
        }
        gsap.to(target, tweenVars);
    }, [syncItemsToCurrentLayout]);

    const playStartTurn = useCallback((turn: { status: number; phaseChangeEvent: { name: string; data: any } }, timeline?: gsap.core.Timeline) => {
        if (!dimension) {
            turn.status = 0;
            timeline?.play();
            return
        }
        const turnData = turn.phaseChangeEvent.data as StartTurnPayload;
        const currentRound = turnData.currentRound;
        const activeCharacterId = turnData.turn?.character_id ?? turnData.character_id;
        const turnItems = Array.from(itemsMapRef.current?.values() ?? []);
        const renderCompleted = currentRound?.turns?.every((t, index) => {
            const item = turnItems.find(i => i.character_id === t.character_id);
            return item ? true : false;
        });
        if (!renderCompleted || !activeCharacterId) {
            turn.status = 0;
            timeline?.play();
            return;
        }
        console.log("turnItems:", turnItems, currentRound?.turns);

        const noChange = turnItems.every((item) => {
            const turn = currentRound?.turns?.find(t => t.character_id === item.character_id);
            if (turn && turn.status === item.status && turn.order === item.order) {
                return true;
            }
            return false;
        });

        if (noChange) {
            turn.status = 2;
            timeline?.play();
            return;
        }

        turnItems.forEach((item) => {
            const turn = currentRound?.turns?.find(t => t.character_id === item.character_id);
            if (turn) {
                item.order = turn.order;
            } else {
                item.order = item.order && item.order > 0 ? -1 : -2;
            }
        });
        const removes = turnItems.filter(i => i.order === -1);
        const todos = turnItems.filter(i => i.order !== undefined && i.order >= 0 && i.status !== 2).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const dones = turnItems.filter(i => i.order !== undefined && i.order >= 0 && i.status === 2).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const turnOrderItems = [...todos, ...dones];
        const isReordered = turnOrderItems.every((t: TurnBarItem, index: number) => t.index === index);
        if (!isReordered) {
            separator.index = todos.length;
            const cl = gsap.timeline({ timeScale: playbackSpeed });
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

            cl.to(separator.ele, {
                x: calcCoordX(separator.index, turnItems.length, separator.index, true),
                duration: 0,
                overwrite: "auto",
            }, ">");
            timeline?.add(cl);
        }
        if (removes.length > 0) {
            separator.index = todos.length;
            const dl = gsap.timeline({ timeScale: playbackSpeed });
            removes.forEach((d: TurnBarItem) => {
                if (d.ele) {
                    dl.to(d.ele, { autoAlpha: 0, duration: 0.5, ease: "power2.out", overwrite: "auto" }, "<");
                }
            });
            timeline?.add(dl, "<");
        }


        if (currentRound) {
            const turnOrder = getTurnOrderByRound(currentRound);
            const offsetSteps = turnItems.find(t => t.character_id === activeCharacterId)?.index ?? 0;
            if (offsetSteps <= 0) {
                syncItemsToCurrentLayout();
                turn.status = 2;
                timeline?.play();
                return;
            }

            turnOrder.forEach((t: GameTurn, index: number) => {
                const item = turnItems.find(i => i.character_id === t.character_id);
                if (item) {
                    item.index = index;
                    item.status = t.status ?? 0;
                }
            });
            const expectedSeparatorIndex = getRotatedSeparatorIndex(separator.index, offsetSteps, turnOrder.length);
            separator.index = expectedSeparatorIndex;

            const trackEl = trackRef?.current;
            if (trackEl) {
                const itemWidth = dimension?.itemWidth ?? 0;
                const totalDistance = (itemWidth + GAP) * offsetSteps;
                const tl = gsap.timeline({
                    timeScale: playbackSpeed,
                    onComplete: () => {
                        gsap.set(trackEl, { x: 0 });
                        syncItemsToCurrentLayout();
                        turn.status = 2;
                    },
                });
                timeline?.add(tl, ">");
                tl.to(trackEl, { x: -totalDistance, duration: CONVEYOR_DURATION_PER_STEP * offsetSteps, ease: "none", overwrite: "auto" });
                timeline?.play();
                return;
            }
        }
        timeline?.play();


    }, [applyRoundLayoutByIds, getSortedTurnItems, dimension?.itemWidth, itemsMapRef, playbackSpeed, separator, syncItemsToCurrentLayout, trackRef]);
    const playStartRound = useCallback(
        (
            turn: { status: number, phaseChangeEvent: { name: string, data: any } }, timeline?: gsap.core.Timeline
        ) => {
            const round = turn.phaseChangeEvent.data.round;

            const turnOrders = getTurnOrderByRound(round);
            turnOrders.forEach((turn, index) => {
                const item = itemsMapRef.current?.get(turn.character_id);
                if (item) {
                    item.order = turn.order;
                    item.index = index;
                    item.status = turn.status ?? 0;
                }
            });

            const total = turnOrders.length;
            separator.index = total;
            separator.nextRound = round.no + 1;
            if (separator.txtEle) {
                separator.txtEle.textContent = separator.nextRound.toString();
            }
            const tl = gsap.timeline(
                {
                    onComplete: () => {
                        syncItemsToCurrentLayout();
                        turn.status = 2;
                    }
                }
            );
            const turnItems = getSortedTurnItems();
            turnItems.forEach((item) => {
                if (!item.ele) return;
                const isCurrent = (item.index ?? 0) === 0;
                tl.to(item.ele, {
                    x: calcCoordX(item.index ?? 0, total, separator.index),
                    scale: isCurrent ? 1.2 : 1,
                    boxShadow: isCurrent ? "0 0 0 2px white" : "none",
                    autoAlpha: 1,
                    duration: 0.5,
                    ease: "power2.out",
                    overwrite: "auto",
                }, "<");
            });
            if (separator.ele) {
                tl.to(separator.ele, { autoAlpha: 0, duration: 0.5, ease: "power2.out", overwrite: "auto" }, "<");
                tl.to(separator.ele, { x: calcCoordX(separator.index, total, separator.index, true), duration: 0 }, ">");
                tl.to(separator.ele, { autoAlpha: 1, duration: 0.5, ease: "power2.out" }, ">");
            }
            timeline?.add(tl, ">");
            timeline?.play();


        }, [calcCoordX, dimension?.itemWidth, separator, getSortedTurnItems, syncItemsToCurrentLayout]
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

            const turnItems = Array.from(itemsMapRef.current?.values() ?? []);
            const renderCompleted = currentRound.turns?.every((t, index) => {
                const item = turnItems.find(i => i.character_id === t.character_id);
                return item ? true : false;
            });
            if (!renderCompleted) {
                turn.status = 0;
                timeline?.play();
                return;
            }

            turnItems.forEach((item) => {
                const turn = currentRound.turns?.find(t => t.character_id === item.character_id);
                if (turn) {
                    item.status = turn.status ?? 0;
                    item.order = turn.order;
                } else {
                    item.order = -1;
                }
            });
            console.log("turnItems init:", turnItems, currentRound.turns);
            const todos = turnItems.filter(i => i.order !== undefined && i.order >= 0 && i.status < 2).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            const dones = turnItems.filter(i => i.order !== undefined && i.order >= 0 && i.status === 2).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            [...todos, ...dones].forEach((t: TurnBarItem, index: number) => {
                t.index = index;
            });
            separator.index = todos.length;

            const tl = gsap.timeline({
                timeScale: playbackSpeed,
                onComplete: () => {
                    console.log("init turn complete", itemsMapRef.current);
                    turn.status = 2;
                    // syncItemsToCurrentLayout();
                }
            });

            turnItems.forEach((t: TurnBarItem, index: number) => {
                if (t.ele) {
                    const x = calcCoordX(index, turnItems.length, separator.index);

                    tl.to(t.ele, {
                        x,
                        scale: index === 0 ? 1.2 : 1,
                        boxShadow: index === 0 ? "0 0 0 2px white" : "none",
                        duration: 0.5,
                        ease: "power2.out",
                        overwrite: "auto",
                    }, "<");
                }
            });
            if (separator.ele) {
                const x = calcCoordX(separator.index, turnItems.length, separator.index, true);
                tl.to(separator.ele, {
                    x,
                    duration: 0.5,
                    ease: "power2.out",
                    overwrite: "auto",
                }, "<");
                tl.to(separator.ele, { autoAlpha: 1, duration: 0.5, ease: "power2.out" }, ">");
            }
            timeline?.add(tl, ">");

            timeline?.play();
        },
        [calcCoordX, dimension, itemsMapRef, playbackSpeed, separator, syncItemsToCurrentLayout]
    );
    useEffect(() => {
        syncItemsToCurrentLayout();
    }, [syncItemsToCurrentLayout]);
    return { playStartTurn, playInitTurn, playStartRound, syncItemsToCurrentLayout };
};
