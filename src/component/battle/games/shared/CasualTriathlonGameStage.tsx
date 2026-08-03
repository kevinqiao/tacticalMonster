import React from 'react';

import './casualTriathlonGameStage.css';

type Props = {
  badge?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * 休闲对局战斗视口：铺满外层 modal-container。
 * 外层尺寸由 PageConfiguration（宽 = min(100%, 100vh×10/13)，高 = 100%）决定，
 * 故屏宽高比 > 10/13 时弹窗高满屏并保持 10:13；更窄时满宽满高，桌面与弹窗一致。
 */
export const CasualTriathlonGameStage: React.FC<Props> = ({ badge, children }) => (
  <div className="casual-triathlon-stage">
    {badge ? <div className="casual-triathlon-stage__badge">{badge}</div> : null}
    <div className="casual-triathlon-stage__game">{children}</div>
  </div>
);
