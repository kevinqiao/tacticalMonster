import { useTournamentManager } from "@/service/TournamentManager";
import React from "react";
import "./styles.css";

const TeamLayout: React.FC<{ stageId: string, onComplete: () => void }> = ({ stageId, onComplete }) => {
    console.log("team layout", stageId);
    const { monsters } = useTournamentManager();
    return <div>

        {monsters && monsters.length > 0 && <button className="team-layout-button" onClick={onComplete}>Join</button>}

    </div>;

};
export default TeamLayout;