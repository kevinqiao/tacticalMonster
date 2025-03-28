import React, { useMemo } from "react";
import { useCombatManager } from "../../service/CombatManager";
import SceneWrap from "./SpriteWrap";


const Seat: React.FC<{ no: number }> = ({ no }) => {
    const { boardDimension } = useCombatManager();
    const position = useMemo(() => {
        if (!boardDimension) return;
        return {
            top: no === 0 ? boardDimension.height * 7 / 12 : 0,
            left: 0,
            width: boardDimension.width,
            height: boardDimension.height * 5 / 12,
            zIndex: 100,
        };
    }, [boardDimension]);

    return (
        <SceneWrap id={"seat" + no} position={position}>
            <div className="seat">
                <div className="your-turn-text">Seat{no}</div>
            </div>
        </SceneWrap>
    );
};

export default Seat;