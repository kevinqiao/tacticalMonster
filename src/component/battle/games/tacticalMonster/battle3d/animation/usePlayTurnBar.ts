/**
 * 3D 行走动画 - GSAP 驱动 position + R3F 模型动画
 * 路径节点始终为逻辑坐标 (q,r)，直接用 hexTo3DCenter 算 3D 位置。
 */
import gsap from "gsap";
import { useCallback } from "react";
import type { GameRound, GameTurn } from "../../types/gameTypes";
import type { TurnBarDimension, TurnBarItem } from "../view/turnbar/TurnOrderBar";

interface UsePlayTurnBarOptions {
    dimension: TurnBarDimension | null;
    itemsMapRef: React.RefObject<Map<string, TurnBarItem>>;
    separator: { ele: HTMLDivElement | null, nextRound: number, index: number };
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
const STEP_FADE_DURATION = 0.22;
const CONVEYOR_DURATION_PER_STEP = 0.28;

const getSortedTurnItemsFromMap = (map: Map<string, TurnBarItem> | null | undefined): TurnBarItem[] => {
    const items = Array.from(map?.values() ?? []);
    items.forEach((i) => { if (i.index === undefined) i.index = -1; });
    return [...items].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
};
const getTurnOrderByRound = (round: GameRound) => {
    const { no, turns } = round;
    const todos = round.turns?.filter((turn) => turn.status !== 2).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const dones = round.turns?.filter((turn) => turn.status === 2).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const turnOrders = [...(todos ?? []), ...(dones ?? [])];
    return turnOrders;
};
const clampSeparatorIndex = (index: number, total: number) =>
    total <= 0 ? index : Math.max(1, Math.min(index, total));

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
        const turnItems = getSortedTurnItemsFromMap(itemsMapRef.current);
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
    // const getRotatedOrderIds = useCallback(() => {
    //     const oldOrderIds = turnItems.sort((a, b) => (a.index ?? 0) - (b.index ?? 0)).map((item) => item.character_id);
    //     const oldIndexById = new Map<string, number>();
    //     turnItems.forEach((item) => oldIndexById.set(item.character_id, item.index ?? -1));

