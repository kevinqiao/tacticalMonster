import React, { useEffect, useState } from "react";

import { partnerAdminErrorMessage, partnerAdminSuccessMessage } from "./partnerAdminHelpers";
import {
  useAuthChannelCatalog,
  usePartnerAdminMutations,
  usePartnerDetail,
} from "./usePartnerAdmin";

const CONSUMER_CIDS = new Set([1, 2]);
const STAFF_CIDS = new Set([0]);

type PartnerAdminAuthChannelsPanelProps = {
  partnerId: number;
};

const PartnerAdminAuthChannelsPanel: React.FC<PartnerAdminAuthChannelsPanelProps> = ({
  partnerId,
}) => {
  const detail = usePartnerDetail(partnerId);
  const catalog = useAuthChannelCatalog();
  const { updatePartnerAuthChannels, updatePartnerStaffAuthChannels } = usePartnerAdminMutations();
  const [consumerSelected, setConsumerSelected] = useState<number[]>([1]);
  const [staffSelected, setStaffSelected] = useState<number[]>([0]);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!detail) return;
    setConsumerSelected(detail.authChannelIds?.length ? detail.authChannelIds : [1]);
    setStaffSelected(detail.staffAuthChannelIds ?? []);
  }, [detail]);

  const toggleConsumer = (cid: number) => {
    setConsumerSelected((prev) => {
      if (prev.includes(cid)) {
        const next = prev.filter((c) => c !== cid);
        return next.length === 0 ? prev : next;
      }
      return [...prev, cid].sort((a, b) => a - b);
    });
  };

  const toggleStaff = (cid: number) => {
    setStaffSelected((prev) => {
      if (prev.includes(cid)) return prev.filter((c) => c !== cid);
      return [...prev, cid].sort((a, b) => a - b);
    });
  };

  const onSave = async () => {
    try {
      await updatePartnerAuthChannels({ partnerId, authChannelIds: consumerSelected });
      await updatePartnerStaffAuthChannels({ partnerId, staffAuthChannelIds: staffSelected });
      setNote(partnerAdminSuccessMessage("authChannelsSaved"));
    } catch (e) {
      setNote(partnerAdminErrorMessage(e));
    }
  };

  if (catalog === undefined || detail === undefined) {
    return <p className="merchant-note">加载中…</p>;
  }
  if (detail === null) {
    return <p className="merchant-note">Partner not found or access denied.</p>;
  }

  const consumerCatalog = catalog.filter((row) => CONSUMER_CIDS.has(row.cid));
  const staffCatalog = catalog.filter((row) => STAFF_CIDS.has(row.cid));

  return (
    <>
      <p className="merchant-note">
        <code>auth_channels</code>：玩家 / SSO 弹层（Clerk、Embed）。
        <code>staff_auth_channels</code>：Platform / Partner 管理后台 Web 账号密码（cid=0）。
      </p>

      <fieldset className="merchant-field">
        <legend>Consumer — auth_channels</legend>
        {consumerCatalog.map((row) => (
          <label key={row.cid} style={{ display: "block", marginBottom: 6 }}>
            <input
              type="checkbox"
              checked={consumerSelected.includes(row.cid)}
              onChange={() => toggleConsumer(row.cid)}
            />{" "}
            cid {row.cid} · {row.provider}
          </label>
        ))}
      </fieldset>

      <fieldset className="merchant-field">
        <legend>Staff — staff_auth_channels</legend>
        {staffCatalog.map((row) => (
          <label key={row.cid} style={{ display: "block", marginBottom: 6 }}>
            <input
              type="checkbox"
              checked={staffSelected.includes(row.cid)}
              onChange={() => toggleStaff(row.cid)}
            />{" "}
            cid {row.cid} · {row.provider}
          </label>
        ))}
      </fieldset>

      <button type="button" className="merchant-btn" onClick={() => void onSave()}>
        Save channels
      </button>
      {note ? <p className="merchant-note">{note}</p> : null}
    </>
  );
};

export default PartnerAdminAuthChannelsPanel;
