import React, { useMemo } from "react";

export interface TownIsoGroundProps {
  sceneW: number;
  sceneH: number;
  grid: number;
  tileW: number;
  tileH: number;
  originX: number;
  originY: number;
  cartoonFilter?: string;
}

function project(
  col: number,
  row: number,
  originX: number,
  originY: number,
  tileW: number,
  tileH: number
): { x: number; y: number } {
  return {
    x: originX + (col - row) * (tileW / 2),
    y: originY + (col + row) * (tileH / 2),
  };
}

/**
 * 推荐版地表：全屏草地 + 柔和中心广场 + 极淡曲线路径（无硬边、无十字街）
 */
const TownIsoGround: React.FC<TownIsoGroundProps> = ({
  sceneW,
  sceneH,
  grid,
  tileW,
  tileH,
  originX,
  originY,
  cartoonFilter,
}) => {
  const { center, paths } = useMemo(() => {
    const c = grid / 2;
    const p = project(c, c, originX, originY, tileW, tileH);
    const pathStops = [
      { col: c, row: -0.2 },
      { col: c, row: grid + 0.2 },
      { col: -0.2, row: c },
      { col: grid + 0.2, row: c },
    ];
    return {
      center: p,
      paths: pathStops.map((s) => project(s.col, s.row, originX, originY, tileW, tileH)),
    };
  }, [grid, tileW, tileH, originX, originY]);

  const plazaRx = grid * tileW * 0.22;
  const plazaRy = grid * tileH * 0.42;
  const skyH = sceneH * 0.26;

  return (
    <svg
      className="town-scene__ground-plate"
      viewBox={`0 0 ${sceneW} ${sceneH}`}
      width={sceneW}
      height={sceneH}
      aria-hidden
      style={cartoonFilter ? { filter: cartoonFilter } : undefined}
    >
      <defs>
        <linearGradient id="town-sky-band" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6ec5f5" />
          <stop offset="100%" stopColor="#92dc68" />
        </linearGradient>
        <linearGradient id="town-grass-fill" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#8ede5e" />
          <stop offset="50%" stopColor="#68c442" />
          <stop offset="100%" stopColor="#4a9e30" />
        </linearGradient>
        <radialGradient id="town-grass-light" cx="50%" cy="48%" r="55%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.14)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        <radialGradient id="town-plaza-soft" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f0e8d4" />
          <stop offset="50%" stopColor="#d8c8a8" />
          <stop offset="100%" stopColor="rgba(200,180,140,0)" />
        </radialGradient>
        <radialGradient id="town-path-fade" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(228,200,120,0.22)" />
          <stop offset="100%" stopColor="rgba(228,200,120,0)" />
        </radialGradient>
      </defs>

      <rect x="0" y="0" width={sceneW} height={sceneH} fill="url(#town-grass-fill)" />
      <rect x="0" y="0" width={sceneW} height={skyH} fill="url(#town-sky-band)" />
      <rect x="0" y={skyH * 0.55} width={sceneW} height={sceneH} fill="url(#town-grass-fill)" />
      <rect x="0" y="0" width={sceneW} height={sceneH} fill="url(#town-grass-light)" />

      {/* 极淡曲线路径：中心向四方淡出 */}
      {paths.map((pt, i) => (
        <ellipse
          key={`path-${i}`}
          cx={(center.x + pt.x) / 2}
          cy={(center.y + pt.y) / 2}
          rx={Math.abs(pt.x - center.x) * 0.55 + 12}
          ry={Math.abs(pt.y - center.y) * 0.35 + 8}
          fill="url(#town-path-fade)"
        />
      ))}

      <ellipse cx={center.x} cy={center.y} rx={plazaRx} ry={plazaRy} fill="url(#town-plaza-soft)" />
    </svg>
  );
};

export default TownIsoGround;
