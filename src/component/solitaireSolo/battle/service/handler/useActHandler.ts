import { ActionStatus, ActMode, Card, SoloActionData, SoloCard, SoloGameStatus, SoloZone, ZoneType } from "component/solitaireSolo";
import { useConvex } from "convex/react";
import { useCallback } from "react";
import { dealEffect } from "../../animation/effects/dealEffect";
import { PlayEffects } from "../../animation/PlayEffects";
import { useSoloGameManager } from "../GameManager";
import { SoloGameEngine } from "../SoloGameEngine";

const useActHandler = () => {
    const convex = useConvex();
    const { ruleManager, gameState, boardDimension } = useSoloGameManager();
    const onUpdate = useCallback((result: Card[]) => {
        if (!gameState) return;
        result.forEach((r: SoloCard) => {
            const card = gameState.cards.find((c: SoloCard) => c.id === r.id);
            if (card) {
                card.isRevealed = r.isRevealed;
                card.zone = r.zone;
                card.zoneId = r.zoneId;
                card.zoneIndex = r.zoneIndex;
            }
            // console.log('update card', card);
        });

    }, [gameState]);

    const onDrop = useCallback(async (data: SoloActionData) => {
        if (!gameState || !ruleManager) return;
        const { dropTarget, card, actModes } = data;
        if (!card || !actModes?.includes(ActMode.DRAG)) {
            gameState.actionStatus = ActionStatus.IDLE;
            return;
        }

        gameState.actionStatus = ActionStatus.DROPPING;
        console.log("onDrop", data);
        if (dropTarget && ruleManager.canMoveToZone(card as Card, dropTarget.zoneId)) {
            moveCard(data);
            return;
        }
        cancelDrag(data);

    }, [gameState, boardDimension]);
    const onClickOrTouch = useCallback((data: SoloActionData) => {
        if (!ruleManager || !gameState) return;
        const { card } = data;
        if (!card) {
            gameState.actionStatus = ActionStatus.IDLE;
            return;
        }
        const target = ruleManager?.findTarget(card as Card);
        if (target) {
            if (card.zoneId === ZoneType.TALON) {
                drawCard(data);
            } else {
                moveCard({ ...data, dropTarget: target });
            }
        } else {
            gameState.actionStatus = ActionStatus.IDLE;
        }
        return
    }, [gameState, boardDimension]);

    const recycle = useCallback(() => {
        if (!gameState) return;
        gameState.actionStatus = ActionStatus.ACTING;
        const talonCards = gameState.cards.filter((c: SoloCard) => c.zoneId === 'talon');
        if (talonCards.length > 0)
            return;
        const wasteCards = gameState.cards.filter((c: SoloCard) => c.zoneId === 'waste');
        if (wasteCards.length === 0)
            return;
        const cards = gameState.cards.filter((c: SoloCard) => c.zoneId === "waste").sort((a: SoloCard, b: SoloCard) => b.zoneIndex - a.zoneIndex).map((c: SoloCard, index: number) => {
            return { ...c, zoneIndex: index, zoneId: "talon", zone: ZoneType.TALON };
        });

        PlayEffects.recycle({
            data: { gameState, boardDimension, cards },
            onComplete: () => {
                onUpdate(cards);
                gameState.actionStatus = ActionStatus.IDLE;
            }
        });
    }, [gameState, boardDimension])
    const deal = useCallback((effectType: 'default' | 'fan' | 'spiral' | 'wave' | 'explosion' = 'default') => {
        if (!gameState) return;
        gameState.actionStatus = ActionStatus.ACTING;
        const dealedCards = SoloGameEngine.deal(gameState.cards);
        dealEffect({
            effectType: effectType,
            data: { cards: dealedCards, gameState, boardDimension },
            onComplete: () => {
                onUpdate(dealedCards);
                gameState.status = SoloGameStatus.START;
                gameState.actionStatus = ActionStatus.IDLE;
            }
        });
    }, [gameState, boardDimension]);

    const cancelDrag = useCallback((data: SoloActionData) => {
        if (!data || !data.card) return;
        PlayEffects.dragCancel({
            data: { cards: [data.card, ...(data.cards || [])], gameState, boardDimension }, onComplete: () => {
                if (gameState) {
                    gameState.actionStatus = ActionStatus.IDLE;
                }
            }
        });
    }, [gameState, boardDimension]);
    const drawCard = useCallback((data: SoloActionData) => {
        if (!gameState || !ruleManager) return;
        const { card } = data;
        if (!card || !ruleManager.canDraw(card as Card)) {
            gameState.actionStatus = ActionStatus.IDLE;
            return;
        }
        const wasteCards = gameState.cards.filter((c: SoloCard) => c.zoneId === 'waste').sort((a: SoloCard, b: SoloCard) => a.zoneIndex - b.zoneIndex);
        const wasteIndex = wasteCards.length === 0 ? 0 : wasteCards[wasteCards.length - 1].zoneIndex + 1;
        PlayEffects.hideCard({ data: { card } });
        setTimeout(() => {
            PlayEffects.popCard({ data: { card } });
        }, 400)
        const drawedCard: SoloCard = { ...card, isRevealed: true, zone: ZoneType.WASTE, zoneId: 'waste', zoneIndex: wasteIndex };
        PlayEffects.drawCard({
            data: { card: drawedCard, boardDimension, gameState }, onComplete: () => {
                onUpdate([drawedCard]);
                gameState.actionStatus = ActionStatus.IDLE;
            }
        });

    }, [gameState, boardDimension]);

    const moveCard = useCallback(async (data: SoloActionData) => {
        const { card, cards, dropTarget } = data;
        if (!gameState || !ruleManager) return;
        if (!card || !dropTarget || !ruleManager.canMoveToZone(card as Card, dropTarget.zoneId)) {
            gameState.actionStatus = ActionStatus.IDLE;
            return;
        }
        const flipCards: SoloCard[] = [];
        const dropCards: SoloCard[] = [];
        if (dropTarget.zoneId && card && dropTarget.zoneId !== card.zoneId) {
            const targetZone = gameState.zones.find((z: SoloZone) => z.id === dropTarget.zoneId);
            if (!targetZone) return;
            const zoneCards = gameState.cards.filter((c: SoloCard) => c.zoneId === dropTarget.zoneId).sort((a: SoloCard, b: SoloCard) => a.zoneIndex - b.zoneIndex);
            const zoneIndex = zoneCards.length === 0 ? 0 : zoneCards[zoneCards.length - 1].zoneIndex + 1;
            dropCards.push({ ...card, zone: targetZone.type, zoneId: dropTarget.zoneId, zoneIndex: zoneIndex });
            cards?.sort((a: SoloCard, b: SoloCard) => a.zoneIndex - b.zoneIndex).forEach((c: SoloCard, index: number) => {
                dropCards.push({ ...c, zone: targetZone.type, zoneId: dropTarget.zoneId, zoneIndex: zoneIndex + index + 1 });
            });
        }
        // 任务1: 手动控制 resolve 的查询 Promise
        const queryPromise = new Promise<void>((resolve) => {
            if (card.zone === ZoneType.TABLEAU) {
                const cards = gameState.cards.filter(c => c.zoneId === card.zoneId && c.zoneIndex < card.zoneIndex);

                setTimeout(() => {
                    const flipCard = cards.length > 0 ? cards[cards.length - 1] : undefined;
                    if (flipCard) {
                        flipCard.isRevealed = true;
                        flipCards.push({ ...flipCard, isRevealed: true })
                        PlayEffects.flipCard({
                            data: { card: flipCard, boardDimension }
                        });
                    }
                    resolve();
                }, 100);
            } else
                resolve();
            // convex.query(api.dao.userDao.findUser, { uid: '111' })
            //     .then((user) => {
            //         if (user) {
            //             console.log('User found:', user);
            //         }
            //         resolve(); // 成功时 resolve
            //     })
            //     .catch((error) => {
            //         console.error('Query user failed:', error);
            //         resolve(); // 失败时也 resolve，确保 Promise.all 继续执行
            //     });
        });

        // 任务2: 手动控制 resolve 的动画 Promise
        const animationPromise = new Promise<void>((resolve) => {
            PlayEffects.moveCard({
                data: { boardDimension, gameState, cards: dropCards },
                onComplete: resolve // 动画完成时 resolve
            });
        });

        // 等待两个操作都完成
        await Promise.all([queryPromise, animationPromise]);
        onUpdate([...flipCards, ...dropCards]);
        gameState.actionStatus = ActionStatus.IDLE;
    }, [gameState, boardDimension]);


    return { onClickOrTouch, onDrop, recycle, deal };
};

export default useActHandler;


