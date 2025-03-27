import React, { useMemo } from 'react';
import TurnBar from './scene/TurnBar';
import "./style.css";
const SpriteGrid: React.FC = () => {
  const render = useMemo(() => {
    return (
      <div style={{ position: "absolute", top: 0, left: 0, zIndex: 2000 }}>
        {/* <YourTurn /> */}
        <TurnBar size={3} no={0} />
        <TurnBar size={3} no={1} />

        {/* <Seat no={0} />
      <Seat no={1} /> */}
      </div>
    );
  }, []);
  return render;
};


export default SpriteGrid;
