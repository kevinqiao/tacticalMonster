const TIER_LABELS: Record<string, string> = {
  bronze: "青铜",
  silver: "白银",
  gold: "黄金",
  platinum: "铂金",
  diamond: "钻石",
};

export function casualLadderTierLabel(tierId: string): string {
  return TIER_LABELS[tierId] ?? tierId;
}
