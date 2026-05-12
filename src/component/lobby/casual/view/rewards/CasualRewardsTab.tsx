import { PageProp } from "host/RenderApp";
import { useModalManager } from "host/service/ModalManager";
import { useUserManager } from "host/service/UserManager";
import React, { useEffect, useMemo, useRef, useState } from "react";

import { CASUAL_MISSION_TEMPLATES } from "@/convex/casualPlatform/convex/data/casualMissionTemplates";
import { CASUAL_BATTLE_PASS_MODAL_OPEN } from "../../control/HeadNavSharedCasual";
import { useCasualPlatform } from "../../service/useCasualPlatformManager";
import "../shared/casualEconomyPages.css";
import {
  missionClaimErrorMessage,
  missionRewardChipsFromTemplate,
} from "../shared/casualEconomyUi";
import CasualPageShell from "../shell/CasualPageShell";
import {
  createInitialFreeRewardsMock,
  type CasualFreeRewardsMockState,
} from "./casualFreeRewardsMock";

/** 当前 7 日奖周期内已点亮的档位数（与 `casual_checkin_streaks.streakCount` 一致） */
function checkinFilledSlots(streakCount: number): number {
  if (streakCount <= 0) return 0;
  const r = streakCount % 7;
  return r === 0 ? 7 : r;
}

/** 下一档待签索引 0..6；当日已领取则不高亮「今日」 */
function resolveCheckinTodaySlotIndex(streakCount: number, claimedToday: boolean): number | null {
  if (claimedToday) return null;
  const filled = checkinFilledSlots(streakCount);
  if (filled >= 7) return 0;
  return filled;
}

