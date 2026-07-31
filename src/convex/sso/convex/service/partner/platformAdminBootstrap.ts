import { v } from "convex/values";

import { mutation } from "../../_generated/server";
import {
  PLATFORM_ADMIN_EMAIL,
} from "./platformAdminAccount";
import { getPlatformStaffRow } from "./platformStaff";
import { getPartnerStaffRow, getPartnerByPid, nextPartnerId } from "./partnerStaff";
import { dedupeAuthIdentitiesByUid } from "../../dao/authIdentityHelpers";
import { normalizeWebAccountId } from "../../utils/webIdentity";
import { provisionWebStaffAccount } from "./ensureStaffIdentity";
import {
  DEFAULT_PLAYER_AUTH,
  DEFAULT_STAFF_AUTH,
  playerAuthModeFromConsumerCids,
  playerAuthValidator,
  resolvePlayerAuth,
  resolveStaffAuth,
  sanitizePlayerAuth,
  staffAuthValidator,
  type PartnerAuthRow,
} from "../auth/partnerAuth";
import {
  validatePartnerSlug,
  type PartnerCapabilities,
} from "./partnerCapabilities";
import { readPartnerGames } from "./portalPartnerConfig";
import {
  assertValidStoreSlug,
  getStoreBySlug,
  getStoreStaffRow,
  newStoreId,
  normalizeStoreSlug,
} from "./storeStaff";

const DEV_BOOTSTRAP_SECRET = "dev-local-platform-bootstrap";

const platformStaffRoleValidator = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("viewer")
);

const partnerStaffRoleValidator = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("developer"),
  v.literal("viewer")
);

function assertBootstrapSecret(provided: string) {
  const secret = process.env.PLATFORM_BOOTSTRAP_SECRET?.trim() || DEV_BOOTSTRAP_SECRET;
  if (provided !== secret) {
    throw new Error("forbidden");
  }
}

/** Seed admin/admin: user + auth_identities + platform_staff for /platform/admin. */
export const bootstrapPlatformAdminAccount = mutation({
  args: {
    bootstrapSecret: v.string(),
    passwordHash: v.string(),
    email: v.optional(v.string()),
    platformUid: v.string(),
  },
  handler: async (ctx, args) => {
    assertBootstrapSecret(args.bootstrapSecret);

    const dedupe = await dedupeAuthIdentitiesByUid(ctx);

    const accountId = normalizeWebAccountId(args.email?.trim() || PLATFORM_ADMIN_EMAIL);
    const uid = args.platformUid.trim();
    if (!uid) throw new Error("uid_required");
    const contactEmail = accountId.includes("@") ? accountId : undefined;
    const now = Date.now();

    let userCreated = false;
    const existingUserByAccount = await ctx.db
      .query("user")
      .withIndex("by_accountId", (q) => q.eq("accountId", accountId))
      .unique();
    const existingUserByEmail = contactEmail
      ? await ctx.db
          .query("user")
          .withIndex("by_email", (q) => q.eq("email", contactEmail))
          .unique()
      : null;

    if (!existingUserByAccount && !existingUserByEmail) {
      await ctx.db.insert("user", {
        accountId,
        ...(contactEmail ? { email: contactEmail } : {}),
        passwordHash: args.passwordHash,
        name: "Platform Admin",
        createdAt: now,
        updatedAt: now,
      });
      userCreated = true;
    } else {
      const row = existingUserByAccount ?? existingUserByEmail!;
      await ctx.db.patch(row._id, {
        accountId,
        ...(contactEmail ? { email: contactEmail } : {}),
        passwordHash: args.passwordHash,
        updatedAt: now,
      });
    }

    let identityCreated = false;
    let identity = await ctx.db
      .query("auth_identities")
      .withIndex("by_partner_subject", (q) =>
        q.eq("partnerId", 0).eq("subject", accountId)
      )
      .unique();
    if (!identity) {
      identity = await ctx.db
        .query("auth_identities")
        .withIndex("by_uid", (q) => q.eq("uid", uid))
        .unique();
    }

    if (!identity) {
      await ctx.db.insert("auth_identities", {
        uid,
        provider: "web",
        subject: accountId,
        partnerId: 0,
        ...(contactEmail ? { email: contactEmail } : {}),
        name: "Platform Admin",
        cid: 0,
        lastUpdate: now,
        expire: now + 600_000,
        createdAt: now,
        updatedAt: now,
      });
      identityCreated = true;
    } else {
      await ctx.db.patch(identity._id, {
        uid,
        provider: "web",
        subject: accountId,
        partnerId: 0,
        ...(contactEmail ? { email: contactEmail } : {}),
        name: identity.name ?? "Platform Admin",
        cid: 0,
        lastUpdate: now,
        expire: now + 600_000,
        updatedAt: now,
      });
    }

    const existingStaff = await getPlatformStaffRow(ctx, uid);
    let staffCreated = false;
    if (!existingStaff) {
      await ctx.db.insert("platform_staff", {
        uid,
        role: "owner",
        createdAt: now,
      });
      staffCreated = true;
    }

    return {
      ok: true as const,
      accountId,
      uid,
      dedupe,
      userCreated,
      identityCreated,
      staffCreated,
      login: { username: accountId, password: "(see PLATFORM_ADMIN_PASSWORD or default admin)" },
    };
  },
});

