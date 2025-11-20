import React from 'react';

import "./style.css";
import { MatchReportModel } from './types';

export const MatchReport: React.FC<{ matchReport: MatchReportModel | null, onOK: () => void }> = ({ matchReport, onOK }) => {


  return (
    <div className="match-report-content">
      <h1> Match Report</h1>
      <p>Score:</p>
      <div className="game-over-submit-container">
        <div className="game-over-submit-btn" onClick={onOK}>OK</div>
      </div>
    </div>
  );
};




export default MatchReport;