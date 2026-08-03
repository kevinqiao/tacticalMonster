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
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!detail) return;
    setName(detail.name ?? "");
  }, [detail]);

  const onSave = async () => {
    try {
      await updatePartnerProfile({
        partnerId,
        name: name.trim(),
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
      {detail.host ? (
        <p className="merchant-note">
          Official website: {detail.host}（在「品牌」中编辑并同步风格）
        </p>
      ) : (
        <p className="merchant-note">官网 URL 请在「品牌」中填写并同步风格。</p>
      )}
      <p className="merchant-note">
        产品能力（portalGames / campaignOps）由平台在「基础设置」中管理。
      </p>
      <button type="button" className="merchant-btn" onClick={() => void onSave()}>
        Save profile
      </button>
      {note ? <p className="merchant-note">{note}</p> : null}
    </>
  );
};

export default PartnerAdminProfilePanel;
