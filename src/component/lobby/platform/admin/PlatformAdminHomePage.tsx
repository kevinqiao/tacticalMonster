import React, { useState } from "react";

import { PageProp } from "host/RenderApp";

import { useLogoutUnauthorizedSession } from "../../shared/useLogoutUnauthorizedSession";
import {
  capabilityBadges,
  platformAdminErrorMessage,
  platformAdminSuccessMessage,
} from "./platformAdminHelpers";
import PlatformAdminToolbar from "./PlatformAdminToolbar";
import PlatformPartnerBaseSettingsModal from "./PlatformPartnerBaseSettingsModal";
import PlatformPartnerPortalGamesModal from "./PlatformPartnerPortalGamesModal";
import PlatformPartnerShopModal from "./PlatformPartnerShopModal";
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
  const { authed } = usePlatformAdminAuth();
  const access = usePlatformOperatorAccess();
  const isOperator = access?.isOperator === true;
  const unauthorized = Boolean(authed && access !== undefined && !isOperator);
  useLogoutUnauthorizedSession(unauthorized);

  const partners = useAllPartners(isOperator);
  const team = usePlatformTeam(isOperator);
  const {
    createPartner,
    deletePartner,
    updatePartnerCapabilities,
    addPlatformStaff,
    updatePlatformStaffProfile,
    removePlatformStaff,
  } = usePlatformAdminMutations();
  const canManagePartners = access?.role === "owner" || access?.role === "admin";

  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [portalGames, setPortalGames] = useState(false);
  const [campaignOps, setCampaignOps] = useState(false);
  const [slug, setSlug] = useState("");
  const [staffAccountId, setStaffAccountId] = useState("");
  const [staffName, setStaffName] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffRole, setStaffRole] = useState<(typeof STAFF_ROLES)[number]>("admin");
  const [note, setNote] = useState<string | null>(null);
  const [teamModalPartner, setTeamModalPartner] = useState<{ pid: number; name: string } | null>(
    null
  );
  const [baseSettingsModalPartner, setBaseSettingsModalPartner] = useState<{
    pid: number;
    name: string;
  } | null>(null);
  const [portalModalPartner, setPortalModalPartner] = useState<{
    pid: number;
    name: string;
  } | null>(null);
  const [shopModalPartner, setShopModalPartner] = useState<{
    pid: number;
    name: string;
  } | null>(null);
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
        portalGames,
        campaignOps,
        slug: campaignOps ? slug.trim() || undefined : undefined,
      });
      setName("");
      setHost("");
      setPortalGames(false);
      setCampaignOps(false);
      setSlug("");
      setNote(`${platformAdminSuccessMessage("partnerCreated")} PID ${result.pid}。请在「团队」中添加 owner。`);
    } catch (e) {
      setNote(platformAdminErrorMessage(e));
    }
  };

  const onDeletePartner = async (p: { pid: number; name: string }) => {
    if (!canManagePartners) {
      setNote(platformAdminErrorMessage("forbidden"));
      return;
    }
    const ok = window.confirm(
      `确认删除 Partner「${p.name}」(PID ${p.pid})？\n将同时移除其 partner_staff 成员关系，此操作不可恢复。`
    );
    if (!ok) return;
    try {
      await deletePartner({ pid: p.pid });
      if (teamModalPartner?.pid === p.pid) setTeamModalPartner(null);
      if (portalModalPartner?.pid === p.pid) setPortalModalPartner(null);
      setNote(`${platformAdminSuccessMessage("partnerDeleted")} PID ${p.pid}。`);
    } catch (e) {
      setNote(platformAdminErrorMessage(e));
    }
  };

  const onToggleCampaignOps = async (p: {
    pid: number;
    name: string;
    slug?: string;
    capabilities?: { portalGames?: boolean; campaignOps?: boolean } | null;
  }) => {
    if (!canManagePartners) {
      setNote(platformAdminErrorMessage("forbidden"));
      return;
    }
    const enabling = !p.capabilities?.campaignOps;
    let nextSlug = p.slug?.trim() ?? "";
    if (enabling && !nextSlug) {
      const entered = window.prompt(
        `为「${p.name}」开启 campaignOps，请输入 public slug（/cc/{slug}）：`,
        p.name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 32) || "partner"
      );
      if (entered == null) return;
      nextSlug = entered.trim();
      if (!nextSlug) {
        setNote("slug 不能为空。");
        return;
      }
    }
    try {
      await updatePartnerCapabilities({
        partnerId: p.pid,
        portalGames: p.capabilities?.portalGames === true,
        campaignOps: enabling,
        ...(enabling ? { slug: nextSlug } : {}),
      });
      setNote(
        enabling
          ? `${platformAdminSuccessMessage("capabilitiesSaved")} 已开启 campaignOps（slug=${nextSlug}）。`
          : `${platformAdminSuccessMessage("capabilitiesSaved")} 已关闭 campaignOps。`
      );
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

  // Unauthenticated / re-auth: SSO overlay (askAuth after logout). No inline form.
  if (!authed || unauthorized || (authed && access === undefined)) {
    return (
      <div className="merchant-page">
        <PlatformAdminToolbar />
        <h1>平台运营</h1>
        <p className="merchant-note">
          {unauthorized
            ? "当前账号无运营权限，正在退出并打开登录…"
            : !authed
              ? "请通过登录窗口使用 platform_staff 账号登录（如 admin / admin）。"
              : "加载中…"}
        </p>
      </div>
    );
  }

  return (
    <div className="merchant-page">
      <PlatformAdminToolbar />
      <h1>平台运营</h1>
      <p className="merchant-note">
        使用 <strong>admin / admin</strong> 登录（Web 账号 + <code>platform_staff</code> 权限）。
        Partner 日常配置（资料、登录配置等）请使用 <a href="/partner/admin">/partner/admin</a>。
        Portal 游戏激活权由平台在此管理。
      </p>

      <>
          <section>
            <h2>创建 Partner</h2>
            {canManagePartners ? (
              <>
                <label className="merchant-field">
                  名称
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Games" />
                </label>
                <label className="merchant-field">
                  Host（可选）
                  <input
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="games.example.com"
                  />
                </label>
                <fieldset className="merchant-field merchant-field--radio">
                  <legend>能力</legend>
                  <label className="merchant-radio">
                    <input
                      type="checkbox"
                      checked={portalGames}
                      onChange={(e) => setPortalGames(e.target.checked)}
                    />
                    portalGames（Portal 游戏）
                  </label>
                  <label className="merchant-radio">
                    <input
                      type="checkbox"
                      checked={campaignOps}
                      onChange={(e) => setCampaignOps(e.target.checked)}
                    />
                    campaignOps（活动 / 券 / 门店）
                  </label>
                </fieldset>
                {campaignOps ? (
                  <label className="merchant-field">
                    Campaign slug（公开路径 /cc/{"{slug}"}）
                    <input
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="acme"
                    />
                  </label>
                ) : null}
                <button type="button" className="merchant-btn" onClick={() => void onCreate()}>
                  创建 Partner
                </button>
              </>
            ) : (
              <p className="merchant-note">仅 owner / admin 可创建或删除 Partner。</p>
            )}
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
                    {p.slug ? ` · /cc/${p.slug}` : ""}
                    {" · "}
                    {capabilityBadges(p.capabilities)}
                  </p>
                  <nav className="merchant-nav">
                    <a href={`/partner/admin?partnerId=${p.pid}&section=profile`}>资料</a>
                    <a href={`/partner/admin?partnerId=${p.pid}&section=auth`}>登录配置</a>
                    <button
                      type="button"
                      className="merchant-link-btn"
                      onClick={() => setTeamModalPartner({ pid: p.pid, name: p.name })}
                    >
                      团队
                    </button>
                    {p.capabilities?.portalGames || canManagePartners ? (
                      <>
                        <button
                          type="button"
                          className="merchant-link-btn"
                          onClick={() =>
                            setBaseSettingsModalPartner({ pid: p.pid, name: p.name })
                          }
                        >
                          基础设置
                        </button>
                        <button
                          type="button"
                          className="merchant-link-btn"
                          onClick={() => setPortalModalPartner({ pid: p.pid, name: p.name })}
                        >
                          Game Lobby
                        </button>
                        <button
                          type="button"
                          className="merchant-link-btn"
                          onClick={() => setShopModalPartner({ pid: p.pid, name: p.name })}
                        >
                          商店
                        </button>
                      </>
                    ) : null}
                    {canManagePartners ? (
                      <button
                        type="button"
                        className="merchant-link-btn"
                        onClick={() => void onToggleCampaignOps(p)}
                      >
                        {p.capabilities?.campaignOps ? "关闭 campaignOps" : "开启 campaignOps"}
                      </button>
                    ) : null}
                    {canManagePartners && Number(p.pid) !== 0 ? (
                      <button
                        type="button"
                        className="merchant-btn"
                        onClick={() => void onDeletePartner(p)}
                      >
                        删除
                      </button>
                    ) : null}
                    {Number(p.pid) === 0 ? (
                      <span className="merchant-note">系统默认（不可删除）</span>
                    ) : null}
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
      {baseSettingsModalPartner ? (
        <PlatformPartnerBaseSettingsModal
          partnerId={baseSettingsModalPartner.pid}
          partnerName={baseSettingsModalPartner.name}
          canEdit={canManagePartners}
          onClose={() => setBaseSettingsModalPartner(null)}
        />
      ) : null}
      {portalModalPartner ? (
        <PlatformPartnerPortalGamesModal
          partnerId={portalModalPartner.pid}
          partnerName={portalModalPartner.name}
          canEdit={canManagePartners}
          onClose={() => setPortalModalPartner(null)}
        />
      ) : null}
      {shopModalPartner ? (
        <PlatformPartnerShopModal
          partnerId={shopModalPartner.pid}
          partnerName={shopModalPartner.name}
          canEdit={canManagePartners}
          onClose={() => setShopModalPartner(null)}
        />
      ) : null}
    </div>
  );
};

export default PlatformAdminHomePage;
