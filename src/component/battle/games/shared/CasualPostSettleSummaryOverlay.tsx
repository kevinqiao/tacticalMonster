import { setPortalAdPhase } from 'host/service/ads/display/portalAdPhase';
import { useCrazyGamesMidgameBreak } from 'host/service/ads/midgame/useCrazyGamesMidgameBreak';
import React, { useEffect, useId } from 'react';



import type { WeeklyLeagueSettleUI } from './casualWeeklyLeagueScoreUI';

import { formatWeeklyLeagueSettleLines } from './casualWeeklyLeagueScoreUI';



import type { CasualAsyncTableSummaryUI, Match3WatchContext } from './casualAsyncTableSummaryUI';

import { CasualAdReplayVideoIcon } from './CasualAdReplayVideoIcon';
import {
  CASUAL_AD_REPLAY_BUTTON_LABEL,
  formatCasualAdReplayQuotaBadge,
} from './casualGameScoreReportUI';
import { CasualTableSummaryPanel } from './CasualTableSummaryPanel';

import { useReplayWindowCountdown } from './useReplayWindowCountdown';

import './manualSettleConfirmOverlay.css';



export type CasualPostSettleSummaryOverlayProps = {

  open: boolean;

  title?: string;

  subtitle?: string;

  /** 有数据时展示本桌完整名次表（每行一玩家） */

  summary: CasualAsyncTableSummaryUI | null;

  /** 后端 `pendingOthers`：成绩已记，本桌尚未全员提交，暂无摘要 */

  waitingForPeers?: boolean;

  onDismiss: () => void;

  dismissLabel?: string;

  /** 可点击再战时展示（与单人挑战一致：不可战则不显示） */

  replayAvailable?: boolean;

  replayLabel?: string;

  /** Portal 广告再战 vs 门票 */

  replayMode?: "ad" | "token";

  /** 广告再战：今日剩余（与 cap 一起换算已用/上限，单独展示） */
  adReplayDailyRemaining?: number;

  adReplayDailyCap?: number;

  onReplay?: () => void;

  replayBusy?: boolean;

  /** epoch ms，再战窗口结束时刻 */

  replayWindowEndsAt?: number;

  onWatchRow?: (ctx: Match3WatchContext, displayLabel: string) => void;

  watchButtonLabel?: string;

  weeklyLeagueSettle?: WeeklyLeagueSettleUI | null;

  /** 内容区滚动时底部操作栏固定可见（默认开启，避免矮屏溢出） */

  pinFooter?: boolean;

  /** 历史战报等：覆盖同桌榜表头说明 */

  tableMetaNote?: string;

  /** 三场合战整场再战：定制说明文案 */

  triathlonSessionReplay?: boolean;

};



/**

 * 休闲 run 提交成功后展示同桌摘要（自然终局等非 ManualSettle 流程）。

 */

