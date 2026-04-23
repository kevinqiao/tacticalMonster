// Dice.tsx
import React, { useEffect } from 'react';
import useCombatAct from '../service/useCombatAct';
import { Seat } from '../types/CombatTypes';
import './dice.css';


const BotOn: React.FC<{ seat: Seat, size: number }> = ({ seat, size }) => {
    const { turnOffBot } = useCombatAct();
    useEffect(() => {
        if (seat.botOn && seat.botOnEle) {
            seat.botOnEle.style.opacity = "1";
        }
    }, [seat]);
    return (
        <div ref={(ele) => seat.botOnEle = ele} style={{ cursor: "pointer", position: 'relative', top: 0, left: 0, width: size, height: size, backgroundColor: 'red', color: "white", opacity: 0 }} onClick={turnOffBot}>
            Bot<br />On
        </div>
    );
};

export default BotOn;
