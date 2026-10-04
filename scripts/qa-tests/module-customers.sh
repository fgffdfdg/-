#!/bin/bash
# ============================================================
# 模块测试：客户管理 (customers)
# API: GET/POST /api/customers, GET/PUT/DELETE /api/customers/[id]
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

PORT="${1:-${DEPLOY_RUN_PORT:-5000}}"
BASE="http://localhost:${PORT}"
PASSED=0
FAILED=0

check() {
    local label="$1" expected="$2" actual="$3"
    if [ "$actual" = "$expected" ]; then
        echo -e "    ${GREEN}✓${NC} ${label}"
        ((PASSED++))
    else
        echo -e "    ${RED}✗${NC} ${label} (期望 ${expected}, 实际 ${actual})"
        ((FAILED++))
    fi
}

echo ""
echo -e "${CYAN}── 模块测试: customers ───────────────────────────────────${NC}"

# ── 1. 列表查询（无需认证可访问） ─────────────────────────
echo -e "${CYAN}  1. GET /api/customers?limit=1${NC}"
RESP=$(curl -s --max-time 5 "${BASE}/api/customers?limit=1")
HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${BASE}/api/customers?limit=1")
check "状态码" "200" "$HTTP"

# ── 2. 带搜索参数 ─────────────────────────────────────────
echo -e "${CYAN}  2. GET /api/customers?search=test&status=potential${NC}"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${BASE}/api/customers?search=test&status=potential&limit=5")
check "搜索+筛选" "200" "$HTTP"

# ── 3. 分页边界 ───────────────────────────────────────────
echo -e "${CYAN}  3. GET /api/customers?limit=50&offset=0${NC}"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${BASE}/api/customers?limit=50&offset=0")
check "分页最大值" "200" "$HTTP"

# ── 4. 未认证 POST（应返回 401） ──────────────────────────
echo -e "${CYAN}  4. POST /api/customers (无 token)${NC}"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
    -X POST -H 'Content-Type: application/json' \
    -d '{"company_name":"测试客户"}' \
    "${BASE}/api/customers")
check "未认证拒绝" "401" "$HTTP"

# ── 5. 不存在的 ID ────────────────────────────────────────
echo -e "${CYAN}  5. GET /api/customers/non-existent-id${NC}"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${BASE}/api/customers/00000000-0000-0000-0000-000000000000")
check "不存在的ID" "200" "$HTTP"  # 返回空数据也是 200

echo ""
echo -e "${CYAN}── customers: ${GREEN}${PASSED} 通过${NC} / ${RED}${FAILED} 失败${NC} ──"

[ "$FAILED" -eq 0 ] && exit 0 || exit 1