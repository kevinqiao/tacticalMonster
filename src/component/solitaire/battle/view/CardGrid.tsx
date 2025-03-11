import gsap from 'gsap';
import React, { useEffect, useState } from 'react';
import useCardAnimate from '../animation/useCardAnimate';
import { useCombatManager } from '../service/CombatManager';
import useCombatAct from '../service/useCombatAct';
import { Card, GameModel } from '../types/CombatTypes';
import { getCardCoord } from '../utils';
import "./card.css";
interface CardSVGProps {
  card: Card;
  width?: string;
  height?: string;
}

const useCardCoord = (card: Card, game: GameModel | null, boardWidth: number, boardHeight: number) => {
  const [coord, setCoord] = useState<{ x: number, y: number, cwidth: number, cheight: number, zIndex: number } | null>(null)

  useEffect(() => {
    if (!game || !game.cards) return;
    // const padding = 20;
    // const zwidth = !card.zone ? boardWidth * 2 / 3 : (card.zone === 1 ? boardWidth * 3 / 7 : boardWidth);
    // const zheight = boardHeight / 3;
    // const top = !card.zone || card.zone === 1 ? 0 : boardHeight / 3;
    // const left = !card.zone || card.zone === 2 ? 0 : boardWidth * 5.8 / 7;
    // const h = boardHeight / 3;
    // const w = !card.zone ? (zwidth - padding * 2) / 3 : (card.zone === 1 ? (zwidth - padding * 4) / 3 : (zwidth - padding * 8) / 7);
    // const cwidth = h / w > 1.5 ? w : h / 1.5
    // const cheight = cwidth * 1.5
    // const hmargin = !card.zone ? (zwidth - cwidth * 4 - padding * 2) / 3 : (card.zone === 1 ? (zwidth - cwidth * 2 - padding * 2) / 2 : (zwidth - 7 * cwidth - padding * 2) / 6);
    // const vmargin = !card.zone || card.zone === 1 ? (zheight - cheight) / 2 : 0;
    // const x = left + padding + cwidth * (card.col || 0) + hmargin * (card.col || 0)
    // const y = top + vmargin + 10 * (card.row || 0);
    const ccoord: { x: number, y: number, cwidth: number, cheight: number, zIndex: number } = getCardCoord(card, boardWidth, boardHeight);

    // const cord: { x: number, y: number, cwidth: number, cheight: number, zIndex: number } = { x, y, cwidth, cheight, zIndex: card.row || 0 }
    if (card.zone === 1) {
      const zIndex = game.cards.filter((c: Card) => c.zone === card.zone).findIndex((c: Card) => c.id === card.id);
      if (zIndex != undefined) {
        ccoord['zIndex'] = zIndex;
      }
    }
    setCoord(ccoord)

  }, [card, boardWidth, boardHeight, game])
  return coord
}
const CardContainer: React.FC<{ card: Card, boardWidth: number, boardHeight: number }> = ({ card, boardWidth, boardHeight }) => {
  const { playFlip } = useCardAnimate();
  const { game } = useCombatManager();
  const coord = useCardCoord(card, game, boardWidth, boardHeight)
  // const pwidth = Math.floor((boardWidth - cardMargin * 8) / 7);


  useEffect(() => {

    if (card && card.ele && coord) {

      const { x, y, cwidth, cheight, zIndex } = coord
      gsap.set(card.ele, {
        x,
        y,
        zIndex: zIndex + 100
      });
    }
  }, [card, coord])
  return (

    <div ref={(ele) => card.ele = ele} className="card" style={{
      width: coord?.cwidth,
      height: coord?.cheight,
    }} onClick={() => playFlip(card)}
    >
      <CardSVG card={card} />
    </div>


  );
};


const CardSVG = ({ card, width = '100%', height = '100%' }: CardSVGProps) => {
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
        <text x="10" y="45" fontSize="20" fill={color} fontFamily="Arial, sans-serif">{card.suit}</text>
        <g transform="translate(90, 145) rotate(180)">
          <text x="0" y="20" fontSize="20" fill={color} fontFamily="Arial, sans-serif">{card.rank}</text>
          <text x="0" y="40" fontSize="20" fill={color} fontFamily="Arial, sans-serif">{card.suit}</text>
        </g>
        <text x="50" y="90" fontSize="40" fill={color} textAnchor="middle" fontFamily="Arial, sans-serif">{card.suit}</text>
      </svg>
    </>
  );
};


const CardGrid: React.FC = () => {
  const { game, boardDimension } = useCombatManager();
  const { deal } = useCombatAct();
  const { playDeal } = useCardAnimate();

  useEffect(() => {
    game?.cards?.forEach((card, index) => {
      if (card.ele) {
        gsap.set(card.ele, { rotationY: 180 });
      }
    })
    console.log("cards", game?.cards);
  }, [game])

  return (
    <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "white" }}>

      {game?.cards?.map((card) => (
        <CardContainer key={card.id} card={card} boardWidth={boardDimension.width} boardHeight={boardDimension.height} />
      ))}

      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", position: "absolute", bottom: 0, right: 0, width: "100%", height: 60, backgroundColor: "red" }}>
        <div style={{ cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", width: 70, height: 40, backgroundColor: "blue", color: "white", marginRight: 20 }} onClick={deal}>
          Deal
        </div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: 70, height: 40, backgroundColor: "blue", color: "white" }}>
          Shuffle
        </div>
      </div>
    </div>
  );
};


export default CardGrid;
