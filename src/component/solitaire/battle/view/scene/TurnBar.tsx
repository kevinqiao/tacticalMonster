import React, { useMemo } from "react";
import { useCombatManager } from "../../service/CombatManager";
import SceneWrap from "./SceneWrap";
import "./style.css";


const TurnBar: React.FC<{ size: number, no: number }> = ({ size, no }) => {
    const { boardDimension } = useCombatManager();
    const position = useMemo(() => {
        if (!boardDimension) return;
        return {
            top: no === 0 ? boardDimension.height * 7 / 12 : boardDimension.height * 5 / 12 - 5,
            left: 0,
            width: boardDimension.width,
            height: 5,
            zIndex: 2000,
        };
    }, [boardDimension]);

    return (
        <SceneWrap id={"turn-bar-" + no} position={position}>
            <div style={{ display: "flex", width: "100%", height: "100%" }}>
                {Array.from({ length: size }, (_, i) => i).map((i) => (
                    <div key={i + 1} id={"turn-bar-item-" + no + "-" + i} className="turn-bar-item" style={{ width: "100%", height: "100%" }}></div>
                ))}
            </div>
        </SceneWrap>
    );
};

export default TurnBar;