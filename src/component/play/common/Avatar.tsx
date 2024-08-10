import { gsap } from "gsap";
import React, { useCallback, useEffect, useRef } from "react";
interface Props {
  player: { uid: string; name?: string; avatar?: number };
  mode: number; //0-match 1-battle
}
const Avatar: React.FC<Props> = ({ player, mode }) => {
  const avatarRef = useRef<HTMLDivElement | null>(null);
  const nameRef = useRef<HTMLDivElement | null>(null);
  const sceneContainerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (mode === 0) return;
    setTimeout(() => {
      if (nameRef.current && avatarRef.current) {
        const avatartBound = avatarRef.current.getBoundingClientRect();
        const nameBound = nameRef.current.getBoundingClientRect();
        const x = mode === 1 ? avatartBound.width : -nameBound.width;
        const tl = gsap.timeline();
        tl.to(nameRef.current, { x, duration: 0.1 }).to(nameRef.current, { alpha: 1, duration: 0.3 }, ">");
        tl.play();
      }
    }, 1000);
  }, [mode]);
  const avatarcss = {
    width: "100%",
    height: "100%",
    backgroundImage: `url("avatars/${player.avatar}.svg")`,
    backgroundSize: "cover",
  };
  const loadDimension = useCallback((el: HTMLDivElement) => {
    if (el) {
      const dimension = el.getBoundingClientRect();
      console.log(dimension);
    }
  }, []);
  return (
    <div ref={sceneContainerRef} style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}>
      {/* <div style={avatarSheetStyle}></div> */}
      {player ? (
        <div
          ref={avatarRef}
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
            height: "100%",
            color: "white",
          }}
        >
          <div style={avatarcss}></div>
          {mode === 0 ? (
            <div style={{ overflow: "hidden", whiteSpace: "nowrap", width: "auto" }}>{player.name}</div>
          ) : (
            <div
              ref={nameRef}
              style={{
                position: "absolute",
                top: -10,
                left: 0,
                opacity: 0,
                overflow: "hidden",
                whiteSpace: "nowrap",
                width: "auto",
                color: "white",
              }}
            >
              <span style={{ fontSize: 10 }}>{player.name}</span>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default Avatar;
