import React, { useCallback } from "react";
import { useCombatManager } from "../../../service/CombatManager";
import { ensureMatchReportSprite } from "../../../utils/combatHudRegistry";
import { usePlayGameOver } from "../../animation/usePlayGameOver";
import "./styles.css";

/** 对局/匹配结算层（与 GameReport 区分） */
const MatchReport: React.FC = () => {
    const { combatHudRef, exit } = useCombatManager();
    const { playMatchReportClose } = usePlayGameOver();
    const close = useCallback(() => {
        playMatchReportClose({ onComplete: exit })
    }, [exit, playMatchReportClose])

    return (
        <div
            className="match-report-panel"
            ref={(el) => {
                const root = ensureMatchReportSprite(combatHudRef);
                root.ele = el;
            }}
            onClick={() => console.log("match-report-container click")}
        >
            <div className="match-report-actions">
                <button className="game-over-button" onClick={close}>
                    OK
                </button>
            </div>
        </div>
    );
};
export default MatchReport;
