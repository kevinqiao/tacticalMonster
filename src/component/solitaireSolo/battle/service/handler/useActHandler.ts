import { ActionStatus, Card, SoloActionData, SoloCard, SoloZone, ZoneType } from "component/solitaireSolo";
import { useConvex } from "convex/react";
import { useCallback } from "react";
import { dealEffect } from "../../animation/effects/dealEffect";
import { PlayEffects } from "../../animation/PlayEffects";
import { useSoloGameManager } from "../GameManager";
import { SoloGameEngine } from "../SoloGameEngine";

const useActHandler = () => {
    const convex = useConvex();
    const { ruleManager, gameState, boardDimension } = useSoloGameManager();
    console.log("useActHandler", ruleManager, gameState, boardDimension);
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

        if (!gameState) return;
        gameState.actionStatus = ActionStatus.DROPPING;
        const { dropTarget, card, cards } = data;
        if (!dropTarget || card?.zoneId === dropTarget.zoneId) {
            cancelDrag(data);
            return;
        }
        const zone = gameState.zones.find(z => z.id === dropTarget.zoneId);
        if (zone?.type === ZoneType.TABLEAU) {
            console.log('moveCard', data);
            moveCard(data);
            return;
        }
        if (zone?.type === ZoneType.FOUNDATION) {
            const suit = card?.zoneId.split('-')[1];
            if (card && card.suit !== suit) {
                const zoneId = `foundation-${card.suit}`;
                moveCard({ ...data, dropTarget: { ...dropTarget, zoneId } });
            } else
                moveCard(data);
            return;
        }

    }, [gameState, boardDimension]);
    const onClickOrTouch = useCallback((data: SoloActionData) => {
        if (!gameState) return;
        const { card } = data;
        if (card?.zone === ZoneType.TABLEAU) {
            const zoneId = `foundation-${card.suit}`;
            const targetZone = gameState.zones.find(z => z.type === ZoneType.TABLEAU && z.id !== card.zoneId);
            if (targetZone) {
                moveCard({ card, cards: [], dropTarget: { zoneId } });
            }
            return;
        } else if (card?.zone === ZoneType.TALON) {
            drawCard({ card });
        }
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
        const { card } = data;
        if (!gameState || !card) return;
        console.log("drawCard", card);
        const wasteCards = gameState.cards.filter((c: SoloCard) => c.zoneId === 'waste').sort((a: SoloCard, b: SoloCard) => a.zoneIndex - b.zoneIndex);
        const wasteIndex = wasteCards.length === 0 ? 0 : wasteCards[wasteCards.length - 1].zoneIndex + 1;
        PlayEffects.hideCard({ data: { card } });
        setTimeout(() => {
            PlayEffects.popCard({ data: { card } });
        }, 400)
        const drawedCard: SoloCard = { ...card, isRevealed: true, zone: ZoneType.WASTE, zoneId: 'waste', zoneIndex: wasteIndex };
        console.log("drawedCard", drawedCard);
        PlayEffects.drawCard({
            data: { card: drawedCard, boardDimension, gameState }, onComplete: () => {
                onUpdate([drawedCard]);
                gameState.actionStatus = ActionStatus.IDLE;
            }
        });

    }, [gameState, boardDimension]);

    const checkGameOver = useCallback((effectType: 'default' | 'simple' | 'bounce' | 'fountain' | 'firework' | 'classic' | 'classicSimple' | 'singleCard' = 'singleCard') => {
        console.log("checkGameOver called", {
            hasGameState: !!gameState,
            hasRuleManager: !!ruleManager,
            hasBoardDimension: !!boardDimension
        });

        if (!gameState || !ruleManager || !boardDimension) {
            console.warn('Missing dependencies for game over check');
            return;
        }

        const isWon = ruleManager.isGameWon();
        console.log('Game won status:', isWon);

        if (isWon) {
            const foundationCards = gameState.cards.filter(c => c.zone === ZoneType.FOUNDATION);
            console.log('🎉 Game Won! Foundation cards:', foundationCards.length);
            console.log('Foundation cards with elements:', foundationCards.filter(c => c.ele).length);

            // 触发胜利动画
            setTimeout(() => {
                console.log('Triggering victory animation with effect:', effectType);
                PlayEffects.gameOver({
                    effectType: effectType,
                    data: { cards: gameState.cards, boardDimension },
                    onComplete: () => {
                        console.log('🎊 Victory animation complete!');
                        // 这里可以触发其他胜利后的逻辑，比如显示胜利界面、保存分数等
                    }
                });
            }, 500); // 延迟500ms让最后的移牌动画完成
        }
    }, [gameState, ruleManager, boardDimension]);

    const moveCard = useCallback(async (data: SoloActionData) => {
        const { card, cards, dropTarget } = data;
        if (!gameState || !card || !dropTarget) return;
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

        // 检查游戏是否胜利
        checkGameOver('singleCard'); // 测试单卡效果，确认后改为 'classic'

    }, [gameState, boardDimension, checkGameOver]);


    return { onClickOrTouch, onDrop, recycle, deal, checkGameOver };
};

export default useActHandler;


