#!/bin/bash
# ============================================================
# ExportDrive 增量测试脚本
# 用途：分析 git diff 变更文件，自动判定影响模块，只跑相关测试
# 用法：
#   bash scripts/qa-incremental.sh              # 检测最近一次提交
#   bash scripts/qa-incremental.sh HEAD~3        # 检测最近 3 次提交
#   bash scripts/qa-incremental.sh --all         # 全量测试
#   bash scripts/qa-incremental.sh --module customers  # 指定模块
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"
MAP_FILE="${COZE_WORKSPACE_PATH}/scripts/qa-module-map.conf"
TEST_DIR="${COZE_WORKSPACE_PATH}/scripts/qa-tests"
DEPLOY_RUN_PORT="${DEPLOY_RUN_PORT:-5000}"

PASSED=0
FAILED=0
TOTAL=0

# ── 解析参数 ──────────────────────────────────────────────
DIFF_BASE="HEAD~1"
RUN_ALL=false
TARGET_MODULE=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --all)   RUN_ALL=true; shift ;;
        --module) TARGET_MODULE="$2"; shift 2 ;;
        *)       DIFF_BASE="$1"; shift ;;
    esac
done

# ── 1. 获取变更文件列表 ───────────────────────────────────
get_changed_files() {
    if $RUN_ALL; then
        # 全量：列出所有源码文件
        git ls-files | grep -E '\.(ts|tsx|css)$'
    elif [ -n "$TARGET_MODULE" ]; then
        # 指定模块：从映射表反查文件
        grep "|$TARGET_MODULE$" "$MAP_FILE" | cut -d'|' -f1 | while read pattern; do
            git ls-files | grep -E "^${pattern//\*/.*}$" 2>/dev/null || true
        done
    else
        # 增量：只取变更文件
        git diff --name-only "$DIFF_BASE" HEAD 2>/dev/null || git diff --name-only HEAD
    fi
}

# ── 2. 文件路径 → 模块名 ─────────────────────────────────
resolve_modules() {
    local changed_files="$1"
    local modules=""
    
    while IFS= read -r file; do
        [ -z "$file" ] && continue
        
        while IFS='|' read -r pattern module; do
            [ -z "$pattern" ] && continue
            # 用 bash 通配符匹配
            if [[ "$file" == $pattern ]]; then
                # 处理 shared: 前缀
                if [[ "$module" == shared:* ]]; then
                    modules+="${module#shared:} "
                else
                    modules+="$module "
                fi
                break
            fi
        done < "$MAP_FILE"
    done <<< "$changed_files"
    
    # 去重
    echo "$modules" | tr ' ' '\n' | sort -u | grep -v '^$' | tr '\n' ' '
}

# ── 3. 运行模块测试 ──────────────────────────────────────
run_module_test() {
    local module="$1"
    local test_script="${TEST_DIR}/module-${module}.sh"
    
    if [ -f "$test_script" ]; then
        echo -e "  ${CYAN}[${module}]${NC} 运行测试..."
        if bash "$test_script" "$DEPLOY_RUN_PORT" 2>&1; then
            echo -e "  ${GREEN}[${module}] ✓ 通过${NC}"
            ((PASSED++))
        else
            echo -e "  ${RED}[${module}] ✗ 失败${NC}"
            ((FAILED++))
        fi
    else
        echo -e "  ${YELLOW}[${module}]${NC} 跳过（无测试脚本，需创建: ${test_script}）"
    fi
    ((TOTAL++))
}

# ── 4. 主流程 ─────────────────────────────────────────────

echo ""
echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}   ExportDrive 增量测试${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

# 检查映射表
if [ ! -f "$MAP_FILE" ]; then
    echo -e "${RED}✗ 映射表不存在: ${MAP_FILE}${NC}"
    exit 1
fi

# 获取变更文件
CHANGED_FILES=$(get_changed_files)

if [ -z "$CHANGED_FILES" ]; then
    echo -e "${GREEN}✓ 无变更文件，跳过测试。${NC}"
    exit 0
fi

# 展示变更文件
echo -e "${CYAN}── 变更文件 ──────────────────────────────────────────────${NC}"
echo "$CHANGED_FILES" | head -20
FILE_COUNT=$(echo "$CHANGED_FILES" | grep -c .)
if [ "$FILE_COUNT" -gt 20 ]; then
    echo -e "  ... 共 ${YELLOW}${FILE_COUNT}${NC} 个文件"
fi
echo ""

# 解析影响模块
MODULES=$(resolve_modules "$CHANGED_FILES")

if [ -z "$MODULES" ]; then
    echo -e "${YELLOW}⚠ 未匹配到任何模块映射，跳过测试。${NC}"
    echo -e "  请检查 ${MAP_FILE} 是否覆盖了变更文件。"
    exit 0
fi

echo -e "${CYAN}── 影响模块 ──────────────────────────────────────────────${NC}"
echo -e "  ${YELLOW}$(echo "$MODULES" | tr ' ' '\n' | sort -u | paste -sd ' ' -)${NC}"
echo ""

# 特殊处理 shared:all
if echo "$MODULES" | grep -q "all"; then
    echo -e "${YELLOW}⚠ 检测到共享代码变更（shared:all），建议全量冒烟测试。${NC}"
    echo -e "  运行: ${CYAN}bash scripts/qa-incremental.sh --all${NC}"
    echo ""
fi

# 移除 all 占位符，跑所有有测试脚本的模块
MODULES=$(echo "$MODULES" | sed 's/\ball\b//g' | tr ' ' '\n' | sort -u | grep -v '^$')

# 如果只有 shared:all 且没有具体模块，跑冒烟测试
if [ -z "$MODULES" ]; then
    echo -e "${YELLOW}→ 无具体模块，运行核心冒烟测试...${NC}"
    if [ -f "${TEST_DIR}/smoke.sh" ]; then
        bash "${TEST_DIR}/smoke.sh" "$DEPLOY_RUN_PORT"
    fi
    exit $?
fi

echo -e "${CYAN}── 测试执行 ──────────────────────────────────────────────${NC}"

# 串行执行各模块测试
for module in $MODULES; do
    run_module_test "$module"
done

echo ""
echo -e "${CYAN}── 结果汇总 ──────────────────────────────────────────────${NC}"
echo -e "  总计: ${TOTAL}  通过: ${GREEN}${PASSED}${NC}  失败: ${RED}${FAILED}${NC}  跳过: $((TOTAL - PASSED - FAILED))"
echo ""

if [ "$FAILED" -gt 0 ]; then
    echo -e "${RED}✗ 有 ${FAILED} 个模块测试失败，请修复后重试。${NC}"
    exit 1
else
    echo -e "${GREEN}✓ 所有测试通过！${NC}"
    exit 0
fi