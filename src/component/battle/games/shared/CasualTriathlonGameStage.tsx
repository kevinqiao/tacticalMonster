import React from 'react';

import './casualTriathlonGameStage.css';

type Props = {
  badge?: React.ReactNode;
  children: React.ReactNode;
};

/** 休闲对局统一战斗视口：宽高比 1:1.3，最大化居中（单局 / 合战共用） */
export const CasualTriathlonGameStage: React.FC<Props> = ({ badge, children }) => (
  <div className="casual-triathlon-stage">
    {badge ? <div className="casual-triathlon-stage__badge">{badge}</div> : null}
    <div className="casual-triathlon-stage__viewport">
      <div className="casual-triathlon-stage__frame">
        <div className="casual-triathlon-stage__game">{children}</div>
      </div>
    </div>
  </div>
);