export const bootstrapPlatformStaff = mutation({
  args: {
    bootstrapSecret: v.string(),
    uid: v.string(),
    role: v.optional(platformStaffRoleValidator),
  },
  handler: async (ctx, args) => {
    assertBootstrapSecret(args.bootstrapSecret);

    const uid = args.uid.trim();
    if (!uid) throw new Error("uid_required");

    const existing = await getPlatformStaffRow(ctx, uid);
    if (existing) {
      return { ok: true as const, uid, role: existing.role, created: false };
    }

    await ctx.db.insert("platform_staff", {
      uid,
      role: args.role ?? "owner",
      createdAt: Date.now(),
    });
    return { ok: true as const, uid, role: args.role ?? "owner", created: true };
  },
});

export const bootstrapDefaultPlatformAdmin = mutation({
  args: {
    bootstrapSecret: v.string(),
    platformUid: v.string(),
  },
  handler: async (ctx, { bootstrapSecret, platformUid }) => {
    assertBootstrapSecret(bootstrapSecret);
    const uid = platformUid.trim();
    const existing = await getPlatformStaffRow(ctx, uid);
    if (existing) {
      return { ok: true as const, uid, role: existing.role, created: false };
    }
    await ctx.db.insert("platform_staff", {
      uid,
      role: "owner",
      createdAt: Date.now(),
    });
    return { ok: true as const, uid, role: "owner" as const, created: true };
  },
});

/** Seed partner_staff web account for /partner/admin (e.g. kqiao/12345). */
export const bootstrapPartnerStaffAccount = mutation({
  args: {
    bootstrapSecret: v.string(),
    partnerId: v.number(),
    passwordHash: v.string(),
    accountId: v.optional(v.string()),
    platformUid: v.string(),
    role: v.optional(partnerStaffRoleValidator),
  },
  handler: async (ctx, args) => {
    assertBootstrapSecret(args.bootstrapSecret);

    const partner = await getPartnerByPid(ctx, args.partnerId);
    if (!partner) throw new Error("not_found");

    const loginAccountId = args.accountId?.trim() || "admin";
    const platformUid = args.platformUid.trim();
    if (!platformUid) throw new Error("uid_required");

    const uid = await provisionWebStaffAccount(
      ctx,
      loginAccountId,
      args.passwordHash,
      platformUid
    );

    const existingStaff = await getPartnerStaffRow(ctx, args.partnerId, uid);
    let staffCreated = false;
    if (!existingStaff) {
      await ctx.db.insert("partner_staff", {
        partnerId: args.partnerId,
        uid,
        role: args.role ?? "owner",
        createdAt: Date.now(),
      });
      staffCreated = true;
    }

    const accountId = normalizeWebAccountId(loginAccountId);
    return {
      ok: true as const,
      accountId,
      uid,
      partnerId: args.partnerId,
      staffCreated,
      login: { username: accountId, password: "(see script --password)" },
    };
  },
});

