import React from 'react';
import ControlPanel from './sprite/ControlPanel';
import CountdownGo from './sprite/CountDownGo';
import FlipPanel from './sprite/FlipPanel';
import FoundationGround from './sprite/FoundationGround';
import TurnBar from './sprite/TurnBar';
import YourTurn from './sprite/YourTurn';
import "./style.css";
const SpriteGrid: React.FC = () => {
  return (
    <>
      <div style={{ position: "absolute", top: 0, left: 0, zIndex: 1000 }}>
        <ControlPanel no={0} />
        <ControlPanel no={1} />
        <TurnBar size={3} no={0} />
        <TurnBar size={3} no={1} />
        <FoundationGround />
        {/* <Seat no={0} />
      <Seat no={1} /> */}
      </div>
      <div style={{ position: "absolute", top: 0, left: 0, zIndex: 3500 }}>
        <FlipPanel />
      </div>
      <div style={{ position: "absolute", top: 0, left: 0, zIndex: 3000 }}>
        <YourTurn />
        <CountdownGo />
        {/* <Seat no={0} />
      <Seat no={1} /> */}
      </div>
    </>
  );

};


export default SpriteGrid;
