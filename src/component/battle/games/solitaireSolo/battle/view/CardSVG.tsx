import React from 'react';
import { SoloCard } from '../types/SoloTypes';
import "./card.css";

interface CardSVGProps {
  card: SoloCard;
  width?: string;
  height?: string;
}

/** 高对比色 + 常规字重；避免过粗字重在小尺寸下显粗糙 */
const FACE_TEXT_PROPS = {
  fontFamily: '"Fredoka", "Segoe UI", Arial, sans-serif',
  fontWeight: 600,
};

export const CardSVG = ({ card, width = '100%', height = '100%' }: CardSVGProps) => {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const color = isRed
    ? 'var(--card-face-red, #d80f1c)'
    : 'var(--card-face-black, #0a0a0c)';

  return (
    <>
      <svg className="back" width={width} height={height} viewBox="0 0 100 150" preserveAspectRatio="xMidYMid meet">
        <rect
          width="100%"
          height="100%"
          fill="var(--card-back-fill, #0e2a24)"
          stroke="var(--card-back-edge, #c8e6df)"
          strokeWidth="2.5"
          rx="5"
          ry="5"
        />

        <pattern
          id="diagonal"
          width="8"
          height="8"
          patternTransform="rotate(45)"
          patternUnits="userSpaceOnUse"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="8"
            stroke="var(--card-back-pattern, #6fb8ab)"
            strokeWidth="2.4"
          />
        </pattern>

        <rect x="5" y="5" width="90" height="140" fill="url(#diagonal)" />

        <circle
          cx="50"
          cy="75"
          r="20"
          fill="none"
          stroke="var(--card-back-accent, #ffffff)"
          strokeWidth="3"
        />

        <path
          d="M50 55 A20 20 0 0 1 70 75 A20 20 0 0 1 50 95 A20 20 0 0 1 30 75 A20 20 0 0 1 50 55"
          fill="none"
          stroke="var(--card-back-accent, #ffffff)"
          strokeWidth="2"
        />
      </svg>
      <svg className="front" width={width} height={height} viewBox="0 0 100 150" preserveAspectRatio="xMidYMid meet">
        <rect
          width="100%"
          height="100%"
          fill="var(--card-face-bg, #ffffff)"
          stroke="var(--card-face-border, #1c1c1c)"
          strokeWidth="1.8"
          rx="5"
          ry="5"
        />
        {/* 文案由 popCard 写入；y 坐标勿改（hideCard/popCard 用属性选择器） */}
        <text x="10" y="25" fontSize="20" fill={color} {...FACE_TEXT_PROPS} />
        <text x="10" y="45" fontSize="18" fill={color} {...FACE_TEXT_PROPS} />
        <g transform="translate(90, 145) rotate(180)">
          <text x="0" y="20" fontSize="20" fill={color} {...FACE_TEXT_PROPS} />
          <text x="0" y="40" fontSize="18" fill={color} {...FACE_TEXT_PROPS} />
        </g>
        <text
          x="50"
          y="90"
          fontSize="40"
          fill={color}
          textAnchor="middle"
          {...FACE_TEXT_PROPS}
        />
      </svg>
    </>
  );
};

export default CardSVG;
