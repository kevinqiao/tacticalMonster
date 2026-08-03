import { PageProp } from "host/RenderApp";
import React, { useRef, useState } from "react";

import { useCasualPlatform } from "../../service/useCasualPlatformManager";
import CasualPageShell from "../shell/CasualPageShell";

/** Season Missions + Pass + 开箱示例（通用骨架） */
const Child2: React.FC<PageProp> = ({ visible }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const casual = useCasualPlatform();
  const [msg, setMsg] = useState<string | null>(null);

  const activeSeason = casual.seasons.find((s) => s.active) ?? casual.seasons[0];
  const passSeasonId = casual.passProgress?.seasonId ?? activeSeason?.seasonId;
  return (
    <CasualPageShell title="任务" titleId="casual-tab-tasks" rootRef={rootRef} visible={visible}>
      {!casual.convexUrl ? (
        <p style={{ margin: 0, opacity: 0.75, fontSize: 14 }}>
          配置 <code style={{ fontSize: 13 }}>VITE_CONVEX_URL_CASUAL</code> 后可同步任务与 Pass。
        </p>
      ) : (
        <>
          {msg ? (
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "#1a5f7a" }}>{msg}</p>
          ) : null}
          {casual.passProgress && (
            <div style={{ margin: "0 0 16px", fontSize: 14 }}>
              <p style={{ margin: "0 0 6px" }}>
                Pass L{casual.passProgress.level} · XP {casual.passProgress.xp}{" "}
                <span style={{ opacity: 0.7 }}>({casual.passProgress.seasonId})</span>
              </p>
              <p style={{ margin: "0 0 6px", opacity: 0.85 }}>
                Vouchers {casual.casualPlayer?.seasonVouchers ?? 0} · Tracks standard
                {casual.passProgress.tracksPurchased?.standard ? "✓" : "—"} deluxe
                {casual.passProgress.tracksPurchased?.deluxe ? "✓" : "—"}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <button
                  type="button"
                  style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #ccc" }}
                  onClick={async () => {
                    if (!passSeasonId) return;
                    const r = await casual.claimPassLevel({
                      seasonId: passSeasonId,
                      track: "free",
                      level: 1,
                    });
                    setMsg(r.ok ? "Claimed free L1" : `Pass: ${r.error ?? "fail"}`);
                    await casual.refreshCasualPlayer();
                  }}
                >
                  Claim free L1
                </button>
                <button
                  type="button"
                  style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #ccc" }}
                  onClick={async () => {
                    if (!passSeasonId) return;
                    const r = await casual.devUnlockPassTrack({
                      seasonId: passSeasonId,
                      track: "standard",
                    });
                    setMsg(r.ok ? "Unlocked standard (dev)" : "Unlock failed");
                  }}
                >
                  Dev unlock standard
                </button>
                <button
                  type="button"
                  style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #ccc" }}
                  onClick={async () => {
                    const r = await casual.openFixedChest("chest_pass_milestone_1");
                    setMsg(r.ok ? "Opened milestone chest" : `Chest: ${r.error ?? "fail"}`);
                    await casual.refreshCasualPlayer();
                  }}
                >
                  Open pass milestone chest
                </button>
              </div>
            </div>
          )}
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {casual.missions.map((m) => (
              <li key={m.taskId} style={{ marginBottom: 10 }}>
                <span style={{ opacity: 0.75, fontSize: 12 }}>[{m.tier ?? "—"}]</span> {m.title}{" "}
                <span style={{ opacity: 0.75 }}>
                  ({m.progress}/{m.target}){m.completed ? " ✓" : ""}
                  {m.claimed ? " · claimed" : ""}
                </span>
                {m.completed && !m.claimed ? (
                  <button
                    type="button"
                    style={{ marginLeft: 8, padding: "2px 8px", fontSize: 12, borderRadius: 4 }}
                    onClick={async () => {
                      const r = await casual.claimSeasonMission(m.taskId);
                      setMsg(r.ok ? `Claimed ${m.taskId}` : `Mission: ${r.error ?? "fail"}`);
                      await casual.refreshCasualPlayer();
                    }}
                  >
                    Claim
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      )}
    </CasualPageShell>
  );
};

export default Child2;
