import React, { useState } from "react";

import PartnerTeamPanel from "../shared/PartnerTeamPanel";
import PartnerAdminFormModal from "./PartnerAdminFormModal";
import {
  PARTNER_ROLE_OPTIONS,
  partnerAdminErrorMessage,
  partnerAdminSuccessMessage,
} from "./partnerAdminHelpers";
import { usePartnerAdminMutations, usePartnerTeam } from "./usePartnerAdmin";

type Props = {
  partnerId: number;
  partnerName: string;
  onClose: () => void;
};

const PartnerAdminTeamModal: React.FC<Props> = ({ partnerId, partnerName, onClose }) => {
  const team = usePartnerTeam(partnerId);
  const { addPartnerStaff, removePartnerStaff } = usePartnerAdminMutations();
  const [note, setNote] = useState<string | null>(null);

  return (
    <PartnerAdminFormModal
      title={`${partnerName} · 团队（PID ${partnerId}）`}
      ariaLabel="Partner 团队"
      onClose={onClose}
      footer={
        note ? (
          <>
            <p className="merchant-form-modal__status merchant-note">{note}</p>
            <div className="merchant-form-modal__actions">
              <button type="button" className="merchant-btn" onClick={onClose}>
                关闭
              </button>
            </div>
          </>
        ) : (
          <div className="merchant-form-modal__actions">
            <button type="button" className="merchant-btn" onClick={onClose}>
              关闭
            </button>
          </div>
        )
      }
    >
      <p className="merchant-note">
        成员关系在 <code>partner_staff</code>；身份在 <code>auth_identities</code>；Web 登录账号在{" "}
        <code>user</code>（可选）。
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
            setNote(partnerAdminErrorMessage(e));
            throw e;
          }
        }}
        onRemove={async (uid) => {
          try {
            await removePartnerStaff({ partnerId, uid });
            setNote(partnerAdminSuccessMessage("memberRemoved"));
          } catch (e) {
            setNote(partnerAdminErrorMessage(e));
            throw e;
          }
        }}
      />
    </PartnerAdminFormModal>
  );
};

export default PartnerAdminTeamModal;
