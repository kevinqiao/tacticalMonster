import React, { useEffect, useMemo } from "react";
import { useCombatManager } from "../../service/CombatManager";

import { CSSProperties } from "react";
import { useSprite } from "../../service/SpriteProvider";
import { Card } from "../../types/CombatTypes";
import { cardCoord } from "../../utils";
import { CardSVG } from "../CardGrid";
import "../style.css";
import "./sprite.css";
import SpriteWrap from "./SpriteWrap";
const FoundationGround: React.FC = () => {
    const { game, boardDimension } = useCombatManager();
    const { spriteRefs } = useSprite();
    const zone = boardDimension?.zones[0];
    const baseCards = useMemo(() => {
        if (!zone || !game) return [];
        const card0: Card = { field: 0, col: 0, row: 0, suit: "♠", rank: "", id: "0", status: 1 };
        const card1: Card = { field: 0, col: 1, row: 0, suit: "♥", rank: "", id: "1", status: 1 };
        const card2: Card = { field: 0, col: 2, row: 0, suit: "♣", rank: "", id: "2", status: 1 };
        const card3: Card = { field: 0, col: 3, row: 0, suit: "♦", rank: "", id: "3", status: 1 };
        const cards: Card[] = [card0, card1, card2, card3];
        cards.forEach((card: Card) => {
            const { field, col, row } = card;
            const cord = cardCoord(field || 0, col || 0, row || 0, boardDimension, 0);
            card.x = cord.x;
            card.y = cord.y;
            card.width = cord.cwidth;
            card.height = cord.cheight;
            card.zIndex = 10000;
            const cc = game.cards?.find((c: Card) => c.field === field && c.col === col && c.row === row);
            console.log("cc", cc);
            if (cc)
                card.status = 0;
        });
        return cards;
    }, [zone, game]);
    const position = useMemo((): CSSProperties => {
        if (!boardDimension) return {};
        return {
            position: "absolute",
            top: 0,
            left: 0,
        };
    }, [boardDimension]);
    useEffect(() => {
        if (!spriteRefs || !baseCards) return;
        console.log("founddation cards", baseCards);
        baseCards.forEach((card) => {
            const cardRef = spriteRefs.get("foundation-ground-card" + card.col)
            if (card.status === 0 && cardRef) {
                // cardRef.current!.style.transform = "rotateY(0deg)";
                cardRef.current!.style.opacity = "0";
                cardRef.current!.style.visibility = "hidden";
            }
        })
        // const card0 = spriteRefs.get("foundation-ground-card0")?.current;
        // const card1 = spriteRefs.get("foundation-ground-card1")?.current;
        // const card2 = spriteRefs.get("foundation-ground-card2")?.current;
        // const card3 = spriteRefs.get("foundation-ground-card3")?.current;
        // console.log("card0", card0);
        // if (card0) card0.style.transform = "rotateY(0deg)";
        // if (card1) card1.style.transform = "rotateY(0deg)";
        // if (card2) card2.style.transform = "rotateY(0deg)";
        // if (card3) card3.style.transform = "rotateY(0deg)";
        // if (card0)
        //     gsap.to(card0, { rotateY: 0, duration: 1.5, ease: "power2.inOut" })
    }, [spriteRefs, baseCards]);


    return <SpriteWrap id={"foundation-ground"} position={position}>
        {baseCards.filter((card) => card.status === 1).map((card, index) => (
            <div key={index} id={"foundation-ground-card" + index} className="card" style={{ position: "absolute", top: `${card.y}px`, left: `${card.x}px`, width: `${card.width}px`, height: `${card.height}px`, zIndex: `${card.zIndex}`, transform: "rotateY(180deg)", opacity: 0, visibility: "hidden" }}>
                <CardSVG key={index} card={card} />
            </div>
        ))}
    </SpriteWrap>
}

export default FoundationGround;