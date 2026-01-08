import { ModalProp } from "@/service/ModalManager";
import React from "react";
import "./style.css";


const GameLauncher: React.FC<ModalProp> = (props) => {
    console.log("props", props);
    
    return (

        <div className="game-launcher-container"></div>

    );
};

export default GameLauncher;