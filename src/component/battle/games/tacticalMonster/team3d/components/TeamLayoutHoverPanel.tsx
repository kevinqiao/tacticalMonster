/**
 * 编队场景：悬停属性面板（纯 DOM，定位由 TeamLayoutHoverScreenSync + fixed 完成）
 */
import React from "react";

export type HoverStatLine = { label: string; value: string };

export type TeamLayoutHoverPanelContentProps = {
    title: string;
    subtitle?: string;
    lines: HoverStatLine[];
    showRemove?: boolean;
    onRemove?: () => void;
    onPanelMouseEnter?: () => void;
    onPanelMouseLeave?: () => void;
};

/** 仅面板内容与样式，不含定位（由外层 fixed 容器负责） */
export const TeamLayoutHoverPanelContent: React.FC<TeamLayoutHoverPanelContentProps> = ({
    title,
    subtitle,
    lines,
    showRemove,
    onRemove,
    onPanelMouseEnter,
    onPanelMouseLeave,
}) => (
    <div
        role="dialog"
        aria-label={title}
        onMouseEnter={onPanelMouseEnter}
        onMouseLeave={onPanelMouseLeave}
        style={{
            minWidth: 260,
            maxWidth: 360,
            padding: "12px 14px",
            background: "rgba(15, 23, 42, 0.94)",
            border: "1px solid rgba(148, 163, 184, 0.45)",
            borderRadius: 10,
            color: "#f1f5f9",
            fontSize: 15,
            lineHeight: 1.35,
            fontFamily: "system-ui, sans-serif",
            boxShadow: "0 6px 24px rgba(0,0,0,0.5)",
            pointerEvents: "auto",
        }}
    >
        <div style={{ fontWeight: 700, marginBottom: subtitle ? 4 : 8, fontSize: 17 }}>{title}</div>
        {subtitle ? (
            <div style={{ opacity: 0.88, fontSize: 13, marginBottom: 8 }}>{subtitle}</div>
        ) : null}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
                {lines.map((row) => (
                    <tr key={`${row.label}-${row.value}`}>
                        <td style={{ padding: "4px 10px 4px 0", opacity: 0.78, whiteSpace: "nowrap" }}>
                            {row.label}
                        </td>
                        <td style={{ padding: "4px 0", textAlign: "right", wordBreak: "break-word" }}>
                            {row.value}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
        {showRemove ? (
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove?.();
                }}
                style={{
                    marginTop: 10,
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #b91c1c",
                    background: "#7f1d1d",
                    color: "#fecaca",
                    cursor: "pointer",
                    fontSize: 15,
                    fontWeight: 600,
                }}
            >
                remove
            </button>
        ) : null}
    </div>
);

export default TeamLayoutHoverPanelContent;
