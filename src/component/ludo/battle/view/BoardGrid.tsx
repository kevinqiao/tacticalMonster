import React, { useMemo } from 'react';
import "./style.css";
const GoalTracks: { [k: number]: { x: number, y: number }[] } = {
  0: [
    { x: 1, y: 6 },
    { x: 1, y: 7 },
    { x: 2, y: 7 },
    { x: 3, y: 7 },
    { x: 4, y: 7 },
    { x: 5, y: 7 },
    { x: 6, y: 7 }
  ],
  1: [
    { x: 8, y: 1 },
    { x: 7, y: 1 },
    { x: 7, y: 2 },
    { x: 7, y: 3 },
    { x: 7, y: 4 },
    { x: 7, y: 5 },
    { x: 7, y: 6 }
  ],
  2: [
    { x: 8, y: 7 },
    { x: 9, y: 7 },
    { x: 10, y: 7 },
    { x: 11, y: 7 },
    { x: 12, y: 7 },
    { x: 13, y: 7 },
    { x: 13, y: 8 }
  ]
  ,
  3: [
    { x: 6, y: 13 },
    { x: 7, y: 13 },
    { x: 7, y: 12 },
    { x: 7, y: 11 },
    { x: 7, y: 10 },
    { x: 7, y: 9 },
    { x: 7, y: 8 }
  ]
}
const goalTiles = Object.entries(GoalTracks).flatMap(([seat, arr]) => {
  // 将每个数组的每个对象添加属性 key
  switch (seat) {
    case "0":
      return arr.map(item => ({ ...item, seat, color: "yellow" }))
    case "1":
      return arr.map(item => ({ ...item, seat, color: "red" }))
    case "2":
      return arr.map(item => ({ ...item, seat, color: "blue" }))
    default:
      return arr.map(item => ({ ...item, seat, color: "green" }))
  }
}
);
// console.log(goalTiles)
const BoardCell: React.FC<{ x: number, y: number, tileSize: number }> = ({ x, y, tileSize }) => {

  const bgColor = useMemo(() => {
    const goalCell = goalTiles.find(item => item.x === x && item.y === y);
    if (goalCell)
      return goalCell.color;
    return "white";
  }, [x, y])

  return <div style={{ width: "100%", height: "100%", backgroundColor: bgColor, border: "1px solid black" }} />
}

const BoardGrid: React.FC<{ tileSize: number }> = ({ tileSize }) => {

  const top = `${100 * 6 / 15}%`
  const left = `${100 * 6 / 15}%`
  const height = `${100 * 3 / 15}%`
  const width = `${100 * 3 / 15}%`

  return (
    <>
      <div key="vtrack" style={{ position: "absolute", top: 0, left, width, height: "100%" }}>
        {Array.from({ length: 15 }).map((_, row) => (
          <div
            key={row}
            style={{ display: "flex", justifyContent: "flex-start", height: `${100 / 15}%`, width: "100%" }}
            data-testid={`grid-row-${row}`}
          >
            {Array.from({ length: 3 }).map((_, col) => (
              <div key={`${row}-${col}`} style={{ width: "33.3%", height: "100%" }} >
                <BoardCell x={col + 6} y={row} tileSize={tileSize} />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div key="htrack" style={{ position: "absolute", top, left: 0, width: "100%", height }}>
        {Array.from({ length: 3 }).map((_, row) => (
          <div
            key={row}
            style={{ display: "flex", justifyContent: "flex-start", height: "33.3%", width: "100%" }}
            data-testid={`grid-row-${row}`}
          >
            {Array.from({ length: 15 }).map((_, col) => (
              <div key={`${row}-${col}`} style={{ width: `${100 / 15}%`, height: "100%" }} >
                <BoardCell x={col} y={row + 6} tileSize={tileSize} />
              </div>
            ))}
          </div>
        ))}
      </div>

    </>
  );
};


export default BoardGrid;
