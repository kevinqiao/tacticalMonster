import React, { useCallback, useEffect, useState } from "react";

import { PORTAL_TOURNAMENT_DEFINITIONS } from "@/convex/portal/convex/data/portalTournamentConfigs";
import { defaultOfferingsForGames } from "@/convex/portal/convex/data/portalLobbyConfig";
import { portalLobbyPath } from "@/host/util/portalPathParse";

import { platformAdminErrorMessage } from "./platformAdminHelpers";

const LOBBY_ERROR_MAP: Record<string, string> = {
  lobby_slug_taken: "该 Lobby slug 已被占用。请先点「编辑」，或换一个未使用的 slug。",
  lobby_not_found: "Lobby 不存在或无权操作。",
  lobby_tournament_invalid: "Offerings 含无效赛事 ID。",
  lobby_slug_invalid: "Lobby slug 格式无效（小写字母、数字、连字符）。",
};

function lobbyAdminErrorMessage(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  for (const [code, zh] of Object.entries(LOBBY_ERROR_MAP)) {
    if (raw.includes(code)) return zh;
  }
  return platformAdminErrorMessage(error);
}
import {
  usePartnerPortalConfig,
  usePlatformAdminAuth,
  usePlatformAdminMutations,
} from "./usePlatformAdmin";

type LobbyQuotaScope = "mode" | "lobby" | "tournament";

type LobbyRow = {
  lobbyId: string;
  slug: string;
  title: string;
  isDefault: boolean;
  branding: {
    logoUrl: string;
    backgroundLandscapeUrl: string;
    backgroundPortraitUrl: string;
  };
  offerings: Array<{ tournamentId: string }>;
  soloCount: number;
  multiCount: number;
  /** Lobby overlay; null/undefined = inherit partner base. */
  quotaScope?: LobbyQuotaScope | null;
};

type Props = {
  partnerId: number;
  canEdit: boolean;
  partnerSlug: string;
};

/**
 * Admin: multi named lobbies via SSO → Portal bridge
 * (same pattern as shop settings — Platform Admin does not talk to Portal Convex directly).
 */
