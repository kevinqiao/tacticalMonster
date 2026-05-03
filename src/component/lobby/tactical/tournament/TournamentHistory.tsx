import { ModalProp } from "host/service/ModalManager";
import React from "react";
import "./tournamentList.css";


const TournamentHistory: React.FC<ModalProp> = ({ visible, data, close }) => {
    // console.log("TournamentJoinList", visible, data, close);
    return (
        <div style={{ width: "100%", height: "100%" }}>

            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", height: "100%", backgroundColor: "red", color: "white" }} >Tournament History</div>
        </div>
    );
};

export default TournamentHistory;
