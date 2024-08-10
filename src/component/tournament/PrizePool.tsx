import React, { useEffect, useRef, useState } from "react";
import "./tournament.css";
interface Props {
  //   color: string; // Define the type of the color prop
  asset: number;
  amount: number;
}
const PrizePool: React.FC<Props> = ({ asset, amount }) => {
  const divRef = useRef<HTMLDivElement | null>(null);
  const [fontSize, setFontSize] = useState(25);

  const calculateFontSize = () => {
    if (divRef.current) {
      const divWidth = divRef.current.offsetWidth;
      const newFontSize = divWidth / 8; // 示例计算方法
      setFontSize(Math.max(newFontSize, 14));
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
    <div ref={divRef} className="tournament-trophy">
      <div style={{ height: 20 }}></div>
      <div className="roboto-bold" style={{ textAlign: "center" }}>
        <span style={{ fontSize: fontSize + 5, color: "yellow" }}>$30</span>
      </div>
      <div style={{ height: 10 }}></div>
      <div className="roboto-bold" style={{ height: "25px" }}>
        <span style={{ fontSize: fontSize - 2, color: "white" }}>PRIZE POOL</span>
      </div>
    </div>
  );
};

export default PrizePool;
