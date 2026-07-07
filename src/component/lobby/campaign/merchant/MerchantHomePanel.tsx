import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  campaignAdminErrorMessage,
  campaignSuccessMessage,
} from "../shared/campaignErrorMessage";
import { useMerchantCampaignClient } from "../service/useMerchantCampaignManager";
import { MerchantNavLink } from "./MerchantEmbeddedNavContext";
import MerchantWebSignInForm from "./MerchantWebSignInForm";
import { useMerchantAdminAuth } from "./useMerchantAdminAuth";
const MerchantHomePanel: React.FC = () => {
  const { t } = useTranslation("campaign.merchant");
  const { authed } = useMerchantAdminAuth();
  const { http, fns } = useMerchantCampaignClient();
  const [merchants, setMerchants] = useState<
    Array<{ merchantId: string; slug: string; name: string; role: string }>
  >([]);
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!http || !authed) {
      setMerchants([]);
      return;
    }
    const rows = (await http.query(fns.listMyMerchants, {})) as typeof merchants;
    setMerchants(rows ?? []);
  }, [http, authed, fns.listMyMerchants]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createMerchant = async () => {
    if (!http || !authed) return;
    try {
      await http.mutation(fns.createMerchant, { slug, name });
      setSlug("");
      setName("");
      setNote(campaignSuccessMessage("merchantCreated"));
      await refresh();
    } catch (e) {
      setNote(campaignAdminErrorMessage(e));
    }
  };

  if (!authed) {
    return <MerchantWebSignInForm />;
  }

  return (
    <>
      {merchants.length > 0 ? (
        <section className="merchant-onboarding">
          <h2>{t("home.gettingStarted")}</h2>
          <p className="merchant-note">{t("home.gettingStartedSteps")}</p>
        </section>
      ) : null}
      <h2>{t("home.myMerchants")}</h2>
      <section>
            {merchants.map((m) => (
              <article key={m.merchantId} className="merchant-card">
                <strong>{m.name}</strong>
                <p className="merchant-note">
                  /{m.slug} · {m.role}
                </p>
                <p className="merchant-note">
                  {t("home.homepageLink")}:{" "}
                  <a href={`/campaign/${m.slug}`} target="_blank" rel="noopener noreferrer">
                    /campaign/{m.slug}
                  </a>
                </p>
                <nav className="merchant-nav">
                  <MerchantNavLink
                    route={{ view: "campaigns", merchantId: m.merchantId, merchantName: m.name }}
                  >
                    {t("nav.campaigns")}
                  </MerchantNavLink>
                  <MerchantNavLink
                    route={{ view: "coupon-defs", merchantId: m.merchantId, merchantName: m.name }}
                  >
                    {t("nav.couponDefs")}
                  </MerchantNavLink>
                  <MerchantNavLink
                    route={{ view: "coupons", merchantId: m.merchantId, merchantName: m.name }}
                  >
                    {t("nav.coupons")}
                  </MerchantNavLink>
                  <MerchantNavLink
                    route={{ view: "redeem", merchantId: m.merchantId, merchantName: m.name }}
                  >
                    {t("nav.redeem")}
                  </MerchantNavLink>
                  <MerchantNavLink
                    route={{ view: "brand", merchantId: m.merchantId, merchantName: m.name }}
                  >
                    {t("nav.brand")}
                  </MerchantNavLink>
                  <MerchantNavLink
                    route={{ view: "team", merchantId: m.merchantId, merchantName: m.name }}
                  >
                    {t("nav.team")}
                  </MerchantNavLink>
                </nav>
              </article>
            ))}
          </section>

          <section>
            <h2>{t("home.createMerchant")}</h2>
            <label className="merchant-field">
              {t("home.slug")}
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder={t("home.slugPlaceholder")}
              />
            </label>
            <label className="merchant-field">
              {t("home.name")}
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("home.namePlaceholder")}
              />
            </label>
            <button type="button" className="merchant-btn" onClick={() => void createMerchant()}>
              {t("home.create")}
            </button>
            {note ? <p className="merchant-note">{note}</p> : null}
      </section>
    </>
  );
};

export default MerchantHomePanel;
