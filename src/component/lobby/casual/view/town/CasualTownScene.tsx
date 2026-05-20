import React, { useEffect, useMemo, useRef, useState } from "react";

import { casualTownAssetsById, type CasualTownAssetId } from "./assets/casualTownAssetCatalog";
import { getTownBuilding } from "./casualTownBuildingCatalog";
import {
  sceneDepth,
  TOWN_AMBIENT_DECOR,
  TOWN_SCENE_GRID,
  TOWN_SCENE_SLOTS,
  type TownSceneSlot,
} from "./casualTownSceneLayout";
import TownIsoGround from "./TownIsoGround";
import { TOWN_SCENE } from "./townSceneConstants";

const SCENE_W = TOWN_SCENE.sceneW;
const SCENE_H = TOWN_SCENE.sceneH;
const TILE_W = TOWN_SCENE.tileW;
const TILE_H = TOWN_SCENE.tileH;
const ORIGIN_X = TOWN_SCENE.originX;
const ORIGIN_Y = TOWN_SCENE.originY;
const BUILDING_BASE_SCALE = TOWN_SCENE.buildingBaseScale;

function project(col: number, row: number): { left: number; top: number } {
  return {
    left: ORIGIN_X + (col - row) * (TILE_W / 2),
    top: ORIGIN_Y + (col + row) * (TILE_H / 2),
  };
}

function TownAssetImg({
  assetId,
  className,
  widthPx,
  style,
}: {
  assetId: CasualTownAssetId;
  className?: string;
  widthPx: number;
  style?: React.CSSProperties;
}) {
  const asset = casualTownAssetsById[assetId];
  if (!asset) return null;
  const heightPx = Math.round((widthPx * asset.height) / asset.width);
  return (
    <img
      className={className}
      src={asset.src}
      alt=""
      width={widthPx}
      height={heightPx}
      draggable={false}
      style={style}
    />
  );
}

function SceneAnchor({
  col,
  row,
  zIndex,
  className,
  children,
}: {
  col: number;
  row: number;
  zIndex: number;
  className?: string;
  children: React.ReactNode;
}) {
  const { left, top } = project(col, row);
  return (
    <div className={`town-scene__anchor ${className ?? ""}`} style={{ left, top, zIndex }}>
      {children}
    </div>
  );
}

function BuildingSlot({
  slot,
  level,
  selected,
  onSelect,
  cartoonFilter,
}: {
  slot: TownSceneSlot;
  level: number;
  selected: boolean;
  onSelect: (id: string) => void;
  cartoonFilter: string;
}) {
  const def = getTownBuilding(slot.buildingId);
  if (!def) return null;

  const unlocked = TOWN_SCENE.previewAllUnlocked || level >= def.visibleFromStage;
  const scaleMul = (slot.scale ?? 1) * BUILDING_BASE_SCALE;
  const decorPx = Math.round(TILE_W * 1.35 * scaleMul);
  const lift = slot.decorLift ?? 0;

  const kindClass = def.isLegendary ? " town-scene__building--legendary" : "";
  const isCenter = slot.buildingId === "town_square";

  return (
    <SceneAnchor
      col={slot.col}
      row={slot.row}
      zIndex={sceneDepth(slot.col, slot.row) + 10}
      className={`town-scene__building town-scene__building--decor-only${isCenter ? " town-scene__building--center" : ""}${selected ? " is-selected" : ""}${unlocked ? "" : " is-locked"}${kindClass}`}
    >
      <button
        type="button"
        className="town-scene__hit"
        onClick={() => onSelect(slot.buildingId)}
        aria-label={def.name}
      >
        {selected && <span className="town-scene__select-ring" aria-hidden />}
        <div className="town-scene__decor-wrap" style={{ marginTop: -lift }}>
          {unlocked ? (
            <TownAssetImg
              assetId={slot.decorId}
              widthPx={decorPx}
              className="town-scene__decor"
              style={{ filter: cartoonFilter }}
            />
          ) : (
            <TownAssetImg
              assetId="locked_decor"
              widthPx={Math.round(decorPx * 0.55)}
              className="town-scene__locked"
            />
          )}
        </div>
        {selected && (
          <span className="town-scene__label">
            <span className="town-scene__label-icon">{def.icon}</span>
            {def.name}
          </span>
        )}
      </button>
    </SceneAnchor>
  );
}

function AmbientDecor({
  col,
  row,
  decorId,
  cartoonFilter,
  scale = 1,
}: {
  col: number;
  row: number;
  decorId: CasualTownAssetId;
  cartoonFilter: string;
  scale?: number;
}) {
  return (
    <SceneAnchor col={col} row={row} zIndex={sceneDepth(col, row) + 4} className="town-scene__ambient">
      <TownAssetImg
        assetId={decorId}
        widthPx={Math.round(TILE_W * 0.85 * scale * BUILDING_BASE_SCALE)}
        style={{ filter: cartoonFilter, opacity: 0.92 }}
      />
    </SceneAnchor>
  );
}

export interface CasualTownSceneProps {
  level: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  skyGradient: string;
  groundTint: string;
  cartoonFilter: string;
}

const CasualTownScene: React.FC<CasualTownSceneProps> = ({
  level,
  selectedId,
  onSelect,
  skyGradient,
  groundTint,
  cartoonFilter,
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;
    const update = () => setScale(el.clientWidth / SCENE_W);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const buildings = useMemo(
    () =>
      [...TOWN_SCENE_SLOTS].sort(
        (a, b) => sceneDepth(a.col, a.row) - sceneDepth(b.col, b.row)
      ),
    []
  );

  const ambient = useMemo(
    () =>
      [...TOWN_AMBIENT_DECOR].sort(
        (a, b) => sceneDepth(a.col, a.row) - sceneDepth(b.col, b.row)
      ),
    []
  );

  const scaledH = SCENE_H * scale;

  return (
    <div
      className="town-scene town-scene--recommended"
      data-town-renderer="v6-recommended"
      style={{ background: skyGradient }}
    >
      <div className="town-scene__sun" aria-hidden />
      <div className="town-scene__clouds" aria-hidden>
        <span className="town-scene__cloud town-scene__cloud--a" />
        <span className="town-scene__cloud town-scene__cloud--b" />
        <span className="town-scene__cloud town-scene__cloud--c" />
      </div>
      <div className="town-scene__ground" style={{ background: groundTint }} />
      <div
        ref={viewportRef}
        className="town-scene__viewport"
        style={{ height: scaledH }}
      >
        <div
          className="town-scene__world"
          style={{
            width: SCENE_W,
            height: SCENE_H,
            transform: `translateX(-50%) scale(${scale})`,
          }}
        >
          <TownIsoGround
            sceneW={SCENE_W}
            sceneH={SCENE_H}
            grid={TOWN_SCENE_GRID}
            tileW={TILE_W}
            tileH={TILE_H}
            originX={ORIGIN_X}
            originY={ORIGIN_Y}
            cartoonFilter={cartoonFilter}
          />
          {ambient.map((d) => (
            <AmbientDecor
              key={`a-${d.col}-${d.row}-${d.decorId}`}
              col={d.col}
              row={d.row}
              decorId={d.decorId}
              scale={d.scale}
              cartoonFilter={cartoonFilter}
            />
          ))}
          {buildings.map((slot) => (
            <BuildingSlot
              key={slot.buildingId}
              slot={slot}
              level={level}
              selected={selectedId === slot.buildingId}
              onSelect={onSelect}
              cartoonFilter={cartoonFilter}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CasualTownScene;
