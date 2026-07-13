import React, { useState } from "react";

import PartnerAdminFormModal from "../../partner/admin/PartnerAdminFormModal";
import { platformAdminErrorMessage } from "./platformAdminHelpers";

const STAFF_ROLES = ["owner", "admin", "viewer"] as const;

export type PlatformStaffEditMember = {
  uid: string;
  role: (typeof STAFF_ROLES)[number] | string;
  name?: string;
  email?: string;
  webAccountId?: string;
};

type Props = {
  member: PlatformStaffEditMember;
  onClose: () => void;
  onSave: (args: {
    uid: string;
    name: string;
    role: (typeof STAFF_ROLES)[number];
    password?: string;
  }) => Promise<void>;
};

const PlatformStaffEditModal: React.FC<Props> = ({ member, onClose, onSave }) => {
  const [displayName, setDisplayName] = useState(member.name ?? "");
  const [role, setRole] = useState<(typeof STAFF_ROLES)[number]>(
    (STAFF_ROLES.includes(member.role as (typeof STAFF_ROLES)[number])
      ? member.role
      : "viewer") as (typeof STAFF_ROLES)[number]
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
      setError(platformAdminErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PartnerAdminFormModal
      title="编辑成员资料"
      ariaLabel="编辑运营成员资料"
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
          onChange={(e) => setRole(e.target.value as (typeof STAFF_ROLES)[number])}
          disabled={busy}
        >
          {STAFF_ROLES.map((r) => (
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

export default PlatformStaffEditModal;
