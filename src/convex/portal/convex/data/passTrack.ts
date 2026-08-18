/**
 * Portal Term Pass 节点：发 coin / ticket，不发周分、不发 Arena 卡。
 * 20 节点镜像 Town：多数 coin，8/16 ticket，4/20 称号。
 */

export type PassRewardKind = "coin" | "ticket" | "title";

export type PassNode = {
  node: number;
  xp: number;
  kind: PassRewardKind;
  amount: number;
  title?: string;
};

export const RPG_PASS_NODES: PassNode[] = Array.from({ length: 20 }, (_, index) => {
  const node = index + 1;
  const xp = node * 10;
  if (node === 4 || node === 20) {
    return { node, xp, kind: "title" as const, amount: 1, title: node === 4 ? "新秀" : "王者" };
  }
  if (node === 8 || node === 16) {
    return { node, xp, kind: "ticket" as const, amount: 1 };
  }
  return { node, xp, kind: "coin" as const, amount: 40 + node * 8 };
});

export const RPG_SHOP_SKUS = [
  { id: "ticket_x1", tickets: 1, coins: 100 },
  { id: "ticket_x5", tickets: 5, coins: 450 },
] as const;
