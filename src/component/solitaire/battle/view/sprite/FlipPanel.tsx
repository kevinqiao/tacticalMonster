import React, { CSSProperties, useMemo } from "react";
import { useCombatManager } from "../../service/CombatManager";
import useCombatAct from "../../service/useCombatAct";
import "./sprite.css";


const FlipPanel: React.FC = () => {
    const { boardDimension } = useCombatManager();
    const { flipCard } = useCombatAct();
    const position = useMemo((): CSSProperties => {
        if (!boardDimension) return {};
        const zone = boardDimension.zones[1];
        if (!zone) return {};
        const slot = zone.slots.find(slot => slot.index === -1);
        if (!slot) return {};
        return {
            position: "absolute",
            top: slot.top,
            left: slot.left,
            width: slot.width,
            height: slot.height,

        };
    }, [boardDimension]);


    return (
        <div id="flip-panel" style={position} onClick={flipCard} >

        </div>
    );
};

export default FlipPanel;