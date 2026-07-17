import React, { useState } from "react";
import { ConvexProvider, useMutation, useQuery } from "convex/react";

import { api } from "@/convex/sso/convex/_generated/api";
import { ssoConvexClient } from "host/service/AppProviders";
import {
  campaignAdminErrorMessage,
  campaignSuccessMessage,
} from "../../campaign/shared/campaignErrorMessage";
import { usePartnerAdminAuth } from "./usePartnerAdmin";

type Props = {
  partnerId: number;
  embedded?: boolean;
  onManageStoreTeam?: (store: { storeId: string; name: string }) => void;
};

/**
 * Partner-scoped stores (门店) — redeem locations bound to partnerId.
 * APIs live on SSO Convex; must not run under MerchantCampaignProvider's Campaign client.
 */
const PartnerStoresBody: React.FC<Props> = ({
  partnerId,
  embedded,
  onManageStoreTeam,
}) => {
  const { authed } = usePartnerAdminAuth();
  const stores = useQuery(
    api.service.partner.storeAdmin.listStoresForPartner,
    authed && partnerId ? { partnerId } : "skip"
  );
  const createStoreMut = useMutation(api.service.partner.storeAdmin.createStore);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [note, setNote] = useState<string | null>(null);

  const createStore = async () => {
    if (!authed) return;
    try {
      await createStoreMut({
        partnerId,
        name: name.trim(),
        slug: slug.trim(),
      });
      setName("");
      setSlug("");
      setNote(campaignSuccessMessage("merchantCreated"));
    } catch (e) {
      setNote(campaignAdminErrorMessage(e));
    }
  };

  const loading = stores === undefined;

  return (
    <div className={embedded ? undefined : "merchant-page"}>
      {!embedded ? <h2>门店</h2> : null}
      <p className="merchant-note">
        门店绑定本 Partner（PID {partnerId}），用于核销范围与店员账号。可在此管理各店员工；店员登录{" "}
        <a href="/partner/operation">/partner/operation</a> 核销。
      </p>

      <section>
        <h3>门店列表</h3>
        {loading ? <p className="merchant-note">加载中…</p> : null}
        {!loading && (stores?.length ?? 0) === 0 ? (
          <p className="merchant-note">暂无门店，可在下方创建。</p>
        ) : null}
        {(stores ?? []).map((s) => (
          <article key={s.storeId} className="merchant-card">
            <strong>{s.name}</strong>
            <p className="merchant-note">/{s.slug}</p>
            {onManageStoreTeam ? (
              <div className="merchant-nav">
                <button
                  type="button"
                  className="merchant-btn"
                  onClick={() =>
                    onManageStoreTeam({ storeId: s.storeId, name: s.name })
                  }
                >
                  管理员工
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </section>

      <section>
        <h3>创建门店</h3>
        <label className="merchant-field">
          slug
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="store-downtown"
          />
        </label>
        <label className="merchant-field">
          名称
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Downtown Store"
          />
        </label>
        <button type="button" className="merchant-btn" onClick={() => void createStore()}>
          创建门店
        </button>
        {note ? <p className="merchant-note">{note}</p> : null}
      </section>
    </div>
  );
};

export const PartnerStoresInner: React.FC<Props> = (props) => (
  <ConvexProvider client={ssoConvexClient}>
    <PartnerStoresBody {...props} />
  </ConvexProvider>
);

export default PartnerStoresInner;
