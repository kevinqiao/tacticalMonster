import React from "react";

import { useCombatManager } from "../../../service/CombatManager";
import { ensureGameReportSprite } from "../../../utils/combatHudRegistry";

import "./styles.css";

/** 3D 结算：仅用本地 game / gameOverEvent 展示；终局与 Tournament 由服务端 phase 流与 submitScore 路径处理，不再请求 gameOver mutation */
const GameOver: React.FC = () => {
    const { combatHudRef } = useCombatManager();

    ensureGameReportSprite(combatHudRef);

    return (
        <div
            className="game-report-container"
            ref={(el) => {
                const root = ensureGameReportSprite(combatHudRef);
                root.ele = el;
            }}
        >
            {/* <div className="game-over-report">
                <div>Score: {totalScore}</div>
                {endReason ? <div>{endReason}</div> : null}
            </div>
            <div className="game-over-actions">
                <button
                    className="game-over-button"
                    onClick={() => void handleSubmit()}
                    disabled={submitting || submitted}
                >
                    {submitted ? "Submitted" : submitting ? "Submitting..." : "Submit Score (retry)"}
                </button>
                <button className="game-over-button" onClick={handleClose}>
                    Close
                </button>
            </div> */}
        </div>
    );
};
export default GameOver;