/** 奖励 Tab：免费获取入口（签到、邀请、广告等）；赛季通行证在独立 Modal */
const CasualRewardsTab: React.FC<PageProp> = ({ visible }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const casual = useCasualPlatform();
  const { user } = useUserManager();
  const { openModal } = useModalManager();
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const [mock, setMock] = useState<CasualFreeRewardsMockState>(createInitialFreeRewardsMock);
  const [claimingCheckIn, setClaimingCheckIn] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3800);
    return () => window.clearTimeout(t);
  }, [toast]);

  const mockBanner = !casual.convexUrl
    ? "未配置休闲后端：以下为免费奖励入口的界面预览。"
    : !user?.uid
      ? "未登录：以下交互为本地演示，登录后可对接真实领取。"
      : null;

  const openBattlePass = () => {
    openModal({
      name: CASUAL_BATTLE_PASS_MODAL_OPEN.name,
      effect: CASUAL_BATTLE_PASS_MODAL_OPEN.effect,
    });
  };

  const dailySignInMission = useMemo(
    () => casual.missions.find((m) => m.taskId === "daily_sign_in"),
    [casual.missions]
  );

  const dailySignInTemplate = useMemo(
    () => CASUAL_MISSION_TEMPLATES.find((t) => t.taskId === "daily_sign_in"),
    []
  );
  const checkInRewardChips = useMemo(
    () => missionRewardChipsFromTemplate(dailySignInTemplate),
    [dailySignInTemplate]
  );

  const checkInClaimedToday = Boolean(dailySignInMission?.claimed);
  const checkInStreakCount = dailySignInMission
    ? (casual.checkinStreak?.streakCount ?? 0)
    : mock.checkInStreak;
  const checkInFilledSlots = checkinFilledSlots(checkInStreakCount);
  const todayCheckinSlotIndex = resolveCheckinTodaySlotIndex(
    checkInStreakCount,
    dailySignInMission ? checkInClaimedToday : mock.checkInClaimedToday
  );

  const checkInTodayState = !dailySignInMission
    ? mock.checkInClaimedToday
      ? "今日已签"
      : "待签到"
    : checkInClaimedToday
      ? "今日已签"
      : dailySignInMission.completed
        ? "可领取"
        : "待签到";
  const canClaimCheckIn = Boolean(
    dailySignInMission &&
      dailySignInMission.completed &&
      !checkInClaimedToday &&
      !claimingCheckIn
  );

  useEffect(() => {
    if (!visible) return;
    if (!user?.uid) return;
    if (!dailySignInMission) return;
    if (dailySignInMission.completed || checkInClaimedToday) return;
    void casual.touchDailyLoginMission();
  }, [
    visible,
    user?.uid,
    dailySignInMission?.completed,
    dailySignInMission?.claimed,
    dailySignInMission?.taskId,
    casual,
  ]);

  const handleClaimCheckIn = async () => {
    if (!dailySignInMission) {
      setMock((s) => ({
        ...s,
        checkInClaimedToday: true,
        checkInStreak: s.checkInStreak + (s.checkInClaimedToday ? 0 : 1),
      }));
      setToast({ ok: true, text: "预览：今日签到奖励已领取" });
      return;
    }
    if (!canClaimCheckIn) return;
    setClaimingCheckIn(true);
    try {
      const r = await casual.claimSeasonMission("daily_sign_in");
      if (r.ok) {
        setToast({ ok: true, text: "今日签到奖励已领取" });
      } else {
        setToast({ ok: false, text: missionClaimErrorMessage(r.error) });
      }
      await Promise.all([
        casual.refreshCasualPlayer(),
        casual.refreshSeasonMissions(),
        casual.refreshCheckinStreak(),
      ]);
    } finally {
      setClaimingCheckIn(false);
    }
  };

  return (
    <CasualPageShell
      title="奖励"
      titleId="casual-tab-rewards"
      rootRef={rootRef}
      visible={visible}
      showHeader
    >
      <div className="casual-econ">
        {toast ? (
          <div
            className={`casual-econ__toast${toast.ok ? "" : " casual-econ__toast--err"}`}
            role="status"
          >
            {toast.text}
          </div>
        ) : null}

        {mockBanner ? (
          <div className="casual-econ__mockBanner" role="note">
            {mockBanner}
          </div>
        ) : null}

        <section className="casual-freeRw__hero" aria-label="赛季通行证入口">
          <div>
            <h2 className="casual-econ__sectionTitle" style={{ marginBottom: 4 }}>
              赛季通行证
            </h2>
            <p className="casual-econ__sectionHint" style={{ marginBottom: 0 }}>
              等级奖励、标准轨与豪华轨在独立页面查看与领取。
            </p>
          </div>
          <button type="button" className="casual-freeRw__heroBtn" onClick={openBattlePass}>
            打开通行证
          </button>
        </section>

        <h2 className="casual-econ__sectionTitle">每日签到</h2>
        <p className="casual-econ__sectionHint">
          登录后自动激活签到任务，可在此直接领取每日奖励。
        </p>
        <div className="casual-freeRw__card">
          <div className="casual-freeRw__row">
            <span>今日状态</span>
            <strong>{checkInTodayState}</strong>
            {dailySignInMission ? (
              <span>
                （{Math.min(dailySignInMission.progress, dailySignInMission.target)}/
                {dailySignInMission.target}）
              </span>
            ) : (
              <span>（预览）</span>
            )}
          </div>
          <div className="casual-freeRw__checkinStrip" aria-label="每日签到面板">
            {Array.from({ length: 7 }, (_, i) => {
              const done = i < checkInFilledSlots;
              const today = todayCheckinSlotIndex !== null && i === todayCheckinSlotIndex;
              return (
                <div
                  key={`checkin-day-${i + 1}`}
                  className={`casual-freeRw__checkinDay${done ? " casual-freeRw__checkinDay--done" : ""}${today ? " casual-freeRw__checkinDay--today" : ""}`}
                >
                  <span className="casual-freeRw__checkinDayLabel">DAY {i + 1}</span>
                  <span className="casual-freeRw__checkinDayState">{done ? "已领" : today ? "今日" : "待领"}</span>
                </div>
              );
            })}
          </div>
          {checkInRewardChips.length > 0 ? (
            <div className="casual-freeRw__rewardRow" aria-label="签到奖励">
              {checkInRewardChips.map((chip) => (
                <span key={chip} className="casual-freeRw__rewardChip">
                  {chip}
                </span>
              ))}
            </div>
          ) : null}
          <button
            type="button"
            className="casual-freeRw__primary"
            disabled={!canClaimCheckIn && Boolean(dailySignInMission)}
            onClick={handleClaimCheckIn}
          >
            {claimingCheckIn
              ? "领取中…"
              : dailySignInMission
                ? checkInClaimedToday
                  ? "今日已签"
                  : dailySignInMission.completed
                    ? "领取今日签到"
                    : "登录后自动激活"
                : mock.checkInClaimedToday
                  ? "今日已签"
                  : "领取今日签到"}
          </button>
        </div>

        <h2 className="casual-econ__sectionTitle">邀请好友</h2>
        <p className="casual-econ__sectionHint">成功邀请好友加入可获得一次性奖励（示意）。</p>
        <div className="casual-freeRw__card">
          <div className="casual-freeRw__row">
            <span>已邀请</span>
            <strong>{mock.inviteFriendsCount}</strong>
            <span>位好友</span>
          </div>
          <button
            type="button"
            className="casual-freeRw__secondary"
            onClick={() => {
              setMock((s) => ({ ...s, inviteFriendsCount: s.inviteFriendsCount + 1 }));
              setToast({ ok: true, text: "预览：已记录邀请 +1" });
            }}
          >
            模拟邀请成功
          </button>
          <button
            type="button"
            className="casual-freeRw__primary"
            disabled={mock.inviteRewardTierClaimed >= 1}
            onClick={() => {
              setMock((s) => ({ ...s, inviteRewardTierClaimed: Math.max(s.inviteRewardTierClaimed, 1) }));
              setToast({ ok: true, text: "预览：已领取邀请里程碑奖励" });
            }}
          >
            {mock.inviteRewardTierClaimed >= 1 ? "里程碑已领" : "领取里程碑奖励"}
          </button>
        </div>

        <h2 className="casual-econ__sectionTitle">观看广告</h2>
        <p className="casual-econ__sectionHint">观看短视频广告获取额外金币（示意）。</p>
        <div className="casual-freeRw__card">
          <div className="casual-freeRw__row">
            <span>今日已看</span>
            <strong>
              {mock.adsWatchedToday}/{mock.adsDailyCap}
            </strong>
          </div>
          <button
            type="button"
            className="casual-freeRw__primary"
            disabled={mock.adsWatchedToday >= mock.adsDailyCap}
            onClick={() => {
              setMock((s) => ({
                ...s,
                adsWatchedToday: Math.min(s.adsDailyCap, s.adsWatchedToday + 1),
              }));
              setToast({ ok: true, text: "预览：广告奖励已发放（本地）" });
            }}
          >
            {mock.adsWatchedToday >= mock.adsDailyCap ? "今日次数已用尽" : "观看广告"}
          </button>
        </div>
      </div>
    </CasualPageShell>
  );
};

export default CasualRewardsTab;
