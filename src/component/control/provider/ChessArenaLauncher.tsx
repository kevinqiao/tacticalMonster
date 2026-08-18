import { ConvexProvider, ConvexReactClient, useConvex } from "convex/react";
import { api } from "convex/chessArena/convex/_generated/api";
import gsap from "gsap";
import React, { useEffect, useRef } from "react";
import { usePageManager } from "service/PageManager";
import { useUserManager } from "service/UserManager";
import { SSA_URLS } from "service/SSAManager";
import "./style.css";

const ChessArenaCheck: React.FC<{ gameId: string }> = ({ gameId }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { openPage } = usePageManager();
  const { updateUserData } = useUserManager();
  const convex = useConvex();
  useEffect(() => {
    const fetchGame = async () => {
      try {
        const res = await convex.query(api.service.gameManager.loadGame, { gameId });
        if (res?.ok) {
          gsap.to(ref.current, { autoAlpha: 1, duration: 0.5, ease: "ease.out" });
        }
      } catch {
        gsap.to(ref.current, { autoAlpha: 1, duration: 0.5, ease: "ease.out" });
      }
    };
    if (gameId) fetchGame();
  }, [gameId, convex]);

  return (
    <div ref={ref} className="launcher_container">
      <div className="launcher_content">
        <button onClick={() => openPage({ uri: "/rpg/match", data: { gameId } })}>Play</button>
        <button onClick={() => updateUserData({ game: {} })}>Cancel</button>
      </div>
    </div>
  );
};

const ChessArenaLauncher: React.FC<{ gameId: string }> = ({ gameId }) => {
  const client = React.useMemo(() => new ConvexReactClient(SSA_URLS.chessArena), []);
  return (
    <ConvexProvider client={client}>
      <ChessArenaCheck gameId={gameId} />
    </ConvexProvider>
  );
};

export default ChessArenaLauncher;
