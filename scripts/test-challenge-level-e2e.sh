#!/bin/bash
#
# 挑战关卡端到端测试自动化脚本
# 适用于 Linux、Mac 和 Git Bash (Windows)
#
# 使用方法:
#   bash scripts/test-challenge-level-e2e.sh
#   或
#   chmod +x scripts/test-challenge-level-e2e.sh
#   ./scripts/test-challenge-level-e2e.sh
#

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TOURNAMENT_DIR="$PROJECT_ROOT/src/convex/tournament"
TACTICAL_MONSTER_DIR="$PROJECT_ROOT/src/convex/tacticalMonster"

# 测试参数
TEST_UID="${TEST_UID:-test_player_bronze}"
TEST_TOURNAMENT_TYPE="${TEST_TOURNAMENT_TYPE:-monster_rumble_challenge_bronze_boss_1}"

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# 检查命令是否存在
check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_error "$1 未安装或不在 PATH 中"
        exit 1
    fi
}

# 检查目录是否存在
check_directory() {
    if [ ! -d "$1" ]; then
        log_error "目录不存在: $1"
        exit 1
    fi
}

# 运行 Convex 命令
run_convex() {
    local module_dir=$1
    local command=$2
    local args=$3
    
    log_info "执行: $command"
    if [ -n "$args" ]; then
        log_info "参数: $args"
        (cd "$module_dir" && npx convex run "$command" "$args")
    else
        (cd "$module_dir" && npx convex run "$command")
    fi
}

# 主函数
main() {
    log_step "挑战关卡端到端测试 - 完整流程"
    log_info "测试玩家: $TEST_UID"
    log_info "测试关卡: $TEST_TOURNAMENT_TYPE"
    log_info "项目根目录: $PROJECT_ROOT"
    
    # 检查前置条件
    log_step "检查前置条件"
    check_command "npx"
    check_command "node"
    check_directory "$TOURNAMENT_DIR"
    check_directory "$TACTICAL_MONSTER_DIR"
    log_success "前置条件检查通过"
    
    # 步骤1: 准备测试数据（Tournament模块）
    log_step "步骤1: 准备 Tournament 模块测试数据"
    if run_convex "$TOURNAMENT_DIR" \
        "service/tournament/tests/challengeLevel/runTest:setupChallengeLevelTestData" \
        ""; then
        log_success "Tournament 模块测试数据创建成功"
    else
        log_error "Tournament 模块测试数据创建失败"
        exit 1
    fi
    
    # 等待数据创建完成
    log_info "等待 3 秒以确保数据同步..."
    sleep 3
    
    # 步骤2: 验证测试数据（Tournament模块）
    log_step "步骤2: 验证 Tournament 模块测试数据"
    VALIDATION_ARGS="{\"playerIds\": [\"$TEST_UID\"], \"tournamentTypeId\": \"$TEST_TOURNAMENT_TYPE\"}"
    if run_convex "$TOURNAMENT_DIR" \
        "service/tournament/tests/challengeLevel/runTest:validateChallengeLevelTestData" \
        "$VALIDATION_ARGS"; then
        log_success "Tournament 模块数据验证完成"
    else
        log_warning "Tournament 模块数据验证出现问题（继续执行）"
    fi
    
    # 步骤3: 验证测试数据（TacticalMonster模块）
    log_step "步骤3: 验证 TacticalMonster 模块测试数据"
    VALIDATION_ARGS="{\"uid\": \"$TEST_UID\"}"
    if run_convex "$TACTICAL_MONSTER_DIR" \
        "service/game/tests/challengeLevel/endToEndTest:testChallengeLevelDataValidation" \
        "$VALIDATION_ARGS"; then
        log_success "TacticalMonster 模块数据验证完成"
    else
        log_warning "TacticalMonster 模块数据验证出现问题（继续执行）"
    fi
    
    # 步骤4: 运行端到端测试（TacticalMonster模块）
    log_step "步骤4: 运行端到端测试"
    E2E_ARGS="{\"uid\": \"$TEST_UID\", \"tournamentType\": \"$TEST_TOURNAMENT_TYPE\"}"
    if run_convex "$TACTICAL_MONSTER_DIR" \
        "service/game/tests/challengeLevel/endToEndTest:testChallengeLevelEndToEnd" \
        "$E2E_ARGS"; then
        log_success "端到端测试执行完成"
    else
        log_error "端到端测试执行失败"
        exit 1
    fi
    
    log_step "测试流程完成"
    log_success "所有步骤执行完毕！"
    log_info ""
    log_info "下一步："
    log_info "1. 查看 Convex Dashboard 中的日志以获取详细信息"
    log_info "2. 验证 Match 和 PlayerMatch 记录"
    log_info "3. 验证游戏实例和分数提交"
}

# 运行主函数
main "$@"

