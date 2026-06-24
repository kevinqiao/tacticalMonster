import { describe, expect, it } from "vitest";

import { botSlotsToScoreBands, pickScoresFromRolloutBands } from "../rolloutPick";



describe("rolloutPick", () => {

  it("maps each slot to band with min=slot.low", () => {

    const bands = botSlotsToScoreBands([

      { rank: 1, low: 452, high: Number.POSITIVE_INFINITY },

      { rank: 2, low: 294, high: 402 },

    ]);

    expect(bands).toEqual([

      { min: 452, count: 1 },

      { min: 294, max: 402, count: 1 },

    ]);

  });



  it("picks rollouts within slot bounds descending", () => {

    const fills = pickScoresFromRolloutBands({

      gameType: "block_blast",

      sessionSeed: 42,

      slots: [

        { rank: 1, low: 452, high: Number.POSITIVE_INFINITY },

        { rank: 2, low: 294, high: 402 },

      ],

      bands: [

        {

          min: 452,

          rollouts: [

            { rolloutIndex: 1, finalScore: 466, elapsedTime: 240 },

            { rolloutIndex: 2, finalScore: 430, elapsedTime: 260 },

          ],

        },

        {

          min: 294,

          max: 402,

          rollouts: [

            { rolloutIndex: 3, finalScore: 340, elapsedTime: 300 },

            { rolloutIndex: 4, finalScore: 281, elapsedTime: 320 },

          ],

        },

      ],

    });



    expect(fills).toHaveLength(2);

    expect(fills[0]!.score).toBeGreaterThan(fills[1]!.score);

    expect(fills[0]!.rolloutIndex).toBe(1);

    expect(fills[0]!.score).toBe(466);

    expect(fills[1]!.rolloutIndex).toBe(3);

    expect(fills[1]!.score).toBe(340);

  });



  it("binds nearest rolloutIndex when pool has no slot match but keeps slot score", () => {

    const fills = pickScoresFromRolloutBands({

      gameType: "block_blast",

      sessionSeed: 99,

      slots: [{ rank: 1, low: 9800, high: 9900 }],

      bands: [{ min: 9800, max: 9900, rollouts: [{ rolloutIndex: 1, finalScore: 466 }] }],

    });

    expect(fills[0]!.rolloutIndex).toBe(1);

    expect(fills[0]!.score).toBeGreaterThanOrEqual(9800);

    expect(fills[0]!.score).toBeLessThanOrEqual(9900);

    expect(fills[0]!.score).not.toBe(466);

  });



  it("uses rollout finalScore from globalPool when band empty but pool entry matches slot", () => {

    const fills = pickScoresFromRolloutBands({

      gameType: "block_blast",

      sessionSeed: 7,

      slots: [{ rank: 3, low: 100, high: 150 }],

      localFills: [{ rank: 3, score: 120 }],

      bands: [

        { min: 100, max: 150, rollouts: [] },

        { min: 452, rollouts: [{ rolloutIndex: 8, finalScore: 125, elapsedTime: 200 }] },

      ],

    });

    expect(fills[0]!.rolloutIndex).toBe(8);

    expect(fills[0]!.score).toBe(125);

    expect(fills[0]!.duration).toBe(200_000);

  });

});


