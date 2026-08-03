import React, { useState } from "react";
import { useQuery } from "convex/react";
import { useTranslation } from "react-i18next";

import { useMerchantCampaignClient } from "../service/useMerchantCampaignManager";
import { requestWalletPass, type WalletPassProviderId } from "./walletPassClient";

type Props = {
  couponId: string;
  className?: string;
  /** Defaults to apple. Google shows a coming-soon message. */
  provider?: WalletPassProviderId;
};

/**
 * Downloads a signed .pkpass when PassKit certs are configured on Campaign Convex.
 * Google Wallet is intentionally not offered yet (stub → coming-soon note).
 */
export const AddToAppleWalletButton: React.FC<Props> = ({
  couponId,
  className,
  provider = "apple",
}) => {
  const { t } = useTranslation("campaign.player");
  const { http, authed, fns } = useMerchantCampaignClient();
  const availability = useQuery(fns.passkitAvailability, {});
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  if (provider === "google") {
    return (
      <div className={className}>
        <button
          type="button"
          className="campaign-coupons-sheet__use"
          onClick={() => setNote(t("myCoupons.googleWalletSoon"))}
        >
          Google Wallet
        </button>
        {note ? <p className="campaign-coupons-sheet__meta">{note}</p> : null}
      </div>
    );
  }

  if (availability === undefined) return null;
  if (!availability.appleConfigured) return null;

  return (
    <div className={className}>
      <button
        type="button"
        className="campaign-coupons-sheet__use"
        disabled={busy || !authed || !http}
        onClick={() => {
          if (!http || !authed) return;
          setBusy(true);
          setNote(null);
          void (async () => {
            try {
              const res = await requestWalletPass({
                provider: "apple",
                couponId,
                http,
                createAppleWalletPass: fns.createAppleWalletPass,
              });
              if (!res.ok) {
                setNote(
                  res.error === "passkit_not_configured"
                    ? t("myCoupons.walletUnavailable")
                    : t("myCoupons.walletPassFailed")
                );
                return;
              }
              window.location.href = res.downloadUrl;
            } catch {
              setNote(t("myCoupons.walletPassFailed"));
            } finally {
              setBusy(false);
            }
          })();
        }}
      >
        {busy ? t("myCoupons.walletAdding") : t("myCoupons.addToAppleWallet")}
      </button>
      {note ? <p className="campaign-coupons-sheet__meta">{note}</p> : null}
    </div>
  );
};

export default AddToAppleWalletButton;