/**
 * Wipe SSO partner row + partner_staff for test relaunch (secret-gated).
 * Does not purge auth_identities / users / platform_staff. Never deletes pid=0.
 * Portal config must be wiped separately (operation wipe-partner script).
 */
export const wipeDevPartnerAccount = mutation({
  args: {
    bootstrapSecret: v.string(),
    partnerId: v.number(),
  },
  handler: async (ctx, args) => {
    assertBootstrapSecret(args.bootstrapSecret);
    const pid = Math.floor(args.partnerId);
    if (!Number.isFinite(pid) || pid < 0) throw new Error("invalid_partner");
    if (pid === 0) throw new Error("default_partner_protected");

    const partner = await getPartnerByPid(ctx, pid);
    if (!partner) {
      return { ok: true as const, partnerId: pid, removed: false, removedStaff: 0 };
    }

    const staffRows = await ctx.db
      .query("partner_staff")
      .withIndex("by_partner", (q) => q.eq("partnerId", pid))
      .collect();
    for (const row of staffRows) {
      await ctx.db.delete(row._id);
    }
    await ctx.db.delete(partner._id);
    return {
      ok: true as const,
      partnerId: pid,
      removed: true,
      removedStaff: staffRows.length,
    };
  },
});

/** Ensure default partner row (pid=0) playerAuth / staffAuth. */
export const bootstrapDefaultPartnerChannels = mutation({
  args: {
    bootstrapSecret: v.string(),
    playerAuth: v.optional(playerAuthValidator),
    staffAuth: v.optional(staffAuthValidator),
    /** @deprecated prefer playerAuth */
    authChannelIds: v.optional(v.array(v.number())),
  },
  handler: async (ctx, args) => {
    assertBootstrapSecret(args.bootstrapSecret);

    const playerAuth = args.playerAuth
      ? sanitizePlayerAuth(args.playerAuth)
      : args.authChannelIds?.length
        ? sanitizePlayerAuth({
            mode: playerAuthModeFromConsumerCids(args.authChannelIds),
          })
        : DEFAULT_PLAYER_AUTH;
    const staffAuth = args.staffAuth ?? DEFAULT_STAFF_AUTH;

    const existing = await ctx.db
      .query("partner")
      .withIndex("by_pid", (q) => q.eq("pid", 0))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { playerAuth, staffAuth });
      return {
        ok: true as const,
        pid: 0,
        created: false as const,
        playerAuth,
        staffAuth,
      };
    }

    const defaultCaps = { portalGames: true, campaignOps: true };
    await ctx.db.insert("partner", {
      pid: 0,
      name: "Default Partner",
      host: "https://default.com",
      playerAuth,
      staffAuth,
      capabilities: defaultCaps,
    });
    return {
      ok: true as const,
      pid: 0,
      created: true as const,
      playerAuth,
      staffAuth,
    };
  },
});

/**
 * Backfill `playerAuth` / `staffAuth`, move legacy `config` → `data`,
 * and clear deprecated auth_channels / staff_auth_channels / config.
 *
 * `npx convex run service/partner/platformAdminBootstrap:migrateLegacyPartnerAuthChannels '{"bootstrapSecret":"dev-local-platform-bootstrap"}' --prod`
 */
