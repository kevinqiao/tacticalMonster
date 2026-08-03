import React, { useId } from "react";

import { HEAD_NAV_RES_CARD_PNG } from "./HeadNavDesktopConfig";

export function formatResourceAmount(n: number | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (n >= 1_000_000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return n.toLocaleString("en-US");
}

/** 叠在长方形 PNG 上的装饰框（与底图同尺寸拉伸；每实例 id 独立） */
function HeadHudResFrameSvg() {
  const sid = useId().replace(/:/g, "");
  const gid = `hhrfgl-${sid}`;
  return (
    <svg
      className="head-nav-hud__res-frame"
      viewBox="0 0 200 48"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.28" />
        </linearGradient>
      </defs>
      <rect
        x="1"
        y="1"
        width="198"
        height="46"
        rx="8"
        fill="none"
        stroke="rgba(210, 175, 95, 0.55)"
        strokeWidth="2"
      />
      <rect x="3" y="3" width="194" height="42" rx="6" fill={`url(#${gid})`} />
    </svg>
  );
}

/** 金币/宝石：PNG 底 + 左类型图 + SVG 叠层 + 前景数字与 +（与 HeadNavBarDesktop 一致） */
export function HeadHudResourceChip({
  amountLabel,
  glyphSrc,
  onAdd,
  addAriaLabel,
}: {
  amountLabel: string;
  glyphSrc: string;
  onAdd: () => void;
  addAriaLabel: string;
}) {
  return (
    <div className="head-nav-hud__res" role="group">
      <div className="head-nav-hud__res-card">
        <img
          className="head-nav-hud__res-png"
          src={HEAD_NAV_RES_CARD_PNG}
          alt=""
          draggable={false}
        />
        <div className="head-nav-hud__res-glyph">
          <img src={glyphSrc} alt="" draggable={false} />
        </div>
        <HeadHudResFrameSvg />
        <div className="head-nav-hud__res-front">
          <span className="head-nav-hud__res-amount">{amountLabel}</span>
          <button type="button" className="head-nav-hud__res-add" onClick={onAdd} aria-label={addAriaLabel}>
            +
          </button>
        </div>
      </div>
    </div>
  );
}
