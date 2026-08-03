/** Bot rollout pacing personas — slower pick, faster roll. */

export type YatzPersona = {
  id: string;
  thinkTimeScale: {
    roll: number;
    toggle_hold: number;
    pick_category: number;
  };
};

const PERSONAS: YatzPersona[] = [
  { id: "steady", thinkTimeScale: { roll: 1.05, toggle_hold: 1.0, pick_category: 1.1 } },
  { id: "quick_roll", thinkTimeScale: { roll: 0.9, toggle_hold: 0.95, pick_category: 1.15 } },
  { id: "deliberate", thinkTimeScale: { roll: 1.15, toggle_hold: 1.1, pick_category: 1.25 } },
  { id: "casual", thinkTimeScale: { roll: 1.0, toggle_hold: 1.05, pick_category: 1.0 } },
  { id: "focused", thinkTimeScale: { roll: 0.95, toggle_hold: 1.0, pick_category: 1.2 } },
  { id: "relaxed", thinkTimeScale: { roll: 1.1, toggle_hold: 1.15, pick_category: 0.95 } },
];

export function personaForRollout(rolloutIndex: number): YatzPersona {
  return PERSONAS[Math.abs(rolloutIndex) % PERSONAS.length]!;
}
