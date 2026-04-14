import React from "react";
import { TournamentModeType } from "../config/tournamentConfigs";
import "./tournamentList.css";


const TournamentCategoryList: React.FC = () => {
    return (
        <div className="tournament-list-container">
            {/* 静态大图/背景作为 LCP 元素，确保立即渲染且尺寸够大 */}
            <div className="tournament-header">
                <h1 className="tournament-title">Tournaments</h1>
            </div>

        </div>
    );
};

export default TournamentCategoryList;
