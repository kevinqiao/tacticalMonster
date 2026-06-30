import React, { useEffect, useState } from "react";

import {
  ENABLED_CONTEXT_OPTIONS,
  partnerAdminErrorMessage,
  partnerAdminSuccessMessage,
  type EnabledContext,
} from "./partnerAdminHelpers";
import { usePartnerAdminMutations, usePartnerDetail } from "./usePartnerAdmin";

type PartnerAdminProfilePanelProps = {
  partnerId: number;
};

const PartnerAdminProfilePanel: React.FC<PartnerAdminProfilePanelProps> = ({ partnerId }) => {
  const detail = usePartnerDetail(partnerId);
  const { updatePartnerProfile } = usePartnerAdminMutations();

  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [allowedOrigins, setAllowedOrigins] = useState("");
  const [defaultLandingPath, setDefaultLandingPath] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [enabledContexts, setEnabledContexts] = useState<EnabledContext[]>([]);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!detail) return;
    setName(detail.name ?? "");
    setHost(detail.host ?? "");
    setAllowedOrigins((detail.data?.allowedOrigins ?? []).join("\n"));
    setDefaultLandingPath(detail.data?.defaultLandingPath ?? "");
    setLogoUrl(detail.data?.branding?.logoUrl ?? "");
    setPrimaryColor(detail.data?.branding?.primaryColor ?? "");
    setEnabledContexts((detail.data?.enabledContexts ?? []) as EnabledContext[]);
  }, [detail]);

  const toggleContext = (ctx: EnabledContext) => {
    setEnabledContexts((prev) =>
      prev.includes(ctx) ? prev.filter((c) => c !== ctx) : [...prev, ctx]
    );
  };

  const onSave = async () => {
    try {
      await updatePartnerProfile({
        partnerId,
        name: name.trim(),
        host: host.trim() || undefined,
        allowedOrigins: allowedOrigins
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter(Boolean),
        enabledContexts,
        defaultLandingPath: defaultLandingPath.trim() || undefined,
        logoUrl: logoUrl.trim() || undefined,
        primaryColor: primaryColor.trim() || undefined,
      });
      setNote(partnerAdminSuccessMessage("profileSaved"));
    } catch (e) {
      setNote(partnerAdminErrorMessage(e));
    }
  };

  if (detail === undefined) {
    return <p className="merchant-note">加载中…</p>;
  }
  if (detail === null) {
    return <p className="merchant-note">Partner not found or access denied.</p>;
  }

  return (
    <>
      <label className="merchant-field">
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="merchant-field">
        Host
        <input value={host} onChange={(e) => setHost(e.target.value)} />
      </label>
      <label className="merchant-field">
        Allowed origins (one per line)
        <textarea
          value={allowedOrigins}
          onChange={(e) => setAllowedOrigins(e.target.value)}
          rows={4}
        />
      </label>
      <label className="merchant-field">
        Default landing path
        <input
          value={defaultLandingPath}
          onChange={(e) => setDefaultLandingPath(e.target.value)}
          placeholder="/casual/lobby"
        />
      </label>
      <fieldset className="merchant-field">
        <legend>Enabled contexts</legend>
        {ENABLED_CONTEXT_OPTIONS.map((ctx) => (
          <label key={ctx} style={{ display: "block", marginBottom: 6 }}>
            <input
              type="checkbox"
              checked={enabledContexts.includes(ctx)}
              onChange={() => toggleContext(ctx)}
            />{" "}
            {ctx}
          </label>
        ))}
      </fieldset>
      <label className="merchant-field">
        Logo URL
        <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
      </label>
      <label className="merchant-field">
        Primary color
        <input
          value={primaryColor}
          onChange={(e) => setPrimaryColor(e.target.value)}
          placeholder="#2563eb"
        />
      </label>
      <button type="button" className="merchant-btn" onClick={() => void onSave()}>
        Save profile
      </button>
      {note ? <p className="merchant-note">{note}</p> : null}
    </>
  );
};

export default PartnerAdminProfilePanel;
