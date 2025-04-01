import React, { useMemo } from "react";
import { useCombatManager } from "../../service/CombatManager";

import { CSSProperties } from "react";
import SpriteWrap from "./SpriteWrap";
import "./sprite.css";
export const PropsPanel: React.FC<{ no: number }> = ({ no }) => {
    const { game, boardDimension, direction } = useCombatManager();
    return <SpriteWrap id={"avatar-panel-" + no} position={{ width: "50%" }}>
        {no === 0 && <div className={direction === 0 ? "avatar0" : "avatar1"}></div>}
        {no === 1 && <div className={direction === 0 ? "avatar1" : "avatar0"}></div>}
    </SpriteWrap>
}
export const AvatarPanel: React.FC<{ no: number }> = ({ no }) => {
    const { game, boardDimension, direction } = useCombatManager();
    const player = useMemo(() => {
        if (!game) return null;
        const field = direction === 0 ? (no === 0 ? 2 : 3) : (no === 0 ? 3 : 2);
        const player = game.seats?.find(seat => seat.field === field);
        return player;
    }, [game, direction, no]);
    return <SpriteWrap id={"avatar-panel-" + no} position={{ display: "flex", width: "100%" }}>
        {no === 0 && <><div className={direction === 0 ? "avatar0" : "avatar1"} style={{ width: "50%" }}></div><div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "50%", height: "100%", backgroundColor: "white" }}>100</div></>}
        {no === 1 && <><div className={direction === 0 ? "avatar1" : "avatar0"} style={{ width: "50%" }}></div><div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "50%", height: "100%", backgroundColor: "white" }}>100</div></>}
    </SpriteWrap>
}
const SkillPanel: React.FC<{ no: number }> = ({ no }) => {
    const { game, boardDimension, direction } = useCombatManager();
    const skills = useMemo(() => {
        if (!game) return [];
        return [1, 2, 3]

    }, [game, no]);
    return <SpriteWrap id={"skill-panel-" + no}>
        <div id="skill-panel-items" style={{
            display: "flex",
            justifyContent: "center",    // 外层容器居中
            alignItems: "center",
            width: "100%",
            height: "100%",
            color: "white"
        }}>
            <div style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-around",  // 内层容器靠左对齐
                marginTop: "10px",
                width: "90%",          // 容器宽度适应内容
                transform: no === 1 ? "rotateX(180deg)" : "rotateX(0deg)",
            }}>
                {skills.map((skill, index) => (
                    <div key={index} className="skill-icon"></div>
                ))}
            </div>
        </div>
    </SpriteWrap>
}
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
            left: boardDimension.width,
            width,
            height: height - 10,
            // backgroundColor: "white",
        };
    }, [no, boardDimension]);

    return <SpriteWrap id={"control-panel-" + no} position={position}>

        <div id="control-panel-items" style={{ display: "flex", flexDirection: "column", justifyContent: no === 0 ? "flex-start" : "flex-end", alignItems: "center", width: "100%", height: "100%", color: "white" }}>
            {no === 0 ? <> <div id="avatar-panel0" className="avatar-panel"><AvatarPanel no={no} /></div>
                <div style={{ width: "100%", height: "30%", backgroundColor: "green" }}><SkillPanel no={no} /></div>
                <div style={{ width: "100%", height: "40%", backgroundColor: "white" }}><PropsPanel no={no} /></div>
            </> : <>
                <div style={{ width: "100%", height: "40%", backgroundColor: "white" }}><PropsPanel no={no} /></div>
                <div style={{ width: "100%", height: "30%", backgroundColor: "green" }}><SkillPanel no={no} /></div>
                <div id="avatar-panel1" className="avatar-panel"><AvatarPanel no={no} /></div>
            </>}
        </div>
    </SpriteWrap>
}

export default ControlPanel;