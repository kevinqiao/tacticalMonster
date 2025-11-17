import { ConvexProvider, ConvexReactClient, useConvex } from "convex/react";
import { api } from "convex/solitaireArena/convex/_generated/api";
import gsap from "gsap";
import React, { useEffect, useRef } from "react";
import { usePageManager } from "service/PageManager";
import { useUserManager } from "service/UserManager";
import "./style.css";

const convex_url = "https://artful-chipmunk-59.convex.cloud"
const SolitaireArenaCheck: React.FC<{ gameId: string }> = ({ gameId }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { openPage } = usePageManager();
  const { user, updateUserData } = useUserManager();
  const convex = useConvex();
  useEffect(() => {
    const fetchGame = async () => {
      const res = await convex.query(api.service.gameManager.getGameStatus, { gameId });
      console.log("getGameStatus:", gameId, res);
      if (res.status >= 0 && res.status < 2)
        gsap.to(ref.current, { autoAlpha: 1, duration: 0.5, ease: "ease.out" });
      else {
        gsap.to(ref.current, { autoAlpha: 0, duration: 0.5, ease: "ease.out" });
        // updateUserData({ game: {} });
      }
    }
    if (gameId) {
      fetchGame();
    }
  }, [gameId, updateUserData]);

  const handlePlay = () => {
    // console.log("play");
    gsap.to(ref.current, { autoAlpha: 0, duration: 0.5, ease: "ease.out" });
    openPage({ uri: "/play/battle", data: { gameId: gameId } });
  }
  const handleCancel = () => {
    updateUserData({ game: {} });
    gsap.to(ref.current, { autoAlpha: 0, duration: 0.5, ease: "ease.out" });
  }
  return <div ref={ref} className="launcher_container">
    <div className="launcher_content">
      <button
        onClick={handlePlay}
        style={{
          fontSize: '14px',
          padding: '8px 12px',
          height: '36px',
          minHeight: '36px',
          flex: 'none'
        }}
      >
        Play
      </button>
      <button
        onClick={handleCancel}
        style={{
          fontSize: '14px',
          padding: '8px 12px',
          height: '36px',
          minHeight: '36px',
          flex: 'none'
        }}
      >
        Cancel
      </button>
    </div>
  </div>
}

// 优化的主渲染组件
const SolitaireArenaLauncher: React.FC<{ gameId: string }> = ({ gameId }) => {

  const client = React.useMemo(() => new ConvexReactClient(convex_url), [convex_url]);
  return <>
    <ConvexProvider client={client}>
      <SolitaireArenaCheck gameId={gameId} />
    </ConvexProvider></>;
};

export default SolitaireArenaLauncher;
