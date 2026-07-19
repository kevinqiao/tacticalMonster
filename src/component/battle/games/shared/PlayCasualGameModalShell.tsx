import type { ModalProp } from 'host/service/ModalManager';
import {
  beginPortalGameSessionLoad,
  endPortalGameSession,
  markPortalGameplayReady,
} from 'host/service/ads/display/portalAdPhase';
import React, { useEffect } from 'react';

import { CasualTriathlonGameStage } from './CasualTriathlonGameStage';
import './casualTriathlonGameStage.css';

/** Games without `onGameLoadComplete` still need a gameplayStart for CrazyGames QA. */
const GAMEPLAY_READY_FALLBACK_MS = 2500;

type Props = ModalProp & {
  children: React.ReactNode;
};

/** 休闲单局弹层：铺满外层 modal（外层按屏宽高比相对 10/13 定尺寸） */
export const PlayCasualGameModalShell: React.FC<Props> = ({
  visible,
  data,
  close,
  children,
}) => {
  const casualTournamentId =
    typeof data?.casualTournamentId === 'string' ? data.casualTournamentId : undefined;
  const casualMatchGameId =
    typeof data?.casualMatchGameId === 'string' ? data.casualMatchGameId : undefined;

  useEffect(() => {
    if (!visible || !casualMatchGameId) return;
    beginPortalGameSessionLoad();
    const timer = window.setTimeout(() => {
      markPortalGameplayReady();
    }, GAMEPLAY_READY_FALLBACK_MS);
    return () => {
      window.clearTimeout(timer);
      endPortalGameSession();
    };
  }, [visible, casualMatchGameId]);

  if (!visible) return null;

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
