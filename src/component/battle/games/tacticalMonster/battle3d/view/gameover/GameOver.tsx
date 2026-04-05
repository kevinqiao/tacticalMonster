import React, { useCallback } from "react";
import { useCombatManager } from "../../../service/CombatManager";
import { usePlayGameOver } from "../../animation/usePlayGameOver";
import GameReport from "./GameReport";
import MatchReport from "./MatchReport";
import "./styles.css";

/** 3D 结算：仅用本地 game / gameOverEvent 展示；终局与 Tournament 由服务端 phase 流与 submitScore 路径处理，不再请求 gameOver mutation */
const GameOver: React.FC = () => {
    const { game } = useCombatManager();
    const { playGameReportClose, playMatchReport } = usePlayGameOver();
    const onGameReportClose = useCallback(() => {
        playGameReportClose({
            onComplete: () => {
                console.log("game mode:", game?.mode);
                playMatchReport({});

            },
        });
    }, [game, playGameReportClose, playMatchReport]);

    return (
        <>
            <GameReport onClose={onGameReportClose} />
            <MatchReport />
        </>
    );
};
export default GameOver;
