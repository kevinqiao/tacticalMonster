import { PageProp } from "component/RenderApp";
import gsap from "gsap";
import React, { useCallback, useEffect, useRef } from "react";
import LobbyControl from "./LobbyControl";
import "./styles.css";

const LobbyHome: React.FC<PageProp> = ({ visible, active }) => {
  const headRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const open = useCallback(() => {
    const tl = gsap.timeline();
    tl.to(headRef.current, { autoAlpha: 1, y: 0, duration: 0.7, ease: "power2.inOut" }).to(bottomRef.current, { autoAlpha: 1, y: 0, duration: 0.7, ease: "power2.inOut" }, "<")
    tl.play();
  }, [])
  const close = useCallback(() => {
    const tl = gsap.timeline();
    tl.to(headRef.current, { autoAlpha: 0, y: "-100%", duration: 0, ease: "power2.inOut" }).to(bottomRef.current, { autoAlpha: 0, y: "100%", duration: 0, ease: "power2.inOut" }, "<")
    tl.play();
  }, [])
  useEffect(() => {
    console.log("LobbyHome visible", visible)
    if (visible > 0) {
      setTimeout(() => {
        open();
      }, 500)
    } else {
      setTimeout(() => {
        close();
      }, 600)
    }
  }, [visible]);


  return (
    <>
      {/* {children} */}
      <div ref={headRef} style={{ width: "100%", height: 50, backgroundColor: "green", position: "fixed", top: 0, left: 0, zIndex: 3000, opacity: 0 }}>
      </div>
      <div ref={bottomRef} style={{ position: "fixed", width: "100%", height: 60, bottom: 0, left: 0, zIndex: 3000, opacity: 0 }}>
        <LobbyControl />
      </div>
    </>
  );
};

export default LobbyHome;
