import {
  TcgBossDef,
  TcgBossTurnOp,
  TcgCardDef,
  TcgCatalog,
  TcgFightState,
  TcgFightStatus,
  TcgGreedySimResult,
  TcgMinion,
} from "../types/TcgTypes";
import { createSeededRandom, shuffleInPlace } from "../utils/seedRandom";

const HERO_MAX_HP = 30;
const MAX_MANA = 10;
const MAX_TURNS = 30;
const INITIAL_HAND = 3;

let nextInstanceId = 0;

function resetInstanceIds(): void {
  nextInstanceId = 0;
}

function newInstanceId(): string {
  nextInstanceId += 1;
  return `m${nextInstanceId}`;
}

function dealDamageToBoss(state: TcgFightState, amount: number): void {
  if (amount <= 0 || state.status !== TcgFightStatus.PLAYING) return;
  let remaining = amount;
  if (state.bossArmor > 0) {
    const absorbed = Math.min(state.bossArmor, remaining);
    state.bossArmor -= absorbed;
    remaining -= absorbed;
  }
  if (remaining > 0) {
    state.bossHp = Math.max(0, state.bossHp - remaining);
    state.damageDealtToBoss += remaining;
  }
  if (state.bossHp <= 0) {
    state.status = TcgFightStatus.PLAYER_WIN;
  }
}

function dealDamageToHero(state: TcgFightState, amount: number): void {
  if (amount <= 0 || state.status !== TcgFightStatus.PLAYING) return;
  let remaining = amount;
  if (state.heroArmor > 0) {
    const absorbed = Math.min(state.heroArmor, remaining);
    state.heroArmor -= absorbed;
    remaining -= absorbed;
  }
  if (remaining > 0) {
    state.heroHp = Math.max(0, state.heroHp - remaining);
  }
  if (state.heroHp <= 0) {
    state.status = TcgFightStatus.PLAYER_LOSS;
  }
}

function drawCards(state: TcgFightState, amount: number, rng: () => number): void {
  for (let i = 0; i < amount; i++) {
    if (state.deck.length === 0) {
      dealDamageToHero(state, 1);
      continue;
    }
    const idx = Math.floor(rng() * state.deck.length);
    const cardId = state.deck.splice(idx, 1)[0]!;
    state.hand.push(cardId);
  }
}

function applySpellEffect(
  state: TcgFightState,
  card: TcgCardDef,
  rng: () => number,
): void {
  const params = card.params ?? {};
  switch (card.effectId) {
    case "deal_damage": {
      const amount = Number(params.amount ?? 0);
      dealDamageToBoss(state, amount);
      break;
    }
    case "draw": {
      const amount = Number(params.amount ?? 1);
      drawCards(state, amount, rng);
      break;
    }
    case "gain_armor": {
      const amount = Number(params.amount ?? 0);
      state.heroArmor += amount;
      break;
    }
    case "heal_hero": {
      const amount = Number(params.amount ?? 0);
      state.heroHp = Math.min(state.heroMaxHp, state.heroHp + amount);
      break;
    }
    default:
      break;
  }
}

function playMinion(state: TcgFightState, card: TcgCardDef): void {
  const minion: TcgMinion = {
    instanceId: newInstanceId(),
    cardId: card.cardId,
    attack: card.attack ?? 0,
    health: card.health ?? 1,
    keywords: card.keywords ?? [],
    canAttack: false,
  };
  state.board.push(minion);
}

function playCardFromHand(
  state: TcgFightState,
  handIndex: number,
  catalog: TcgCatalog,
  rng: () => number,
): boolean {
  if (state.status !== TcgFightStatus.PLAYING) return false;
  const cardId = state.hand[handIndex];
  if (!cardId) return false;
  const card = catalog[cardId];
  if (!card || card.cost > state.mana) return false;

  state.mana -= card.cost;
  state.hand.splice(handIndex, 1);

  if (card.type === "minion") {
    playMinion(state, card);
  } else {
    applySpellEffect(state, card, rng);
  }
  return true;
}

function cardPlayPriority(card: TcgCardDef): number {
  if (card.type === "spell" && card.effectId === "deal_damage") {
    const amount = Number(card.params?.amount ?? 0);
    return 1000 + amount * 10 - card.cost;
  }
  if (card.type === "minion") {
    const atk = card.attack ?? 0;
    const hp = card.health ?? 0;
    return 500 + atk * 5 + hp * 2 - card.cost;
  }
  if (card.effectId === "gain_armor") {
    return 300 + Number(card.params?.amount ?? 0);
  }
  if (card.effectId === "draw") {
    return 200 + Number(card.params?.amount ?? 0);
  }
  if (card.effectId === "heal_hero") {
    return 100 + Number(card.params?.amount ?? 0);
  }
  return 0;
}