    //     const activeOldIndex = oldIndexById.get(activeCharacterId);
    //     const offsetSteps = activeOldIndex !== undefined ? Math.max(0, activeOldIndex) : 0;
    //     const rotatedOrderIds = oldOrderIds.slice(offsetSteps).concat(oldOrderIds.slice(0, offsetSteps));
    //     return rotatedOrderIds;
    // }, []);
    const getSortedTurnItems = useCallback((): TurnBarItem[] => {
        console.log("itemsMapRef.current", itemsMapRef.current);
        return getSortedTurnItemsFromMap(itemsMapRef.current);
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
    const playStartTurn = useCallback((turn: { status: number, turnRound: { name: string, data: any } }, timeline?: gsap.core.Timeline) => {
        const turnData = turn.turnRound.data as StartTurnPayload;
        const currentRound = turnData.currentRound;
        const turnItems = getSortedTurnItems();
        if (turnItems.length !== (currentRound?.turns?.length ?? 0)) {
            turn.status = 0;
            timeline?.play();
            return;
        }
        const hasSummoned = turnItems.some((item) => item.index === undefined || item.index < 0);
        if (hasSummoned && currentRound) {
            const turnOrders = getTurnOrderByRound(currentRound);
            turnOrders.forEach((turn, index) => {
                const item = itemsMapRef.current?.get(turn.character_id);
                if (item) item.index = index;
            });
            console.log("turnOrders", turnItems.map((item) => item.character_id + " " + item.index));
            syncItemsToCurrentLayout();
            turn.status = 2;
            return;
        }
        const activeCharacterId =
            turnData.turn?.character_id ??
            turnData.character_id;
        if (!activeCharacterId) {
            return;
        }
        console.log("turnItems", turnItems.map((item) => item.character_id + " " + item.index));
        const oldOrderIds = turnItems.sort((a, b) => (a.index ?? 0) - (b.index ?? 0)).map((item) => item.character_id);
        const oldIndexById = new Map<string, number>();
        turnItems.forEach((item) => oldIndexById.set(item.character_id, item.index ?? -1));

        const activeOldIndex = oldIndexById.get(activeCharacterId);
        const offsetSteps = activeOldIndex !== undefined ? Math.max(0, activeOldIndex) : 0;
        const rotatedOrderIds = oldOrderIds.slice(offsetSteps).concat(oldOrderIds.slice(0, offsetSteps));
        const totalItems = turnItems.length;
        const baseSeparatorIndex = clampSeparatorIndex(separator.index, totalItems);
        const expectedFinalSeparatorIndex =
            (((baseSeparatorIndex - 1 - offsetSteps) % totalItems) + totalItems) % totalItems + 1;

        if (offsetSteps <= 0) {
            turn.status = 2;
            timeline?.play();
            return;
        }

        // 传送带模式：轨道整体左移，形成连续滚动视觉
        const trackEl = trackRef?.current;
        if (trackEl) {
            const stepWidth = (dimension?.itemWidth ?? 0) + GAP;
            const totalDistance = stepWidth * offsetSteps;
            const duration = CONVEYOR_DURATION_PER_STEP * Math.max(1, offsetSteps);
            const separatorEl = separator.ele;
            const separatorWidth = (dimension?.itemWidth ?? 0) * 0.75;
            const separatorX = separatorEl
                ? (Number(gsap.getProperty(separatorEl, "x")) || calcCoordX(baseSeparatorIndex, totalItems, baseSeparatorIndex, true))
                : 0;
            const distanceToExitLeft = separatorX + separatorWidth;
            const separatorWillExitLeft = !!separatorEl && totalDistance > distanceToExitLeft;

            const tl = gsap.timeline({
                timeScale: playbackSpeed,
                onComplete: () => {
                    turn.status = 2;
                    gsap.set(trackEl, { x: 0 });
                    applyRoundLayoutByIds(rotatedOrderIds, expectedFinalSeparatorIndex);
                    syncItemsToCurrentLayout();
                },
            });
            timeline?.add(tl, ">");
            tl.to(trackEl, {
                x: -totalDistance,
                duration,
                ease: "none",
                overwrite: "auto",
            });
            if (separatorWillExitLeft && separatorEl) {
                // 先看到 separator 移出最左边，再在最右侧淡入出现
                const exitTime = duration * (distanceToExitLeft / Math.max(totalDistance, 1));
                const fadeOutAt = Math.min(duration, exitTime + 0.02);
                const reappearAt = Math.min(duration, fadeOutAt + STEP_FADE_DURATION * 0.9);
                tl.to(separatorEl, {
                    autoAlpha: 0,
                    duration: STEP_FADE_DURATION * 0.75,
                    ease: "power2.out",
                    overwrite: "auto",
                }, fadeOutAt);
                tl.add(() => {
                    // 使用“世界坐标落点”计算本地 x，确保一定出现在最右槽位
                    const trackX = Number(gsap.getProperty(trackEl, "x")) || 0;
                    const rightSlotWorldX = calcCoordX(totalItems, totalItems, totalItems, true);
                    separator.index = totalItems;
                    gsap.set(separatorEl, { x: rightSlotWorldX - trackX });
                }, reappearAt);
                tl.to(separatorEl, {
                    autoAlpha: 1,
                    duration: STEP_FADE_DURATION,
                    ease: "power2.out",
                    overwrite: "auto",
                }, reappearAt + 0.01);
            }
            timeline?.play();
            return;
        }

        // 无 track 容器时兜底：直接应用最新布局，避免状态与显示脱节
        applyRoundLayoutByIds(rotatedOrderIds, expectedFinalSeparatorIndex);
        syncItemsToCurrentLayout();

    }, [
        applyRoundLayoutByIds,
        calcCoordX,
        getSortedTurnItems,
        highlightCurrentItem,
        dimension?.itemWidth,
        playbackSpeed,
        separator,
        trackRef,
        syncItemsToCurrentLayout,
    ]
    );
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
            console.log("play start round", turnOrders, turnItems);
            separator.index = turnItems.length;
            const tl = gsap.timeline(
                {
                    onComplete: () => {
                        syncItemsToCurrentLayout();
                        turn.status = 2;
                    }
                }
            );
            timeline?.add(tl, ">");
            timeline?.play();


        }, [separator, getSortedTurnItems, syncItemsToCurrentLayout]
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

            const turnItems = getSortedTurnItemsFromMap(itemsMapRef.current)
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
    return { playStartTurn, playInitTurn, playStartRound, syncItemsToCurrentLayout };
};
