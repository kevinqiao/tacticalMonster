import React, { useCallback, useEffect, useState } from "react";

import { useTranslation } from "react-i18next";

import { PageProp } from "host/RenderApp";

import { useUserManager } from "host/service/UserManager";

import {
  campaignAdminErrorMessage,
  campaignSuccessMessage,
} from "../shared/campaignErrorMessage";

import { MerchantPageToolbar } from "../shared/CampaignLocaleSwitcher";

import { formatCampaignRewardLabel } from "../shared/campaignRewardDisplay";

import {
  MerchantCampaignProvider,
  useMerchantCampaignClient,
} from "../service/useMerchantCampaignManager";

import { MerchantNavLink } from "./MerchantEmbeddedNavContext";

import {
  datetimeLocalToMs,
  msToDatetimeLocal,
  type MerchantCouponDefOption,
} from "./campaignFormHelpers";

import "./merchant.css";

function partnerIdFromLocation(): number {
  const raw = new URLSearchParams(window.location.search).get("partnerId") ?? "";
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

const DEFAULT_VALIDITY_HOURS = 72;
const DEFAULT_ACTIVATION_DELAY_HOURS = 24;

type ActivationKind = "immediate" | "delay_hours" | "fixed_at";

type ScheduleDraft = {
  usageRules: string;
  validityHours: string;
  activationKind: ActivationKind;
  activationDelayHours: string;
  activationAtLocal: string;
};

function parseActivationKind(value: string): ActivationKind {
  if (value === "delay_hours" || value === "fixed_at") return value;
  return "immediate";
}

function scheduleFromDef(def: MerchantCouponDefOption): ScheduleDraft {
  const activation = def.activation ?? { kind: "immediate" as const };
  return {
    usageRules: def.usageRules ?? "",
    validityHours: String(def.validity?.hours ?? DEFAULT_VALIDITY_HOURS),
    activationKind: activation.kind,
    activationDelayHours: String(
      activation.kind === "delay_hours" ? activation.hours : DEFAULT_ACTIVATION_DELAY_HOURS
    ),
    activationAtLocal:
      activation.kind === "fixed_at"
        ? msToDatetimeLocal(activation.atMs)
        : msToDatetimeLocal(Date.now() + 24 * 3600 * 1000),
  };
}

function emptyCreateSchedule(): ScheduleDraft {
  return {
    usageRules: "",
    validityHours: String(DEFAULT_VALIDITY_HOURS),
    activationKind: "immediate",
    activationDelayHours: String(DEFAULT_ACTIVATION_DELAY_HOURS),
    activationAtLocal: msToDatetimeLocal(Date.now() + 24 * 3600 * 1000),
  };
}

export const MerchantCouponDefListInner: React.FC<{
  visible: number;
  partnerId: number;
  embedded?: boolean;
}> = ({ visible, partnerId, embedded }) => {
  const { t, i18n } = useTranslation("campaign.merchant");
  const { askAuth } = useUserManager();
  const { http, authed, fns } = useMerchantCampaignClient();

  const [rows, setRows] = useState<MerchantCouponDefOption[]>([]);
  const [name, setName] = useState("");
  const [itemLabel, setItemLabel] = useState("");
  const [createSchedule, setCreateSchedule] = useState<ScheduleDraft>(emptyCreateSchedule);
  const [editById, setEditById] = useState<Record<string, ScheduleDraft>>({});
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!http || !authed || !partnerId) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const list = (await http.action(fns.listCouponDefsForStaff, {
        partnerId,
        includeArchived: true,
      })) as MerchantCouponDefOption[];
      setRows(list ?? []);
      setEditById(
        Object.fromEntries((list ?? []).map((def) => [def.couponDefId, scheduleFromDef(def)]))
      );
    } finally {
      setLoading(false);
    }
  }, [http, authed, partnerId, fns.listCouponDefsForStaff]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const scheduleArgs = (draft: ScheduleDraft) => {
    const hours = Math.floor(Number(draft.validityHours));
    const delayHours = Math.floor(Number(draft.activationDelayHours));
    return {
      usageRules: draft.usageRules,
      validityHours: Number.isFinite(hours) ? hours : DEFAULT_VALIDITY_HOURS,
      activationKind: draft.activationKind,
      ...(draft.activationKind === "fixed_at"
        ? { activationAtMs: datetimeLocalToMs(draft.activationAtLocal) }
        : {}),
      ...(draft.activationKind === "delay_hours"
        ? {
            activationDelayHours: Number.isFinite(delayHours)
              ? delayHours
              : DEFAULT_ACTIVATION_DELAY_HOURS,
          }
        : {}),
    };
  };

  const createDef = async () => {
    if (!http || !authed || !partnerId) {
      askAuth({});
      return;
    }
    try {
      await http.action(fns.createCouponDef, {
        partnerId,
        name: name.trim(),
        itemLabel: itemLabel.trim(),
        ...scheduleArgs(createSchedule),
      });
      setName("");
      setItemLabel("");
      setCreateSchedule(emptyCreateSchedule());
      setNote(campaignSuccessMessage("couponDefCreated"));
      await refresh();
    } catch (e) {
      setNote(campaignAdminErrorMessage(e));
    }
  };

  const saveSchedule = async (couponDefId: string) => {
    if (!http || !authed || !partnerId) return;
    const draft = editById[couponDefId];
    if (!draft) return;
    try {
      await http.action(fns.updateCouponDef, {
        partnerId,
        couponDefId,
        ...scheduleArgs(draft),
      });
      setNote(campaignSuccessMessage("saved"));
      await refresh();
    } catch (e) {
      setNote(campaignAdminErrorMessage(e));
    }
  };

  const archiveDef = async (couponDefId: string) => {
    if (!http || !authed || !partnerId) return;
    try {
      await http.action(fns.archiveCouponDef, { partnerId, couponDefId });
      setNote(campaignSuccessMessage("archived"));
      await refresh();
    } catch (e) {
      setNote(campaignAdminErrorMessage(e));
    }
  };

  if (visible === 0) return null;

  const renderScheduleFields = (
    draft: ScheduleDraft,
    onChange: (next: ScheduleDraft) => void
  ) => (
    <>
      <label className="merchant-field">
        {t("couponDefs.usageRules")}
        <textarea
          rows={3}
          value={draft.usageRules}
          placeholder={t("couponDefs.usageRulesPlaceholder")}
          onChange={(e) => onChange({ ...draft, usageRules: e.target.value })}
        />
      </label>
      <p className="merchant-note">{t("couponDefs.usageRulesHint")}</p>
      <label className="merchant-field">
        {t("couponDefs.activation")}
        <select
          value={draft.activationKind}
          onChange={(e) =>
            onChange({
              ...draft,
              activationKind: parseActivationKind(e.target.value),
            })
          }
        >
          <option value="immediate">{t("couponDefs.activationImmediate")}</option>
          <option value="delay_hours">{t("couponDefs.activationDelay")}</option>
          <option value="fixed_at">{t("couponDefs.activationFixed")}</option>
        </select>
      </label>
      {draft.activationKind === "delay_hours" ? (
        <label className="merchant-field">
          {t("couponDefs.activationDelayHours")}
          <input
            type="number"
            min={0}
            max={8760}
            value={draft.activationDelayHours}
            onChange={(e) => onChange({ ...draft, activationDelayHours: e.target.value })}
          />
        </label>
      ) : null}
      {draft.activationKind === "fixed_at" ? (
        <label className="merchant-field">
          {t("couponDefs.activationAt")}
          <input
            type="datetime-local"
            value={draft.activationAtLocal}
            onChange={(e) => onChange({ ...draft, activationAtLocal: e.target.value })}
          />
        </label>
      ) : null}
      <label className="merchant-field">
        {t("couponDefs.validityHours")}
        <input
          type="number"
          min={1}
          max={8760}
          value={draft.validityHours}
          onChange={(e) => onChange({ ...draft, validityHours: e.target.value })}
        />
      </label>
    </>
  );

  const content = (
    <>
      {embedded ? <p className="merchant-note">{t("couponDefs.intro")}</p> : null}
      <section className="merchant-card">
        <h2>{t("couponDefs.newTitle")}</h2>
        <label className="merchant-field">
          {t("couponDefs.adminName")}
          <input
            value={name}
            placeholder={t("couponDefs.adminNamePlaceholder")}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="merchant-field">
          {t("couponDefs.itemLabel")}
          <input
            value={itemLabel}
            placeholder={t("couponDefs.itemLabelPlaceholder")}
            onChange={(e) => setItemLabel(e.target.value)}
          />
        </label>
        {renderScheduleFields(createSchedule, setCreateSchedule)}
        <p className="merchant-note">{t("couponDefs.activationHint")}</p>
        <p className="merchant-note">{t("couponDefs.validityHoursHint")}</p>
        <button type="button" className="merchant-btn" onClick={() => void createDef()}>
          {t("couponDefs.create")}
        </button>
      </section>

      <h2>{t("couponDefs.existing")}</h2>
      {loading ? <p>{t("campaigns.loading")}</p> : null}
      {rows.map((def) => {
        const hours = def.validity?.hours ?? DEFAULT_VALIDITY_HOURS;
        const activation = def.activation ?? { kind: "immediate" as const };
        const draft = editById[def.couponDefId] ?? scheduleFromDef(def);
        const activationLabel =
          activation.kind === "fixed_at"
            ? t("couponDefs.activationLineFixed", {
                at: new Date(activation.atMs).toLocaleString(i18n.language),
              })
            : activation.kind === "delay_hours"
              ? t("couponDefs.activationLineDelay", { hours: activation.hours })
              : t("couponDefs.activationLineImmediate");
        return (
          <article key={def.couponDefId} className="merchant-card">
            <strong>{def.name}</strong>
            <p>{formatCampaignRewardLabel(def.reward)}</p>
            {def.usageRules?.trim() ? (
              <p className="merchant-note" style={{ whiteSpace: "pre-wrap" }}>
                {t("couponDefs.usageRulesLine", { rules: def.usageRules.trim() })}
              </p>
            ) : (
              <p className="merchant-note">{t("couponDefs.usageRulesEmpty")}</p>
            )}
            <p className="merchant-note">
              {activationLabel} · {t("couponDefs.validityLine", { hours })} · {def.status} ·{" "}
              {def.couponDefId}
            </p>
            {def.status === "active" ? (
              <>
                {renderScheduleFields(draft, (next) =>
                  setEditById((prev) => ({ ...prev, [def.couponDefId]: next }))
                )}
                <div className="merchant-nav">
                  <button
                    type="button"
                    className="merchant-btn"
                    onClick={() => void saveSchedule(def.couponDefId)}
                  >
                    {t("couponDefs.saveSchedule")}
                  </button>
                  <button
                    type="button"
                    className="merchant-btn"
                    onClick={() => void archiveDef(def.couponDefId)}
                  >
                    {t("couponDefs.archive")}
                  </button>
                </div>
              </>
            ) : null}
          </article>
        );
      })}
      {rows.length === 0 && !loading ? (
        <p className="merchant-note">{t("couponDefs.empty")}</p>
      ) : null}
      {note ? <p className="merchant-note">{note}</p> : null}
    </>
  );

  if (embedded) return content;

  return (
    <div className="merchant-page">
      <MerchantPageToolbar />
      <h1>{t("couponDefs.title")}</h1>
      <p className="merchant-note">{t("couponDefs.intro")}</p>
      <nav className="merchant-nav">
        <MerchantNavLink route={{ view: "home" }}>{t("nav.back")}</MerchantNavLink>
        {partnerId ? (
          <MerchantNavLink route={{ view: "campaigns", partnerId: String(partnerId) }}>
            {t("nav.campaigns")}
          </MerchantNavLink>
        ) : null}
      </nav>
      {content}
    </div>
  );
};

const MerchantCouponDefListPage: React.FC<PageProp> = ({ visible, data }) => {
  const fromData =
    typeof data?.partnerId === "number"
      ? data.partnerId
      : typeof data?.partnerId === "string"
        ? Number(data.partnerId)
        : 0;
  const partnerId =
    Number.isFinite(fromData) && fromData > 0 ? fromData : partnerIdFromLocation();

  return (
    <MerchantCampaignProvider>
      <MerchantCouponDefListInner visible={visible} partnerId={partnerId} />
    </MerchantCampaignProvider>
  );
};

export default MerchantCouponDefListPage;
