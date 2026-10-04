#!/bin/bash
# ============================================================
# ExportDrive 核心冒烟测试（30s）
# 用途：验证 5 个核心 API 端点存活 + 关键页面可访问
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PORT="${1:-${DEPLOY_RUN_PORT:-5000}}"
BASE="http://localhost:${PORT}"
PASSED=0
FAILED=0

echo ""
echo -e "${CYAN}── 核心冒烟测试 ──────────────────────────────────────────${NC}"
echo -e "  目标: ${BASE}"
echo ""

# ── 测试函数 ──────────────────────────────────────────────
test_api() {
    local method="$1"
    local path="$2"
    local label="$3"
    local data="$4"
    
    local http_code
    if [ "$method" = "GET" ]; then
        http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${BASE}${path}")
    else
        http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
            -X "$method" \
            -H 'Content-Type: application/json' \
            -d "$data" \
            "${BASE}${path}")
    fi
    
    # 200/201/401/403 都算服务正常（401=需要登录，说明 API 活着）
    if [[ "$http_code" =~ ^(200|201|401|403|302)$ ]]; then
        echo -e "  ${GREEN}✓${NC} ${label} ${CYAN}${method} ${path}${NC} → ${http_code}"
        ((PASSED++))
    else
        echo -e "  ${RED}✗${NC} ${label} ${CYAN}${method} ${path}${NC} → ${RED}${http_code}${NC}"
        ((FAILED++))
    fi
}

test_page() {
    local path="$1"
    local label="$2"
    
    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${BASE}${path}")
    
    if [[ "$http_code" =~ ^(200|301|302|304)$ ]]; then
        echo -e "  ${GREEN}✓${NC} ${label} ${CYAN}${path}${NC} → ${http_code}"
        ((PASSED++))
    else
        echo -e "  ${RED}✗${NC} ${label} ${CYAN}${path}${NC} → ${RED}${http_code}${NC}"
        ((FAILED++))
    fi
}

# ── API 探活（5 个核心接口） ─────────────────────────────
echo -e "${CYAN}  API 探活:${NC}"
test_api "GET"  "/api/customers?limit=1"           "客户列表"
test_api "GET"  "/api/proforma-invoices?limit=1"   "形式发票"
test_api "GET"  "/api/export-licenses?limit=1"      "出口许可证"
test_api "GET"  "/api/organizations/current"        "组织上下文"
test_api "GET"  "/api/supabase-config"              "Supabase 配置"

# ── 关键页面探活 ─────────────────────────────────────────
echo ""
echo -e "${CYAN}  页面探活:${NC}"
test_page "/"                              "工作台首页"
test_page "/customers"                     "客户管理"
test_page "/proforma-invoice"              "形式发票"
test_page "/blog"                          "博客展示"
test_page "/carclip"                       "CarClip 落地页"

echo ""
echo -e "${CYAN}── 结果 ──────────────────────────────────────────────────${NC}"
echo -e "  通过: ${GREEN}${PASSED}${NC}  失败: ${RED}${FAILED}${NC}"

if [ "$FAILED" -gt 0 ]; then
    echo -e "${RED}✗ 冒烟测试不通过！${NC}"
    exit 1
else
    echo -e "${GREEN}✓ 冒烟测试通过！${NC}"
    exit 0
fi