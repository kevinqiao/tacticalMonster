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
        [dimension?.itemWidth]
    );

    const syncItemsToCurrentLayout = useCallback(() => {
        const turnItems = getSortedTurnItems();
        const total = turnItems.length;
        separator.index = clampSeparatorIndex(separator.index, total);
        turnItems.forEach((item) => {
            if (!item.ele) return;
            const isCurrent = (item.index ?? 0) === 0;
            gsap.set(item.ele, {
                x: calcCoordX(item.index ?? 0, total, separator.index),
                scale: isCurrent ? 1.2 : 1,
                boxShadow: isCurrent ? "0 0 0 2px white" : "none",
                autoAlpha: 1,
            });
        });
        if (separator.ele) {
            gsap.set(separator.ele, { x: calcCoordX(separator.index, total, separator.index, true) });
        }
    }, [calcCoordX, itemsMapRef, separator]);

    const getSortedTurnItems = useCallback((): TurnBarItem[] => {
        const items = Array.from(itemsMapRef.current?.values() ?? []);
        items.forEach((i) => { if (i.index === undefined) i.index = -1; });
        return [...items].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    }, [itemsMapRef]);

    const applyRoundLayoutByIds = useCallback((orderIds: string[], separatorIndex?: number) => {
        orderIds.forEach((characterId, index) => {
            const item = itemsMapRef.current?.get(characterId);
            if (item) item.index = index;
        });
        const size = orderIds.length;
        if (size <= 0) return;
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
    const playStartTurn = useCallback((turn: { status: number; turnRound: { name: string; data: any } }, timeline?: gsap.core.Timeline) => {
        const turnData = turn.turnRound.data as StartTurnPayload;
        const currentRound = turnData.currentRound;
        const turnItems = getSortedTurnItems();
        if (turnItems.length !== (currentRound?.turns?.length ?? 0)) {
            turn.status = 0;
            timeline?.play();
            return;
        }
        const activeCharacterId = turnData.turn?.character_id ?? turnData.character_id;

        if (turnItems.some((i) => (i.index ?? 0) < 0) && currentRound) {
            getTurnOrderByRound(currentRound).forEach((t, index) => {
                const item = itemsMapRef.current?.get(t.character_id);
                if (item) item.index = index;
            });
            syncItemsToCurrentLayout();
            turn.status = 2;
            return;
        }
        if (!activeCharacterId) return;

        const sorted = [...turnItems].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
        const oldOrderIds = sorted.map((i) => i.character_id);
        const activeOldIndex = sorted.findIndex((i) => i.character_id === activeCharacterId);
        const offsetSteps = Math.max(0, activeOldIndex);
        const totalItems = turnItems.length;
        const rotatedOrderIds = oldOrderIds.slice(offsetSteps).concat(oldOrderIds.slice(0, offsetSteps));
        const expectedSeparatorIndex = getRotatedSeparatorIndex(
            clampSeparatorIndex(separator.index, totalItems),
            offsetSteps,
            totalItems,
        );

        const finishTurn = () => {
            turn.status = 2;
            applyRoundLayoutByIds(rotatedOrderIds, expectedSeparatorIndex);
            syncItemsToCurrentLayout();
        };

        if (offsetSteps <= 0) {
            finishTurn();
            timeline?.play();
            return;
        }

        const trackEl = trackRef?.current;
        if (trackEl) {
            const itemWidth = dimension?.itemWidth ?? 0;
            const totalDistance = (itemWidth + GAP) * offsetSteps;
            const tl = gsap.timeline({
                timeScale: playbackSpeed,
                onComplete: () => {
                    gsap.set(trackEl, { x: 0 });
                    finishTurn();
                },
            });
            timeline?.add(tl, ">");
            tl.to(trackEl, { x: -totalDistance, duration: CONVEYOR_DURATION_PER_STEP * offsetSteps, ease: "none", overwrite: "auto" });
            timeline?.play();
            return;
        }

        finishTurn();
    }, [applyRoundLayoutByIds, getSortedTurnItems, dimension?.itemWidth, itemsMapRef, playbackSpeed, separator, syncItemsToCurrentLayout, trackRef]);
    const playStartRound = useCallback(
        (
            turn: { status: number, turnRound: { name: string, data: any } }, timeline?: gsap.core.Timeline
        ) => {
            const round = turn.turnRound.data.round;

            const turnOrders = getTurnOrderByRound(round);
            turnOrders.forEach((turn, index) => {
                const item = itemsMapRef.current?.get(turn.character_id);
                if (item) item.index = index;
            });
            const turnItems = getSortedTurnItems();
            const total = turnItems.length;
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
            turn: { status: number; turnRound: { name: string; data: any } },
            timeline?: gsap.core.Timeline
        ) => {
            const round = turn.turnRound.data as GameRound;
            const turnOrders = getTurnOrderByRound(round);
            const visibleOrderIds = turnOrders
                .map((t) => t.character_id)
                .filter((id) => itemsMapRef.current?.has(id));
            const size = visibleOrderIds.length;
            if (size <= 0) {
                turn.status = 0;
                timeline?.play();
                return;
            }
            const visibleTodosCount = turnOrders
                .filter((t) => (t.status ?? 0) !== 2 && itemsMapRef.current?.has(t.character_id))
                .length;
            const separatorIndex = (visibleTodosCount === 0 || visibleTodosCount === size) ? size : visibleTodosCount;
            applyRoundLayoutByIds(visibleOrderIds, separatorIndex);

            const turnItems = getSortedTurnItems()
                .filter((i) => (i.index ?? -1) >= 0)
                .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

            const widthReady = (dimension?.itemWidth ?? 0) > 0;
            if (!widthReady) {
                turn.status = 0;
                timeline?.play();
                return;
            }

            const sepIdx = clampSeparatorIndex(separatorIndex, size);
            const itemByIndex = new Map<number, TurnBarItem>();
            turnItems.forEach((item) => itemByIndex.set(item.index ?? -1, item));

            const displayOrder: Array<{ ele: HTMLDivElement; index: number; isSeparator: boolean }> = [];
            for (let pos = 0; pos < size; pos++) {
                if (separator.index === pos && separator.ele) {
                    displayOrder.push({ ele: separator.ele, index: pos, isSeparator: true });
                }
                const item = itemByIndex.get(pos);
                if (item?.ele) {
                    displayOrder.push({ ele: item.ele, index: pos, isSeparator: false });
                }
            }
            if (separator.index === size && separator.ele) {
                displayOrder.push({ ele: separator.ele, index: size, isSeparator: true });
            }
            if (displayOrder.length <= 0) {
                turn.status = 0;
                timeline?.play();
                return;
            }

            displayOrder.forEach(({ ele, index, isSeparator }) => {
                gsap.set(ele, { autoAlpha: 1, zIndex: index * 3 + (isSeparator ? -1 : 0), x: 0 });
            });

            const targets = displayOrder.map((d) => d.ele);
            const getTargetX = (i: number) => {
                const d = displayOrder[i];
                if (!d) return 0;
                return calcCoordX(d.index, size, sepIdx, d.isSeparator);
            };

            const tl = timeline ?? gsap.timeline({ timeScale: playbackSpeed });
            if (!timeline) {
                tl.timeScale(playbackSpeed);
            }
            if (targets.length > 0) {
                tl.to(targets, {
                    x: (i: number) => getTargetX(i),
                    duration: 0.45,
                    ease: "expo.out",
                    stagger: { each: 0.04, from: "start", ease: "power2.out" },
                    force3D: true,
                    overwrite: "auto",
                }, "<");
            }
            const firstItem = turnItems[0]?.ele;
            if (firstItem) {
                tl.to(firstItem, {
                    scale: 1.2,
                    boxShadow: "0 0 0 2px white",
                    duration: 0.04,
                    ease: "power4.out",
                    force3D: true,
                    overwrite: "auto",
                }, ">=-0.08");
            }
            tl.add(() => {
                turn.status = 2;
                syncItemsToCurrentLayout();
            }, ">");
            timeline?.play();
        },
        [applyRoundLayoutByIds, calcCoordX, dimension?.itemWidth, itemsMapRef, playbackSpeed, separator, syncItemsToCurrentLayout]
    );
    useEffect(() => {
        syncItemsToCurrentLayout();
    }, [syncItemsToCurrentLayout]);
    return { playStartTurn, playInitTurn, playStartRound, syncItemsToCurrentLayout };
};
