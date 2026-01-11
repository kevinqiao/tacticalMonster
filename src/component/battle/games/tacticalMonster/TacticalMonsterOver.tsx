import { useModalManager } from "@/service/ModalManager";
import React from "react";
import { GameOverProps } from "../../GameOver";
import "./styles.css";

const TacticalMonsterOver: React.FC<GameOverProps> = ({ gameId }) => {
    console.log("tactical monster over", gameId);
    const { closeAll } = useModalManager();
    return <div className="tactical-monster-over-container">
        <div className="team-layout-button" onClick={closeAll}>Tactical Monster Over</div>
    </div>;

};
export default TacticalMonsterOver;