function greedyPlayPhase(
  state: TcgFightState,
  catalog: TcgCatalog,
  rng: () => number,
): void {
  let progressed = true;
  while (progressed && state.status === TcgFightStatus.PLAYING) {
    progressed = false;
    const playable = state.hand
      .map((cardId, index) => ({ cardId, index, card: catalog[cardId] }))
      .filter((entry) => entry.card && entry.card.cost <= state.mana)
      .sort(
        (a, b) =>
          cardPlayPriority(b.card!) - cardPlayPriority(a.card!),
      );

    if (playable.length === 0) break;

    const pick = playable[0]!;
    if (playCardFromHand(state, pick.index, catalog, rng)) {
      progressed = true;
    }
  }
}

function minionAttackPhase(state: TcgFightState): void {
  if (state.status !== TcgFightStatus.PLAYING) return;
  for (const minion of state.board) {
    if (!minion.canAttack || minion.attack <= 0) continue;
    dealDamageToBoss(state, minion.attack);
    minion.canAttack = false;
    if (state.status !== TcgFightStatus.PLAYING) break;
  }
}

function applyBossOp(state: TcgFightState, op: TcgBossTurnOp): void {
  switch (op.op) {
    case "deal_damage_hero":
      dealDamageToHero(state, op.amount);
      break;
    case "gain_armor":
      state.bossArmor += op.amount;
      break;
    case "heal":
      state.bossHp = Math.min(state.bossMaxHp, state.bossHp + op.amount);
      break;
  }
}

function bossTurn(state: TcgFightState, boss: TcgBossDef): void {
  if (state.status !== TcgFightStatus.PLAYING) return;
  const script = boss.turnScript;
  if (script.length === 0) return;
  const idx = (state.turn - 1) % script.length;
  applyBossOp(state, script[idx]!);
}

function startPlayerTurn(state: TcgFightState, rng: () => number): void {
  if (state.turn > 1) {
    state.maxMana = Math.min(MAX_MANA, state.maxMana + 1);
  }
  state.mana = state.maxMana;
  drawCards(state, 1, rng);
  for (const minion of state.board) {
    minion.canAttack = true;
  }
}

export function computeFightScore(state: TcgFightState): number {
  if (state.status === TcgFightStatus.PLAYER_WIN) {
    const turnBonus = Math.max(0, MAX_TURNS - state.turn) * 5;
    return 1000 + state.heroHp * 10 + state.heroArmor * 2 + turnBonus;
  }
  return state.damageDealtToBoss;
}

export function createInitialFightState(args: {
  seed: string;
  boss: TcgBossDef;
  deckCardIds: string[];
}): TcgFightState {
  resetInstanceIds();
  const rng = createSeededRandom(args.seed);
  const deck = shuffleInPlace([...args.deckCardIds], rng);

  const state: TcgFightState = {
    seed: args.seed,
    bossId: args.boss.bossId,
    turn: 0,
    heroHp: HERO_MAX_HP,
    heroMaxHp: HERO_MAX_HP,
    heroArmor: 0,
    mana: 1,
    maxMana: 1,
    bossHp: args.boss.hp,
    bossMaxHp: args.boss.hp,
    bossArmor: 0,
    deck,
    hand: [],
    board: [],
    status: TcgFightStatus.PLAYING,
    score: 0,
    damageDealtToBoss: 0,
  };

  drawCards(state, INITIAL_HAND, rng);
  return state;
}

export function runGreedyBossFight(args: {
  seed: string;
  boss: TcgBossDef;
  deckCardIds: string[];
  catalog: TcgCatalog;
}): TcgGreedySimResult {
  resetInstanceIds();
  const state = createInitialFightState({
    seed: args.seed,
    boss: args.boss,
    deckCardIds: args.deckCardIds,
  });
  const rng = createSeededRandom(`${args.seed}:draw`);

  while (
    state.status === TcgFightStatus.PLAYING &&
    state.turn < MAX_TURNS
  ) {
    state.turn += 1;
    startPlayerTurn(state, rng);
    if (state.status !== TcgFightStatus.PLAYING) break;

    greedyPlayPhase(state, args.catalog, rng);
    if (state.status !== TcgFightStatus.PLAYING) break;

    minionAttackPhase(state);
    if (state.status !== TcgFightStatus.PLAYING) break;

    bossTurn(state, args.boss);
  }

  if (state.status === TcgFightStatus.PLAYING) {
    state.status = TcgFightStatus.PLAYER_LOSS;
  }

  state.score = computeFightScore(state);
  return {
    finalState: state,
    turns: state.turn,
    won: state.status === TcgFightStatus.PLAYER_WIN,
  };
}

export function buildCatalog(cards: TcgCardDef[]): TcgCatalog {
  const catalog: TcgCatalog = {};
  for (const card of cards) {
    catalog[card.cardId] = card;
  }
  return catalog;
}
