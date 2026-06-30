import React, { useEffect, useState } from "react";

import PartnerTeamPanel from "../../partner/shared/PartnerTeamPanel";
import {
  PARTNER_ROLE_OPTIONS,
  partnerAdminErrorMessage,
  partnerAdminSuccessMessage,
} from "../../partner/admin/partnerAdminHelpers";
import {
  usePartnerAdminMutations,
  usePartnerTeam,
} from "../../partner/admin/usePartnerAdmin";
import { platformAdminErrorMessage } from "./platformAdminHelpers";

import "../../campaign/merchant/merchant.css";

type Props = {
  partnerId: number;
  partnerName: string;
  onClose: () => void;
};

const PlatformPartnerTeamModal: React.FC<Props> = ({ partnerId, partnerName, onClose }) => {
  const team = usePartnerTeam(partnerId);
  const { addPartnerStaff, removePartnerStaff } = usePartnerAdminMutations();
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const mapError = (e: unknown) => {
    const zh = platformAdminErrorMessage(e);
    return zh === String((e as Error)?.message ?? e) ? partnerAdminErrorMessage(e) : zh;
  };

  return (
    <div className="merchant-form-modal" role="dialog" aria-modal="true">
      <div className="merchant-form-modal__panel">
        <header className="merchant-form-modal__head">
          <h2 className="merchant-form-modal__title">
            {partnerName} · 团队（PID {partnerId}）
          </h2>
          <button
            type="button"
            className="merchant-form-modal__close"
            aria-label="关闭"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="merchant-form-modal__body">
          <p className="merchant-note">
            成员关系在 <code>partner_staff</code>；身份在 <code>auth_identities</code>；Web
            登录账号在 <code>user</code>（可选）。
          </p>
          <PartnerTeamPanel
            team={team}
            roleOptions={PARTNER_ROLE_OPTIONS}
            canManage
            labels={{
              membersTitle: "成员",
              addTitle: "添加成员",
              addHint: "填写 accountId（如 admin）与密码；email 为可选项（仅邮箱登录时填写）。",
              accountIdLabel: "accountId",
              passwordLabel: "密码",
              roleLabel: "角色",
              addButton: "添加",
              removeButton: "移除",
              loading: "加载中…",
              empty: "尚无成员。",
              webAccount: "accountId（subject）",
              noWebUser: "无 user 行",
            }}
            onAdd={async (accountId, password, role) => {
              try {
                await addPartnerStaff({
                  partnerId,
                  accountId,
                  password,
                  role: role as (typeof PARTNER_ROLE_OPTIONS)[number],
                });
                setNote(partnerAdminSuccessMessage("memberAdded"));
              } catch (e) {
                setNote(mapError(e));
              }
            }}
            onRemove={async (uid) => {
              try {
                await removePartnerStaff({ partnerId, uid });
                setNote(partnerAdminSuccessMessage("memberRemoved"));
              } catch (e) {
                setNote(mapError(e));
              }
            }}
          />
        </div>

        {note ? (
          <footer className="merchant-form-modal__footer">
            <p className="merchant-form-modal__status merchant-note">{note}</p>
            <div className="merchant-form-modal__actions">
              <button type="button" className="merchant-btn" onClick={onClose}>
                关闭
              </button>
            </div>
          </footer>
        ) : null}
      </div>
    </div>
  );
};

export default PlatformPartnerTeamModal;
