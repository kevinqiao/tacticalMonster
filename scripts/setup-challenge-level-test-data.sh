#!/bin/bash
# 挑战关卡测试数据创建脚本 (Bash)
# 用于创建挑战关卡端到端测试所需的所有测试数据
#
# 使用方法:
#   bash scripts/setup-challenge-level-test-data.sh
#
# 注意:
#   - 需要先启动 Convex 开发服务器 (npx convex dev)
#   - 如果两个模块是分离部署的，可能需要分别运行

set -e

echo "=========================================="
echo "挑战关卡测试数据创建"
echo "=========================================="
echo ""

# 检查是否在正确的目录
if [ ! -d "src/convex" ]; then
    echo "错误: 请在项目根目录运行此脚本"
    exit 1
fi

echo "[步骤1] 检查 Convex 是否可用..."
if ! command -v npx &> /dev/null; then
    echo "错误: 找不到 npx"
    echo "请确保已安装 Node.js"
    exit 1
fi

if ! npx convex --version &> /dev/null; then
    echo "错误: 找不到 Convex CLI"
    echo "请确保已安装 Convex CLI"
    exit 1
fi
echo "✓ Convex CLI 可用"
echo ""

# 选择模块
echo "请选择要创建的测试数据模块:"
echo "  1. Tournament 模块 (完整测试数据，包括玩家、资源、关卡配置)"
echo "  2. TacticalMonster 模块 (游戏相关数据，包括怪物、队伍、地图配置)"
echo "  3. 两个模块都创建"
echo ""
read -p "请输入选项 (1/2/3，默认为1): " choice
choice=${choice:-1}

if [ "$choice" = "1" ] || [ "$choice" = "3" ]; then
    echo ""
    echo "=========================================="
    echo "[步骤2] 创建 Tournament 模块测试数据"
    echo "=========================================="
    echo "正在运行: service/tournament/tests/challengeLevel/runTest:setupChallengeLevelTestData"
    cd src/convex/tournament
    npx convex run service/tournament/tests/challengeLevel/runTest:setupChallengeLevelTestData
    if [ $? -ne 0 ]; then
        echo ""
        echo "❌ Tournament 模块测试数据创建失败"
        cd ../..
        exit 1
    fi
    cd ../..
    echo ""
    echo "✅ Tournament 模块测试数据创建成功"
fi

if [ "$choice" = "2" ] || [ "$choice" = "3" ]; then
    echo ""
    echo "=========================================="
    if [ "$choice" = "2" ]; then
        echo "[步骤2] 创建 TacticalMonster 模块测试数据"
    else
        echo "[步骤3] 创建 TacticalMonster 模块测试数据"
    fi
    echo "=========================================="
    echo "正在运行: service/game/tests/challengeLevel/setupTestData:setupGameTestData"
    cd src/convex/tacticalMonster
    npx convex run service/game/tests/challengeLevel/setupTestData:setupGameTestData \
        '{"playerIds": ["test_player_bronze", "test_player_silver", "test_player_gold"], "tier": "bronze", "bossId": "boss_bronze_1"}'
    if [ $? -ne 0 ]; then
        echo ""
        echo "❌ TacticalMonster 模块测试数据创建失败"
        cd ../..
        exit 1
    fi
    cd ../..
    echo ""
    echo "✅ TacticalMonster 模块测试数据创建成功"
fi

echo ""
echo "=========================================="
echo "测试数据创建完成！"
echo "=========================================="
echo ""
echo "下一步: 运行端到端测试"
echo "  脚本: bash scripts/test-challenge-level-e2e.sh"
echo ""

