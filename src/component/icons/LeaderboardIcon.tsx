import React, { useEffect, useRef, useState } from "react";

const LeaderboardIcon: React.FC = () => {
  const divRef = useRef<HTMLDivElement | null>(null);
  const [fontSize, setFontSize] = useState(20);

  const calculateFontSize = () => {
    if (divRef.current) {
      const divWidth = divRef.current.offsetWidth;
      const newFontSize = divWidth / 8; // 示例计算方法
      setFontSize(newFontSize);
    }
  };

  useEffect(() => {
    calculateFontSize();
    window.addEventListener("resize", calculateFontSize);
    return () => {
      window.removeEventListener("resize", calculateFontSize);
    };
  }, []);
  return (
    <div ref={divRef} style={{ display: "flex", alignItems: "center", width: "100%", height: "100%" }}>
      <svg id="Layer_4" viewBox="0 0 24 24" width="25%" xmlns="http://www.w3.org/2000/svg" data-name="Layer 4">
        <linearGradient id="linear-gradient" gradientUnits="userSpaceOnUse" x1="4.69" x2="18.31" y1="9.483" y2="23.104">
          <stop offset="0" stopColor="#fd0" />
          <stop offset="1" stopColor="#feb100" />
        </linearGradient>
        <linearGradient
          id="linear-gradient-2"
          gradientUnits="userSpaceOnUse"
          x1="14.75"
          x2="19.25"
          y1="14.25"
          y2="18.75"
        >
          <stop offset="0" stopColor="#ffffd4" />
          <stop offset="1" stopColor="#ffefb1" />
        </linearGradient>
        <linearGradient
          id="linear-gradient-3"
          x1="4.25"
          x2="9.75"
          xlinkHref="#linear-gradient-2"
          y1="12.75"
          y2="18.25"
        />
        <linearGradient
          id="linear-gradient-4"
          x1="11.293"
          x2="12.707"
          xlinkHref="#linear-gradient-2"
          y1="4.293"
          y2="5.707"
        />
        <g id="Gradient">
          <g id="Hierarchy">
            <path
              d="m20 13h-4v-4a2 2 0 0 0 -2-2h-4a2 2 0 0 0 -2 2v2h-4a2 2 0 0 0 -2 2v6a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-4a2 2 0 0 0 -2-2z"
              fill="url(#linear-gradient)"
            />
            <path d="m16 13h2v7h-2z" fill="url(#linear-gradient-2)" />
            <path d="m6 11h2v9h-2z" fill="url(#linear-gradient-3)" />
            <circle cx="12" cy="5" fill="url(#linear-gradient-4)" r="1" />
          </g>
        </g>
      </svg>
      <div
        style={{
          cursor: "pointer",
          width: "75%",
          minHeight: 30,
          overflow: "hidden",
          whiteSpace: "nowrap",
          backgroundColor: "grey",
          borderRadius: 4,
          color: "white",
        }}
      >
        <span style={{ fontSize: fontSize - 3 }}>Leaderboard</span>
      </div>
    </div>
  );
};
export default LeaderboardIcon;