export const migrateLegacyPartnerAuthChannels = mutation({
  args: { bootstrapSecret: v.string() },
  handler: async (ctx, { bootstrapSecret }) => {
    assertBootstrapSecret(bootstrapSecret);
    const rows = await ctx.db.query("partner").collect();
    const migrated: Array<{
      pid: number;
      playerAuth: unknown;
      staffAuth: unknown;
      movedConfigToData: boolean;
      clearedLegacy: boolean;
    }> = [];

    for (const row of rows) {
      const legacy = row as typeof row &
        PartnerAuthRow & {
          auth_channels?: number[];
          staff_auth_channels?: number[];
          config?: unknown;
        };

      const runtimeBag =
        legacy.data && typeof legacy.data === "object"
          ? legacy.data
          : legacy.config && typeof legacy.config === "object"
            ? legacy.config
            : undefined;

      let playerAuth = resolvePlayerAuth({
        playerAuth: legacy.playerAuth,
        staffAuth: legacy.staffAuth,
        data: runtimeBag,
      });
      if (
        legacy.playerAuth === undefined &&
        Array.isArray(legacy.auth_channels) &&
        legacy.auth_channels.length > 0
      ) {
        playerAuth = sanitizePlayerAuth(
          {
            mode: playerAuthModeFromConsumerCids(legacy.auth_channels),
          },
          runtimeBag
        );
      }

      const staffAuth =
        legacy.staffAuth !== undefined
          ? resolveStaffAuth(legacy)
          : Array.isArray(legacy.staff_auth_channels) &&
              legacy.staff_auth_channels.length > 0
            ? DEFAULT_STAFF_AUTH
            : resolveStaffAuth(legacy);

      const movedConfigToData =
        !(legacy.data && typeof legacy.data === "object") &&
        !!(legacy.config && typeof legacy.config === "object");
      const clearedLegacy =
        legacy.auth_channels !== undefined ||
        legacy.staff_auth_channels !== undefined ||
        legacy.config !== undefined;

      if (
        legacy.playerAuth !== undefined &&
        legacy.staffAuth !== undefined &&
        !movedConfigToData &&
        !clearedLegacy
      ) {
        continue;
      }

      await ctx.db.patch(row._id, {
        playerAuth,
        staffAuth,
        ...(movedConfigToData ? { data: legacy.config } : {}),
        auth_channels: undefined,
        staff_auth_channels: undefined,
        config: undefined,
      });
      migrated.push({
        pid: row.pid,
        playerAuth,
        staffAuth,
        movedConfigToData,
        clearedLegacy,
      });
    }

    return { ok: true as const, migrated, scanned: rows.length };
  },
});

/**
 * Dev-only: ensure campaignOps partner (+ portal games / slug / brand sync).
 * Returns partnerId so Node scripts can compute the correct platformUid (MD5).
 */
export const ensureCampaignOpsDevPartner = mutation({
  args: {
    bootstrapSecret: v.string(),
    partnerId: v.optional(v.number()),
    partnerSlug: v.optional(v.string()),
    partnerName: v.optional(v.string()),
    /** @deprecated Ignored — games come from static catalog (full open). */
    games: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    assertBootstrapSecret(args.bootstrapSecret);

    const partnerSlug = validatePartnerSlug(
      args.partnerSlug ?? "demo-partner"
    );
    if (!partnerSlug) throw new Error("slug_required");
    const partnerName = (args.partnerName ?? "Demo Partner").trim() || "Demo Partner";
    const games = readPartnerGames();

    let created = false;
    let partner =
      args.partnerId !== undefined
        ? await getPartnerByPid(ctx, args.partnerId)
        : await ctx.db
            .query("partner")
            .withIndex("by_slug", (q) => q.eq("slug", partnerSlug))
            .unique();

    if (args.partnerId !== undefined && !partner) {
      throw new Error("not_found");
    }

    const capabilities: PartnerCapabilities = {
      portalGames: true,
      campaignOps: true,
    };

    if (!partner) {
      const slugConflict = await ctx.db
        .query("partner")
        .withIndex("by_slug", (q) => q.eq("slug", partnerSlug))
        .unique();
      if (slugConflict) throw new Error("slug_taken");

      const pid = await nextPartnerId(ctx);
      await ctx.db.insert("partner", {
        pid,
        name: partnerName,
        playerAuth: DEFAULT_PLAYER_AUTH,
        staffAuth: DEFAULT_STAFF_AUTH,
        capabilities,
        slug: partnerSlug,
      });
      partner = await getPartnerByPid(ctx, pid);
      created = true;
    }

    if (!partner) throw new Error("partner_create_failed");

    const slugConflict = await ctx.db
      .query("partner")
      .withIndex("by_slug", (q) => q.eq("slug", partnerSlug))
      .unique();
    if (slugConflict && slugConflict.pid !== partner.pid) {
      throw new Error("slug_taken");
    }

    const prevData = (partner.data ?? {}) as Record<string, unknown>;
    const { enabledContexts: _drop, ...dataRest } = prevData;
    await ctx.db.patch(partner._id, {
      name: partnerName,
      capabilities,
      slug: partnerSlug,
      data: dataRest,
    });

    // No Campaign brand sync — slug→partnerId resolves only via SSO `partner.slug`.

    return {
      ok: true as const,
      created,
      partnerId: partner.pid,
      partnerSlug,
      games,
    };
  },
});

