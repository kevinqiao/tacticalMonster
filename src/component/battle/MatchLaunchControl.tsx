import { ConvexReactClient, useConvex } from "convex/react";
import { api } from "convex/tournament/convex/_generated/api";
import gsap from "gsap";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePageManager } from "service/PageManager";
import { useUserManager } from "service/UserManager";
import { PlayerMatch } from "./MatchTypes";
import "./style.css";

const convex_url = "https://beloved-mouse-699.convex.cloud"
const MatchLauncher: React.FC<{ gameId: string }> = ({ gameId }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { openPage } = usePageManager();
  const { updateUserData } = useUserManager();
  const [match, setMatch] = useState<PlayerMatch | null>(null);
  const convex = useConvex();
  console.log("gameId in match launcher", gameId);
  useEffect(() => {
    const fetchMatch = async () => {
      const res = await convex.query(api.service.tournament.matchManager.findGameMatch, { gameId: gameId });
      console.log("findGameMatch result", res);
      if (res) {
        const playerMatch = res as PlayerMatch;
        if (playerMatch.status === 0)
          setMatch(res as PlayerMatch);
      }
    }
    if (gameId) {
      fetchMatch();
    }
  }, [gameId]);
  console.log("match in match launcher", match);
  const handlePlay = useCallback(() => {
    if (match) {
      gsap.set(ref.current, { autoAlpha: 0, duration: 0.5, ease: "ease.out" });
      openPage({ uri: "/play/battle", data: match });
    }
  }, [match, openPage]);
  const handleCancel = () => {
    updateUserData({ game: {} });
    gsap.to(ref.current, { autoAlpha: 0, duration: 0.5, ease: "ease.out" });
  }
  useEffect(() => {
    if (match) {
      console.log("open match launcher", ref.current);
      gsap.to(ref.current, { autoAlpha: 1, duration: 0.5, ease: "ease.out" });
    } else {
      gsap.to(ref.current, { autoAlpha: 0, duration: 0.5, ease: "ease.out" });
    }
  }, [match]);
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
const MatchLaunchControl: React.FC = () => {
  const { user } = useUserManager();
  console.log("user in match launch control", user);
  const client = React.useMemo(() => new ConvexReactClient(convex_url), [convex_url]);
  return <>
    {/* {user?.data?.game?.gameId && <ConvexProvider client={client}>
      <MatchLauncher gameId={user.data.game.gameId} />
    </ConvexProvider>} */}
  </>;
};

export default MatchLaunchControl;
