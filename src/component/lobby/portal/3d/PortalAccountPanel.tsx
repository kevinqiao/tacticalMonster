import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { resolvePlayerDisplayName } from "@/convex/shared/displayName";

export type PortalAccountPanelProps = {
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
  onFeedback?: (message: string) => void;
  /** Called after a successful save (closes the account modal). */
  onSaved?: () => void;
};

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function PortalAccountPanel({
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
  onFeedback,
  onSaved,
}: PortalAccountPanelProps) {
  const { t } = useTranslation("portal.player");
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
        return t("lobby.accountMenu.errors.invalidName");
      case "name_taken":
        return t("lobby.accountMenu.errors.nameTaken");
      case "cooldown":
        return t("lobby.accountMenu.errors.cooldown");
      case "invalid_email":
        return t("lobby.accountMenu.errors.invalidEmail");
      case "noAuth":
        return t("lobby.accountMenu.errors.noAuth");
      default:
        return t("lobby.accountMenu.errors.saveFailed");
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
      onFeedback?.(t("lobby.accountMenu.saved"));
      onSaved?.();
      return;
    }

    setSaving(true);
    try {
      if (nameDirty && onSaveDisplayName) {
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

      onFeedback?.(t("lobby.accountMenu.saved"));
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="portal-account-panel">
      <div className="portal-account-panel__list">
        <label className="portal-account-panel__row portal-account-panel__row--edit">
          <span>{t("lobby.accountMenu.nickname")}</span>
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
          <span>{t("lobby.accountMenu.email")}</span>
          <input
            type="email"
            value={emailValue}
            autoComplete="email"
            disabled={saving || !onSaveContact}
            onChange={(e) => setEmailValue(e.target.value)}
            placeholder={t("lobby.accountMenu.emailPlaceholder")}
          />
        </label>
        <label className="portal-account-panel__row portal-account-panel__row--edit">
          <span>{t("lobby.accountMenu.phone")}</span>
          <input
            type="tel"
            value={phoneValue}
            autoComplete="tel"
            disabled={saving || !onSaveContact}
            onChange={(e) => setPhoneValue(e.target.value)}
            placeholder={t("lobby.accountMenu.phonePlaceholder")}
          />
        </label>
      </div>
      <p className="portal-account-panel__hint">{t("lobby.accountMenu.editHint")}</p>
      {error ? <p className="portal-account-panel__error">{error}</p> : null}
      <button
        type="button"
        className="portal-account-panel__save"
        disabled={saving || (!onSaveDisplayName && !onSaveContact)}
        onClick={() => void handleSave()}
      >
        {saving ? t("lobby.accountMenu.saving") : t("lobby.accountMenu.save")}
      </button>
    </div>
  );
}
