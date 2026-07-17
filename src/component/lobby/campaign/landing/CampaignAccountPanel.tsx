import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { resolvePlayerDisplayName } from "@/convex/shared/displayName";
import "@/component/lobby/portal/3d/portal_3d_modal.css";

export type CampaignAccountPanelProps = {
  uid?: string | null;
  ssoName?: string | null;
  email?: string | null;
  phone?: string | null;
  verifiedEmail?: string | null;
  verifiedPhone?: string | null;
  customDisplayName?: string | null;
  resolvedDisplayName?: string | null;
  onSaveDisplayName?: (
    displayName: string
  ) => Promise<{ ok: boolean; error?: string; displayName?: string }>;
  onSaveContact?: (args: {
    verifiedEmail?: string;
    verifiedPhone?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onSaved?: () => void;
};

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function CampaignAccountPanel({
  uid,
  ssoName,
  email,
  phone,
  verifiedEmail,
  verifiedPhone,
  customDisplayName,
  resolvedDisplayName,
  onSaveDisplayName,
  onSaveContact,
  onSaved,
}: CampaignAccountPanelProps) {
  const { t } = useTranslation("campaign.player");
  const fallbackName =
    resolvedDisplayName?.trim() ||
    resolvePlayerDisplayName({
      uid: uid ?? "guest",
      customName: customDisplayName,
      ssoName: ssoName ?? undefined,
    });
  const initialEmail = (verifiedEmail || email || "").trim();
  const initialPhone = (verifiedPhone || phone || "").trim();

  const [nickname, setNickname] = useState(fallbackName);
  const [emailValue, setEmailValue] = useState(initialEmail);
  const [phoneValue, setPhoneValue] = useState(initialPhone);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNickname(fallbackName);
  }, [fallbackName]);

  useEffect(() => {
    setEmailValue(initialEmail);
  }, [initialEmail]);

  useEffect(() => {
    setPhoneValue(initialPhone);
  }, [initialPhone]);

  const errorMessage = (code?: string) => {
    switch (code) {
      case "invalid_name":
        return t("account.errors.invalidName");
      case "name_taken":
        return t("account.errors.nameTaken");
      case "cooldown":
        return t("account.errors.cooldown");
      case "invalid_email":
        return t("account.errors.invalidEmail");
      case "no_auth":
        return t("account.errors.noAuth");
      default:
        return t("account.errors.saveFailed");
    }
  };

  const handleSave = async () => {
    if (saving) return;
    setError(null);

    const nextName = nickname.trim();
    const nextEmail = emailValue.trim();
    const nextPhone = phoneValue.trim();

    if (!nextName) {
      setError(errorMessage("invalid_name"));
      return;
    }
    if (nextEmail && !looksLikeEmail(nextEmail)) {
      setError(errorMessage("invalid_email"));
      return;
    }

    const nameDirty = nextName !== fallbackName;
    const emailDirty = nextEmail !== initialEmail;
    const phoneDirty = nextPhone !== initialPhone;
    if (!nameDirty && !emailDirty && !phoneDirty) {
      onSaved?.();
      return;
    }

    setSaving(true);
    try {
      if (nameDirty) {
        if (!onSaveDisplayName) {
          setError(errorMessage("no_auth"));
          return;
        }
        const nameRes = await onSaveDisplayName(nextName);
        if (!nameRes.ok) {
          setError(errorMessage(nameRes.error));
          return;
        }
      }

      if ((emailDirty || phoneDirty) && onSaveContact) {
        const contactArgs: { verifiedEmail?: string; verifiedPhone?: string } = {};
        if (nextEmail) contactArgs.verifiedEmail = nextEmail;
        if (nextPhone) contactArgs.verifiedPhone = nextPhone;
        if (contactArgs.verifiedEmail || contactArgs.verifiedPhone) {
          const contactRes = await onSaveContact(contactArgs);
          if (!contactRes.ok) {
            setError(errorMessage(contactRes.error));
            return;
          }
        }
      }

      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  const canSave = Boolean(onSaveDisplayName || onSaveContact);

  return (
    <div className="portal-account-panel">
      <div className="portal-account-panel__list">
        <label className="portal-account-panel__row portal-account-panel__row--edit">
          <span>{t("account.nickname")}</span>
          <input
            type="text"
            value={nickname}
            maxLength={16}
            autoComplete="nickname"
            disabled={saving || !onSaveDisplayName}
            onChange={(e) => setNickname(e.target.value)}
          />
        </label>
        <label className="portal-account-panel__row portal-account-panel__row--edit">
          <span>{t("account.email")}</span>
          <input
            type="email"
            value={emailValue}
            autoComplete="email"
            disabled={saving || !onSaveContact}
            onChange={(e) => setEmailValue(e.target.value)}
            placeholder={t("account.emailPlaceholder")}
          />
        </label>
        <label className="portal-account-panel__row portal-account-panel__row--edit">
          <span>{t("account.phone")}</span>
          <input
            type="tel"
            value={phoneValue}
            autoComplete="tel"
            disabled={saving || !onSaveContact}
            onChange={(e) => setPhoneValue(e.target.value)}
            placeholder={t("account.phonePlaceholder")}
          />
        </label>
      </div>
      <p className="portal-account-panel__hint">{t("account.editHint")}</p>
      {error ? <p className="portal-account-panel__error">{error}</p> : null}
      <button
        type="button"
        className="portal-account-panel__save"
        disabled={saving || !canSave}
        onClick={() => void handleSave()}
      >
        {saving ? t("account.saving") : t("account.save")}
      </button>
    </div>
  );
}
