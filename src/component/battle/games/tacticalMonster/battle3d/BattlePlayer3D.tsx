/**
 * 3D 战斗主界面：按 mode 挂载游玩或观战/重播子树；全局 overlay（结束态）
 * 观战/重播：BattleVenue3DSpectator（内含 ReplayControls + ReplayScoreDisplay）
 */

import React from "react";
import { useCombatManager } from "../service/CombatManager";
import { BattleVenue3DPlay } from "./BattleVenue3DPlay";
import { BattleVenue3DSpectator } from "./BattleVenue3DSpectator";
import "./style.css";

const BattlePlayer3D: React.FC<{ close?: () => void }> = ({ close }) => {
    const { mode } = useCombatManager();

    const venue =
        mode === "watch" || mode === "replay" ? (
            <BattleVenue3DSpectator close={close} />
        ) : (
            <BattleVenue3DPlay close={close} />
        );

    return (
        <>
            {venue}

        </>
    );
};

export default BattlePlayer3D;
