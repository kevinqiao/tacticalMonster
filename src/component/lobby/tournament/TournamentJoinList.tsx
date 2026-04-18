import { ModalProp } from "@/service/ModalManager";
import React from "react";
import TournamentHome from "./TournamentHome";
import "./tournamentList.css";


const TournamentJoinList: React.FC<ModalProp> = ({ visible, data, close }) => {
    // console.log("TournamentJoinList", visible, data, close);
    return (
        <div style={{ width: "100%", height: "100%" }}>
            <TournamentHome />
            {/* <div style={{ width: "100%", height: "100%", backgroundColor: "red" }} /> */}
        </div>
    );
};

export default TournamentJoinList;
