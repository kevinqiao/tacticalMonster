import React, { useEffect, useState } from "react";

import {
  partnerAdminErrorMessage,
  partnerAdminSuccessMessage,
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
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!detail) return;
    setName(detail.name ?? "");
    setHost(detail.host ?? "");
    setAllowedOrigins((detail.data?.allowedOrigins ?? []).join("\n"));
    setDefaultLandingPath(detail.data?.defaultLandingPath ?? "");
    setLogoUrl(detail.data?.branding?.logoUrl ?? "");
    setPrimaryColor(detail.data?.branding?.primaryColor ?? "");
  }, [detail]);

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

  const caps = detail.capabilities;

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
        <legend>Product capabilities (platform-managed)</legend>
        <p className="merchant-note" style={{ marginTop: 0 }}>
          Portal / Campaign Ops are set in /platform/admin — not editable here.
        </p>
        <label style={{ display: "block", marginBottom: 6 }}>
          <input type="checkbox" checked={caps.portalGames === true} disabled readOnly /> portal
        </label>
        <label style={{ display: "block", marginBottom: 6 }}>
          <input type="checkbox" checked={caps.campaignOps === true} disabled readOnly /> campaign
        </label>
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
