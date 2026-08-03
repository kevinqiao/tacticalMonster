import React, { useState } from "react";

import PartnerAdminFormModal from "../admin/PartnerAdminFormModal";
import {
  PARTNER_ROLE_OPTIONS,
  partnerAdminErrorMessage,
} from "../admin/partnerAdminHelpers";

export type PartnerStaffEditMember = {
  uid: string;
  role: string;
  name?: string;
  email?: string;
  webAccountId?: string;
};

type Props = {
  member: PartnerStaffEditMember;
  onClose: () => void;
  onSave: (args: {
    uid: string;
    name: string;
    role: (typeof PARTNER_ROLE_OPTIONS)[number];
    password?: string;
  }) => Promise<void>;
};

const PartnerStaffEditModal: React.FC<Props> = ({ member, onClose, onSave }) => {
  const [displayName, setDisplayName] = useState(member.name ?? "");
  const [role, setRole] = useState<(typeof PARTNER_ROLE_OPTIONS)[number]>(
    (PARTNER_ROLE_OPTIONS.includes(member.role as (typeof PARTNER_ROLE_OPTIONS)[number])
      ? member.role
      : "viewer") as (typeof PARTNER_ROLE_OPTIONS)[number]
  );
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSave({
        uid: member.uid,
        name: displayName.trim(),
        role,
        password: password.trim() || undefined,
      });
      onClose();
    } catch (e) {
      setError(partnerAdminErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PartnerAdminFormModal
      title="编辑成员资料"
      ariaLabel="编辑 Partner 成员资料"
      onClose={onClose}
      footer={
        <>
          {error ? <p className="merchant-form-modal__status merchant-note">{error}</p> : null}
          <div className="merchant-form-modal__actions">
            <button type="button" className="merchant-btn" disabled={busy} onClick={onClose}>
              取消
            </button>
            <button type="button" className="merchant-btn" disabled={busy} onClick={() => void onSubmit()}>
              保存
            </button>
          </div>
        </>
      }
    >
      <p className="merchant-note">
        UID <code>{member.uid}</code>
        {member.webAccountId ? (
          <>
            {" "}
            · accountId <code>{member.webAccountId}</code>
          </>
        ) : null}
      </p>
      <label className="merchant-field">
        显示名
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          disabled={busy}
          autoComplete="nickname"
          placeholder="显示名"
        />
      </label>
      <label className="merchant-field">
        角色
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as (typeof PARTNER_ROLE_OPTIONS)[number])}
          disabled={busy}
        >
          {PARTNER_ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      <label className="merchant-field">
        新密码（留空则不修改）
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={busy}
          autoComplete="new-password"
        />
      </label>
    </PartnerAdminFormModal>
  );
};

export default PartnerStaffEditModal;
