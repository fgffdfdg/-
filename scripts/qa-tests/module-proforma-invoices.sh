#!/bin/bash
# 形式发票模块接口测试
# 覆盖：未授权访问拦截（列表/详情/创建/更新/删除均需登录）

set -e
BASE_URL="http://localhost:${DEPLOY_RUN_PORT:-5000}"
echo "=== 形式发票模块接口测试 ==="

# 1. 列表（未授权应返回 401）
echo "--- 测试 GET /api/proforma-invoices（未授权）---"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/proforma-invoices?limit=1")
if [ "$STATUS" != "401" ]; then echo "FAIL: 期望 401，实际 $STATUS"; exit 1; fi
echo "PASS: 未授权列表返回 401"

# 2. 详情（未授权应返回 401）
echo "--- 测试 GET /api/proforma-invoices/[id]（未授权）---"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/proforma-invoices/00000000-0000-0000-0000-000000000000")
if [ "$STATUS" != "401" ]; then echo "FAIL: 期望 401，实际 $STATUS"; exit 1; fi
echo "PASS: 未授权详情返回 401"

# 3. 创建（未授权应返回 401）
echo "--- 测试 POST /api/proforma-invoices（未授权）---"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/proforma-invoices" \
  -H "Content-Type: application/json" \
  -d '{"title":"QA测试发票","buyer_info":{"buyer_name":"QA Buyer"},"order_info":{"invoice_no":"PI-QA"},"vehicles":[]}')
if [ "$STATUS" != "401" ]; then echo "FAIL: 期望 401，实际 $STATUS"; exit 1; fi
echo "PASS: 未授权创建返回 401"

# 4. 更新（未授权应返回 401）
echo "--- 测试 PUT /api/proforma-invoices/[id]（未授权）---"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$BASE_URL/api/proforma-invoices/00000000-0000-0000-0000-000000000000" \
  -H "Content-Type: application/json" \
  -d '{"title":"QA更新"}')
if [ "$STATUS" != "401" ]; then echo "FAIL: 期望 401，实际 $STATUS"; exit 1; fi
echo "PASS: 未授权更新返回 401"

# 5. 删除（未授权应返回 401）
echo "--- 测试 DELETE /api/proforma-invoices/[id]（未授权）---"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/api/proforma-invoices/00000000-0000-0000-0000-000000000000")
if [ "$STATUS" != "401" ]; then echo "FAIL: 期望 401，实际 $STATUS"; exit 1; fi
echo "PASS: 未授权删除返回 401"

echo "=== 形式发票模块测试全部通过 ==="
