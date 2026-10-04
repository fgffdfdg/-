#!/bin/bash
# ============================================================
# 模块测试：出口许可证 (export-licenses)
# API: GET/POST /api/export-licenses, GET/PUT/DELETE /api/export-licenses/[id]
#      GET /api/export-licenses/[id]/file-url
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
echo -e "${CYAN}── 模块测试: export-licenses ─────────────────────────────${NC}"

# ── 1. 列表查询 ───────────────────────────────────────────
echo -e "${CYAN}  1. GET /api/export-licenses?limit=1${NC}"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${BASE}/api/export-licenses?limit=1")
check "列表查询" "200" "$HTTP"

# ── 2. VIN 搜索 ───────────────────────────────────────────
echo -e "${CYAN}  2. GET /api/export-licenses?search=JTDKB20U053000001${NC}"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${BASE}/api/export-licenses?search=JTDKB20U053000001&limit=5")
check "VIN搜索" "200" "$HTTP"

# ── 3. 未认证 POST（multipart） ───────────────────────────
echo -e "${CYAN}  3. POST /api/export-licenses (无 token)${NC}"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
    -X POST \
    -F "license_no=TEST-001" \
    -F "vins=JTDKB20U053000001" \
    "${BASE}/api/export-licenses")
# multipart 无 token 可能返回 401 或 400
check "未认证拒绝" "401" "$HTTP"

# ── 4. 不存在的文件 URL ───────────────────────────────────
echo -e "${CYAN}  4. GET /api/export-licenses/non-existent/file-url${NC}"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${BASE}/api/export-licenses/00000000-0000-0000-0000-000000000000/file-url")
check "不存在的文件URL" "200" "$HTTP"  # 返回空或错误信息

echo ""
echo -e "${CYAN}── export-licenses: ${GREEN}${PASSED} 通过${NC} / ${RED}${FAILED} 失败${NC} ──"

[ "$FAILED" -eq 0 ] && exit 0 || exit 1