export const CasualPostSettleSummaryOverlay: React.FC<CasualPostSettleSummaryOverlayProps> = ({

  open,

  title = '本局已结算',

  subtitle,

  summary,

  waitingForPeers = false,

  onDismiss,

  dismissLabel = '继续',

  replayAvailable = false,

  replayLabel = CASUAL_AD_REPLAY_BUTTON_LABEL,

  replayMode = "token",

  adReplayDailyRemaining,

  adReplayDailyCap,

  onReplay,

  replayBusy = false,

  replayWindowEndsAt,

  onWatchRow,

  watchButtonLabel,

  weeklyLeagueSettle,

  pinFooter = true,

  tableMetaNote,

  triathlonSessionReplay = false,

}) => {

  const titleId = useId();

  const countdown = useReplayWindowCountdown(replayWindowEndsAt);
  const midgameReady = useCrazyGamesMidgameBreak(open);

  useEffect(() => {
    if (!open) return;
    setPortalAdPhase('settle');
  }, [open]);

  const showTable = Boolean(summary?.rows?.length);

  const showPending = Boolean(waitingForPeers) && !showTable;

  const showSubmittedOnly = open && !showTable && !showPending;



  if (!open || (!showTable && !showPending && !showSubmittedOnly)) return null;



  const defaultSub =

    showTable

      ? triathlonSessionReplay

        ? '三局累计总分如下。再战将消耗 1 张门票，三局从头重打（同 seed），bot 与同桌不变。'

        : '你已提交成绩，以下为本桌全部玩家得分与名次。'

      : showPending

        ? '你的成绩已记录。本桌尚有同桌未完成，暂无法计算名次与分差。'

        : '本局成绩已成功提交。';



  const body = subtitle != null && subtitle.trim() ? subtitle.trim() : defaultSub;



  const showReplayBtn = replayAvailable && Boolean(onReplay);
  const isAdReplay = replayMode === "ad";
  const quotaBadge = isAdReplay
    ? formatCasualAdReplayQuotaBadge(adReplayDailyRemaining, adReplayDailyCap)
    : undefined;

  let replayBtnText = replayLabel;

  if (isAdReplay && !midgameReady) {
    replayBtnText = "广告加载中…";
  } else if (replayBusy) {
    replayBtnText = "匹配中…";
  }

  if (countdown) {
    replayBtnText = `${replayBtnText} ${countdown}`;
  }

  const replayButtonTitle = [replayLabel, quotaBadge].filter(Boolean).join(" ");



  const leagueLines = formatWeeklyLeagueSettleLines(weeklyLeagueSettle);



  return (

    <div className="msc-overlay" role="presentation">

      <button

        type="button"

        className="msc-backdrop"

        aria-label="关闭"

        onClick={onDismiss}

      />

      <div

        className="msc-dialog"

        role="dialog"

        aria-labelledby={titleId}

        aria-modal="true"

        onClick={(e) => e.stopPropagation()}

      >

        <div className={pinFooter ? 'ssc ssc--pinnedFooter' : 'ssc'}>

          <div className={pinFooter ? 'ssc__scroll' : undefined}>

            <h2 id={titleId} className="ssc__title msc-successTitle">

              {title}

            </h2>

            {body ? <p className="ssc__body">{body}</p> : null}

            {showTable && summary ? (

              <CasualTableSummaryPanel

                s={summary}

                onWatchRow={onWatchRow}

                watchButtonLabel={watchButtonLabel}

                metaNote={tableMetaNote}

              />

            ) : null}

            {showPending ? (

              <p className="ssc__body msc-pendingPeersNote" role="status">

                全部同桌提交后，可在下一场对局结束时的结算页查看本桌名次。

              </p>

            ) : null}

            {leagueLines.length > 0 ? (

              <ul className="ssc__leagueLines" aria-label="周联赛">

                {leagueLines.map((line) => (

                  <li key={line.label}>

                    {line.label} <b>{line.value}</b>

                  </li>

                ))}

              </ul>

            ) : null}

          </div>

          <div
            className={[
              'ssc__actions',
              pinFooter ? 'ssc__actions--pinned' : '',
              showReplayBtn ? 'ssc__actions--withReplay' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {showReplayBtn ? (
              <button
                type="button"
                className="ssc__btn ssc__btn--secondary ssc__btn--replayCompact"
                disabled={(isAdReplay && !midgameReady) || replayBusy}
                onClick={() => onReplay?.()}
                title={replayButtonTitle}
              >
                {isAdReplay && midgameReady && !replayBusy ? (
                  <CasualAdReplayVideoIcon />
                ) : null}
                <span className="ssc__replayMain">{replayBtnText}</span>
                {quotaBadge ? (
                  <span className="ssc__replayRemaining" aria-label={`今日已用 ${quotaBadge}`}>
                    {quotaBadge}
                  </span>
                ) : null}
              </button>
            ) : null}
            <button
              type="button"
              className={`ssc__btn ssc__btn--primary${showReplayBtn ? ' ssc__btn--continueWide' : ''}`}
              disabled={!midgameReady}
              onClick={onDismiss}
            >
              {midgameReady ? dismissLabel : '广告加载中…'}
            </button>
          </div>

        </div>

      </div>

    </div>

  );

};


