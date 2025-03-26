import React, { useMemo } from "react";
import { useCombatManager } from "../../service/CombatManager";
import SceneWrap from "./SceneWrap";


const YourTurn: React.FC = () => {
    const { boardDimension } = useCombatManager();
    const position = useMemo(() => {
        if (!boardDimension) return;
        return {
            top: boardDimension.height * 5 / 12,
            left: 0,
            width: boardDimension.width,
            height: boardDimension.height / 6,
        };
    }, [boardDimension]);

    return (
        <SceneWrap id="your-turn" position={position}>
            <div className="your-turn">
                <div className="your-turn-text">Your Turn</div>
            </div>
        </SceneWrap>
    );
};

export default YourTurn;