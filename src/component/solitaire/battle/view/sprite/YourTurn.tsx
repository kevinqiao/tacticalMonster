import React, { CSSProperties, useMemo } from "react";
import { useCombatManager } from "../../service/CombatManager";
import SceneWrap from "./SpriteWrap";
import "./sprite.css";


const YourTurn: React.FC = () => {
    const { boardDimension } = useCombatManager();

    const position = useMemo((): CSSProperties => {
        if (!boardDimension) return {};
        return {
            position: "absolute",
            top: boardDimension.height * 5 / 12,
            left: 0,
            width: boardDimension.width,
            height: boardDimension.height / 6,
            opacity: 0,
            visibility: "hidden",
        };
    }, [boardDimension]);


    return (
        <SceneWrap id="your-turn" position={position} >
            <div id="your-turn-container" className="your-turn">
                <div id="your-turn-text" className="your-turn-text">Your Turn</div>
            </div>
        </SceneWrap>
    );
};

export default YourTurn;