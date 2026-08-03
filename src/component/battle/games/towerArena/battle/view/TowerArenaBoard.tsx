import React, { useMemo } from 'react';
import type { TowerArenaSeed } from '@/convex/towerArena/convex/types/TowerArenaSeed';
import type { WaveSimFrame, WaveSimShot } from '@/convex/towerArena/convex/service/towerWaveSim';
import { computeMapBounds } from '@/convex/towerArena/convex/service/towerWaveSim';

type PlacedTowerView = { slotId: string; towerId: string; level: number };

const TOWER_LABEL: Record<string, string> = {
  archer: '弓',
  cannon: '炮',
  mage: '法',
};

const ENEMY_RADIUS: Record<string, number> = {
  grunt: 7,
  runner: 6,
  brute: 10,
  boss: 14,
};

const ENEMY_FILL: Record<string, string> = {
  grunt: '#e74c3c',
  runner: '#f39c12',
  brute: '#922b21',
  boss: '#8e44ad',
};

function pathD(waypoints: Array<{ x: number; y: number }>): string {
  if (waypoints.length === 0) return '';
  const [first, ...rest] = waypoints;
  return `M ${first!.x} ${first!.y} ${rest.map((p) => `L ${p.x} ${p.y}`).join(' ')}`;
}

function towerRange(
  seed: TowerArenaSeed,
  tower: PlacedTowerView
): number | null {
  const def = seed.towerCatalog.find((t) => t.id === tower.towerId);
  if (!def) return null;
  const stats = def.statsByLevel[Math.min(tower.level - 1, def.statsByLevel.length - 1)];
  return stats?.range ?? null;
}

export type TowerArenaBoardProps = {
  seed: TowerArenaSeed;
  towers: PlacedTowerView[];
  selectedSlotId: string | null;
  pickTowerId: string | null;
  waveFrame: WaveSimFrame | null;
  canPlace: boolean;
  onSlotClick: (slotId: string) => void;
};

const TowerArenaBoard: React.FC<TowerArenaBoardProps> = ({
  seed,
  towers,
  selectedSlotId,
  pickTowerId,
  waveFrame,
  canPlace,
  onSlotClick,
}) => {
  const bounds = useMemo(() => computeMapBounds(seed), [seed]);
  const mainPath = seed.paths[0];

  const selectedTower = selectedSlotId
    ? towers.find((t) => t.slotId === selectedSlotId)
    : null;
  const previewRange = useMemo(() => {
    if (!selectedSlotId || !pickTowerId || !canPlace) return null;
    const slot = seed.towerSlots.find((s) => s.id === selectedSlotId);
    const def = seed.towerCatalog.find((t) => t.id === pickTowerId);
    if (!slot || !def) return null;
    if (towers.some((t) => t.slotId === selectedSlotId)) return null;
    return { x: slot.x, y: slot.y, r: def.statsByLevel[0]?.range ?? 80 };
  }, [selectedSlotId, pickTowerId, canPlace, seed, towers]);

  const rangeRing = selectedTower
    ? (() => {
        const slot = seed.towerSlots.find((s) => s.id === selectedTower.slotId);
        const r = towerRange(seed, selectedTower);
        if (!slot || r == null) return null;
        return { x: slot.x, y: slot.y, r };
      })()
    : previewRange;

  const shots: WaveSimShot[] = waveFrame?.shots ?? [];

  return (
    <svg
      className="tower-arena-board"
      viewBox={`0 0 ${bounds.width} ${bounds.height}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="塔防战场"
    >
      <defs>
        <linearGradient id="tower-grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3d6b3d" />
          <stop offset="100%" stopColor="#2a4a2a" />
        </linearGradient>
        <filter id="tower-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect x={0} y={0} width={bounds.width} height={bounds.height} fill="url(#tower-grass)" />

      {mainPath ? (
        <>
          <path
            d={pathD(mainPath.waypoints)}
            className="tower-arena-board__path-base"
            strokeWidth={28}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d={pathD(mainPath.waypoints)}
            className="tower-arena-board__path"
            strokeWidth={18}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </>
      ) : null}

      <circle cx={24} cy={mainPath?.waypoints[0]?.y ?? 120} r={10} className="tower-arena-board__spawn" />
      <circle
        cx={mainPath?.waypoints[mainPath.waypoints.length - 1]?.x ?? bounds.width - 24}
        cy={mainPath?.waypoints[mainPath.waypoints.length - 1]?.y ?? 120}
        r={10}
        className="tower-arena-board__goal"
      />

      {rangeRing ? (
        <circle
          cx={rangeRing.x}
          cy={rangeRing.y}
          r={rangeRing.r}
          className="tower-arena-board__range"
        />
      ) : null}

      {seed.towerSlots.map((slot) => {
        const tower = towers.find((t) => t.slotId === slot.id);
        const selected = selectedSlotId === slot.id;
        return (
          <g
            key={slot.id}
            className={`tower-arena-board__slot ${tower ? 'tower-arena-board__slot--built' : ''} ${
              selected ? 'tower-arena-board__slot--selected' : ''
            } ${canPlace && !tower ? 'tower-arena-board__slot--placeable' : ''}`}
            onClick={() => onSlotClick(slot.id)}
            style={{ cursor: canPlace || tower ? 'pointer' : 'default' }}
          >
            <circle cx={slot.x} cy={slot.y} r={18} className="tower-arena-board__slot-ring" />
            {tower ? (
              <>
                <circle
                  cx={slot.x}
                  cy={slot.y}
                  r={14}
                  className={`tower-arena-board__tower tower-arena-board__tower--${tower.towerId}`}
                />
                <text
                  x={slot.x}
                  y={slot.y + 4}
                  textAnchor="middle"
                  className="tower-arena-board__tower-label"
                >
                  {TOWER_LABEL[tower.towerId] ?? '?'}
                  {tower.level > 1 ? tower.level : ''}
                </text>
              </>
            ) : (
              <text x={slot.x} y={slot.y + 4} textAnchor="middle" className="tower-arena-board__slot-plus">
                +
              </text>
            )}
          </g>
        );
      })}

      {shots.map((s, i) => (
        <line
          key={`shot-${i}-${s.fromX}`}
          x1={s.fromX}
          y1={s.fromY}
          x2={s.toX}
          y2={s.toY}
          className="tower-arena-board__shot"
        />
      ))}

      {(waveFrame?.enemies ?? []).map((e) => {
        const r = ENEMY_RADIUS[e.typeId] ?? 7;
        const hpPct = e.maxHp > 0 ? e.hp / e.maxHp : 0;
        return (
          <g key={e.id} filter="url(#tower-glow)">
            <circle cx={e.x} cy={e.y} r={r} fill={ENEMY_FILL[e.typeId] ?? '#c0392b'} />
            <rect
              x={e.x - r}
              y={e.y - r - 5}
              width={r * 2}
              height={3}
              fill="#222"
              opacity={0.5}
            />
            <rect
              x={e.x - r}
              y={e.y - r - 5}
              width={r * 2 * hpPct}
              height={3}
              fill="#2ecc71"
            />
          </g>
        );
      })}
    </svg>
  );
};

export default TowerArenaBoard;
