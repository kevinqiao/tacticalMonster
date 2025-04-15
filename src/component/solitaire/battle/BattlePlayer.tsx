import React, { useEffect, useMemo, useRef, useState } from "react";
import { SSAProvider } from "../../../service/SSAManager";
import ActControl from "./control/ActControl";
import CombatEventControl from "./control/CombatEventControl";
import SkillControl from "./control/SkillControl";
import CombatProvider, { useCombatManager } from "./service/CombatManager";
import CombatSkillProvider from "./service/CombatSkillProvider";
import { SpriteProvider } from "./service/SpriteProvider";
import "./style.css";
import { createDualZones } from "./utils";
import CardGrid from "./view/CardGrid";
import SlotGrid from "./view/SlotGrid";
import SpriteGrid from "./view/SpriteGrid";
const CombatBoard: React.FC = () => {
  return <>
    <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "blue" }}>
      <SlotGrid />
      <CardGrid />
      <ActControl />
      <SkillControl />
      <SpriteGrid />
    </div></>

};

export const BattlePlaza: React.FC = () => {

  const containerRef = useRef<HTMLDivElement | null>(null);
  const { game, boardDimension, updateBoardDimension } = useCombatManager();


  useEffect(() => {
    const updatePosition = () => {

      if (containerRef.current) {
        const { x, y, top, left, width, height } = containerRef.current.getBoundingClientRect();
        // console.log("x", x, "y", y, "top", top, "left", left, "width", width, "height", height);
        const boardDimension = { width: 0, height: 0, top: 0, left: 0, zones: {} }
        if (width / height > 0.9) {
          boardDimension.width = height * 0.9
          boardDimension.height = height
          boardDimension.top = 0;
          boardDimension.left = (width - height * 0.9) / 2
        } else {
          boardDimension.width = width;
          boardDimension.height = width / 0.9
          boardDimension.top = (height - width / 0.9) / 2
          boardDimension.left = 0
        }
        // const zones = getDualBoardZones(boardDimension.width, boardDimension.height);
        createDualZones(boardDimension);
        updateBoardDimension(boardDimension);
      }
    };
    if (game) {
      updatePosition();
      window.addEventListener("resize", updatePosition);
    }
    return () => window.removeEventListener("resize", updatePosition);
  }, [game]);


  const render = useMemo(() => {
    return <>
      {game && <div ref={containerRef} className="battle-container" style={{ width: "100%", height: "100%", backgroundColor: "black" }}>
        <div id="left-panel" style={{ position: "absolute", top: 0, left: 0, width: boardDimension?.left, height: "100%", backgroundColor: "black" }}></div>
        <div id="right-panel" style={{ position: "absolute", top: 0, zIndex: 5000, right: 0, width: boardDimension?.left, height: "100%", backgroundColor: "black" }}></div>
        <div style={{
          position: "absolute", top: "50%", left: "50%", width: boardDimension?.width, height: boardDimension?.height, backgroundColor: "white", transform: "translate(-50%, -50%)"
        }}>
          <CombatBoard />
        </div >
      </div >
      }
    </>
  }, [game, boardDimension]);

  return render;
};
const BattlePlayer: React.FC<{ gameId: string }> = ({ gameId }) => {
  // const client = new ConvexReactClient(SSA_URLS["solitaire"]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 页面隐藏时的逻辑处理
        setIsVisible(false);
      } else {
        // 页面恢复可见时的逻辑处理
        setIsVisible(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 清理函数：组件卸载时移除事件监听
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (

    // <ConvexProvider client={client}>
    <SSAProvider app="solitaire">
      {/* <SSASignIn app="solitaire"> */}
      {isVisible && gameId && <SpriteProvider>
        <CombatProvider gameId={gameId}>
          <CombatSkillProvider>
            <BattlePlaza></BattlePlaza>
            <CombatEventControl />
          </CombatSkillProvider>
        </CombatProvider>
      </SpriteProvider>}
      {/* </SSASignIn> */}
    </SSAProvider>
    // </ConvexProvider>
  )
};
export default BattlePlayer;
