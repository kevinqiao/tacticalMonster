import React, { useEffect, useMemo } from "react";
import { useCombatManager } from "../../service/CombatManager";
import { useSprite } from "../../service/SpriteProvider";

import { CSSProperties } from "react";
import SpriteWrap from "./SpriteWrap";
import "./style.css";


const TurnBar: React.FC<{ size: number, no: number }> = ({ size, no }) => {
    const { game, currentAct, boardDimension, direction } = useCombatManager();
    const { spriteRefs } = useSprite();

    const position = useMemo((): CSSProperties => {
        if (!boardDimension) return {};
        return {
            position: "absolute",
            top: no === 0 ? boardDimension.height * 7 / 12 : boardDimension.height * 5 / 12 - 5,
            left: 0,
            width: boardDimension.width,
            height: 5,
            zIndex: 2000,
        };
    }, [boardDimension]);

    useEffect(() => {
        if (!game || !currentAct) return;
        const seat = game.seats?.find(seat => seat.uid === currentAct.uid);
        if (!seat) return;
        const activeNo = direction === 0 ? seat.field - 2 : 3 - seat.field;
        // console.log("turn", game.currentTurn, currentAct)
        if (activeNo !== no) {
            const turnBar = spriteRefs.get("turn-bar-" + no);
            if (!turnBar?.current) return;
            turnBar.current.style.display = "none";
        } else {

            const turnBar = spriteRefs.get("turn-bar-" + no);
            // const turnBar = document.getElementById("turn-bar-" + no);
            if (!turnBar?.current) return;
            turnBar.current.style.display = "block";
            const acted = game.currentTurn?.actions.acted || 0;

            for (let i = 1; i <= size; i++) {
                const turnBarItemRef = spriteRefs.get("turn-bar-item-" + no + "-" + i);
                console.log("turnBarItemRef:", turnBarItemRef)
                if (!turnBarItemRef?.current) continue;
                if (i <= acted) {
                    turnBarItemRef.current.style.backgroundColor = "red";
                } else if (i === currentAct.act) {
                    turnBarItemRef.current.style.backgroundColor = "green";
                } else {
                    turnBarItemRef.current.style.backgroundColor = "grey";
                }
            }
        }
    }, [no, game, currentAct, direction])

    const render = useMemo(() => (
        <SpriteWrap id={"turn-bar-" + no} position={position}>
            <div id="turn-bar-items" style={{ display: "flex", width: "100%", height: "100%" }}>
                {Array.from({ length: size }, (_, i) => i).map((i) => (
                    <div key={"turn-bar-item-" + no + "-" + (i + 1)} id={"turn-bar-item-" + no + "-" + (i + 1)} style={{ width: "33%", height: 6, border:"1px solid white",backgroundColor: "grey" }}></div>
                ))}
            </div>
        </SpriteWrap>
    ), [no, position]);
    return render;
};

export default TurnBar;