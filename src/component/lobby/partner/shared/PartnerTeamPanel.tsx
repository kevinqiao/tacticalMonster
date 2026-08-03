import React, { useState } from "react";

import PartnerStaffEditModal, { type PartnerStaffEditMember } from "./PartnerStaffEditModal";

export type PartnerTeamMember = {
  uid: string;
  role: string;
  provider?: string;
  email?: string;
  name?: string;
  webAccountId?: string;
  hasWebUser?: boolean;
  createdAt: number;
};

export type PartnerTeamPanelLabels = {
  membersTitle: string;
  addTitle: string;
  addHint: string;
  accountIdLabel: string;
  nameLabel: string;
  passwordLabel: string;
  roleLabel: string;
  addButton: string;
  removeButton: string;
  editButton: string;
  loading: string;
  empty: string;
  webAccount: string;
  noWebUser: string;
};

const DEFAULT_LABELS: PartnerTeamPanelLabels = {
  membersTitle: "Members",
  addTitle: "Add member",
  addHint: "Login accountId (user.accountId = auth_identities.subject) and password.",
  accountIdLabel: "Login accountId",
  nameLabel: "Display name",
  passwordLabel: "Password",
  roleLabel: "Role",
  addButton: "Add member",
  removeButton: "Remove",
  editButton: "Edit profile",
  loading: "Loading…",
  empty: "No team members yet.",
  webAccount: "Web account",
  noWebUser: "No Web user row",
};

type Props = {
  team: PartnerTeamMember[] | undefined;
  roleOptions: readonly string[];
  canManage: boolean;
  labels?: Partial<PartnerTeamPanelLabels>;
  onAdd: (accountId: string, password: string, role: string, name?: string) => Promise<void>;
  onRemove: (uid: string) => Promise<void>;
  onEdit?: (args: {
    uid: string;
    name: string;
    role: string;
    password?: string;
  }) => Promise<void>;
};

const PartnerTeamPanel: React.FC<Props> = ({
  team,
  roleOptions,
  canManage,
  labels: labelOverrides,
  onAdd,
  onRemove,
  onEdit,
}) => {
  const labels = { ...DEFAULT_LABELS, ...labelOverrides };
  const [accountId, setAccountId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(roleOptions[0] ?? "viewer");
  const [busy, setBusy] = useState(false);
  const [editingMember, setEditingMember] = useState<PartnerStaffEditMember | null>(null);

  const onAddClick = async () => {
    if (!canManage || !accountId.trim() || !password) return;
    setBusy(true);
    try {
      await onAdd(accountId.trim(), password, role, displayName.trim() || undefined);
      setAccountId("");
      setDisplayName("");
      setPassword("");
    } finally {
      setBusy(false);
    }
  };

  if (team === undefined) {
    return <p className="merchant-note">{labels.loading}</p>;
  }

  return (
    <>
      <section>
        <h2>{labels.membersTitle}</h2>
        {team.length === 0 ? (
          <p className="merchant-note">{labels.empty}</p>
        ) : (
          team.map((member) => (
            <article key={member.uid} className="merchant-card">
              <strong>{member.name || member.email || member.webAccountId || member.uid}</strong>
              <p className="merchant-note">
                {member.role}
                {member.provider ? ` · ${member.provider}` : ""}
              </p>
              {member.webAccountId ? (
                <p className="merchant-note">
                  {labels.webAccount}: <code>{member.webAccountId}</code>
                  {member.hasWebUser ? "" : ` (${labels.noWebUser})`}
                </p>
              ) : null}
              {canManage ? (
                <nav className="merchant-nav">
                  {onEdit ? (
                    <button
                      type="button"
                      className="merchant-link-btn"
                      disabled={busy}
                      onClick={() =>
                        setEditingMember({
                          uid: member.uid,
                          role: member.role,
                          name: member.name,
                          email: member.email,
                          webAccountId: member.webAccountId,
                        })
                      }
                    >
                      {labels.editButton}
                    </button>
                  ) : null}
                  {member.role !== "owner" ? (
                    <button
                      type="button"
                      className="merchant-btn"
                      disabled={busy}
                      onClick={() => void onRemove(member.uid)}
                    >
                      {labels.removeButton}
                    </button>
                  ) : null}
                </nav>
              ) : null}
            </article>
          ))
        )}
      </section>

      {canManage ? (
        <section>
          <h2>{labels.addTitle}</h2>
          <p className="merchant-note">{labels.addHint}</p>
          <label className="merchant-field">
            {labels.accountIdLabel}
            <input
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              disabled={busy}
              autoComplete="username"
            />
          </label>
          <label className="merchant-field">
            {labels.nameLabel}
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={busy}
              autoComplete="nickname"
              placeholder="可选"
            />
          </label>
          <label className="merchant-field">
            {labels.passwordLabel}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              autoComplete="new-password"
            />
          </label>
          <label className="merchant-field">
            {labels.roleLabel}
            <select value={role} onChange={(e) => setRole(e.target.value)} disabled={busy}>
              {roleOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="merchant-btn"
            disabled={busy || !accountId.trim() || !password}
            onClick={() => void onAddClick()}
          >
            {labels.addButton}
          </button>
        </section>
      ) : null}

      {editingMember && onEdit ? (
        <PartnerStaffEditModal
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onSave={async (args) => {
            await onEdit(args);
          }}
        />
      ) : null}
    </>
  );
};

export default PartnerTeamPanel;
