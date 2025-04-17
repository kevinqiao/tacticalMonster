import React, { useCallback, useMemo } from 'react';
import { useUserManager } from 'service/UserManager';
import useActionAnimate from '../animation/useActionAnimate';
import { useCombatManager } from '../service/CombatManager';
import DnDProvider from '../service/DnDProvider';
import useCombatAct from '../service/useCombatAct';
import { Card } from '../types/CombatTypes';
import DnDCard from '../view/DnDCard';


const ActControl: React.FC = () => {
    const { user } = useUserManager();
    const { eventQueue, game, boardDimension, direction, currentAct, completeAct } = useCombatManager();
    const { playMove, playOpenCard } = useActionAnimate();
    const { move } = useCombatAct();

    const draggables = useMemo(() => {

        if (!game || !game.currentTurn || !currentAct || !user || !user.uid) {
            return
        }
        if (!game.currentTurn || game.currentTurn.uid !== user.uid) {
            // console.log("currentAct.uid !== user.uid", currentAct, user);
            return;
        }
        const currentSeat = game.seats?.find(s => s.uid === game.currentTurn?.uid);
        if (!currentSeat) return;
        const cards = game.cards?.filter((c: Card) => (c.field === 1 || c.field === currentSeat.field) && c.status === 1);
        console.log("cards", cards);
        return cards;

    }, [game, currentAct, user])

    const onDrop = useCallback(async (draggingCards: Card[], targets: string[]) => {
        if (!game || !boardDimension || !draggingCards.length) return;
        if (targets.length === 0) {
            playMove({ data: { move: draggingCards } });
            return;
        }
        const [zone, slot] = targets[0].split("_");

        const field = Number(zone) < 2 ? +zone : (direction === 1 ? (zone === "2" ? 3 : 2) : +zone);
        if ((zone === "1") || (draggingCards[0].field === field && draggingCards[0].col === Number(slot))) {
            playMove({ data: { move: draggingCards } });
            return;
        }
        completeAct();
        await executeDrop(draggingCards, { field, slot: Number(slot) });


    }, [user, game, boardDimension, direction, playMove])
    const executeDrop = useCallback(async (draggingCards: Card[], target: { field: number, slot: number }) => {
        if (!game || !boardDimension) return;
        const onComplete = () => {
            const index = eventQueue.findIndex(e => e.name === "localAct");
            if (index !== -1) {
                eventQueue.splice(index, 1);
            }

        }
        const cards = game.cards?.filter((c: Card) => c.field === target.field && c.col === target.slot);
        const row = cards?.length || 0;
        const col = Number(target.slot);
        const prePos: Card[] = [];

        draggingCards.forEach((c: Card, index: number) => {
            prePos.push({ ...c });
            c.row = row + index;
            c.field = target.field;
            c.col = col;
        });
        const localEvent = { name: "localAct", data: { cardId: draggingCards[0].id, to: target } };
        eventQueue.push(localEvent);
        playMove({ data: { move: draggingCards } });
        const res = await move(draggingCards[0].id, target);
        if (res.ok && res.result.open && res.result.open.length > 0) {
            const openCards: Card[] = [];
            res.result.open.forEach((card: Card) => {
                const mcard = game.cards?.find((c) => c.id === card.id);
                if (mcard) {
                    mcard.suit = card.suit;
                    mcard.rank = card.rank;
                    mcard.status = 1;
                    openCards.push(mcard);
                }
            });
            playOpenCard({ data: { open: openCards }, onComplete: onComplete });
        } else {
            onComplete();
        }


    }, [user, move, game, boardDimension, direction, playMove, playOpenCard])
    return (
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 3000 }}>
            <DnDProvider onDrop={onDrop}>
                {draggables?.map((card: Card) => <DnDCard key={card.id} card={card} />)}
            </DnDProvider>
        </div>
    );
};


export default ActControl;


