import React, { useState } from "react";

import PartnerTeamPanel from "../shared/PartnerTeamPanel";
import PartnerAdminFormModal from "./PartnerAdminFormModal";
import {
  PARTNER_ROLE_OPTIONS,
  partnerAdminErrorMessage,
  partnerAdminSuccessMessage,
} from "./partnerAdminHelpers";
import PartnerTeamStoresBlock from "./PartnerTeamStoresBlock";
import { usePartnerAdminMutations, usePartnerTeam } from "./usePartnerAdmin";

type Props = {
  partnerId: number;
  partnerName: string;
  onClose: () => void;
  /** When true, show 门店 / 店员 under this team modal. */
  campaignOps?: boolean;
};

const PartnerAdminTeamModal: React.FC<Props> = ({
  partnerId,
  partnerName,
  onClose,
  campaignOps = false,
}) => {
  const team = usePartnerTeam(partnerId);
  const { addPartnerStaff, updatePartnerStaffProfile, removePartnerStaff } =
    usePartnerAdminMutations();
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
        Partner 成员在 <code>partner_staff</code>
        {campaignOps ? "；门店与店员用于核销范围（店员登录 /partner/operation）。" : "。"}
      </p>
      <PartnerTeamPanel
        team={team}
        roleOptions={PARTNER_ROLE_OPTIONS}
        canManage
        labels={{
          membersTitle: "成员",
          addTitle: "添加成员",
          addHint: "填写 accountId（如 admin）、可选显示名与密码；email 为可选项（仅邮箱登录时填写）。",
          accountIdLabel: "accountId",
          nameLabel: "显示名",
          passwordLabel: "密码",
          roleLabel: "角色",
          addButton: "添加",
          removeButton: "移除",
          editButton: "编辑资料",
          loading: "加载中…",
          empty: "尚无成员。",
          webAccount: "accountId（subject）",
          noWebUser: "无 user 行",
        }}
        onAdd={async (accountId, password, role, name) => {
          try {
            await addPartnerStaff({
              partnerId,
              accountId,
              password,
              role: role as (typeof PARTNER_ROLE_OPTIONS)[number],
              name,
            });
            setNote(partnerAdminSuccessMessage("memberAdded"));
          } catch (e) {
            setNote(partnerAdminErrorMessage(e));
            throw e;
          }
        }}
        onEdit={async ({ uid, name, role, password }) => {
          try {
            await updatePartnerStaffProfile({
              partnerId,
              uid,
              name,
              role: role as (typeof PARTNER_ROLE_OPTIONS)[number],
              password,
            });
            setNote(partnerAdminSuccessMessage("memberUpdated"));
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
      <PartnerTeamStoresBlock partnerId={partnerId} campaignOps={campaignOps} />
    </PartnerAdminFormModal>
  );
};

export default PartnerAdminTeamModal;
