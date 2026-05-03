import { PageProp } from "component/RenderApp";
import { useFooterNavIsDesktop } from "component/lobby/tactical/control/footer/FooterNavIsDesktop";
import React, { useRef } from "react";
import { useCasualPlatformOptional } from "service/CasualPlatformManager";
import "../style.css";
import { useCasualLobbySlideChildSwipe } from "./useCasualLobbySlideChildSwipe";

/** Season Missions + Pass 进度（订阅 casual Convex） */
const Child2: React.FC<PageProp> = ({ visible }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const isDesktop = useFooterNavIsDesktop();
  useCasualLobbySlideChildSwipe(rootRef, { enabled: !isDesktop });
  const casual = useCasualPlatformOptional();

  return (
    <div ref={rootRef} style={{ width: "100%", height: "100%" }}>
      {!casual?.convexUrl ? (
        <div className="casual-lobby-child" style={{ opacity: visible > 0 ? 1 : 0 }}>
          <h2 style={{ margin: "0 0 8px" }}>Season Missions</h2>
          <p style={{ margin: 0, opacity: 0.75 }}>
            Set <code style={{ fontSize: 13 }}>VITE_CONVEX_URL_CASUAL</code> to load missions and pass
            progress.
          </p>
        </div>
      ) : (
        <div className="casual-lobby-child" style={{ opacity: visible > 0 ? 1 : 0 }}>
          <h2 style={{ margin: "0 0 8px" }}>Season Missions</h2>
          {casual.passProgress && (
            <p style={{ margin: "0 0 12px", fontSize: 14 }}>
              Pass L{casual.passProgress.level} · XP {casual.passProgress.xp}{" "}
              <span style={{ opacity: 0.7 }}>({casual.passProgress.seasonId})</span>
            </p>
          )}
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {casual.missions.map((m) => (
              <li key={m.taskId} style={{ marginBottom: 8 }}>
                {m.title}{" "}
                <span style={{ opacity: 0.75 }}>
                  ({m.progress}/{m.target}){m.completed ? " ✓" : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Child2;
