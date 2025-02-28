// Dice.tsx
import React from 'react';
import { Seat } from '../types/CombatTypes';
import './dice.css';
const strokeWidth = 4;


const BotOn: React.FC<{ seat: Seat, size: number }> = ({ seat, size }) => {


    return (
        <div ref={(ele) => seat.botOnEle = ele} style={{ position: 'relative', top: 0, left: 0, width: size, height: size, backgroundColor: 'red', color: "white", opacity: 0, visibility: "hidden" }}>
            Bot<br />On
        </div>
    );
};

export default BotOn;