/**
 * Dev-only: store + partner_staff + store_staff web login for an existing partner.
 * Call after ensureCampaignOpsDevPartner with platformUid = platformStaffUidForAccount(account).
 */
export const bootstrapCampaignOpsDevStoreStaff = mutation({
  args: {
    bootstrapSecret: v.string(),
    partnerId: v.number(),
    passwordHash: v.string(),
    platformUid: v.string(),
    storeSlug: v.optional(v.string()),
    storeName: v.optional(v.string()),
    accountId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertBootstrapSecret(args.bootstrapSecret);

    const partner = await getPartnerByPid(ctx, args.partnerId);
    if (!partner) throw new Error("not_found");

    const storeSlug = normalizeStoreSlug(args.storeSlug ?? "demo-cafe");
    assertValidStoreSlug(storeSlug);
    const storeName = (args.storeName ?? "Demo Cafe").trim() || "Demo Cafe";
    const loginAccountId = args.accountId?.trim() || "admin";
    const platformUid = args.platformUid.trim();
    if (!platformUid) throw new Error("uid_required");

    const created = {
      partnerStaff: false,
      store: false,
      storeStaff: false,
    };

    const uid = await provisionWebStaffAccount(
      ctx,
      loginAccountId,
      args.passwordHash,
      platformUid
    );

    const existingPartnerStaff = await getPartnerStaffRow(ctx, partner.pid, uid);
    if (!existingPartnerStaff) {
      await ctx.db.insert("partner_staff", {
        partnerId: partner.pid,
        uid,
        role: "owner",
        createdAt: Date.now(),
      });
      created.partnerStaff = true;
    }

    let store = await getStoreBySlug(ctx, storeSlug);
    if (store && store.partnerId !== partner.pid) {
      throw new Error("store_slug_taken");
    }
    if (!store) {
      const storeId = newStoreId();
      const now = Date.now();
      await ctx.db.insert("store", {
        storeId,
        partnerId: partner.pid,
        slug: storeSlug,
        name: storeName,
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
      store = await getStoreBySlug(ctx, storeSlug);
      created.store = true;
    } else {
      await ctx.db.patch(store._id, {
        name: storeName,
        status: "active",
        updatedAt: Date.now(),
      });
      store = await getStoreBySlug(ctx, storeSlug);
    }
    if (!store) throw new Error("store_create_failed");

    const existingStoreStaff = await getStoreStaffRow(ctx, store.storeId, uid);
    if (!existingStoreStaff) {
      await ctx.db.insert("store_staff", {
        storeId: store.storeId,
        uid,
        role: "owner",
        createdAt: Date.now(),
      });
      created.storeStaff = true;
    }

    const accountId = normalizeWebAccountId(loginAccountId);
    return {
      ok: true as const,
      created,
      partnerId: partner.pid,
      storeId: store.storeId,
      storeSlug,
      storeName,
      uid,
      accountId,
      login: {
        username: accountId,
        password: "(see script --password)",
        partnerAdminPath: "/partner/admin",
        storeOperationPath: "/partner/operation",
      },
    };
  },
});
