import { SoloGameEngine } from "@/convex/solitaireArena/convex/service/SoloGameEngine";
import { useConvex } from "convex/react";
import gsap from "gsap";
import { useCallback } from "react";
import { api } from "../../../../../../../convex/solitaireArena/convex/_generated/api";
import { SOLO_ANIMATION_CONFIG } from "../../animation/animationConfig";
import { dealEffect } from "../../animation/effects/dealEffect";
import { PlayEffects } from "../../animation/PlayEffects";
import {
    ActionResult,
    ActMode,
    Card,
    GameInteractionPhase,
    SoloActionData,
    SoloCard,
    SoloGameStatus,
    ZoneType,
} from "../../types/SoloTypes";
import { getCardCoord, syncCardStackZIndexFromGameState, tableauCardZIndex } from "../../Utils";
import { useSoloGameManager } from "../GameManager";
// import { SoloGameEngine } from "../SoloGameEngine";

const useActHandler = () => {
    const convex = useConvex();
    const {
        // timelines,
        ruleManager,
        gameState,
        boardDimension,
        boardDimensionRef,
        setInteractionPhase,
        interactionPhase,
        config
    } = useSoloGameManager();
    const saveUpdate = useCallback((cards: Card[]) => {
        if (!gameState) return;
        cards.forEach((r: SoloCard) => {
            const card = gameState.cards.find((c: SoloCard) => c.id === r.id);
            if (card) {
                card.isRevealed = r.isRevealed;
                card.zone = r.zone;
                card.zoneId = r.zoneId;
                card.zoneIndex = r.zoneIndex;
            }
        });

    }, [gameState]);

    const cancelDrag = useCallback((data: SoloActionData) => {
        if (!data?.card) {
            setInteractionPhase(GameInteractionPhase.idle);
            return;
        }
        setInteractionPhase(GameInteractionPhase.animating);
        PlayEffects.dragCancel({
            data: { cards: [data.card, ...(data.cards || [])], gameState, boardDimensionRef },
            onComplete: () => {
                if (gameState) syncCardStackZIndexFromGameState(gameState);
                setInteractionPhase(GameInteractionPhase.idle);
            },
        });
    }, [gameState, boardDimensionRef, setInteractionPhase]);

    const drawCard = useCallback(async (data: SoloActionData) => {
        const { card } = data;
        if (!gameState || !ruleManager || !card) return;
        const drawResult = SoloGameEngine.drawCard(gameState, card.id);
        const drawedCard = drawResult.data?.draw?.[0];
        if (!drawedCard) return;

        setInteractionPhase(GameInteractionPhase.animating);
        let updateCards: SoloCard[] = [];
        try {
            const drawPromise = new Promise<void>((resolve, reject) => {
                convex.mutation(api.service.gameManager.draw, { gameId: gameState.gameId, cardId: card.id })
                    .then((result: ActionResult) => {
                        if (result.ok && result.data?.draw && result.data.draw.length > 0) {
                            const revealedCard = result.data.draw[0] as SoloCard;
                            updateCards.push(...result.data.draw);
                            PlayEffects.popCard({
                                data: { card: revealedCard, gameState },
                                onComplete: () => {
                                    resolve();
                                },
                            });
                        } else {
                            reject();
                        }
                    })
                    .catch((error) => {
                        console.error("draw mutation failed:", error);
                        reject();
                    });
            });
            const playPromise = new Promise<void>((resolve) => {
                PlayEffects.drawCard({
                    data: { card: drawedCard as SoloCard, boardDimensionRef, gameState },
                    onComplete: () => {
                        resolve();
                    },
                });
            });
            await Promise.all([drawPromise, playPromise]);
            saveUpdate(updateCards);
        } catch (e) {
            console.error("drawCard failed:", e);
        } finally {
            //rollback to the previous state
            setInteractionPhase(GameInteractionPhase.idle);
        }
    }, [ruleManager, gameState, boardDimensionRef, convex, saveUpdate, setInteractionPhase]);

    const moveCard = useCallback(async (data: SoloActionData) => {
        const { card, dropTarget, autoFoundationMove } = data;
        if (!gameState || !ruleManager || !card || !dropTarget) return;

        const result = SoloGameEngine.moveCard(gameState, card as Card, dropTarget.zoneId);

        if (!result.ok) {
            console.log("moveCard failed", result);
            return;
        }
        const moveData = result.data?.move || [];
        setInteractionPhase(GameInteractionPhase.animating);
        let updateCards: SoloCard[] = [];
        try {
            const movePromise = new Promise<void>((resolve, reject) => {
                convex.mutation(api.service.gameManager.move, { gameId: gameState.gameId, cardId: card.id, toZone: dropTarget.zoneId })
                    .then((result: ActionResult) => {
                        console.log("move result", result);
                        if (result.ok && result.data?.move && result.data.move.length > 0) {

                            updateCards.push(...result.data.move);
                            if (result.data.flip && result.data.flip.length > 0) {
                                updateCards.push(...result.data.flip);
                                const flipPayload = result.data.flip[0] as SoloCard;
                                const domCard = gameState.cards.find((c: SoloCard) => c.id === flipPayload.id);
                                if (domCard?.ele) {
                                    flipPayload.ele = domCard.ele;
                                }
                                if (flipPayload.ele) {
                                    PlayEffects.flipCard({
                                        data: {
                                            card: flipPayload,
                                            gameState,
                                            ...(autoFoundationMove ? { duration: SOLO_ANIMATION_CONFIG.duration.flip.autoFoundation } : {}),
                                        },
                                        onComplete: () => {
                                            resolve();
                                        }
                                    });
                                } else {
                                    resolve();
                                }
                            } else {
                                resolve();
                            }
                        } else
                            reject();

                    })
                    .catch((error) => {
                        console.error('move card failed:', error);
                        reject();
                    });
            });

            const playPromise = new Promise<void>((resolve) => {

                PlayEffects.moveCard({
                    data: { boardDimensionRef, gameState, moveCards: moveData, targetZoneId: dropTarget.zoneId },
                    onComplete: () => { resolve(); }
                });
            });

            await Promise.all([movePromise, playPromise]);
            saveUpdate(updateCards);
        } catch (e) {
            console.error("moveCard failed:", e);
        } finally {
            //rollback to the previous state
            setInteractionPhase(GameInteractionPhase.idle);
        }

    }, [gameState, boardDimensionRef, ruleManager, convex, saveUpdate, setInteractionPhase]);

    const onDrop = useCallback(async (data: SoloActionData) => {
        if (!gameState || !ruleManager) {
            setInteractionPhase(GameInteractionPhase.idle);
            return;
        }
        const { dropTarget, card, actModes } = data;
        if (!card || !actModes?.includes(ActMode.DRAG)) {
            setInteractionPhase(GameInteractionPhase.idle);
            return;
        }

        console.log("onDrop", data);
        if (card.zone === ZoneType.TALON && ruleManager.canDraw(card.id)) {
            setInteractionPhase(GameInteractionPhase.animating);
            await drawCard(data);
            return;
        }
        if (dropTarget && ruleManager.canMoveToZone(card as Card, dropTarget.zoneId)) {
            await moveCard(data);
            return;
        }
        cancelDrag(data);

    }, [gameState, ruleManager, setInteractionPhase, drawCard, moveCard, cancelDrag]);

    const onClickOrTouch = useCallback((data: SoloActionData) => {
        if (!ruleManager || !gameState) return;
        const { card, cards, actModes, maxDragFromStart } = data;
        if (!card) {
            setInteractionPhase(GameInteractionPhase.idle);
            return;
        }
        /** 超过此像素视为「拖过又松手」，短距离分支只取消，不走 findTarget 自动走牌 */
        const SUBSTANTIAL_DRAG_PX = 6;
        if (actModes?.includes(ActMode.DRAG) && (maxDragFromStart ?? 0) > SUBSTANTIAL_DRAG_PX) {
            cancelDrag(data);
            return;
        }
        // 轻点/微移：收回 pointermove 造成的偏差再走点击逻辑
        if (actModes?.includes(ActMode.DRAG) && card.ele && boardDimensionRef.current) {
            const stack = [card, ...(cards || [])].filter(Boolean) as SoloCard[];
            const zoneId = card.zoneId;
            const zoneCards = gameState.cards
                .filter((c: SoloCard) => c.zoneId === zoneId)
                .sort((a: SoloCard, b: SoloCard) => a.zoneIndex - b.zoneIndex);
            for (const c of stack) {
                if (!c.ele) continue;
                const { x, y } = getCardCoord(c, zoneCards, boardDimensionRef);
                const z =
                    c.zone === ZoneType.TABLEAU
                        ? tableauCardZIndex(c.zoneId, c.zoneIndex)
                        : c.zoneIndex + 10;
                gsap.set(c.ele, { x, y, zIndex: z });
            }
            syncCardStackZIndexFromGameState(gameState);
        }
        const target = ruleManager?.findTarget(card as Card);
        if (target) {
            if (card.zoneId === ZoneType.TALON) {
                void drawCard(data);
            } else {
                void moveCard({ ...data, dropTarget: target });
            }
        } else {
            setInteractionPhase(GameInteractionPhase.idle);
        }
        return
    }, [gameState, ruleManager, boardDimensionRef, setInteractionPhase, drawCard, moveCard, cancelDrag]);

    const recycle = useCallback(async () => {
        if (!gameState) return;
        setInteractionPhase(GameInteractionPhase.animating);

        const result = SoloGameEngine.recycle(gameState);
        if (!result.ok) {
            setInteractionPhase(GameInteractionPhase.idle);
            return;
        }
        const cards = result.data?.update || [];
        const recyclePromise = new Promise<void>((resolve) => {

            convex.mutation(api.service.gameManager.recycle, { gameId: gameState.gameId })
                .then((result: ActionResult) => {
                    console.log("recycle result", result);
                    resolve();
                })
                .catch((error) => {
                    console.error('move card failed:', error);
                    resolve();
                });
        });
        const playPromise = new Promise<void>((resolve) => {
            PlayEffects.recycle({
                data: { gameState, boardDimensionRef, cards },
                onComplete: () => {
                    saveUpdate(cards);
                    setInteractionPhase(GameInteractionPhase.idle);
                }
            });
        })
        await Promise.all([recyclePromise, playPromise]);
        setInteractionPhase(GameInteractionPhase.idle);
        return;
    }, [gameState, boardDimensionRef, convex, saveUpdate, setInteractionPhase])
    const deal = useCallback(async (effectType: 'default' | 'fan' | 'spiral' | 'wave' | 'explosion' = 'default') => {
        if (!gameState) return;
        setInteractionPhase(GameInteractionPhase.animating);
        const dealResult = await convex.mutation(api.service.gameManager.deal, { gameId: gameState.gameId });
        if (dealResult && dealResult.ok) {
            const dealedCards = dealResult.data?.update || [];
            console.log("dealedCards", dealedCards, effectType);
            dealEffect({
                effectType: effectType,
                data: { cards: dealedCards, gameState, boardDimensionRef, boardDimension },
                onComplete: () => {
                    saveUpdate(dealedCards);
                    gameState.status = SoloGameStatus.DEALED;
                    setInteractionPhase(GameInteractionPhase.idle);
                }
            });
        } else {
            setInteractionPhase(GameInteractionPhase.idle);
        }

    }, [gameState, boardDimension, boardDimensionRef, convex, saveUpdate, setInteractionPhase]);

    /** 全明且贪心收 foundation 可胜利时，连续执行收牌（需 config.autoComplete） */
    const runAutoCompleteToFoundation = useCallback(async () => {
        if (!gameState || !config.autoComplete) return;
        if (interactionPhase !== GameInteractionPhase.idle) return;
        if (!SoloGameEngine.canAutoCompleteWithFoundationOnly(gameState)) return;
        while (true) {
            const next = SoloGameEngine.findNextFoundationMove(gameState);
            if (!next) break;
            await moveCard({
                card: next.card as SoloCard,
                dropTarget: { zoneId: next.toZoneId },
                actModes: [ActMode.DRAG],
                autoFoundationMove: true
            });
        }
    }, [gameState, config.autoComplete, interactionPhase, moveCard]);

    return { onClickOrTouch, onDrop, recycle, deal, cancelDrag, runAutoCompleteToFoundation };
};

export default useActHandler;
