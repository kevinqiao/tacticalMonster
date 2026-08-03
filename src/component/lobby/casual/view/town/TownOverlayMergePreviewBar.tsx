import React from "react";

import { TOWN_BUILDINGS } from "./casualTownBuildingCatalog";
import type {
  TownOverlayMergeBaseSide,
  TownOverlayMergePreviewState,
} from "./townOverlayPairPreview";
import "./townOverlayMergePreviewBar.css";

export interface TownOverlayMergePreviewBarProps {
  state: TownOverlayMergePreviewState;
  onChange: (next: TownOverlayMergePreviewState) => void;
}

const BASE_SIDE_LABELS: Record<TownOverlayMergeBaseSide, string> = {
  game: "游戏底图",
  before: "before",
  after: "after",
};

const TownOverlayMergePreviewBar: React.FC<TownOverlayMergePreviewBarProps> = ({
  state,
  onChange,
}) => {
  const patch = (partial: Partial<TownOverlayMergePreviewState>) =>
    onChange({ ...state, ...partial });

  const mapBuildings = TOWN_BUILDINGS;

  return (
    <div className="town-overlay-merge-preview" role="toolbar" aria-label="Overlay 合并预览">
      <div className="town-overlay-merge-preview__head">
        <label className="town-overlay-merge-preview__enable">
          <input
            type="checkbox"
            checked={state.enabled}
            onChange={(e) => patch({ enabled: e.target.checked })}
          />
          <span className="town-overlay-merge-preview__title">Overlay 合并预览</span>
        </label>
        <span className="town-overlay-merge-preview__status">
          {state.enabled
            ? `${state.buildingId} · ${BASE_SIDE_LABELS[state.baseSide]}${
                state.showOverlay ? " + overlay" : "（仅底图）"
              }`
            : "关闭"}
        </span>
      </div>

      {state.enabled && (
        <>
          <div className="town-overlay-merge-preview__row">
            <label className="town-overlay-merge-preview__field">
              <span className="town-overlay-merge-preview__label">建筑</span>
              <select
                className="town-overlay-merge-preview__select"
                value={state.buildingId}
                onChange={(e) => patch({ buildingId: e.target.value })}
              >
                {mapBuildings.map((b) => (
                  <option key={b.buildingId} value={b.buildingId}>
                    {b.name} ({b.buildingId})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="town-overlay-merge-preview__layers">
            {(["game", "before", "after"] as const).map((side) => (
              <button
                key={side}
                type="button"
                className={`town-overlay-merge-preview__btn${
                  state.baseSide === side ? " is-active" : ""
                }`}
                onClick={() => patch({ baseSide: side })}
              >
                {BASE_SIDE_LABELS[side]}
              </button>
            ))}
          </div>

          <label className="town-overlay-merge-preview__toggle">
            <input
              type="checkbox"
              checked={state.showOverlay}
              onChange={(e) => patch({ showOverlay: e.target.checked })}
            />
            叠放 overlays/{state.buildingId}.png
          </label>

          <p className="town-overlay-merge-preview__hint">
            选 after + 勾选 overlay ≈ 解锁后效果；关 overlay 看擦空底图。需存在 raw/pairs/
            {state.buildingId}_after.png。
          </p>
        </>
      )}
    </div>
  );
};

export default TownOverlayMergePreviewBar;
