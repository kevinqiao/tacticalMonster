import { PageProp } from "component/RenderApp";
import gsap from "gsap";
import React, { useCallback, useEffect, useRef } from "react";
import { useGameCenterManager } from "service/GameCenterManager";
import { usePageManager } from "service/PageManager";
import LobbyNavControl from "./control/LobbyNavControl";
import "./style.css";
const LobbyHome: React.FC<PageProp> = ({ visible }) => {
  const { openPage } = usePageManager();
  const { activeGame } = useGameCenterManager();
  const headRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const open = useCallback(() => {
    console.log("LobbyHome opening animation");
    const tl = gsap.timeline();
    tl.fromTo(headRef.current, { autoAlpha: 0, y: "-100%" }, { autoAlpha: 1, y: 0, duration: 0.7, ease: "power2.inOut" })
      .fromTo(bottomRef.current, { autoAlpha: 0, y: "100%" }, { autoAlpha: 1, y: 0, duration: 0.7, ease: "power2.inOut" }, "<");
    tl.play();
  }, [])

  const close = useCallback(() => {
    console.log("LobbyHome closing animation");
    const tl = gsap.timeline();
    tl.to(headRef.current, { autoAlpha: 0, y: "-100%", duration: 0.7, ease: "power2.inOut" })
      .to(bottomRef.current, { autoAlpha: 0, y: "100%", duration: 0.7, ease: "power2.inOut" }, "<");
    tl.play();
  }, [])
  useEffect(() => {
    console.log("LobbyHome visible", visible)
    if (visible > 0) {
      setTimeout(() => {
        open();
      }, 600)
    } else {
      setTimeout(() => {
        close();
      }, 600)
    }
  }, [visible]);


  return (
    <>
      {/* {children} */}
      <div ref={headRef} className="lobby-head-container">
        <div className="head-mask"></div>
        <div className="head-content">
          <div className="head-left"></div>
          <div className="head-center">{activeGame?.ssa}</div>
          <div className="head-right"><div className="nav-menu" onClick={() => openPage({ uri: "/play/lobby/topNav" })}></div></div>
        </div>
      </div>
      <div ref={bottomRef} className="lobby-bottom-container">
        <LobbyNavControl />
      </div>
    </>
  );
};

export default LobbyHome;
