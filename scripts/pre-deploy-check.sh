#!/bin/bash
# ============================================================
# ExportDrive 部署前同步检查脚本
# 用途：部署前检查远程是否有新提交，自动合并，防止覆盖他人代码
# 用法：bash scripts/pre-deploy-check.sh
# ============================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}   ExportDrive 部署前安全检查${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

# ── 1. 检查是否在 git 仓库中 ──────────────────────────────
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}✗ 错误：当前目录不是 git 仓库${NC}"
    exit 1
fi

# ── 2. 获取当前分支名 ────────────────────────────────────
CURRENT_BRANCH=$(git branch --show-current)
echo -e "  当前分支：${YELLOW}${CURRENT_BRANCH}${NC}"

# ── 3. 检查是否有未提交的本地改动 ──────────────────────────
if ! git diff --quiet --exit-code 2>/dev/null || \
   ! git diff --cached --quiet --exit-code 2>/dev/null; then
    echo ""
    echo -e "${YELLOW}  ⚠ 检测到未提交的本地改动：${NC}"
    git status --short
    echo ""
    echo -e "${YELLOW}  建议先提交或暂存（stash）这些改动。${NC}"
    echo -e "  - 提交：${NC}git add -A && git commit -m \"...\""
    echo -e "  - 暂存：${NC}git stash"
    echo ""
    read -p "  是否继续？（有未提交改动可能增加冲突风险）[y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}✗ 已取消。请先处理未提交的改动。${NC}"
        exit 1
    fi
fi

# ── 4. 检查远程仓库连接 ──────────────────────────────────
REMOTE=$(git remote 2>/dev/null | head -1)
if [ -z "$REMOTE" ]; then
    echo -e "${YELLOW}  ⚠ 未配置远程仓库，跳过远程同步检查。${NC}"
    echo -e "${GREEN}  ✓ 可以安全部署（本地仓库模式）${NC}"
    exit 0
fi

echo -e "  远程仓库：${YELLOW}${REMOTE}${NC}"

# ── 5. 获取远程最新信息 ──────────────────────────────────
echo ""
echo -e "  ${BLUE}正在获取远程最新代码...${NC}"
if ! git fetch ${REMOTE} main 2>&1; then
    echo -e "${RED}  ✗ 无法连接远程仓库。请检查网络或仓库配置。${NC}"
    exit 1
fi

# ── 6. 比较本地和远程的差异 ──────────────────────────────
LOCAL_HASH=$(git rev-parse HEAD)
REMOTE_HASH=$(git rev-parse ${REMOTE}/main 2>/dev/null || echo "")

if [ -z "$REMOTE_HASH" ]; then
    echo -e "${YELLOW}  ⚠ 远程 main 分支不存在。${NC}"
    echo -e "${GREEN}  ✓ 可以安全部署（首次部署）${NC}"
    exit 0
fi

# ── 7. 判断是否有远程新提交 ──────────────────────────────
if [ "$LOCAL_HASH" = "$REMOTE_HASH" ]; then
    echo ""
    echo -e "${GREEN}  ✓ 本地代码与远程一致，无他人新提交。${NC}"
    echo -e "${GREEN}  ✓ 可以安全部署！${NC}"
    echo ""
    exit 0
fi

# 检查本地是否领先于远程
if git merge-base --is-ancestor ${REMOTE}/main HEAD 2>/dev/null; then
    echo ""
    echo -e "${GREEN}  ✓ 本地代码领先于远程，无他人新提交。${NC}"
    echo -e "${GREEN}  ✓ 可以安全部署！${NC}"
    echo ""
    exit 0
fi

# ── 8. 远程有新提交，需要合并 ────────────────────────────
echo ""
echo -e "${YELLOW}  ⚠ 检测到远程 main 分支有新的提交！${NC}"
echo ""
echo -e "  远程新提交："
git log --oneline HEAD..${REMOTE}/main | head -5
echo ""

# 检查是否有冲突的可能
if git merge-tree $(git merge-base HEAD ${REMOTE}/main) HEAD ${REMOTE}/main 2>/dev/null | grep -q "^<<<<<<< "; then
    echo -e "${RED}  ✗ 预计存在合并冲突！${NC}"
    echo ""
    echo -e "  请手动处理："
    echo -e "  1. ${NC}git merge ${REMOTE}/main"
    echo -e "  2. 解决冲突文件"
    echo -e "  3. ${NC}git add . && git commit"
    echo -e "  4. 再次运行本脚本"
    echo ""
    exit 1
fi

# ── 9. 尝试自动合并 ──────────────────────────────────────
echo -e "  ${BLUE}正在自动合并远程改动...${NC}"

CURRENT_BRANCH=$(git branch --show-current)

# 保存当前分支名用于后续恢复
if ! git merge ${REMOTE}/main --no-edit 2>&1; then
    echo ""
    echo -e "${RED}  ✗ 自动合并失败，存在冲突！${NC}"
    echo ""
    echo -e "  冲突文件："
    git diff --name-only --diff-filter=U 2>/dev/null || true
    echo ""
    echo -e "  请手动解决冲突后运行："
    echo -e "  ${NC}git add . && git commit"
    echo -e "  然后再次运行本脚本"
    echo ""
    exit 1
fi

echo ""
echo -e "${GREEN}  ✓ 远程改动已自动合并，无冲突！${NC}"
echo -e "${GREEN}  ✓ 可以安全部署！${NC}"
echo ""
echo -e "  ${YELLOW}提示：合并后的代码已包含你和团队的最新改动。${NC}"
echo ""

# ── 10. 运行增量测试 ─────────────────────────────────────
echo ""
echo -e "${BLUE}── 增量测试 ──────────────────────────────────────────────${NC}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
"${SCRIPT_DIR}/qa-incremental.sh" || {
    echo ""
    echo -e "${RED}  ✗ 增量测试不通过，请修复后重试。${NC}"
    exit 1
}