import React from "react";

/** Compact play/video glyph for “看广告重玩” CTAs. */
export function CasualAdReplayVideoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "ssc__replayVideoIcon"}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      focusable="false"
    >
      <rect
        x="2.5"
        y="5"
        width="14"
        height="14"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M10 10.2v5.6L14.5 13 10 10.2Z" fill="currentColor" />
      <path
        d="M18 8.5 21.5 6v12L18 15.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
