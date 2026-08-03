/** 奖励 Tab 本地预览：签到、邀请、广告等免费入口 */

export interface CasualFreeRewardsMockState {
  /** 连续签到天数（示意） */
  checkInStreak: number;
  checkInClaimedToday: boolean;
  inviteFriendsCount: number;
  inviteRewardTierClaimed: number;
  adsWatchedToday: number;
  adsDailyCap: number;
}

export function createInitialFreeRewardsMock(): CasualFreeRewardsMockState {
  return {
    checkInStreak: 5,
    checkInClaimedToday: false,
    inviteFriendsCount: 2,
    inviteRewardTierClaimed: 0,
    adsWatchedToday: 1,
    adsDailyCap: 5,
  };
}
