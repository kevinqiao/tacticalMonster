import React, { useMemo } from "react";
import { useCombatManager } from "../../service/CombatManager";

import { CSSProperties } from "react";
import SpriteWrap from "./SpriteWrap";
import "./style.css";


const ControlPanel: React.FC<{ no: number }> = ({ no }) => {
    const { game, boardDimension, direction } = useCombatManager();

    const player = useMemo(() => {
        if (!game) return null;
        const field = direction === 0 ? (no === 0 ? 2 : 3) : (no === 0 ? 3 : 2);
        const player = game.seats?.find(seat => seat.field === field);
        return player;
    }, [game, direction, no]);

    const position = useMemo((): CSSProperties => {
        if (!boardDimension) return {};
        const slot = no === 0 ? boardDimension['zones'][2]['slots'][6] : boardDimension['zones'][3]['slots'][6];
        const { top, left, width, height } = slot;
        return {
            position: "absolute",
            top: no === 1 ? 0 : top + 5,
            left,
            width,
            height: height - 10,
            // backgroundColor: "white",
        };
    }, [no, boardDimension]);

    return <SpriteWrap id={"control-panel-" + no} position={position}>

        <div id="control-panel-items" style={{ display: "flex", flexDirection: "column", justifyContent: no === 0 ? "flex-start" : "flex-end", alignItems: "center", width: "100%", height: "100%", color: "white" }}>
            {no === 0 ? <> <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", height: 70, backgroundColor: "white", color: "black" }}>{player?.uid}</div>
                <div style={{ width: "100%", height: 70, backgroundColor: "green" }}></div>
                <div style={{ width: "100%", height: 70, backgroundColor: "blue" }}></div>
            </> : <>
                <div style={{ width: "100%", height: 70, backgroundColor: "blue" }}></div>
                <div style={{ width: "100%", height: 70, backgroundColor: "green" }}></div>
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", height: 70, backgroundColor: "white", color: "black" }}>{player?.uid}</div>
            </>}
        </div>
    </SpriteWrap>
}

export default ControlPanel;