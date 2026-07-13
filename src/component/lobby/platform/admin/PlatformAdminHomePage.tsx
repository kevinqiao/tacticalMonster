import React, { useState } from "react";

import { PageProp } from "host/RenderApp";

import WebSignInForm from "../../shared/WebSignInForm";
import {
  platformAdminErrorMessage,
  platformAdminSuccessMessage,
} from "./platformAdminHelpers";
import PlatformAdminToolbar from "./PlatformAdminToolbar";
import PlatformPartnerTeamModal from "./PlatformPartnerTeamModal";
import PlatformStaffEditModal, { type PlatformStaffEditMember } from "./PlatformStaffEditModal";
import {
  useAllPartners,
  usePlatformAdminAuth,
  usePlatformAdminMutations,
  usePlatformOperatorAccess,
  usePlatformTeam,
} from "./usePlatformAdmin";

import "../../campaign/merchant/merchant.css";

const STAFF_ROLES = ["owner", "admin", "viewer"] as const;

const PlatformAdminHomePage: React.FC<PageProp> = ({ visible }) => {
  const { authed, user } = usePlatformAdminAuth();
  const access = usePlatformOperatorAccess();
  const isOperator = access?.isOperator === true;
  const partners = useAllPartners(isOperator);
  const team = usePlatformTeam(isOperator);
  const { createPartner, addPlatformStaff, updatePlatformStaffProfile, removePlatformStaff } =
    usePlatformAdminMutations();

  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [staffAccountId, setStaffAccountId] = useState("");
  const [staffName, setStaffName] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffRole, setStaffRole] = useState<(typeof STAFF_ROLES)[number]>("admin");
  const [note, setNote] = useState<string | null>(null);
  const [teamModalPartner, setTeamModalPartner] = useState<{ pid: number; name: string } | null>(
    null
  );
  const [editingMember, setEditingMember] = useState<PlatformStaffEditMember | null>(null);

  const canManageTeam = access?.role === "owner";

  if (visible === 0) return null;

  const onCreate = async () => {
    if (!authed || !isOperator) {
      setNote(platformAdminErrorMessage("platform_operator_required"));
      return;
    }
    try {
      const result = await createPartner({
        name: name.trim(),
        host: host.trim() || undefined,
      });
      setName("");
      setHost("");
      setNote(`${platformAdminSuccessMessage("partnerCreated")} PID ${result.pid}。请在「团队」中添加 owner。`);
    } catch (e) {
      setNote(platformAdminErrorMessage(e));
    }
  };

  const onAddStaff = async () => {
    if (!canManageTeam) return;
    try {
      await addPlatformStaff({
        accountId: staffAccountId.trim(),
        password: staffPassword,
        role: staffRole,
        name: staffName.trim() || undefined,
      });
      setStaffAccountId("");
      setStaffName("");
      setStaffPassword("");
      setNote("运营成员已添加。");
    } catch (e) {
      setNote(platformAdminErrorMessage(e));
    }
  };

  const onRemoveStaff = async (uid: string) => {
    if (!canManageTeam) return;
    try {
      await removePlatformStaff({ uid });
      setNote("运营成员已移除。");
    } catch (e) {
      setNote(platformAdminErrorMessage(e));
    }
  };

  return (
    <div className="merchant-page">
      <PlatformAdminToolbar />
      <h1>平台运营</h1>
      <p className="merchant-note">
        使用 <strong>admin / admin</strong> 登录（Web 账号 + <code>platform_staff</code> 权限）。
        Partner 日常配置请使用 <a href="/partner/admin">/partner/admin</a>。
      </p>

      {!authed ? (
        <WebSignInForm
          staffGate="platform"
          description="使用 admin / admin 登录；须为 platform_staff 成员。"
        />
      ) : access === undefined ? (
        <p className="merchant-note">加载中…</p>
      ) : !isOperator ? (
        <section className="merchant-card">
          <h2>无运营权限</h2>
          <p className="merchant-note">
            当前账号（<code>{user?.uid}</code>）不在 <code>platform_staff</code> 中。请用 admin / admin
            登录，或由 owner 添加成员。
          </p>
        </section>
      ) : (
        <>
          <section>
            <h2>创建 Partner</h2>
            <label className="merchant-field">
              名称
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Games" />
            </label>
            <label className="merchant-field">
              Host（可选）
              <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="games.example.com" />
            </label>
            <button type="button" className="merchant-btn" onClick={() => void onCreate()}>
              创建 Partner
            </button>
            {note ? <p className="merchant-note">{note}</p> : null}
          </section>

          <section>
            <h2>全部 Partner</h2>
            {partners === undefined ? (
              <p className="merchant-note">加载中…</p>
            ) : partners.length === 0 ? (
              <p className="merchant-note">尚无 Partner，可在上方创建。</p>
            ) : (
              partners.map((p) => (
                <article key={p.pid} className="merchant-card">
                  <strong>{p.name}</strong>
                  <p className="merchant-note">
                    PID {p.pid}
                    {p.host ? ` · ${p.host}` : ""}
                  </p>
                  <nav className="merchant-nav">
                    <a href={`/partner/admin?partnerId=${p.pid}&section=profile`}>资料</a>
                    <a href={`/partner/admin?partnerId=${p.pid}&section=auth`}>登录渠道</a>
                    <button
                      type="button"
                      className="merchant-link-btn"
                      onClick={() => setTeamModalPartner({ pid: p.pid, name: p.name })}
                    >
                      团队
                    </button>
                  </nav>
                </article>
              ))
            )}
          </section>

          <section>
            <h2>运营团队</h2>
            {team === undefined ? (
              <p className="merchant-note">加载中…</p>
            ) : (
              <>
                {team.map((member) => (
                  <article key={member.uid} className="merchant-card">
                    <strong>{member.name || member.email || member.webAccountId || member.uid}</strong>
                    <p className="merchant-note">{member.role}</p>
                    {canManageTeam ? (
                      <nav className="merchant-nav">
                        <button
                          type="button"
                          className="merchant-link-btn"
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
                          编辑资料
                        </button>
                        {member.role !== "owner" ? (
                          <button
                            type="button"
                            className="merchant-btn"
                            onClick={() => void onRemoveStaff(member.uid)}
                          >
                            移除
                          </button>
                        ) : null}
                      </nav>
                    ) : null}
                  </article>
                ))}
                {canManageTeam ? (
                  <>
                    <label className="merchant-field">
                      accountId
                      <input
                        value={staffAccountId}
                        onChange={(e) => setStaffAccountId(e.target.value)}
                        autoComplete="username"
                        placeholder="admin"
                      />
                    </label>
                    <label className="merchant-field">
                      显示名
                      <input
                        value={staffName}
                        onChange={(e) => setStaffName(e.target.value)}
                        autoComplete="nickname"
                        placeholder="可选"
                      />
                    </label>
                    <label className="merchant-field">
                      密码
                      <input
                        type="password"
                        value={staffPassword}
                        onChange={(e) => setStaffPassword(e.target.value)}
                        autoComplete="new-password"
                      />
                    </label>
                    <label className="merchant-field">
                      角色
                      <select
                        value={staffRole}
                        onChange={(e) => setStaffRole(e.target.value as typeof staffRole)}
                      >
                        {STAFF_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button type="button" className="merchant-btn" onClick={() => void onAddStaff()}>
                      添加成员
                    </button>
                  </>
                ) : (
                  <p className="merchant-note">仅 owner 可管理运营团队。</p>
                )}
              </>
            )}
          </section>
        </>
      )}
      {editingMember ? (
        <PlatformStaffEditModal
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onSave={async ({ uid, name, role, password }) => {
            await updatePlatformStaffProfile({
              uid,
              name,
              role,
              password,
            });
            setNote("成员资料已更新。");
          }}
        />
      ) : null}
      {teamModalPartner ? (
        <PlatformPartnerTeamModal
          partnerId={teamModalPartner.pid}
          partnerName={teamModalPartner.name}
          onClose={() => setTeamModalPartner(null)}
        />
      ) : null}
    </div>
  );
};

export default PlatformAdminHomePage;
