import { DEFAULT_CASUAL_TOURNAMENT_ID } from "@/convex/casualPlatform/convex/data/casualTournamentConfigs";
import { PageProp } from "component/RenderApp";
import { useFooterNavIsDesktop } from "component/lobby/tactical/control/footer/FooterNavIsDesktop";
import React, { useRef } from "react";
import { useModalManager } from "service/ModalManager";
import "../style.css";
import { useCasualLobbySlideChildSwipe } from "./useCasualLobbySlideChildSwipe";

/** Solo Adventure：示例入口提交异步锦标赛分数（Phase A 与 Block Blast 串联） */
const Child1: React.FC<PageProp> = ({ visible }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const isDesktop = useFooterNavIsDesktop();
  useCasualLobbySlideChildSwipe(rootRef, { enabled: !isDesktop });
  const { openModal } = useModalManager();
  return (
    <div ref={rootRef} style={{ width: "100%", height: "100%" }}>
    <div className="casual-lobby-child" style={{ opacity: visible > 0 ? 1 : 0 }}>
      <h2 style={{ margin: "0 0 8px" }}>Solo Adventure</h2>
      <p style={{ margin: "0 0 16px", opacity: 0.75 }}>
        Play Block Blast; scores can sync to the casual tournament when configured.
      </p>
      <button
        type="button"
        onClick={() =>
          openModal({
            name: "play_block_blast",
            data: { casualTournamentId: DEFAULT_CASUAL_TOURNAMENT_ID },
          })
        }
        style={{
          padding: "10px 16px",
          borderRadius: 8,
          border: "none",
          background: "#2d6cdf",
          color: "#fff",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Play Block Blast
      </button>
    </div>
    </div>
  );
};

export default Child1;
