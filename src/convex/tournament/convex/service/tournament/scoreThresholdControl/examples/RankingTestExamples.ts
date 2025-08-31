/**
 * 推荐排名测试使用示例
 * 演示如何在不同场景下使用测试功能
 */

/**
 * 示例1: 在Convex Dashboard中运行快速测试
 * 
 * 在Convex Dashboard的Functions页面中执行：
 */

// 快速验证测试
/*
await ctx.runMutation("scoreThresholdControl:runQuickRankingTest", {});

预期输出:
{
  "success": true,
  "testsRun": 3,
  "errors": [],
  "results": [
    {
      "test": "单玩家推荐",
      "success": true,
      "rank": 3,
      "confidence": 0.72,
      "aiCount": 5
    }
  ]
}
*/

/**
 * 示例2: 测试特定玩家的排名推荐
 */

// 测试高分玩家
/*
await ctx.runMutation("scoreThresholdControl:testSinglePlayerRanking", {
  uid: "expert_player_001",
  score: 12000,
  aiCount: 7
});

预期输出:
{
  "success": true,
  "player": {
    "uid": "expert_player_001",
    "score": 12000,
    "recommendedRank": 2,
    "confidence": 0.85,
    "relativePerformance": "excellent",
    "reasoning": "当前表现优异（得分12000），比历史平均提升15.2%，在8人比赛中（含7个AI对手），基于advanced水平的预期表现"
  },
  "aiOpponents": [
    {
      "uid": "ai_1",
      "rank": 1,
      "score": 12500,
      "difficulty": "extreme",
      "behavior": "competitive"
    }
  ]
}
*/

/**
 * 示例3: 测试多玩家比赛场景
 */

// 混合技能水平比赛
/*
await ctx.runMutation("scoreThresholdControl:testMultiPlayerRanking", {
  players: [
    { uid: "expert_001", score: 12000 },
    { uid: "intermediate_001", score: 8500 },
    { uid: "casual_001", score: 5000 },
    { uid: "newbie_001", score: 3000 }
  ],
  aiCount: 4
});

预期输出:
{
  "success": true,
  "humanPlayers": [
    {
      "uid": "expert_001",
      "originalScore": 12000,
      "recommendedRank": 1,
      "confidence": 0.88,
      "relativePerformance": "excellent"
    },
    {
      "uid": "intermediate_001", 
      "originalScore": 8500,
      "recommendedRank": 3,
      "confidence": 0.75,
      "relativePerformance": "good"
    }
  ],
  "analysis": {
    "totalParticipants": 8,
    "humanCount": 4,
    "aiCount": 4,
    "averageHumanScore": 7125,
    "scoreSpread": 9000
  }
}
*/

/**
 * 示例4: 技能水平对比分析
 */

// 分析不同分数段的推荐差异
/*
await ctx.runMutation("scoreThresholdControl:compareSkillLevelRankings", {
  testScores: [2000, 5000, 8000, 11000, 15000],
  aiCount: 6
});

预期输出:
{
  "success": true,
  "comparisons": [
    {
      "uid": "test_player_1",
      "score": 2000,
      "recommendedRank": 6,
      "confidence": 0.65,
      "relativePerformance": "poor",
      "aiDifficultyDistribution": {
        "easy": 3,
        "normal": 2,
        "hard": 1
      },
      "aiBehaviorDistribution": {
        "supportive": 4,
        "balanced": 2,
        "competitive": 0
      }
    }
  ],
  "analysis": {
    "rankProgression": [6, 5, 3, 2, 1],
    "confidenceProgression": [0.65, 0.70, 0.78, 0.85, 0.90],
    "averageRank": 3.4,
    "rankRange": 5
  }
}
*/

/**
 * 示例5: Controller接口测试
 */

// 测试原有的Controller接口
/*
await ctx.runMutation("scoreThresholdControl:testControllerRanking", {
  uid: "test_player",
  score: 9500,
  participantCount: 8
});

预期输出:
{
  "success": true,
  "recommendedRank": 2,
  "confidence": 0.82,
  "reasoning": "当前表现优异（得分9500），比历史平均提升12.3%，在8人比赛中（含7个AI对手）",
  "probabilityDistribution": [],
  "input": {
    "uid": "test_player",
    "score": 9500,
    "participantCount": 8
  }
}
*/

/**
 * 示例6: 完整测试套件
 */

// 运行所有测试
/*
await ctx.runMutation("scoreThresholdControl:runFullRankingTest", {});

预期输出:
{
  "success": true,
  "testResults": {
    "overall": true,
    "validation": {
      "success": true,
      "results": [...],
      "errors": []
    },
    "performance": {
      "avgTime": 45.2,
      "qps": 22.1,
      "results": [...]
    },
    "boundary": {
      "success": true,
      "tests": [...]
    }
  },
  "summary": {
    "validationPassed": true,
    "performanceMs": 45.2,
    "boundaryPassed": true,
    "overallPassed": true
  }
}
*/

/**
 * 示例7: 获取测试状态
 */

// 查看可用的测试功能
/*
await ctx.runQuery("scoreThresholdControl:getTestStatus", {});

预期输出:
{
  "systemStatus": "ready",
  "availableTests": [
    "runFullRankingTest - 完整测试套件",
    "runQuickRankingTest - 快速验证测试",
    "testSinglePlayerRanking - 单玩家排名测试",
    "testMultiPlayerRanking - 多玩家排名测试",
    "testControllerRanking - Controller接口测试",
    "compareSkillLevelRankings - 技能水平比较测试"
  ],
  "recommendations": [
    "建议先运行 runQuickRankingTest 进行快速验证",
    "使用 testSinglePlayerRanking 测试特定场景",
    "使用 compareSkillLevelRankings 分析不同技能水平的推荐差异"
  ]
}
*/

/**
 * 实际使用建议:
 * 
 * 1. 开发阶段: 使用 runQuickRankingTest 进行快速验证
 * 2. 功能测试: 使用 testSinglePlayerRanking 和 testMultiPlayerRanking 测试具体场景
 * 3. 性能测试: 使用 runFullRankingTest 进行完整的性能评估
 * 4. 回归测试: 在代码变更后运行 runFullRankingTest 确保功能正常
 * 5. 分析调优: 使用 compareSkillLevelRankings 分析不同参数的影响
 */

export { }; // 使文件成为模块

