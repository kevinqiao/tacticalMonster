import React from "react";
import { useCombatManager } from "../../../service/CombatManager";
import { ensureGameReportSprite } from "../../../utils/combatHudRegistry";
import "./styles.css";

/** 3D 结算：仅用本地 game / gameOverEvent 展示；终局与 Tournament 由服务端 phase 流与 submitScore 路径处理，不再请求 gameOver mutation */
const GameReport: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { combatHudRef, game, exit } = useCombatManager();

    return (
        <>
            <div
                className="game-report-container"
                ref={(el) => {
                    const root = ensureGameReportSprite(combatHudRef);
                    root.ele = el;
                }}
            >
                <div className="game-over-mask">

                </div>
                <div className="game-over-actions">
                    <button
                        className="game-over-button"
                    >
                        submit score
                    </button>
                    <button className="game-over-button" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>


        </>
    );
};
export default GameReport;
