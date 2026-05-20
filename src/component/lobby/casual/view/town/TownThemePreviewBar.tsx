import React from "react";

import type { CasualSkinEntitlements } from "../../service/useCasualPlatformManager";

import type { TownBpLayer } from "./casualTownThemeCatalog";
import {
  TOWN_BP_LAYER_LABELS,
  TOWN_BP_LAYER_ORDER,
  townLayerBadge,
} from "./townIllustrationTheme";
import "./townThemePreviewBar.css";

export interface TownThemePreviewBarProps {
  liveEntitlements: CasualSkinEntitlements;
  previewLayer: TownBpLayer | null;
  previewDeluxe: boolean;
  onPreviewLayer: (layer: TownBpLayer | null) => void;
  onPreviewDeluxe: (deluxe: boolean) => void;
}

const TownThemePreviewBar: React.FC<TownThemePreviewBarProps> = ({
  liveEntitlements,
  previewLayer,
  previewDeluxe,
  onPreviewLayer,
  onPreviewDeluxe,
}) => {
  const isLive = previewLayer == null;

  return (
    <div className="town-theme-preview" role="toolbar" aria-label="城镇主题档位预览">
      <div className="town-theme-preview__head">
        <span className="town-theme-preview__title">主题 4 档预览（累进叠加）</span>
        <span className="town-theme-preview__status">
          {isLive
            ? `跟随 BP：${townLayerBadge(liveEntitlements)}`
            : `演示：${TOWN_BP_LAYER_LABELS[previewLayer]}${previewDeluxe ? " · 豪华" : ""}`}
        </span>
      </div>
      <div className="town-theme-preview__layers">
        {TOWN_BP_LAYER_ORDER.map((layer) => (
          <button
            key={layer}
            type="button"
            className={`town-theme-preview__btn${
              previewLayer === layer ? " is-active" : ""
            }`}
            onClick={() => onPreviewLayer(layer)}
          >
            {TOWN_BP_LAYER_LABELS[layer]}
          </button>
        ))}
        <button
          type="button"
          className={`town-theme-preview__btn town-theme-preview__btn--live${
            isLive ? " is-active" : ""
          }`}
          onClick={() => onPreviewLayer(null)}
        >
          BP 实况
        </button>
      </div>
      <label className="town-theme-preview__deluxe">
        <input
          type="checkbox"
          checked={previewDeluxe}
          onChange={(e) => onPreviewDeluxe(e.target.checked)}
          disabled={isLive && liveEntitlements.townVariant !== "deluxe"}
        />
        豪华滤镜 deluxe
      </label>
    </div>
  );
};

export default TownThemePreviewBar;
