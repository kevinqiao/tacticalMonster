import type { ModalProp } from 'host/service/ModalManager';
import React from 'react';

import { CasualTriathlonGameStage } from './CasualTriathlonGameStage';
import './casualTriathlonGameStage.css';

type Props = ModalProp & {
  children: React.ReactNode;
  /** triathlon = 1:1.3 居中框；full = 占满弹层（接龙等宽牌桌） */
  layout?: 'triathlon' | 'full';
};

/** 休闲单局弹层：默认与合战相同的 1:1.3 居中战斗视口 */
export const PlayCasualGameModalShell: React.FC<Props> = ({
  visible,
  data,
  close,
  children,
  layout = 'triathlon',
}) => {
  if (!visible) return null;

  const casualTournamentId =
    typeof data?.casualTournamentId === 'string' ? data.casualTournamentId : undefined;
  const casualMatchGameId =
    typeof data?.casualMatchGameId === 'string' ? data.casualMatchGameId : undefined;

  if (casualTournamentId && !casualMatchGameId) {
    return (
      <div className="casual-triathlon-stage casual-triathlon-stage--error" role="alert">
        <p>请先在 Play 通过锦标赛列表报名，再进入对局。</p>
        <button type="button" onClick={close}>
          关闭
        </button>
      </div>
    );
  }

  if (layout === 'full') {
    return <div className="casual-game-stage-full">{children}</div>;
  }

  return <CasualTriathlonGameStage>{children}</CasualTriathlonGameStage>;
};
