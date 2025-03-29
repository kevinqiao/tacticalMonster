import React, { useMemo } from "react";
import { useCombatManager } from "../../service/CombatManager";

import { CSSProperties } from "react";
import SpriteWrap from "./SpriteWrap";
import "./style.css";


const TurnBar: React.FC<{ size: number, no: number }> = ({ size, no }) => {
    const { boardDimension } = useCombatManager();

    const position = useMemo((): CSSProperties => {
        if (!boardDimension) return {};
        return {
            position: "absolute",
            top: no === 0 ? boardDimension.height * 7 / 12 : boardDimension.height * 5 / 12 - 5,
            left: 0,
            width: boardDimension.width,
            height: 5,
            zIndex: 2000,
            opacity: 0,
            visibility: "hidden",
        };
    }, [no, boardDimension]);

    return <SpriteWrap id={"turn-bar-" + no} position={position}>
        <div id="turn-bar-items" style={{ display: "flex", width: "100%", height: "100%" }}>
            {Array.from({ length: size }, (_, i) => i).map((i) => (
                <div key={"turn-bar-item-" + no + "-" + (i + 1)} id={"turn-bar-item-" + no + "-" + (i + 1)} style={{ width: "33%", height: 6, border: "1px solid white", backgroundColor: "grey" }}></div>
            ))}
        </div>
    </SpriteWrap>
}

export default TurnBar;