import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PageProp } from "host/RenderApp";
import { useUserManager } from "host/service/UserManager";
import {
  campaignAdminErrorMessage,
  campaignErrorMessage,
  campaignSuccessMessage,
} from "../shared/campaignErrorMessage";
import { MerchantPageToolbar } from "../shared/CampaignLocaleSwitcher";
import {
  MerchantCampaignProvider,
  useMerchantCampaignAdmin,
  useMerchantCampaignClient,
} from "../service/useMerchantCampaignManager";
import {
  CAMPAIGN_DAY_TIMEZONE_OPTIONS,
  buildRewardRulesFromForm,
  buildDisplayConfigFromForm,
  validateDisplayCampaignForm,
  campaignFormFromDoc,
  campaignTimezoneLabel,
  couponDefLabel,
  portalVoucherSkuLabel,
  datetimeLocalToMs,
  defaultCampaignForm,
  defaultRankRewardTier,
  defaultRankRewardTiers,
  pickDefaultRewardProductId,
  rewardKindLabel,
  rankRewardTierPreviewLines,
  rewardModelLabel,
  normalizeFormForRewardModel,
  formUsesRankRewardTiers,
  ensureFormRewardProduct,
  playLimitsFromForm,
  replaySettingsFromForm,
  type CampaignFormState,
  type MerchantCouponDefOption,
  type PortalVoucherSkuOption,
} from "./campaignFormHelpers";
import { useCampaignTournamentOptions } from "./useCampaignTournamentOptions";
import i18n from "@/i18n";
import posterGuideUrl from "../assets/poster-guide.pdf?url";
import { MerchantCampaignFormModal } from "./MerchantCampaignFormModal";
import { MerchantNavLink } from "./MerchantEmbeddedNavContext";
import "./merchant.css";
function partnerIdFromLocation(): number {
  const raw = new URLSearchParams(window.location.search).get("partnerId") ?? "";
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
async function uploadCampaignPoster(args: {
  http: NonNullable<ReturnType<typeof useMerchantCampaignClient>["http"]>;
  fns: ReturnType<typeof useMerchantCampaignClient>["fns"];
  partnerId: number;
  file: File;
}): Promise<string> {
  const uploadUrl = (await args.http.action(args.fns.generatePosterUploadUrl, {
    partnerId: args.partnerId,
  })) as string;
  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": args.file.type || "application/octet-stream" },
    body: args.file,
  });
  if (!uploadRes.ok) throw new Error("fetch_failed");
  const { storageId } = (await uploadRes.json()) as { storageId: string };
  return storageId;
}
async function uploadCampaignPosterPair(args: {
  http: NonNullable<ReturnType<typeof useMerchantCampaignClient>["http"]>;
  fns: ReturnType<typeof useMerchantCampaignClient>["fns"];
  partnerId: number;
  portraitFile?: File | null;
  landscapeFile?: File | null;
}): Promise<{
  posterPortraitStorageId?: string;
  posterLandscapeStorageId?: string;
}> {
  let posterPortraitStorageId: string | undefined;
  let posterLandscapeStorageId: string | undefined;
  if (args.portraitFile) {
    posterPortraitStorageId = await uploadCampaignPoster({
      http: args.http,
      fns: args.fns,
      partnerId: args.partnerId,
      file: args.portraitFile,
    });
  }
  if (args.landscapeFile) {
    posterLandscapeStorageId = await uploadCampaignPoster({
      http: args.http,
      fns: args.fns,
      partnerId: args.partnerId,
      file: args.landscapeFile,
    });
  }
  return { posterPortraitStorageId, posterLandscapeStorageId };
}
function campaignHasPortraitPoster(campaign: {
  posterPortraitStorageId?: string | null;
  posterStorageId?: string | null;
}): boolean {
  return Boolean(campaign.posterPortraitStorageId || campaign.posterStorageId);
}
const CampaignFormFields: React.FC<{
  form: CampaignFormState;
  couponDefs: MerchantCouponDefOption[];
  portalVoucherSkus?: PortalVoucherSkuOption[];
  onChange: (patch: Partial<CampaignFormState>) => void;
  disabled?: boolean;
  structuralLocked?: boolean;
  experienceTypeLocked?: boolean;
  posterPortraitPreview?: string | null;
  posterLandscapePreview?: string | null;
  onPosterPortraitSelect?: (file: File | null) => void;
  onPosterLandscapeSelect?: (file: File | null) => void;
  tournamentOptions?: ReadonlyArray<{
    tournamentId: string;
    label: string;
    gameType: string;
    mode: "solo" | "multi";
  }>;
}> = ({
  form,
  couponDefs,
  portalVoucherSkus = [],
  onChange,
  disabled,
  structuralLocked,
  experienceTypeLocked,
  posterPortraitPreview,
  posterLandscapePreview,
  onPosterPortraitSelect,
  onPosterLandscapeSelect,
  tournamentOptions = [],
}) => {
  const { t, i18n: i18nInst } = useTranslation("campaign.merchant");
  const lock = disabled || structuralLocked;
  void couponDefs;
  const selectedPortalSku = portalVoucherSkus.find((sku) => sku.skuId === form.couponDefId);
  const partnerIdHint =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("partnerId") ?? ""
      : "";
  void i18nInst.language;
  useEffect(() => {
    if (!tournamentOptions.length) return;
    if (tournamentOptions.some((g) => g.tournamentId === form.tournamentId)) return;
    const first = tournamentOptions[0]!;
    onChange(
      normalizeFormForRewardModel({
        ...form,
        tournamentId: first.tournamentId,
        gameType: first.gameType,
        mode: first.mode,
      })
    );
  }, [tournamentOptions, form.tournamentId, onChange]);
  return (
    <>
      <fieldset className="merchant-field merchant-field--radio" disabled={experienceTypeLocked || lock}>
        <legend>{t("form.experienceType")}</legend>
        <label className="merchant-radio">
          <input
            type="radio"
            name="experienceType"
            checked={form.experienceType === "game"}
            onChange={() => onChange({ experienceType: "game" })}
          />
          {t("form.experienceTypeGame")}
        </label>
        <label className="merchant-radio">
          <input
            type="radio"
            name="experienceType"
            checked={form.experienceType === "display"}
            onChange={() => onChange({ experienceType: "display", ctaKind: "none" })}
          />
          {t("form.experienceTypeDisplay")}
        </label>
      </fieldset>
      <label className="merchant-field">
        {t("form.title")}
        <input
          value={form.title}
          disabled={disabled}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </label>
      <label className="merchant-field">
        {t("form.slug")}
        <input
          value={form.slug}
          disabled={lock}
          onChange={(e) => onChange({ slug: e.target.value })}
          placeholder={t("form.slugPlaceholder")}
        />
      </label>
      <label className="merchant-field">
        {t("form.rulesText")}
        <textarea
          value={form.rulesText}
          disabled={disabled}
          rows={3}
          onChange={(e) => onChange({ rulesText: e.target.value })}
        />
      </label>
      <div className="merchant-field-row">
        <label className="merchant-field">
          {t("form.startsAt")}
          <input
            type="datetime-local"
            value={form.startsAtLocal}
            disabled={lock}
            onChange={(e) => onChange({ startsAtLocal: e.target.value })}
          />
        </label>
        <label className="merchant-field">
          {t("form.endsAt")}
          <input
            type="datetime-local"
            value={form.endsAtLocal}
            disabled={lock}
            onChange={(e) => onChange({ endsAtLocal: e.target.value })}
          />
        </label>
      </div>
      <h3 className="merchant-section-title">{t("form.posterSection")}</h3>
      <p className="merchant-note">{t("form.posterDualHint")}</p>
      <label className="merchant-field">
        {t("form.posterPortrait")}
        <input
          type="file"
          accept="image/*"
          disabled={disabled}
          onChange={(e) => onPosterPortraitSelect?.(e.target.files?.[0] ?? null)}
        />
      </label>
      <p className="merchant-note merchant-note--compact">{t("form.posterPortraitSize")}</p>
      {posterPortraitPreview ? (
        <img
          className="merchant-poster-preview merchant-poster-preview--portrait"
          src={posterPortraitPreview}
          alt=""
        />
      ) : null}
      <label className="merchant-field">
        {t("form.posterLandscape")}
        <input
          type="file"
          accept="image/*"
          disabled={disabled}
          onChange={(e) => onPosterLandscapeSelect?.(e.target.files?.[0] ?? null)}
        />
      </label>
      <p className="merchant-note merchant-note--compact">{t("form.posterLandscapeSize")}</p>
      {posterLandscapePreview ? (
        <img
          className="merchant-poster-preview merchant-poster-preview--landscape"
          src={posterLandscapePreview}
          alt=""
        />
      ) : null}
      <p className="merchant-note">{t("form.posterRequiredHint")}</p>
      <p className="merchant-note">{t("form.posterDraftHint")}</p>
      <p className="merchant-note">
        <a href={posterGuideUrl} target="_blank" rel="noreferrer">
          {t("form.posterGuideLink")}
        </a>
      </p>
      {form.experienceType === "display" ? (
        <>
          <label className="merchant-field">
            {t("form.highlightText")}
            <input
              value={form.highlightText}
              disabled={disabled}
              onChange={(e) => onChange({ highlightText: e.target.value })}
              placeholder={t("form.highlightTextPlaceholder")}
            />
          </label>
          <h3 className="merchant-section-title">{t("form.ctaSection")}</h3>
          <label className="merchant-field">
            {t("form.ctaKind")}
            <select
              value={form.ctaKind}
              disabled={lock}
              onChange={(e) =>
                onChange({ ctaKind: e.target.value as CampaignFormState["ctaKind"] })
              }
            >
              <option value="none">{t("form.ctaNone")}</option>
              <option value="external_url">{t("form.ctaExternalUrl")}</option>
              <option value="tel">{t("form.ctaTel")}</option>
              <option value="maps">{t("form.ctaMaps")}</option>
            </select>
          </label>
          {form.ctaKind !== "none" ? (
            <>
              <label className="merchant-field">
                {t("form.ctaLabel")}
                <input
                  value={form.ctaLabel}
                  disabled={lock}
                  onChange={(e) => onChange({ ctaLabel: e.target.value })}
                />
              </label>
              <label className="merchant-field">
                {t("form.ctaUrl")}
                <input
                  value={form.ctaUrl}
                  disabled={lock}
                  onChange={(e) => onChange({ ctaUrl: e.target.value })}
                  placeholder={t(`form.ctaUrlPlaceholder.${form.ctaKind}`)}
                />
              </label>
            </>
          ) : null}
        </>
      ) : null}
      {form.experienceType === "game" ? (
      <>
      <h3 className="merchant-section-title">{t("form.gameSection")}</h3>
      <label className="merchant-field">
        {t("form.tournament", { defaultValue: "Tournament desk" })}
        <select
          value={form.tournamentId}
          disabled={lock}
          onChange={(e) => {
            const opt = tournamentOptions.find((o) => o.tournamentId === e.target.value);
            if (!opt) return;
            onChange(
              normalizeFormForRewardModel({
                ...form,
                tournamentId: opt.tournamentId,
                gameType: opt.gameType,
                mode: opt.mode,
              })
            );
          }}
        >
          {tournamentOptions.map((g) => (
            <option key={g.tournamentId} value={g.tournamentId}>
              {g.label}
            </option>
          ))}
        </select>
      </label>
      <p className="merchant-note">
        <code>{form.tournamentId}</code>
        {" · "}
        {form.mode === "solo" ? t("form.modeSolo") : t("form.modeMulti")}
      </p>
      <label className="merchant-field">
        {t("form.rewardModel")}
        <select
          value={form.rewardModel}
          disabled={lock}
          onChange={(e) => {
            const rewardModel = e.target.value as CampaignFormState["rewardModel"];
            onChange(
              normalizeFormForRewardModel({
                ...form,
                rewardModel,
                rankRewardTiers:
                  formUsesRankRewardTiers({ ...form, rewardModel }) &&
                  form.rankRewardTiers.length === 0
                    ? defaultRankRewardTiers(
                        form.couponDefId || pickDefaultRewardProductId(portalVoucherSkus)
                      )
                    : form.rankRewardTiers,
              })
            );
          }}
        >
          <option value="pass_per_run">{t("form.rewardModelPass")}</option>
          <option value="competitive_leaderboard">{t("form.rewardModelCompetitive")}</option>
        </select>
      </label>
      <p className="merchant-note">{rewardModelLabel(form.rewardModel)}</p>
      {form.rewardModel === "competitive_leaderboard" ? (
        <p className="merchant-note">
          {form.mode === "solo" ? t("form.rankSoloHint") : t("form.rankMultiHint")}
        </p>
      ) : form.mode === "multi" ? (
        <p className="merchant-note">{t("form.passMultiHint")}</p>
      ) : (
        <p className="merchant-note">{t("form.passSoloHint")}</p>
      )}
      {structuralLocked ? <p className="merchant-note">{t("form.livePosterHint")}</p> : null}
      <h3 className="merchant-section-title">{t("form.couponRewardSection")}</h3>
      {form.rewardModel === "pass_per_run" && form.mode === "solo" ? (
        <label className="merchant-field">
          {t("form.passCondition")}
          <select
            value={form.rewardKind}
            disabled={lock}
            onChange={(e) =>
              onChange({ rewardKind: e.target.value as CampaignFormState["rewardKind"] })
            }
          >
            <option value="solo_p75_success">{t("form.passP75")}</option>
            <option value="score_threshold">{t("form.passScore")}</option>
          </select>
        </label>
      ) : formUsesRankRewardTiers(form) ? (
        <div className="merchant-rank-tiers">
          <div className="merchant-rank-tiers__header">
            <h4 className="merchant-rank-tiers__title">
              {form.rewardModel === "pass_per_run"
                ? t("form.matchRankRewardTiers")
                : t("form.rankRewardTiers")}
            </h4>
            <button
              type="button"
              className="merchant-btn merchant-btn-secondary merchant-btn--compact"
              disabled={lock}
              onClick={() =>
                onChange({
                  rankRewardTiers: [
                    ...form.rankRewardTiers,
                    defaultRankRewardTier(pickDefaultRewardProductId(portalVoucherSkus)),
                  ],
                })
              }
            >
              {t("form.addRankTier")}
            </button>
          </div>
          {form.rankRewardTiers.map((tier, index) => (
            <div key={`rank-tier-${index}`} className="merchant-rank-tier">
              <p className="merchant-rank-tier__label">
                {t("form.rankTierLabel", { index: index + 1 })}
              </p>
              <div className="merchant-field-row">
                <label className="merchant-field">
                  {t("form.rankFrom")}
                  <input
                    type="number"
                    min={1}
                    max={form.rewardModel === "pass_per_run" ? 5 : 20}
                    value={tier.rankFrom}
                    disabled={lock}
                    onChange={(e) =>
                      onChange({
                        rankRewardTiers: form.rankRewardTiers.map((row, i) =>
                          i === index ? { ...row, rankFrom: e.target.value } : row
                        ),
                      })
                    }
                  />
                </label>
                <label className="merchant-field">
                  {t("form.rankTo")}
                  <input
                    type="number"
                    min={1}
                    max={form.rewardModel === "pass_per_run" ? 5 : 20}
                    value={tier.rankTo}
                    disabled={lock}
                    onChange={(e) =>
                      onChange({
                        rankRewardTiers: form.rankRewardTiers.map((row, i) =>
                          i === index ? { ...row, rankTo: e.target.value } : row
                        ),
                      })
                    }
                  />
                </label>
              </div>
              <label className="merchant-field">
                {t("form.couponDef")}
                <select
                  value={tier.couponDefId}
                  disabled={lock}
                  onChange={(e) =>
                    onChange({
                      rankRewardTiers: form.rankRewardTiers.map((row, i) =>
                        i === index ? { ...row, couponDefId: e.target.value } : row
                      ),
                    })
                  }
                >
                  <option value="">{t("form.selectCouponDef")}</option>
                  {portalVoucherSkus.map((sku) => (
                    <option key={sku.skuId} value={sku.skuId}>
                      {portalVoucherSkuLabel(sku)}
                    </option>
                  ))}
                </select>
              </label>
              {form.rankRewardTiers.length > 1 ? (
                <button
                  type="button"
                  className="merchant-btn merchant-btn-secondary merchant-btn--compact"
                  disabled={lock}
                  onClick={() =>
                    onChange({
                      rankRewardTiers: form.rankRewardTiers.filter((_, i) => i !== index),
                    })
                  }
                >
                  {t("form.removeRankTier")}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      {form.rewardModel === "pass_per_run" &&
      form.mode === "solo" &&
      form.rewardKind === "score_threshold" ? (
        <label className="merchant-field">
          {t("form.minScore")}
          <input
            type="number"
            value={form.minScore}
            disabled={lock}
            onChange={(e) => onChange({ minScore: e.target.value })}
          />
        </label>
      ) : null}
      {form.rewardModel === "pass_per_run" && form.mode === "solo" ? (
      <label className="merchant-field">
        {t("form.couponDef")}
        <select
          value={form.couponDefId}
          disabled={lock}
          onChange={(e) => onChange({ couponDefId: e.target.value })}
        >
          <option value="">{t("form.selectCouponDef")}</option>
          {portalVoucherSkus.map((sku) => (
            <option key={sku.skuId} value={sku.skuId}>
              {portalVoucherSkuLabel(sku)}
            </option>
          ))}
        </select>
      </label>
      ) : null}
      {portalVoucherSkus.length === 0 ? (
        <p className="merchant-note">
          {t("form.noCouponDefs")}{" "}
          <MerchantNavLink route={{ view: "coupon-defs", partnerId: String(partnerIdHint) }}>
            {t("nav.couponDefs")}
          </MerchantNavLink>
        </p>
      ) : null}
      {form.rewardModel === "pass_per_run" && form.mode === "solo" && selectedPortalSku ? (
        <p className="merchant-note">
          {t("form.rewardPreview", {
            label: portalVoucherSkuLabel(selectedPortalSku),
          })}
        </p>
      ) : null}
      {formUsesRankRewardTiers(form) && form.rankRewardTiers.length > 0 ? (
        <div className="merchant-rank-tier-preview">
          {rankRewardTierPreviewLines(form, [], portalVoucherSkus).map((line) => (
            <p key={line} className="merchant-note">
              {line}
            </p>
          ))}
        </div>
      ) : null}
      <label className="merchant-field">
        {form.rewardModel === "pass_per_run" ? t("form.maxCouponsPass") : t("form.maxCouponsRank")}
        <input
          type="number"
          min={1}
          value={form.maxCouponsPerPlayer}
          disabled={lock}
          onChange={(e) => onChange({ maxCouponsPerPlayer: e.target.value })}
        />
      </label>
      <label className="merchant-field">
        {t("form.maxPlaysPerDay")}
        <input
          type="number"
          min={1}
          value={form.maxPlaysPerDay}
          disabled={lock}
          placeholder={t("form.unlimited")}
          onChange={(e) => onChange({ maxPlaysPerDay: e.target.value })}
        />
      </label>
      <label className="merchant-field">
        {t("form.dayTimezone")}
        <select
          value={form.dayTimezone}
          disabled={lock}
          onChange={(e) => onChange({ dayTimezone: e.target.value })}
        >
          {CAMPAIGN_DAY_TIMEZONE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {campaignTimezoneLabel(opt.value)}
            </option>
          ))}
        </select>
      </label>
      <p className="merchant-note">{t("form.dailyQuotaHint")}</p>
      <fieldset className="merchant-field merchant-field--radio">
        <legend>{t("form.replaySection")}</legend>
        <p className="merchant-note">{t("form.replaySectionHint")}</p>
        <label className="merchant-field">
          {t("form.maxReplaysPerMatch")}
          <input
            type="number"
            min={0}
            max={20}
            step={1}
            value={form.maxReplaysPerMatch}
            disabled={lock}
            placeholder={t("form.replayInherit")}
            onChange={(e) => onChange({ maxReplaysPerMatch: e.target.value })}
          />
        </label>
        <label className="merchant-field">
          {t("form.adReplayEnabled")}
          <select
            value={form.adReplayEnabled}
            disabled={lock}
            onChange={(e) =>
              onChange({
                adReplayEnabled: e.target.value as CampaignFormState["adReplayEnabled"],
              })
            }
          >
            <option value="inherit">{t("form.replayInherit")}</option>
            <option value="true">{t("form.replayOn")}</option>
            <option value="false">{t("form.replayOff")}</option>
          </select>
        </label>
        <label className="merchant-field">
          {t("form.adReplayDailyCap")}
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={form.adReplayDailyCap}
            disabled={lock}
            placeholder={t("form.replayInherit")}
            onChange={(e) => onChange({ adReplayDailyCap: e.target.value })}
          />
        </label>
        <label className="merchant-field">
          {t("form.ticketReplayEnabled")}
          <select
            value={form.ticketReplayEnabled}
            disabled={lock}
            onChange={(e) =>
              onChange({
                ticketReplayEnabled: e.target
                  .value as CampaignFormState["ticketReplayEnabled"],
              })
            }
          >
            <option value="inherit">{t("form.replayInherit")}</option>
            <option value="true">{t("form.replayOn")}</option>
            <option value="false">{t("form.replayOff")}</option>
          </select>
        </label>
        <label className="merchant-field">
          {t("form.ticketReplayPriceTickets")}
          <input
            type="number"
            min={1}
            max={100}
            step={1}
            value={form.ticketReplayPriceTickets}
            disabled={lock}
            placeholder={t("form.replayInherit")}
            onChange={(e) => onChange({ ticketReplayPriceTickets: e.target.value })}
          />
        </label>
      </fieldset>
      <p className="merchant-note">
        {t("form.rulePreview", {
          rewardKind: rewardKindLabel(form),
          couponLabel: selectedPortalSku
            ? portalVoucherSkuLabel(selectedPortalSku)
            : couponDefLabel(undefined),
        })}
      </p>
      </>
      ) : null}
    </>
  );
};
export const MerchantCampaignListInner: React.FC<{
  visible: number;
  partnerId: number;
  embedded?: boolean;
}> = ({ visible, partnerId, embedded }) => {
  const { t, i18n: i18nInst } = useTranslation("campaign.merchant");
  const { askAuth } = useUserManager();
  const {
    campaigns,
    couponDefs,
    portalVoucherSkus,
    loading,
    refresh,
    http,
    authed,
    fns,
  } = useMerchantCampaignAdmin(partnerId || null);
  const typedCouponDefs = couponDefs as MerchantCouponDefOption[];
  const typedPortalVoucherSkus = portalVoucherSkus as PortalVoucherSkuOption[];
  const [form, setForm] = useState<CampaignFormState>(() => defaultCampaignForm());
  const [note, setNote] = useState<string | null>(null);
  const [editNote, setEditNote] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createNote, setCreateNote] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  /** Partner public /cc/{slug} when available (optional display). */
  const [partnerSlug, setPartnerSlug] = useState("");
  const { options: tournamentOptions } = useCampaignTournamentOptions();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CampaignFormState | null>(null);
  const [createPosterPortraitFile, setCreatePosterPortraitFile] = useState<File | null>(null);
  const [createPosterLandscapeFile, setCreatePosterLandscapeFile] = useState<File | null>(null);
  const [createPosterPortraitPreview, setCreatePosterPortraitPreview] = useState<string | null>(null);
  const [createPosterLandscapePreview, setCreatePosterLandscapePreview] = useState<string | null>(null);
  const [editPosterPortraitFile, setEditPosterPortraitFile] = useState<File | null>(null);
  const [editPosterLandscapeFile, setEditPosterLandscapeFile] = useState<File | null>(null);
  const [editPosterPortraitPreview, setEditPosterPortraitPreview] = useState<string | null>(null);
  const [editPosterLandscapePreview, setEditPosterLandscapePreview] = useState<string | null>(null);
  void i18nInst.language;
  useEffect(() => {
    // Partner slug for public /cc/{slug} links — wire when partner detail is available.
    setPartnerSlug("");
  }, [partnerId]);
  useEffect(() => {
    if (typedPortalVoucherSkus.length === 0) return;
    setForm((prev) => {
      const couponDefId = prev.couponDefId || pickDefaultRewardProductId(typedPortalVoucherSkus);
      const rankRewardTiers =
        prev.rankRewardTiers.length > 0
          ? prev.rankRewardTiers
          : defaultRankRewardTiers(couponDefId);
      if (prev.couponDefId && prev.rankRewardTiers.length > 0) return prev;
      return { ...prev, couponDefId, rankRewardTiers };
    });
  }, [typedPortalVoucherSkus]);
  const patchForm = (patch: Partial<CampaignFormState>) =>
    setForm((prev) => normalizeFormForRewardModel({ ...prev, ...patch }));
  const onCreatePosterPortraitSelect = (file: File | null) => {
    setCreatePosterPortraitFile(file);
    if (createPosterPortraitPreview?.startsWith("blob:")) URL.revokeObjectURL(createPosterPortraitPreview);
    setCreatePosterPortraitPreview(file ? URL.createObjectURL(file) : null);
  };
  const onCreatePosterLandscapeSelect = (file: File | null) => {
    setCreatePosterLandscapeFile(file);
    if (createPosterLandscapePreview?.startsWith("blob:")) URL.revokeObjectURL(createPosterLandscapePreview);
    setCreatePosterLandscapePreview(file ? URL.createObjectURL(file) : null);
  };
  const onEditPosterPortraitSelect = (file: File | null) => {
    setEditPosterPortraitFile(file);
    if (editPosterPortraitPreview?.startsWith("blob:")) URL.revokeObjectURL(editPosterPortraitPreview);
    setEditPosterPortraitPreview(file ? URL.createObjectURL(file) : null);
  };
  const onEditPosterLandscapeSelect = (file: File | null) => {
    setEditPosterLandscapeFile(file);
    if (editPosterLandscapePreview?.startsWith("blob:")) URL.revokeObjectURL(editPosterLandscapePreview);
    setEditPosterLandscapePreview(file ? URL.createObjectURL(file) : null);
  };
  const resetCreatePosterState = () => {
    setCreatePosterPortraitFile(null);
    setCreatePosterLandscapeFile(null);
    if (createPosterPortraitPreview?.startsWith("blob:")) URL.revokeObjectURL(createPosterPortraitPreview);
    if (createPosterLandscapePreview?.startsWith("blob:")) URL.revokeObjectURL(createPosterLandscapePreview);
    setCreatePosterPortraitPreview(null);
    setCreatePosterLandscapePreview(null);
  };
  const openCreateModal = () => {
    const couponDefId = pickDefaultRewardProductId(typedPortalVoucherSkus);
    setForm({
      ...defaultCampaignForm(),
      couponDefId,
      rankRewardTiers: defaultRankRewardTiers(couponDefId),
    });
    resetCreatePosterState();
    setCreateNote(null);
    setCreateModalOpen(true);
  };
  const closeCreateModal = () => {
    setCreateModalOpen(false);
    setCreateNote(null);
    setCreating(false);
    resetCreatePosterState();
  };
  const closeEditModal = () => {
    setEditingId(null);
    setEditingStatus(null);
    setEditForm(null);
    setEditNote(null);
    setSavingEdit(false);
    setEditPosterPortraitFile(null);
    setEditPosterLandscapeFile(null);
    if (editPosterPortraitPreview?.startsWith("blob:")) URL.revokeObjectURL(editPosterPortraitPreview);
    if (editPosterLandscapePreview?.startsWith("blob:")) URL.revokeObjectURL(editPosterLandscapePreview);
    setEditPosterPortraitPreview(null);
    setEditPosterLandscapePreview(null);
  };
  const createCampaign = async () => {
    if (!http || !authed || !partnerId) {
      askAuth({});
      return;
    }
    const normalized = ensureFormRewardProduct(
      normalizeFormForRewardModel(form),
      typedPortalVoucherSkus
    );
    setCreating(true);
    setCreateNote(t("campaigns.creating"));
    try {
      if (normalized.experienceType === "display") {
        const validationError = validateDisplayCampaignForm(normalized);
        if (validationError) {
          const message = campaignErrorMessage(validationError);
          setCreateNote(message);
          setNote(message);
          return;
        }
        let posterPortraitStorageId: string | undefined;
        let posterLandscapeStorageId: string | undefined;
        ({ posterPortraitStorageId, posterLandscapeStorageId } = await uploadCampaignPosterPair({
          http,
          fns,
          partnerId,
          portraitFile: createPosterPortraitFile,
          landscapeFile: createPosterLandscapeFile,
        }));
        await http.action(fns.createCampaign, {
          partnerId,
          slug: normalized.slug,
          title: normalized.title,
          rulesText: normalized.rulesText || undefined,
          startsAt: datetimeLocalToMs(normalized.startsAtLocal),
          endsAt: datetimeLocalToMs(normalized.endsAtLocal),
          experienceType: "display",
          displayConfig: buildDisplayConfigFromForm(normalized),
          ...(posterPortraitStorageId
            ? { posterPortraitStorageId: posterPortraitStorageId as never }
            : {}),
          ...(posterLandscapeStorageId
            ? { posterLandscapeStorageId: posterLandscapeStorageId as never }
            : {}),
        });
      } else {
        const { posterPortraitStorageId, posterLandscapeStorageId } = await uploadCampaignPosterPair({
          http,
          fns,
          partnerId,
          portraitFile: createPosterPortraitFile,
          landscapeFile: createPosterLandscapeFile,
        });
        await http.action(fns.createCampaign, {
          partnerId,
          slug: normalized.slug,
          title: normalized.title,
          rulesText: normalized.rulesText || undefined,
          startsAt: datetimeLocalToMs(normalized.startsAtLocal),
          endsAt: datetimeLocalToMs(normalized.endsAtLocal),
          tournamentId: normalized.tournamentId,
          rewardModel: normalized.rewardModel,
          playLimits: playLimitsFromForm(normalized),
          ...(() => {
            const replaySettings = replaySettingsFromForm(normalized);
            return replaySettings ? { replaySettings } : {};
          })(),
          rewardRules: buildRewardRulesFromForm(
            normalized,
            typedCouponDefs,
            typedPortalVoucherSkus
          ),
          ...(posterPortraitStorageId
            ? { posterPortraitStorageId: posterPortraitStorageId as never }
            : {}),
          ...(posterLandscapeStorageId
            ? { posterLandscapeStorageId: posterLandscapeStorageId as never }
            : {}),
        });
      }
      setNote(campaignSuccessMessage("campaignCreated"));
      closeCreateModal();
      await refresh();
    } catch (e) {
      const message = campaignAdminErrorMessage(e);
      setCreateNote(message);
      setNote(message);
    } finally {
      setCreating(false);
    }
  };
  const setLive = async (campaignId: string) => {
    if (!http || !authed) {
      askAuth({});
      return;
    }
    try {
      const row = (await http.action(fns.getCampaignForStaff, {
        partnerId,
        campaignId,
      })) as {
        posterPortraitStorageId?: string | null;
        posterStorageId?: string | null;
      } | null;
      if (row && !campaignHasPortraitPoster(row)) {
        setNote(campaignErrorMessage("display_poster_portrait_required"));
        return;
      }
      await http.action(fns.updateCampaignStatus, {
        partnerId,
        campaignId,
        status: "live",
      });
      setNote(campaignSuccessMessage("live"));
      await refresh();
    } catch (e) {
      setNote(campaignAdminErrorMessage(e));
    }
  };
  const setDraft = async (campaignId: string) => {
    if (!http || !authed) return;
    try {
      await http.action(fns.updateCampaignStatus, {
        partnerId,
        campaignId,
        status: "draft",
      });
      setNote(campaignSuccessMessage("drafted"));
      if (editingId === campaignId) {
        setEditingStatus("draft");
      }
      await refresh();
    } catch (e) {
      setNote(campaignAdminErrorMessage(e));
    }
  };
  /** 已结束活动：从公开落地页拿掉（status→draft），与 live「下线改配置」意图不同 */
  const hideFromLanding = async (campaignId: string) => {
    if (!http || !authed) return;
    try {
      await http.action(fns.updateCampaignStatus, {
        partnerId,
        campaignId,
        status: "draft",
      });
      setNote(campaignSuccessMessage("hiddenFromLanding"));
      if (editingId === campaignId) {
        setEditingStatus("draft");
      }
      await refresh();
    } catch (e) {
      setNote(campaignAdminErrorMessage(e));
    }
  };
  const startEdit = async (campaignId: string) => {
    if (!http || !authed) {
      askAuth({});
      return;
    }
    try {
      const row = await http.action(fns.getCampaignForStaff, { partnerId, campaignId });
      if (!row) {
        setNote(campaignErrorMessage("not_found"));
        return;
      }
      setEditingId(campaignId);
      setEditingStatus((row as { status: string }).status);
      setEditForm(
        ensureFormRewardProduct(
          campaignFormFromDoc(row as Parameters<typeof campaignFormFromDoc>[0]),
          typedPortalVoucherSkus
        )
      );
      setEditPosterPortraitFile(null);
      setEditPosterLandscapeFile(null);
      const staffRow = row as {
        posterPortraitUrl?: string | null;
        posterLandscapeUrl?: string | null;
        posterUrl?: string | null;
      };
      setEditPosterPortraitPreview(staffRow.posterPortraitUrl ?? staffRow.posterUrl ?? null);
      setEditPosterLandscapePreview(staffRow.posterLandscapeUrl ?? null);
      setEditNote(null);
      setNote(null);
    } catch (e) {
      setNote(campaignAdminErrorMessage(e));
    }
  };
  const saveEdit = async () => {
    if (!http || !authed || !editingId || !editForm) {
      askAuth({});
      return;
    }
    setSavingEdit(true);
    setEditNote(t("campaigns.saving"));
    try {
      if (editingStatus === "live") {
        const { posterPortraitStorageId, posterLandscapeStorageId } = await uploadCampaignPosterPair({
          http,
          fns,
          partnerId,
          portraitFile: editPosterPortraitFile,
          landscapeFile: editPosterLandscapeFile,
        });
        await http.action(fns.updateCampaign, {
          partnerId,
          campaignId: editingId,
          title: editForm.title,
          rulesText: editForm.rulesText || undefined,
          ...(posterPortraitStorageId
            ? { posterPortraitStorageId: posterPortraitStorageId as never }
            : {}),
          ...(posterLandscapeStorageId
            ? { posterLandscapeStorageId: posterLandscapeStorageId as never }
            : {}),
        });
      } else {
        const normalized = ensureFormRewardProduct(
          normalizeFormForRewardModel(editForm),
          typedPortalVoucherSkus
        );
        if (normalized.experienceType === "display") {
          const validationError = validateDisplayCampaignForm(normalized);
          if (validationError) {
            const message = campaignErrorMessage(validationError);
            setEditNote(message);
            setNote(message);
            return;
          }
          let posterPortraitStorageId: string | undefined;
          let posterLandscapeStorageId: string | undefined;
          ({ posterPortraitStorageId, posterLandscapeStorageId } = await uploadCampaignPosterPair({
            http,
            fns,
            partnerId,
            portraitFile: editPosterPortraitFile,
            landscapeFile: editPosterLandscapeFile,
          }));
          await http.action(fns.updateCampaign, {
            partnerId,
            campaignId: editingId,
            title: normalized.title,
            rulesText: normalized.rulesText || undefined,
            startsAt: datetimeLocalToMs(normalized.startsAtLocal),
            endsAt: datetimeLocalToMs(normalized.endsAtLocal),
            displayConfig: buildDisplayConfigFromForm(normalized),
            ...(posterPortraitStorageId
              ? { posterPortraitStorageId: posterPortraitStorageId as never }
              : {}),
            ...(posterLandscapeStorageId
              ? { posterLandscapeStorageId: posterLandscapeStorageId as never }
              : {}),
          });
        } else {
          const { posterPortraitStorageId, posterLandscapeStorageId } = await uploadCampaignPosterPair({
            http,
            fns,
            partnerId,
            portraitFile: editPosterPortraitFile,
            landscapeFile: editPosterLandscapeFile,
          });
          await http.action(fns.updateCampaign, {
            partnerId,
            campaignId: editingId,
            title: normalized.title,
            rulesText: normalized.rulesText || undefined,
            startsAt: datetimeLocalToMs(normalized.startsAtLocal),
            endsAt: datetimeLocalToMs(normalized.endsAtLocal),
            tournamentId: normalized.tournamentId,
            rewardModel: normalized.rewardModel,
            playLimits: playLimitsFromForm(normalized),
            replaySettings: replaySettingsFromForm(normalized),
            rewardRules: buildRewardRulesFromForm(
              normalized,
              typedCouponDefs,
              typedPortalVoucherSkus
            ),
            ...(posterPortraitStorageId
              ? { posterPortraitStorageId: posterPortraitStorageId as never }
              : {}),
            ...(posterLandscapeStorageId
              ? { posterLandscapeStorageId: posterLandscapeStorageId as never }
              : {}),
          });
        }
      }
      const refreshed = (await http.action(fns.getCampaignForStaff, {
        partnerId,
        campaignId: editingId,
      })) as {
        posterPortraitUrl?: string | null;
        posterLandscapeUrl?: string | null;
        posterUrl?: string | null;
      } | null;
      if (refreshed) {
        setEditPosterPortraitPreview(refreshed.posterPortraitUrl ?? refreshed.posterUrl ?? null);
        setEditPosterLandscapePreview(refreshed.posterLandscapeUrl ?? null);
      }
      setEditPosterPortraitFile(null);
      setEditPosterLandscapeFile(null);
      const savedMessage = campaignSuccessMessage("saved");
      setEditNote(savedMessage);
      setNote(savedMessage);
      window.scrollTo({ top: 0, behavior: "smooth" });
      await refresh();
    } catch (e) {
      const message = campaignAdminErrorMessage(e);
      setEditNote(message);
      setNote(message);
    } finally {
      setSavingEdit(false);
    }
  };
  const finalizeLeaderboard = async (campaignId: string) => {
    if (!http || !authed) return;
    try {
      const result = (await http.action(fns.finalizeCampaignLeaderboardRewardsStaff, {
        partnerId,
        campaignId,
      })) as { ok: boolean; error?: string; couponsIssued?: number };
      if (!result.ok) {
        setNote(campaignErrorMessage(result.error) ?? i18n.t("settlementFailed", { ns: "campaign.errors" }));
        return;
      }
      setNote(
        i18n.t("leaderboardSettled", {
          ns: "campaign.errors",
          count: result.couponsIssued ?? 0,
        })
      );
      await refresh();
    } catch (e) {
      setNote(campaignAdminErrorMessage(e));
    }
  };
  if (visible === 0) return null;
  const PageShell = embedded ? React.Fragment : "div";
  const pageShellProps = embedded ? {} : { className: "merchant-page" };
  return (
    <PageShell {...pageShellProps}>
      {!embedded ? (
        <>
          <MerchantPageToolbar />
          <h1>{t("campaigns.title")}</h1>
          <p className="merchant-note">{t("campaigns.intro", { partnerSlug: partnerSlug || "your-slug" })}</p>
          {partnerSlug ? (
            <p className="merchant-note">
              {t("campaigns.merchantHomeUrl", { partnerSlug })}{" "}
              <a href={`/cc/${partnerSlug}`} target="_blank" rel="noopener noreferrer">
                /cc/{partnerSlug}
              </a>
            </p>
          ) : null}
          <nav className="merchant-nav">
            <MerchantNavLink route={{ view: "home" }}>{t("nav.back")}</MerchantNavLink>
          </nav>
        </>
      ) : (
        <>
          <p className="merchant-note">{t("campaigns.intro", { partnerSlug: partnerSlug || "your-slug" })}</p>
          {partnerSlug ? (
            <p className="merchant-note">
              {t("campaigns.merchantHomeUrl", { partnerSlug })}{" "}
              <a href={`/cc/${partnerSlug}`} target="_blank" rel="noopener noreferrer">
                /cc/{partnerSlug}
              </a>
            </p>
          ) : null}
        </>
      )}
      {note ? <p className="merchant-note">{note}</p> : null}
      <div className="merchant-list-toolbar">
        <h2 className="merchant-list-toolbar__title">{t("campaigns.existing")}</h2>
        <button type="button" className="merchant-btn" onClick={openCreateModal}>
          {t("campaigns.createNew")}
        </button>
      </div>
      {loading ? <p>{t("campaigns.loading")}</p> : null}
      {(
        campaigns as Array<{
          campaignId: string;
          slug: string;
          title: string;
          status: string;
          mode: "solo" | "multi";
          rewardModel?: CampaignFormState["rewardModel"];
          experienceType?: CampaignFormState["experienceType"];
          startsAt: number;
          endsAt: number;
          gameType: string;
          settlement?: {
            status?: string;
            couponsIssued?: number;
            winnerCount?: number;
          };
        }>
      ).map((c) => {
        const formPreview = campaignFormFromDoc(c as Parameters<typeof campaignFormFromDoc>[0]);
        const previewSku = typedPortalVoucherSkus.find(
          (sku) => sku.skuId === formPreview.couponDefId
        );
        const ended = Date.now() >= c.endsAt || c.status === "ended";
        const settlementStatus = c.settlement?.status;
        const leaderboardSettled = settlementStatus === "done";
        const canFinalizeLeaderboard =
          formPreview.rewardModel === "competitive_leaderboard" &&
          ended &&
          !leaderboardSettled;
        const locale = i18nInst.language;
        return (
          <article key={c.campaignId} className="merchant-card">
            <strong>{c.title}</strong>
            <p className="merchant-note">
              {formPreview.experienceType === "display"
                ? t("campaigns.statusLineDisplay", { status: c.status })
                : t("campaigns.statusLine", {
                    status: c.status,
                    rewardModel: rewardModelLabel(formPreview.rewardModel),
                    mode: c.mode,
                    gameType: c.gameType,
                  })}
            </p>
            <p className="merchant-note">
              {new Date(c.startsAt).toLocaleString(locale)} –{" "}
              {new Date(c.endsAt).toLocaleString(locale)}
            </p>
            {formPreview.experienceType === "display" ? (
              <p className="merchant-note">{t("campaigns.displayTypeHint")}</p>
            ) : formUsesRankRewardTiers(formPreview) ? (
              rankRewardTierPreviewLines(formPreview, [], typedPortalVoucherSkus).map((line) => (
                <p key={line} className="merchant-note">
                  {line}
                </p>
              ))
            ) : (
              <p className="merchant-note">
                {t("campaigns.couponLine", {
                  couponLabel: previewSku
                    ? portalVoucherSkuLabel(previewSku)
                    : couponDefLabel(undefined),
                  rewardKind: rewardKindLabel(formPreview),
                })}
              </p>
            )}
            {partnerSlug ? (
              <p className="merchant-note">
                {t("campaigns.landingPage", { partnerSlug, slug: c.slug })}
              </p>
            ) : null}
            {c.status !== "live" &&
            c.status !== "ended" &&
            !campaignHasPortraitPoster(c as { posterPortraitStorageId?: string | null; posterStorageId?: string | null }) ? (
              <p className="merchant-note">{t("campaigns.posterBeforeLive")}</p>
            ) : null}
            <div className="merchant-nav">
              {c.status !== "live" &&
              c.status !== "ended" &&
              !leaderboardSettled ? (
                <button type="button" className="merchant-btn" onClick={() => void setLive(c.campaignId)}>
                  {t("campaigns.goLive")}
                </button>
              ) : null}
              {c.status !== "live" &&
              c.status !== "ended" &&
              leaderboardSettled ? (
                <p className="merchant-note">{t("campaigns.settledCannotRelive")}</p>
              ) : null}
              {c.status === "live" ? (
                <button type="button" className="merchant-btn" onClick={() => void setDraft(c.campaignId)}>
                  {t("campaigns.setDraft")}
                </button>
              ) : null}
              {c.status === "ended" ? (
                <button
                  type="button"
                  className="merchant-btn"
                  onClick={() => void hideFromLanding(c.campaignId)}
                >
                  {t("campaigns.hideFromLanding")}
                </button>
              ) : null}
              {c.status !== "ended" && !leaderboardSettled ? (
                <button type="button" className="merchant-btn" onClick={() => void startEdit(c.campaignId)}>
                  {t("campaigns.edit")}
                </button>
              ) : null}
              {formPreview.rewardModel === "competitive_leaderboard" && leaderboardSettled ? (
                <p className="merchant-note">
                  {t("campaigns.leaderboardSettled", {
                    count: c.settlement?.couponsIssued ?? 0,
                  })}
                </p>
              ) : null}
              {canFinalizeLeaderboard ? (
                <button
                  type="button"
                  className="merchant-btn"
                  onClick={() => void finalizeLeaderboard(c.campaignId)}
                >
                  {settlementStatus === "failed"
                    ? t("campaigns.retryFinalizeLeaderboard")
                    : t("campaigns.finalizeLeaderboard")}
                </button>
              ) : null}
              <MerchantNavLink
                route={{ view: "coupons", partnerId: String(partnerId), campaignId: c.campaignId }}
              >
                {t("nav.couponManagement")}
              </MerchantNavLink>
            </div>
          </article>
        );
      })}
      <MerchantCampaignFormModal
        open={createModalOpen}
        title={t("campaigns.newTitle")}
        onClose={closeCreateModal}
        statusNote={createNote}
        footer={
          <>
            <button
              type="button"
              className="merchant-btn"
              disabled={creating}
              onClick={() => void createCampaign()}
            >
              {creating ? t("campaigns.creating") : t("campaigns.createDraft")}
            </button>
            <button
              type="button"
              className="merchant-btn merchant-btn-secondary"
              disabled={creating}
              onClick={closeCreateModal}
            >
              {t("campaigns.cancel")}
            </button>
          </>
        }
      >
        <p className="merchant-note">{t("campaigns.newHint")}</p>
        <CampaignFormFields
          form={form}
          couponDefs={typedCouponDefs}
          portalVoucherSkus={typedPortalVoucherSkus}
          tournamentOptions={tournamentOptions}
          onChange={patchForm}
          posterPortraitPreview={createPosterPortraitPreview}
          posterLandscapePreview={createPosterLandscapePreview}
          onPosterPortraitSelect={onCreatePosterPortraitSelect}
          onPosterLandscapeSelect={onCreatePosterLandscapeSelect}
        />
      </MerchantCampaignFormModal>
      <MerchantCampaignFormModal
        open={Boolean(editingId && editForm)}
        title={`${t("campaigns.editTitle")}${editingStatus === "live" ? t("campaigns.editLive") : ""}`}
        onClose={closeEditModal}
        statusNote={editNote}
        footer={
          <>
            <button
              type="button"
              className="merchant-btn"
              disabled={savingEdit}
              onClick={() => void saveEdit()}
            >
              {savingEdit ? t("campaigns.saving") : t("campaigns.save")}
            </button>
            {editingStatus === "live" && editingId ? (
              <button
                type="button"
                className="merchant-btn merchant-btn-secondary"
                disabled={savingEdit}
                onClick={() => void setDraft(editingId)}
              >
                {t("campaigns.offlineForEdit")}
              </button>
            ) : null}
            <button
              type="button"
              className="merchant-btn merchant-btn-secondary"
              disabled={savingEdit}
              onClick={closeEditModal}
            >
              {t("campaigns.cancel")}
            </button>
          </>
        }
      >
        {editingStatus === "live" ? (
          <p className="merchant-note">{t("form.liveLockedHint")}</p>
        ) : null}
        {editForm ? (
          <CampaignFormFields
            form={editForm}
            couponDefs={typedCouponDefs}
            portalVoucherSkus={typedPortalVoucherSkus}
            tournamentOptions={tournamentOptions}
            structuralLocked={editingStatus === "live"}
            experienceTypeLocked={editingStatus === "live"}
            posterPortraitPreview={editPosterPortraitPreview}
            posterLandscapePreview={editPosterLandscapePreview}
            onPosterPortraitSelect={onEditPosterPortraitSelect}
            onPosterLandscapeSelect={onEditPosterLandscapeSelect}
            onChange={(patch) => setEditForm((prev) => (prev ? { ...prev, ...patch } : prev))}
          />
        ) : null}
      </MerchantCampaignFormModal>
    </PageShell>
  );
};
const MerchantCampaignListPage: React.FC<PageProp> = ({ visible, data }) => {
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
      <MerchantCampaignListInner visible={visible} partnerId={partnerId} />
    </MerchantCampaignProvider>
  );
};
export default MerchantCampaignListPage;
