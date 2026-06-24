/**
 * Casual 大厅图标（SKIN_DESIGN §7）。
 * Town Tab（index 4）暂用 tactical 占位，本轮不单独产资产。
 */
import navIconPlaceholder from "../../tactical/control/footer/assets/nav-button-bg.png";
import lobbyCurrencyCoin from "./icons/currency/lobby_currency_coin.svg?url";
import lobbyCurrencyGem from "./icons/currency/lobby_currency_gem.svg?url";
import lobbyCurrencyVoucher from "./icons/currency/lobby_currency_voucher.svg?url";
import lobbyNavHistory from "./icons/nav/lobby_nav_history.svg?url";
import lobbyNavPlay from "./icons/nav/lobby_nav_play.svg?url";
import lobbyNavRewards from "./icons/nav/lobby_nav_rewards.svg?url";
import lobbyNavShop from "./icons/nav/lobby_nav_shop.svg?url";

/** 与 `CASUAL_FOOTER_NAV_URI` 顺序一致：商店 / 历史 / 游玩 / 奖励 / Town */
export const CASUAL_LOBBY_NAV_ICONS: readonly string[] = [
  lobbyNavShop,
  lobbyNavHistory,
  lobbyNavPlay,
  lobbyNavRewards,
  navIconPlaceholder,
];

export const CASUAL_LOBBY_CURRENCY_ICONS = {
  coin: lobbyCurrencyCoin,
  gem: lobbyCurrencyGem,
  voucher: lobbyCurrencyVoucher,
} as const;
