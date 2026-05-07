import { DEFAULT_CASUAL_TOURNAMENT_ID } from "@/convex/casualPlatform/convex/data/casualTournamentConfigs";
import { PageProp } from "host/RenderApp";
import React, { useRef } from "react";
import { useModalManager } from "host/service/ModalManager";

import CasualPageShell from "../shell/CasualPageShell";

/** Solo Adventure：示例入口（通用骨架 + Modal 开局） */
const Child1: React.FC<PageProp> = ({ visible }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const { openModal } = useModalManager();

  return (
    <CasualPageShell title="Solo" titleId="casual-tab-solo" rootRef={rootRef} visible={visible}>
      <p style={{ margin: "0 0 16px", opacity: 0.75, fontSize: 14 }}>
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
    </CasualPageShell>
  );
};

export default Child1;
