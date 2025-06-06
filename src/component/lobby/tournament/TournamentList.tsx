import { useConvex } from "convex/react";
import React from "react";
import { api } from "../../../convex/solitaire/convex/_generated/api";
import { usePageManager } from "../../../service/PageManager";
import { SSAProvider, useSSAManager } from "../../../service/SSAManager";
import "./style.css";
const TournamentItem: React.FC<{ item: number }> = (props) => {
    const { openPage } = usePageManager();
    const { player } = useSSAManager();
    const convex = useConvex();
    // console.log(credentials);
    const getSignedPlayer = async () => {
        console.log("getSignedPlayer", player?.uid, player?.token);
        const signedPlayer = await convex.action(api.service.auth.getSignedPlayer, { uid: player?.uid ?? "", token: player?.token ?? "" });
        console.log(signedPlayer);
        openPage({ uri: "/play/lobby/match", data: { token: signedPlayer } });
    }
    return (
        <div className="tournament-list-item">
            <button onClick={getSignedPlayer}>Join Match</button>
        </div>
    );
};
const TournamentList: React.FC = (props) => {
    // const { credentials } = useSSAManager();

    return (
        <SSAProvider app="solitaire">
            <div
                className="tournament-list-container"
            >
                {Array.from({ length: 8 }, (_, index) => index + 1).map((item, index) => (
                    <TournamentItem item={item} key={index} />
                ))}
            </div>
        </SSAProvider>
    );
};
const TournamentHome: React.FC = (props) => {
    return (
        <div className="tournament-home-container">
            <TournamentList />
        </div>
    );
};
export default TournamentHome;