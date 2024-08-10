import React, { useRef } from "react";
import candy_textures from "../../../model/candy_textures";
import useDimension from "../../../util/useDimension";
interface Props {
  asset?: number;
}
const frameSize = 100;
const GoalCandy: React.FC<Props> = ({ asset }) => {
  const sceneContainerRef = useRef<HTMLDivElement | null>(null);
  const { width, height } = useDimension(sceneContainerRef);

  const calculateBackgroundPosition = () => {
    let pos = "0px 0px";
    const texture = candy_textures.find((c) => c.id === asset);
    if (texture) {
      pos = `-${texture.x}px -${texture.y}px`;
    }
    return pos;
  };

  const candySheetStyle = {
    width: frameSize,
    height: frameSize,
    backgroundImage: `url("assets/assets_candy.png")`,
    backgroundSize: "auto",
    backgroundPosition: calculateBackgroundPosition(),
    backgroundColor: "transparent",
    transform: `scale(${height / frameSize},${height / frameSize})`,
    transformOrigin: "top left",
  };

  return (
    <div ref={sceneContainerRef} style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}>
      <div style={candySheetStyle}></div>
    </div>
  );
};

export default GoalCandy;