const PlatformPartnerLobbiesPanel: React.FC<Props> = ({
  partnerId,
  canEdit,
  partnerSlug,
}) => {
  const { authed } = usePlatformAdminAuth();
  const config = usePartnerPortalConfig(partnerId);
  const {
    listPlatformPartnerLobbies,
    upsertPlatformPartnerLobby,
    deletePlatformPartnerLobby,
  } = usePlatformAdminMutations();

  const [lobbies, setLobbies] = useState<LobbyRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [slug, setSlug] = useState("default");
  const [title, setTitle] = useState("Game Center");
  const [isDefault, setIsDefault] = useState(true);
  const [logoUrl, setLogoUrl] = useState("");
  const [bgLand, setBgLand] = useState("");
  const [bgPort, setBgPort] = useState("");
  const [selectedTournamentIds, setSelectedTournamentIds] = useState<string[]>([]);
  /** "" = inherit partner base quotaScope. */
  const [quotaScope, setQuotaScope] = useState<"" | LobbyQuotaScope>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setSlug("default");
    setTitle("Game Center");
    setIsDefault(true);
    setLogoUrl("");
    setBgLand("");
    setBgPort("");
    setQuotaScope("");
    const games = config?.games?.length ? config.games : ["solitaire"];
    setSelectedTournamentIds(
      defaultOfferingsForGames(games).map((o) => o.tournamentId)
    );
  }, [config?.games]);

  const reload = useCallback(async () => {
    if (!authed) return;
    setLoading(true);
    try {
      const result = (await listPlatformPartnerLobbies({ partnerId })) as {
        lobbies?: LobbyRow[];
      };
      setLobbies(result.lobbies ?? []);
      setNote(null);
    } catch (e) {
      setLobbies([]);
      setNote(lobbyAdminErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [authed, listPlatformPartnerLobbies, partnerId]);

  useEffect(() => {
    resetForm();
    void reload();
  }, [partnerId, resetForm, reload]);

  const toggleTournament = (id: string) => {
    setSelectedTournamentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const onSave = async () => {
    if (!canEdit) return;
    setSaving(true);
    setNote(null);
    try {
      const offerings = selectedTournamentIds.map((tournamentId, i) => ({
        tournamentId,
        sortOrder: i,
        enabled: true,
      }));
      const branding =
        logoUrl.trim() || bgLand.trim() || bgPort.trim()
          ? {
              ...(logoUrl.trim() ? { logoUrl: logoUrl.trim() } : {}),
              ...(bgLand.trim() ? { backgroundLandscapeUrl: bgLand.trim() } : {}),
              ...(bgPort.trim() ? { backgroundPortraitUrl: bgPort.trim() } : {}),
            }
          : undefined;
      await upsertPlatformPartnerLobby({
        partnerId,
        ...(editingId ? { lobbyId: editingId } : {}),
        slug,
        title,
        isDefault,
        enabled: true,
        branding,
        offerings,
        // Always send: "" → null clears lobby override; otherwise set mode/lobby/tournament.
        quotaScope: quotaScope === "" ? null : quotaScope,
      });
      setNote(editingId ? "Lobby 已更新" : "Lobby 已保存（同 slug 则更新）");
      resetForm();
      await reload();
    } catch (e) {
      setNote(lobbyAdminErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (row: LobbyRow) => {
    setEditingId(row.lobbyId);
    setSlug(row.slug);
    setTitle(row.title);
    setIsDefault(row.isDefault);
    setLogoUrl(row.branding?.logoUrl ?? "");
    setBgLand(row.branding?.backgroundLandscapeUrl ?? "");
    setBgPort(row.branding?.backgroundPortraitUrl ?? "");
    setSelectedTournamentIds(row.offerings.map((o) => o.tournamentId));
    setQuotaScope(
      row.quotaScope === "mode" ||
        row.quotaScope === "lobby" ||
        row.quotaScope === "tournament"
        ? row.quotaScope
        : ""
    );
  };

  const onDelete = async (lobbyId: string) => {
    if (!canEdit) return;
    try {
      await deletePlatformPartnerLobby({ partnerId, lobbyId });
      setNote("Lobby 已删除");
      if (editingId === lobbyId) resetForm();
      await reload();
    } catch (e) {
      setNote(lobbyAdminErrorMessage(e));
    }
  };

  const slugForUrl = partnerSlug.trim() || "partner";

  return (
    <section
      className="merchant-card"
      style={{
        marginTop: 0,
        marginBottom: 28,
        padding: 16,
        border: "1px solid rgba(255,255,255,0.18)",
        borderRadius: 10,
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <h3 style={{ margin: "0 0 8px", fontSize: 18 }}>Lobbies（多命名大厅）</h3>
      <p style={{ opacity: 0.75, fontSize: 13, marginBottom: 12 }}>
        主推入口：配置 offerings 后自动派生 <code>partner.games</code>。URL：
        <code>/gc/{"{partnerSlug}"}</code> 或{" "}
        <code>/gc/{"{partnerSlug}"}/{"{lobbySlug}"}</code>
        。未配置背景/logo 时使用平台默认图。
      </p>

      {loading ? (
        <p>加载 Lobby…</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {(lobbies ?? []).length === 0 ? (
            <li style={{ opacity: 0.7, marginBottom: 12 }}>
              尚无 Lobby。保存下方表单可创建默认大厅（或玩家首次进入时自动创建）。
            </li>
          ) : (
            (lobbies ?? []).map((row) => (
              <li
                key={row.lobbyId}
                style={{
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 8,
                }}
              >
                <div>
                  <strong>{row.title}</strong> <code>{row.slug}</code>
                  {row.isDefault ? " · default" : ""}
                  {" · "}
                  solo {row.soloCount} / multi {row.multiCount}
                  {" · "}
                  共享：
                  {row.quotaScope === "lobby"
                    ? "整个 Lobby"
                    : row.quotaScope === "tournament"
                      ? "每赛事"
                      : row.quotaScope === "mode"
                        ? "按模式"
                        : "继承 Partner"}
                </div>
                <div style={{ fontSize: 13, opacity: 0.8 }}>
                  {portalLobbyPath(slugForUrl, row.isDefault ? null : row.slug)}
                </div>
                {canEdit ? (
                  <div style={{ marginTop: 8, display: 8 }}>
                    <button type="button" className="merchant-btn" onClick={() => onEdit(row)}>
                      编辑
                    </button>
                    {!row.isDefault ? (
                      <button
                        type="button"
                        className="merchant-btn"
                        onClick={() => void onDelete(row.lobbyId)}
                      >
                        删除
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))
          )}
        </ul>
      )}

      {canEdit ? (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            border: "1px dashed rgba(255,255,255,0.25)",
            borderRadius: 8,
          }}
        >
          <h4 style={{ marginTop: 0 }}>
            {editingId ? "编辑 Lobby" : "新建 Lobby"}
          </h4>
          {!editingId ? (
            <p style={{ opacity: 0.7, fontSize: 12, marginTop: -4, marginBottom: 8 }}>
              已有大厅请点上方「编辑」。同 slug 保存会覆盖该大厅，不会新建。
            </p>
          ) : null}
          <label style={{ display: "block", marginBottom: 8 }}>
            Slug{" "}
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              disabled={!!editingId && isDefault}
            />
          </label>
          <label style={{ display: "block", marginBottom: 8 }}>
            Title{" "}
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label style={{ display: "block", marginBottom: 8 }}>
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
            />{" "}
            默认 Lobby
          </label>
          <label style={{ display: "block", marginBottom: 8 }}>
            入场次数共享范围{" "}
            <select
              value={quotaScope}
              onChange={(e) =>
                setQuotaScope(e.target.value as "" | LobbyQuotaScope)
              }
            >
              <option value="">继承 Partner 底配置</option>
              <option value="mode">按模式（单人/多人各一池）</option>
              <option value="lobby">整个 Lobby 共用一池</option>
              <option value="tournament">每个赛事独立</option>
            </select>
          </label>
          <p style={{ opacity: 0.7, fontSize: 12, marginTop: -4, marginBottom: 8 }}>
            覆盖 Partner「基础设置」里的共享范围；选「继承」则清除本 Lobby 覆盖。
          </p>
          <label style={{ display: "block", marginBottom: 8 }}>
            Logo URL{" "}
            <input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="空=默认"
              style={{ width: "100%" }}
            />
          </label>
          <label style={{ display: "block", marginBottom: 8 }}>
            BG landscape{" "}
            <input
              value={bgLand}
              onChange={(e) => setBgLand(e.target.value)}
              placeholder="空=默认"
              style={{ width: "100%" }}
            />
          </label>
          <label style={{ display: "block", marginBottom: 8 }}>
            BG portrait{" "}
            <input
              value={bgPort}
              onChange={(e) => setBgPort(e.target.value)}
              placeholder="空=默认"
              style={{ width: "100%" }}
            />
          </label>
          <div style={{ marginBottom: 8 }}>
            <strong>Tournaments</strong>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 4,
                marginTop: 6,
                maxHeight: 220,
                overflow: "auto",
              }}
            >
              {PORTAL_TOURNAMENT_DEFINITIONS.map((def) => (
                <label key={def.tournamentId} style={{ fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={selectedTournamentIds.includes(def.tournamentId)}
                    onChange={() => toggleTournament(def.tournamentId)}
                  />{" "}
                  {def.title}
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="merchant-btn merchant-btn--primary"
              disabled={saving}
              onClick={() => void onSave()}
            >
              {saving ? "保存中…" : "保存 Lobby"}
            </button>
            {editingId ? (
              <button type="button" className="merchant-btn" onClick={resetForm}>
                取消编辑
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {note ? (
        <p className="merchant-note" style={{ marginTop: 12 }} role="status">
          {note}
        </p>
      ) : null}
    </section>
  );
};

export default PlatformPartnerLobbiesPanel;
