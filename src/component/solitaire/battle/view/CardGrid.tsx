import React, { useCallback } from 'react';
import { useCombatManager } from '../service/CombatManager';
import { useSprite } from '../service/SpriteProvider';
import { Card } from '../types/CombatTypes';
import "./style.css";
interface CardSVGProps {
  card: Card;
  width?: string;
  height?: string;
}

const CardContainer: React.FC<{ card: Card, onLoad: () => void }> = ({ card, onLoad }) => {
  const load = useCallback((ele: HTMLDivElement | null) => {
    if (ele) {
      card.ele = ele;
      onLoad();
    }
  }, [onLoad]);

  return (

    // <div ref={(ele) => card.ele = ele} className="card" style={{
    //   width: 0,
    //   height: 0,
    // }}
    // >
    // <DnDCard card={card}>
    <div ref={load} className="card">
      <CardSVG card={card} />
    </div>
    // </DnDCard>


  );
};

export const CardSVG = ({ card, width = '100%', height = '100%' }: CardSVGProps) => {
  const isRed = card.suit === '♥' || card.suit === '♦';
  const color = isRed ? 'red' : 'black';

  return (
    <>
      <svg className="back" width={width} height={height} viewBox="0 0 100 150" preserveAspectRatio="xMidYMid meet">
        {/* 背景矩形，增加阴影 */}
        <rect
          width="100%"
          height="100%"
          fill="#1a3c34"
          stroke="#555" // 描边颜色变浅，更明显
          strokeWidth="2" // 描边加粗
          rx="5"
          ry="5"
          style={{ filter: 'drop-shadow(2px 2px 2px rgba(0,0,0,0.3))' }} // 添加阴影
        />

        {/* 调整图案密度和对比度 */}
        <pattern
          id="diagonal"
          width="8" // 减小宽度，增加图案密度
          height="8"
          patternTransform="rotate(45)"
          patternUnits="userSpaceOnUse"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="8"
            stroke="#5a8a82" // 提高颜色对比度
            strokeWidth="2"
          />
        </pattern>

        {/* 内部矩形 */}
        <rect
          x="5"
          y="5"
          width="90"
          height="140"
          fill="url(#diagonal)"
        />

        {/* 中心圆圈 */}
        <circle
          cx="50"
          cy="75"
          r="20"
          fill="none"
          stroke="#fff"
          strokeWidth="2.5" // 稍加粗描边
        />

        {/* 中心路径 */}
        <path
          d="M50 55 A20 20 0 0 1 70 75 A20 20 0 0 1 50 95 A20 20 0 0 1 30 75 A20 20 0 0 1 50 55"
          fill="none"
          stroke="#fff"
          strokeWidth="1.5" // 稍加粗描边
        />
      </svg>
      <svg className="front" width={width} height={height} viewBox="0 0 100 150" preserveAspectRatio="xMidYMid meet">
        <rect width="100%" height="100%" fill="white" stroke="#333" strokeWidth="1" rx="5" ry="5" />
        <text x="10" y="25" fontSize="20" fill={color} fontFamily="Arial, sans-serif">{card.rank}</text>
        <text x="10" y="45" fontSize="20" fill={color} fontFamily="Arial, sans-serif">{card?.rank?.length === 0 ? "" : card.suit}</text>
        <g transform="translate(90, 145) rotate(180)">
          <text x="0" y="20" fontSize="20" fill={color} fontFamily="Arial, sans-serif">{card.rank}</text>
          <text x="0" y="40" fontSize="20" fill={color} fontFamily="Arial, sans-serif">{card?.rank?.length === 0 ? "" : card.suit}</text>
        </g>
        <text x="50" y="90" fontSize="40" fill={color} textAnchor="middle" fontFamily="Arial, sans-serif">{card.suit}</text>
      </svg>
    </>
  );
};


const CardGrid: React.FC = () => {

  const { game } = useCombatManager();
  const { completeCardsLoaded } = useSprite();
  // const [isLoaded, setIsLoaded] = useState(false);
  const loadCheck = useCallback(() => {
    if (game) {
      if (game.cards?.every((c) => c.ele))
        completeCardsLoaded();
      // setIsLoaded((pre) => !pre ? true : pre);
    }

  }, [game]);

  return (
    // <DnDProvider>
    <div style={{ position: "absolute", top: 0, left: 0, zIndex: 1500, width: "100%", height: "100%" }}>
      {game?.cards?.map((card) => (
        <CardContainer key={game.gameId + '-' + card.id} card={card} onLoad={loadCheck} />
      ))}
    </div>
    // </DnDProvider>
  );
};


export default CardGrid;