import { useConvex } from "convex/react";
import gsap from "gsap";
import React, { useCallback, useEffect, useRef } from "react";
import { usePageManager } from "service/PageManager";
import { SSAProvider } from "service/SSAManager";
import { useUserManager } from "service/UserManager";
import { api } from "../../convex/tm/convex/_generated/api";
import "./map.css";
const GameLauncherMain: React.FC = () => {
  const { user, completeGame } = useUserManager();
  const { openPage } = usePageManager();
  const containerRef = useRef<HTMLDivElement>(null);
  const maskRef = useRef<HTMLDivElement>(null);
  const convex = useConvex();

  const open = useCallback(() => {
    if (containerRef.current && maskRef.current) {
      const tl = gsap.timeline();
      tl.to(maskRef.current, { autoAlpha: 0.5, duration: 0.3 });
      tl.to(containerRef.current, { autoAlpha: 1, duration: 0.3, ease: "power2.out" }, "<");
      tl.play();
    }
  }, [containerRef, maskRef]);
  const close = useCallback(() => {
    if (containerRef.current && maskRef.current) {
      const tl = gsap.timeline();
      tl.to(maskRef.current, { autoAlpha: 0, duration: 0.3 });
      tl.to(containerRef.current, { autoAlpha: 0, duration: 0.3, ease: "power2.in" }, "<");
      tl.play();
    }
  }, [containerRef, maskRef]);
  const handlePlay = useCallback(() => {
    close();
    openPage({ uri: "/play/map", data: { gameId: user?.data.gameId } });
  }, [close, user, openPage]);
  useEffect(() => {

    const fetchGame = async (gameId: string) => {
      console.log("fetchGame", user?.data.gameId)
      if (user?.data.gameId) {
        const gameObj = await convex.query(api.dao.tmGameDao.find, {
          gameId: user.data.gameId, uid: "1",
          token: "test-token"
        });
        if (gameObj && !gameObj.status) {
          open();
          // setTimeout(() => openPage({ uri: "/play/map", data: { gameId: user.data.gameId } }), 3000);
        } else {
          completeGame();
        }
      }
    }
    console.log(location.pathname)
    console.log(user)
    if (user?.data?.gameId && !location.pathname.includes("/play/map")) fetchGame(user.data.gameId);
  }, [user, completeGame]);

  return (<div style={{ position: "absolute", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "transparent", pointerEvents: "none" }}>
    {/* 遮罩层 */}
    <div ref={maskRef} style={{
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      backgroundColor: "black",
      opacity: 0,
      visibility: "hidden"
    }} />
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", position: "absolute", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "transparent", pointerEvents: "none" }}>
      <div ref={containerRef} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 200, height: 150, backgroundColor: "red", opacity: 0, visibility: "hidden", pointerEvents: "auto" }}>
        <div style={{ cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", width: 80, height: 40, backgroundColor: "white" }} onClick={handlePlay}>Play</div>
        <div style={{ width: 80, height: 10 }}></div>
        <div style={{ cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", width: 80, height: 40, backgroundColor: "white" }} onClick={close}>Exit</div>
      </div>
    </div>
  </div>);
};
const GameLauncher: React.FC = () => {
  return (
    <SSAProvider app="tacticalMonster">
      <GameLauncherMain />
    </SSAProvider>
  );
};

export default GameLauncher;
