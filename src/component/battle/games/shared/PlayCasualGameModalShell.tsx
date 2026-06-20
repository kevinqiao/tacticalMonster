import type { ModalProp } from 'host/service/ModalManager';
import React from 'react';

import { CasualTriathlonGameStage } from './CasualTriathlonGameStage';

type Props = ModalProp & {
  children: React.ReactNode;
};

/** 休闲单局弹层：与合战相同的 1:1.5 居中战斗视口 */
export const PlayCasualGameModalShell: React.FC<Props> = ({ visible, data, close, children }) => {
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

  return <CasualTriathlonGameStage>{children}</CasualTriathlonGameStage>;
};
