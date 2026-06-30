import type { ModalProp } from 'host/service/ModalManager';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import BlockBlastGame from 'component/battle/games/blockBlast/battle/BlockBlastGame';
import { CasualTriathlonBetweenGamesOverlay } from 'component/battle/games/shared/CasualTriathlonBetweenGamesOverlay';
import { CasualTriathlonGameStage } from 'component/battle/games/shared/CasualTriathlonGameStage';
import 'component/battle/games/shared/casualTriathlonGameStage.css';
import type { TriathlonLegScore } from 'component/battle/games/shared/casualTriathlonSubmitFlow';
import type { CasualGameScoreReportUI } from 'component/battle/games/shared/casualGameScoreReportUI';
import {
  resolveTriathlonSessionLeg,
  triathlonGameLabel,
  triathlonLegScoresFromProgress,
  type TriathlonMidSessionAdvanceHandler,
} from 'component/battle/games/shared/casualTriathlonSubmitFlow';
import Match3Game from 'component/battle/games/match3/battle/Match3Game';
import SolitaireGame from 'component/battle/games/solitaireSolo/battle/SolitaireGame';

import {
  casualGameKindFromGameType,
  type CasualGameKind,
} from '../../service/casualOpenRunAssignment';
import { useCasualPlatform } from '../../service/useCasualPlatformManager';
import type { TriathlonNextGame } from '../../service/useCasualTriathlonSession';

type SessionLeg = {
  gameId: string;
  gameIndex: number;
  gameType: string;
};

const PlayCasualTriathlonSession: React.FC<ModalProp> = ({ visible, data, close }) => {
  const casual = useCasualPlatform();
  const casualTournamentId =
    typeof data?.casualTournamentId === 'string' ? data.casualTournamentId : undefined;
  const initialGameId =
    typeof data?.casualMatchGameId === 'string' ? data.casualMatchGameId : undefined;

  const initialLeg = useMemo(() => {
    if (!casualTournamentId || !initialGameId) return null;
    return resolveTriathlonSessionLeg(casualTournamentId, initialGameId);
  }, [casualTournamentId, initialGameId]);

  const [activeLeg, setActiveLeg] = useState<SessionLeg | null>(initialLeg);
  const [legScores, setLegScores] = useState<TriathlonLegScore[]>([]);
  const [pendingNext, setPendingNext] = useState<TriathlonNextGame | null>(null);
  const [lastCompletedLeg, setLastCompletedLeg] = useState<TriathlonLegScore | null>(null);
  const [lastCompletedScoreReport, setLastCompletedScoreReport] =
    useState<CasualGameScoreReportUI | null>(null);

  useEffect(() => {
    setActiveLeg(initialLeg);
    setPendingNext(null);
    setLastCompletedLeg(null);
    setLastCompletedScoreReport(null);
  }, [initialLeg?.gameId, casualTournamentId]);

  useEffect(() => {
    if (!visible || !initialGameId) {
      setLegScores([]);
      return;
    }
    let cancelled = false;
    void casual.fetchTriathlonSessionProgress(initialGameId).then((progress) => {
      if (cancelled) return;
      const fromServer = triathlonLegScoresFromProgress(progress);
      if (fromServer.length > 0) {
        setLegScores(fromServer);
      }
      if (progress?.openLeg && initialLeg) {
        const serverLeg = progress.openLeg;
        if (
          serverLeg.gameId !== initialLeg.gameId ||
          serverLeg.gameIndex !== initialLeg.gameIndex
        ) {
          setActiveLeg({
            gameId: serverLeg.gameId,
            gameIndex: serverLeg.gameIndex,
            gameType: serverLeg.gameType,
          });
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [visible, initialGameId, initialLeg, casual.fetchTriathlonSessionProgress]);

  const onTriathlonNextGame = useCallback(
    (
      next: TriathlonNextGame,
      score: number,
      gameType: string,
      scoreReport?: CasualGameScoreReportUI
    ) => {
      const completed: TriathlonLegScore = { gameType, score };
      setLegScores((prev) => [...prev, completed]);
      setLastCompletedLeg(completed);
      setLastCompletedScoreReport(scoreReport ?? null);
      setPendingNext(next);
    },
    []
  );

  const continueToNextLeg = useCallback(() => {
    if (!pendingNext) return;
    setActiveLeg({
      gameId: pendingNext.gameId,
      gameIndex: pendingNext.gameIndex,
      gameType: pendingNext.gameType,
    });
    setPendingNext(null);
    setLastCompletedLeg(null);
    setLastCompletedScoreReport(null);
  }, [pendingNext]);

  const onTriathlonSessionReplay = useCallback(
    (restartGameId: string) => {
      if (!casualTournamentId) return;
      const leg = resolveTriathlonSessionLeg(casualTournamentId, restartGameId);
      setActiveLeg(leg);
      setLegScores([]);
      setPendingNext(null);
      setLastCompletedLeg(null);
      setLastCompletedScoreReport(null);
    },
    [casualTournamentId]
  );

  if (!visible) return null;

  if (!casualTournamentId || !initialLeg || !activeLeg) {
    return (
      <div className="casual-triathlon-stage casual-triathlon-stage--error" role="alert">
        <p>无法进入三场合战，请从 Play 重新报名。</p>
        <button type="button" onClick={close}>
          关闭
        </button>
      </div>
    );
  }

  if (pendingNext && lastCompletedLeg) {
    return (
      <CasualTriathlonBetweenGamesOverlay
        open
        completedLeg={lastCompletedLeg}
        legScores={legScores}
        nextGame={pendingNext}
        scoreReport={lastCompletedScoreReport}
        onContinue={continueToNextLeg}
      />
    );
  }

  const kind: CasualGameKind = casualGameKindFromGameType(activeLeg.gameType);
  const makeAdvanceHandler =
    (gameType: string): TriathlonMidSessionAdvanceHandler =>
    (next, score, scoreReport) => {
      onTriathlonNextGame(next, score, gameType, scoreReport);
    };

  const badge = (
    <>
      三场合战 · 第 {activeLeg.gameIndex + 1} 局 · {triathlonGameLabel(activeLeg.gameType)}
      {legScores.length > 0
        ? ` · 累计 ${legScores.reduce((s, r) => s + r.score, 0).toLocaleString()} 分`
        : ''}
    </>
  );

  const gameProps = {
    casualTournamentId,
    casualMatchGameId: activeLeg.gameId,
    onGameSubmit: close,
    onTriathlonNextGame: makeAdvanceHandler(activeLeg.gameType),
  };

  if (kind !== 'match_3') {
    return (
      <div className="casual-game-stage-full">
        <div className="casual-triathlon-stage__badge">{badge}</div>
        {kind === 'block_blast' ? (
          <BlockBlastGame key={activeLeg.gameId} {...gameProps} />
        ) : (
          <SolitaireGame key={activeLeg.gameId} {...gameProps} />
        )}
      </div>
    );
  }

  return (
    <CasualTriathlonGameStage badge={badge}>
      <Match3Game
        key={activeLeg.gameId}
        {...gameProps}
        onTriathlonSessionReplay={onTriathlonSessionReplay}
      />
    </CasualTriathlonGameStage>
  );
};

export default PlayCasualTriathlonSession;
