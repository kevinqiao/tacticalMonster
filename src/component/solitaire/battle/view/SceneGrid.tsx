import React from 'react';
import Seat from './scene/Seat';
import YourTurn from './scene/YourTurn';
import "./style.css";
const SceneGrid: React.FC = () => {
  return (
    <div style={{ position: "absolute", top: 0, left: 0, zIndex: 100, width: "100%", height: "100%" }}>
      <YourTurn />
      <Seat no={0} />
      <Seat no={1} />
    </div>
  );
};


export default SceneGrid;
