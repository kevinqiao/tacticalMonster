import React, { useCallback, useEffect, useState } from "react";

import { partnerAdminErrorMessage } from "./partnerAdminHelpers";
import { usePartnerAdminMutations } from "./usePartnerAdmin";

type Voucher = {
  itemId: string;
  uid: string;
  title: string;
  rewardText: string;
  code: string;
  useRequestedAt: number | null;
  expiresAt: number | null;
};

type Props = { partnerId: number };

const PartnerAdminRedeemPanel: React.FC<Props> = ({ partnerId }) => {
  const {
    listPartnerVouchers,
    confirmPartnerVoucherUse,
    rejectPartnerVoucherUse,
    redeemPartnerVoucher,
    voidPartnerVoucher,
  } = usePartnerAdminMutations();
  const [items, setItems] = useState<Voucher[] | null>(null);
  const [code, setCode] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const result = await listPartnerVouchers({ partnerId });
      if (result.ok !== true) throw new Error(typeof result.error === "string" ? result.error : "load_failed");
      setItems(Array.isArray(result.items) ? result.items as Voucher[] : []);
    } catch (error) {
      setNote(partnerAdminErrorMessage(error));
      setItems([]);
    }
  }, [listPartnerVouchers, partnerId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = async (operation: () => Promise<Record<string, unknown>>) => {
    setBusy(true);
    setNote(null);
    try {
      const result = await operation();
      if (result.ok !== true) throw new Error(typeof result.error === "string" ? result.error : "redeem_failed");
      setNote("操作成功。");
      await refresh();
    } catch (error) {
      setNote(partnerAdminErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section>
        <h3 className="merchant-section-title" style={{ marginTop: 0 }}>
          输码核销
        </h3>
        <p className="merchant-note">输入玩家兑换券码，可直接核销已申请或未申请使用的兑换券。</p>
        <div className="merchant-inline-actions">
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="PV-..."
            aria-label="兑换券码"
          />
          <button
            type="button"
            className="merchant-btn"
            disabled={busy || !code.trim()}
            onClick={() =>
              void run(async () => await redeemPartnerVoucher({ partnerId, code: code.trim() }))
            }
          >
            核销
          </button>
        </div>
      </section>

      <section>
        <h3 className="merchant-section-title">使用申请</h3>
        {items === null ? <p className="merchant-note">加载中…</p> : null}
        {items?.length === 0 ? <p className="merchant-note">暂无待确认的使用申请。</p> : null}
        {items?.map((item) => (
          <article key={item.itemId} className="merchant-card">
            <strong>{item.title}</strong>
            <p className="merchant-note">
              {item.rewardText ? `${item.rewardText} · ` : ""}码：<code>{item.code}</code>
              {item.useRequestedAt ? ` · 申请于 ${new Date(item.useRequestedAt).toLocaleString()}` : ""}
            </p>
            <div className="merchant-inline-actions">
              <button
                type="button"
                className="merchant-btn"
                disabled={busy}
                onClick={() =>
                  void run(async () => await confirmPartnerVoucherUse({ partnerId, itemId: item.itemId }))
                }
              >
                确认使用
              </button>
              <button
                type="button"
                className="merchant-link-btn"
                disabled={busy}
                onClick={() =>
                  void run(async () => await rejectPartnerVoucherUse({ partnerId, itemId: item.itemId }))
                }
              >
                拒绝
              </button>
              <button
                type="button"
                className="merchant-link-btn"
                disabled={busy}
                onClick={() => void run(async () => await voidPartnerVoucher({ partnerId, itemId: item.itemId }))}
              >
                作废
              </button>
            </div>
          </article>
        ))}
      </section>
      {note ? <p className="merchant-note">{note}</p> : null}
    </>
  );
};

export default PartnerAdminRedeemPanel;
