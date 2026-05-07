import { ModalProp } from "host/service/ModalManager";
import type { User } from "host/service/UserManager";
import { useUserManager } from "host/service/UserManager";
import React, { useEffect, useMemo, useState } from "react";

import { PASS_LEVEL_REWARDS } from "@/convex/casualPlatform/convex/data/casualPassRewards";
import avatarPlaceholderUrl from "../../../tactical/control/head/assets/avatar-placeholder.svg?url";
import { useCasualPlatform } from "../../service/useCasualPlatformManager";
import "../shared/casualEconomyPages.css";
import { formatGrantLabel, passClaimErrorMessage } from "../shared/casualEconomyUi";
import "./casualBattlePassModal.css";
import { createInitialPassMock, type PassTrack } from "./casualPassMock";

function claimKey(track: PassTrack, level: number): string {
  return `${track}:${level}`;
}

function formatSeasonRange(startsAt: number, endsAt: number): string {
  const fmt = (ms: number) =>
    new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${fmt(startsAt)} — ${fmt(endsAt)}`;
}

function avatarPhotoUrlFromUser(u: User | null): string | undefined {
  if (!u) return undefined;
  const d = (u.data ?? null) as Record<string, unknown> | null;
  const raw = d?.["imageUrl"] ?? d?.["avatar"] ?? d?.["picture"] ?? d?.["photoUrl"];
  if (typeof raw === "string" && raw.trim().length > 0) {
    return raw.trim();
  }
  const uAny = u as { picture?: string; imageUrl?: string; avatar?: string };
  for (const v of [uAny.picture, uAny.imageUrl, uAny.avatar]) {
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return undefined;
}

interface PassViewModel {
  isLive: boolean;
  seasonId: string;
  seasonLabel: string;
  seasonRange: string;
  maxPassLevel: number;
  xp: number;
  seasonVouchers: number;
  tracks: { standard?: boolean; deluxe?: boolean };
  claimedSet: Set<string>;
}

const COIN_VIS_CAP = 20000;
const GEM_VIS_CAP = 5000;

const CasualBattlePassModal: React.FC<ModalProp> = ({ visible }) => {
  const casual = useCasualPlatform();
  const { user } = useUserManager();
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const [mockState, setMockState] = useState(createInitialPassMock);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const activeSeason = casual.seasons.find((s) => s.active) ?? casual.seasons[0];
  const liveSeasonId = casual.passProgress?.seasonId ?? activeSeason?.seasonId;
  const livePass = Boolean(
    casual.convexUrl && user?.uid && casual.passProgress && liveSeasonId
  );

  const view: PassViewModel = useMemo(() => {
    if (livePass && casual.passProgress && liveSeasonId) {
      const claimedSet = new Set<string>();
      for (const c of casual.passProgress.claimed ?? []) {
        claimedSet.add(claimKey(c.track as PassTrack, c.level));
      }
      const sn = casual.seasons.find((s) => s.seasonId === liveSeasonId);
      const seasonRange =
        sn != null ? formatSeasonRange(sn.startsAt, sn.endsAt) : "";
      return {
        isLive: true,
        seasonId: liveSeasonId,
        seasonLabel: sn?.name ?? liveSeasonId,
        seasonRange,
        maxPassLevel: casual.passProgress.level,
        xp: casual.passProgress.xp,
        seasonVouchers: casual.casualPlayer?.seasonVouchers ?? 0,
        tracks: casual.passProgress.tracksPurchased ?? {},
        claimedSet,
      };
    }
    const m = mockState;
    const claimedSet = new Set<string>();
    for (const c of m.claimed) {
      claimedSet.add(claimKey(c.track, c.level));
    }
    return {
      isLive: false,
      seasonId: m.seasonId,
      seasonLabel: m.seasonName,
      seasonRange: formatSeasonRange(m.seasonStartsAt, m.seasonEndsAt),
      maxPassLevel: m.level,
      xp: m.xp,
      seasonVouchers: m.seasonVouchers,
      tracks: m.tracksPurchased,
      claimedSet,
    };
  }, [livePass, liveSeasonId, casual.passProgress, casual.seasons, casual.casualPlayer, mockState]);

  const xpSegment = Math.max(0, Math.min(1, (view.xp % 1000) / 1000));

  const claimState = (
    track: PassTrack,
    level: number
  ): "claim" | "claimed" | "locked_track" | "locked_level" => {
    if (view.claimedSet.has(claimKey(track, level))) return "claimed";
    if (level > view.maxPassLevel) return "locked_level";
    if (track === "standard" && !view.tracks.standard) return "locked_track";
    if (track === "deluxe" && !view.tracks.deluxe) return "locked_track";
    return "claim";
  };

  const mockBannerText = !casual.convexUrl
    ? "未配置休闲后端：以下为界面静态预览，领取仅保存在本页内存中。"
    : !user?.uid
      ? "未登录：以下为界面静态预览，登录并配置赛季数据后将同步真实通行证。"
      : "暂无赛季通行证数据：以下为界面静态预览，配置 casual_seasons 并登录后将同步服务端。";

  const photoUrl = useMemo(
    () => avatarPhotoUrlFromUser(user?.uid ? (user as User) : null),
    [user]
  );
  const resolvedAvatar = photoUrl || avatarPlaceholderUrl;

  const coins = view.isLive ? (casual.casualPlayer?.coins ?? 0) : 8840;
  const gems = view.isLive ? (casual.casualPlayer?.gems ?? 0) : 120;
  const coinFill = Math.max(0.06, Math.min(1, coins / COIN_VIS_CAP));
  const gemFill = Math.max(0.06, Math.min(1, gems / GEM_VIS_CAP));

  if (!visible) return null;

  return (
    <div className="cbp-shell">
      <div className="cbp casual-econ">
        <header className="cbp__header">
          <div className="cbp__hud">
            <div className="cbp__avatar" aria-hidden>
              <img src={resolvedAvatar} alt="" draggable={false} />
            </div>
            <div className="cbp__hudBars">
              <div className="cbp__resBar" aria-label={`金币 ${coins}`}>
                <div className="cbp__resBar__top">
                  <span>金币</span>
                  <span className="cbp__resBar__val">{coins}</span>
                </div>
                <div className="cbp__resBar__track" aria-hidden>
                  <div
                    className="cbp__resBar__fill cbp__resBar__fill--coin"
                    style={{ width: `${coinFill * 100}%` }}
                  />
                </div>
              </div>
              <div className="cbp__resBar" aria-label={`钻石 ${gems}`}>
                <div className="cbp__resBar__top">
                  <span>钻石</span>
                  <span className="cbp__resBar__val">{gems}</span>
                </div>
                <div className="cbp__resBar__track" aria-hidden>
                  <div
                    className="cbp__resBar__fill cbp__resBar__fill--gem"
                    style={{ width: `${gemFill * 100}%` }}
                  />
                </div>
              </div>
              <div className="cbp__passHud" aria-label="通行证三轨与等级">
                <div className="cbp__passHud__rails">
                  <span className="cbp__passHud__rail cbp__passHud__rail--free" title="免费轨" />
                  <span className="cbp__passHud__rail cbp__passHud__rail--std" title="标准轨" />
                  <span className="cbp__passHud__rail cbp__passHud__rail--dx" title="豪华轨" />
                </div>
                <span className="cbp__passHud__level">{view.maxPassLevel}</span>
              </div>
            </div>
          </div>
          、
        </header>

        <div className="cbp__body">
          {toast ? (
            <div
              className={`casual-econ__toast${toast.ok ? "" : " casual-econ__toast--err"}`}
              role="status"
            >
              {toast.text}
            </div>
          ) : null}

          {!view.isLive ? (
            <div className="casual-econ__mockBanner" role="note">
              {mockBannerText}
            </div>
          ) : null}

          <h2 className="casual-econ__sectionTitle">赛季通行证</h2>
          <p className="casual-econ__sectionHint">
            参与对局与任务可获得赛季 XP；每 1000 XP 升一级。免费轨始终可用，标准/豪华轨需解锁后领取对应奖励。
          </p>

          <section
            className="casual-rewards__seasonCard casual-rewards__seasonCard--hero"
            aria-label="赛季通行证"
          >
            <h2 className="casual-rewards__seasonName">{view.seasonLabel}</h2>
            {view.seasonRange ? <p className="casual-rewards__seasonMeta">{view.seasonRange}</p> : null}
            <div className="casual-rewards__xpRow">
              <span>
                通行证 L{view.maxPassLevel}
                <span className="casual-rewards__xpMeta"> · 累计 {view.xp} XP</span>
              </span>
              <span className="casual-rewards__voucherPill">券 {view.seasonVouchers}</span>
            </div>
            <div className="casual-rewards__xpBar" aria-hidden>
              <div className="casual-rewards__xpFill" style={{ width: `${xpSegment * 100}%` }} />
            </div>
            <p className="casual-rewards__xpHint">本段进度为当前等级槽内 XP（每 1000 XP 升一级）</p>
            <div className="casual-rewards__tracks">
              <span className="casual-rewards__track casual-rewards__track--on">免费轨</span>
              <span
                className={`casual-rewards__track${view.tracks.standard ? " casual-rewards__track--on" : " casual-rewards__track--off"}`}
              >
                标准轨{view.tracks.standard ? " 已解锁" : " 未解锁"}
              </span>
              <span
                className={`casual-rewards__track${view.tracks.deluxe ? " casual-rewards__track--on" : " casual-rewards__track--off"}`}
              >
                豪华轨{view.tracks.deluxe ? " 已解锁" : " 未解锁"}
              </span>
            </div>
          </section>

          <h3 className="casual-rewards__passTitle">等级奖励 · 手动领取</h3>
          {PASS_LEVEL_REWARDS.map((row) => (
            <div
              key={row.level}
              className={`casual-rewards__levelCard${row.level === view.maxPassLevel ? " casual-rewards__levelCard--current" : ""}`}
            >
              <div className="casual-rewards__levelHead">
                <span className="casual-rewards__levelBadge">L{row.level}</span>
                <span className="casual-rewards__levelHint">
                  {row.level > view.maxPassLevel ? "等级未达成" : "可领取对应轨道奖励"}
                </span>
              </div>
              <div className="casual-rewards__trackCols">
                {(
                  [
                    ["free", "免费", row.free],
                    ["standard", "标准", row.standard],
                    ["deluxe", "豪华", row.deluxe],
                  ] as const
                ).map(([track, label, grants]) => {
                  const st = claimState(track, row.level);
                  const disabled = st !== "claim";
                  const labelBtn =
                    st === "claimed"
                      ? "已领"
                      : st === "locked_level"
                        ? "未达成"
                        : st === "locked_track"
                          ? "未解锁"
                          : "领取";
                  return (
                    <div key={track} className="casual-rewards__trackCol">
                      <div className="casual-rewards__trackLabel">{label}</div>
                      <div className="casual-rewards__grantTags">
                        {grants.map((g, i) => (
                          <span key={`${track}-${i}`} className="casual-rewards__grantTag">
                            {formatGrantLabel(g.kind, g.amount)}
                          </span>
                        ))}
                      </div>
                      <button
                        type="button"
                        className={`casual-rewards__claim${st === "claimed"
                            ? " casual-rewards__claim--done"
                            : st !== "claim"
                              ? " casual-rewards__claim--muted"
                              : ""
                          }`}
                        disabled={disabled}
                        onClick={async () => {
                          if (view.isLive) {
                            const r = await casual.claimPassLevel({
                              seasonId: view.seasonId,
                              track,
                              level: row.level,
                            });
                            if (r.ok) {
                              setToast({ ok: true, text: `已领取 ${label} L${row.level}` });
                            } else {
                              setToast({ ok: false, text: passClaimErrorMessage(r.error) });
                            }
                            await casual.refreshCasualPlayer();
                          } else {
                            setMockState((prev) => {
                              const k = claimKey(track, row.level);
                              if (prev.claimed.some((c) => claimKey(c.track, c.level) === k)) {
                                return prev;
                              }
                              return { ...prev, claimed: [...prev.claimed, { track, level: row.level }] };
                            });
                            setToast({
                              ok: true,
                              text: `预览：已领取 ${label} L${row.level}（仅本页演示，未写入服务器）`,
                            });
                          }
                        }}
                      >
                        {labelBtn}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {view.isLive ? (
            <details className="casual-rewards__dev">
              <summary>开发者选项</summary>
              <div className="casual-rewards__devRow">
                <button
                  type="button"
                  className="casual-rewards__devBtn"
                  onClick={async () => {
                    const r = await casual.devUnlockPassTrack({
                      seasonId: view.seasonId,
                      track: "standard",
                    });
                    setToast(
                      r.ok
                        ? { ok: true, text: "已解锁标准轨（开发）" }
                        : { ok: false, text: "解锁失败" }
                    );
                  }}
                >
                  解锁标准轨 (dev)
                </button>
                <button
                  type="button"
                  className="casual-rewards__devBtn"
                  onClick={async () => {
                    const r = await casual.devUnlockPassTrack({
                      seasonId: view.seasonId,
                      track: "deluxe",
                    });
                    setToast(
                      r.ok
                        ? { ok: true, text: "已解锁豪华轨（开发）" }
                        : { ok: false, text: "解锁失败" }
                    );
                  }}
                >
                  解锁豪华轨 (dev)
                </button>
              </div>
            </details>
          ) : (
            <details className="casual-rewards__dev">
              <summary>预览模式选项</summary>
              <div className="casual-rewards__devRow">
                <button
                  type="button"
                  className="casual-rewards__devBtn"
                  onClick={() => {
                    setMockState((s) => ({
                      ...s,
                      tracksPurchased: { ...s.tracksPurchased, standard: true },
                    }));
                    setToast({ ok: true, text: "预览：已解锁标准轨" });
                  }}
                >
                  解锁标准轨
                </button>
                <button
                  type="button"
                  className="casual-rewards__devBtn"
                  onClick={() => {
                    setMockState((s) => ({
                      ...s,
                      tracksPurchased: { ...s.tracksPurchased, deluxe: true },
                    }));
                    setToast({ ok: true, text: "预览：已解锁豪华轨" });
                  }}
                >
                  解锁豪华轨
                </button>
                <button
                  type="button"
                  className="casual-rewards__devBtn"
                  onClick={() => {
                    setMockState((s) => {
                      const nl = Math.min(99, s.level + 1);
                      return { ...s, level: nl, xp: s.xp + 400 };
                    });
                    setToast({ ok: true, text: "预览：通行证等级 +1（演示）" });
                  }}
                >
                  +1 等级（演示）
                </button>
                <button
                  type="button"
                  className="casual-rewards__devBtn"
                  onClick={() => setMockState(createInitialPassMock())}
                >
                  重置预览数据
                </button>
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
};

export default CasualBattlePassModal;
