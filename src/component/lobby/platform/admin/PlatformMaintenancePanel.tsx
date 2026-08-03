import React, { useEffect, useMemo, useState } from "react";

import { platformAdminErrorMessage } from "./platformAdminHelpers";
import {
  usePlatformAdminMutations,
  usePlatformStatusAdmin,
} from "./usePlatformAdmin";

type Mode = "normal" | "pre_notice" | "maintenance";

function toLocalInputValue(ts: number | null | undefined): string {
  if (ts == null || !Number.isFinite(ts) || ts <= 0) return "";
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInputValue(value: string): number | null {
  if (!value.trim()) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

const MODE_LABEL: Record<Mode, string> = {
  normal: "正常",
  pre_notice: "维护预告（横幅）",
  maintenance: "正式维护（全站暂停）",
};

const PlatformMaintenancePanel: React.FC<{
  canManage: boolean;
}> = ({ canManage }) => {
  const status = usePlatformStatusAdmin(true);
  const { setPlatformStatus } = usePlatformAdminMutations();

  const [mode, setMode] = useState<Mode>("normal");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [plannedStartAt, setPlannedStartAt] = useState("");
  const [plannedEndAt, setPlannedEndAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!status) return;
    setMode(status.mode);
    setTitle(status.title ?? "");
    setMessage(status.message ?? "");
    setPlannedStartAt(toLocalInputValue(status.plannedStartAt));
    setPlannedEndAt(toLocalInputValue(status.plannedEndAt));
  }, [status]);

  const currentLabel = useMemo(() => {
    if (status === undefined) return "加载中…";
    return MODE_LABEL[status.mode] ?? status.mode;
  }, [status]);

  const onSave = async () => {
    if (!canManage) {
      setNote(platformAdminErrorMessage("forbidden"));
      return;
    }
    setSaving(true);
    try {
      await setPlatformStatus({
        mode,
        title: title.trim() || undefined,
        message: message.trim() || undefined,
        plannedStartAt: fromLocalInputValue(plannedStartAt),
        plannedEndAt: fromLocalInputValue(plannedEndAt),
      });
      setNote(
        mode === "maintenance"
          ? "已进入维护模式：普通用户将被全屏拦截，并同步至 Portal / Casual / Campaign。"
          : mode === "pre_notice"
            ? "已开启维护预告横幅。"
            : "已恢复正常服务。"
      );
    } catch (e) {
      setNote(platformAdminErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <h2>系统维护</h2>
      <p className="merchant-note">
        当前状态：<strong>{currentLabel}</strong>
        。预告仅展示横幅；正式维护会全屏暂停普通用户，并拦截 Portal / Casual / Campaign
        的写入接口。平台运营账号与 <code>/platform/*</code> 可旁路。
      </p>

      <fieldset className="merchant-field merchant-field--radio" disabled={!canManage || saving}>
        <legend>模式</legend>
        {(Object.keys(MODE_LABEL) as Mode[]).map((key) => (
          <label key={key} className="merchant-radio">
            <input
              type="radio"
              name="platform-maintenance-mode"
              checked={mode === key}
              onChange={() => setMode(key)}
            />
            {MODE_LABEL[key]}
          </label>
        ))}
      </fieldset>

      <label className="merchant-field">
        标题（可选）
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="系统维护中"
          disabled={!canManage || saving}
          maxLength={120}
        />
      </label>

      <label className="merchant-field">
        说明
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="我们正在升级服务，预计今晚恢复。"
          disabled={!canManage || saving}
          rows={3}
          maxLength={500}
        />
      </label>

      <label className="merchant-field">
        预计开始
        <input
          type="datetime-local"
          value={plannedStartAt}
          onChange={(e) => setPlannedStartAt(e.target.value)}
          disabled={!canManage || saving}
        />
      </label>

      <label className="merchant-field">
        预计恢复
        <input
          type="datetime-local"
          value={plannedEndAt}
          onChange={(e) => setPlannedEndAt(e.target.value)}
          disabled={!canManage || saving}
        />
      </label>

      {canManage ? (
        <button type="button" onClick={() => void onSave()} disabled={saving || status === undefined}>
          {saving ? "保存中…" : "保存并同步"}
        </button>
      ) : (
        <p className="merchant-note">需要 admin / owner 权限才能切换维护状态。</p>
      )}
      {note ? <p className="merchant-note">{note}</p> : null}
    </section>
  );
};

export default PlatformMaintenancePanel;
