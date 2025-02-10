import React from 'react';
import "./style.css";
const GoalPlace: React.FC<{ tileSize: number }> = ({ tileSize }) => {
  const top = `${100 * 6 / 15}%`
  const left = `${100 * 6 / 15}%`
  const height = `${100 * 3 / 15}%`
  const width = `${100 * 3 / 15}%`
  return (
    <div style={{ position: "absolute", top, left, width, height, backgroundColor: "white", border: "1px solid black" }}>
      <div className="triangle top"></div>
      <div className="triangle right"></div>
      <div className="triangle bottom"></div>
      <div className="triangle left"></div>
    </div>
  );
};


export default GoalPlace;
