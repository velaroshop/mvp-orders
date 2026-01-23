#!/bin/bash

# Test CORS pentru /api/thank-you/verify
# Usage: ./scripts/test-cors.sh <ORDER_ID> [BASE_URL]

ORDER_ID=$1
BASE_URL=${2:-"http://localhost:3000"}

if [ -z "$ORDER_ID" ]; then
  echo "❌ Usage: ./scripts/test-cors.sh <ORDER_ID> [BASE_URL]"
  echo "   Example: ./scripts/test-cors.sh abc123-def456"
  echo "   Example: ./scripts/test-cors.sh abc123-def456 https://mvp-orders.vercel.app"
  exit 1
fi

ENDPOINT="$BASE_URL/api/thank-you/verify?order=$ORDER_ID"

echo "🧪 Testing CORS for: $ENDPOINT"
echo "=============================================="
echo ""

# Test 1: Dev origin (localhost:3000)
echo "1️⃣  Test: Dev origin (localhost:3000)"
RESPONSE=$(curl -s -i -H "Origin: http://localhost:3000" "$ENDPOINT" 2>&1)
CORS_HEADER=$(echo "$RESPONSE" | grep -i "access-control-allow-origin" | head -1)
STATUS=$(echo "$RESPONSE" | grep "HTTP/" | tail -1 | awk '{print $2}')
echo "   Status: $STATUS"
echo "   $CORS_HEADER"
if [[ "$CORS_HEADER" == *"localhost:3000"* ]]; then
  echo "   ✅ PASS - Dev origin allowed"
else
  echo "   ❌ FAIL - Dev origin should be allowed"
fi
echo ""

# Test 2: Dev origin (mvp-orders.vercel.app)
echo "2️⃣  Test: Dev origin (mvp-orders.vercel.app)"
RESPONSE=$(curl -s -i -H "Origin: https://mvp-orders.vercel.app" "$ENDPOINT" 2>&1)
CORS_HEADER=$(echo "$RESPONSE" | grep -i "access-control-allow-origin" | head -1)
STATUS=$(echo "$RESPONSE" | grep "HTTP/" | tail -1 | awk '{print $2}')
echo "   Status: $STATUS"
echo "   $CORS_HEADER"
if [[ "$CORS_HEADER" == *"mvp-orders.vercel.app"* ]]; then
  echo "   ✅ PASS - Vercel origin allowed"
else
  echo "   ❌ FAIL - Vercel origin should be allowed"
fi
echo ""

# Test 3: Store domain (velaro-shop.ro) - should work if order belongs to this store
echo "3️⃣  Test: Store domain (velaro-shop.ro)"
RESPONSE=$(curl -s -i -H "Origin: https://velaro-shop.ro" "$ENDPOINT" 2>&1)
CORS_HEADER=$(echo "$RESPONSE" | grep -i "access-control-allow-origin" | head -1)
STATUS=$(echo "$RESPONSE" | grep "HTTP/" | tail -1 | awk '{print $2}')
BODY=$(echo "$RESPONSE" | tail -1)
echo "   Status: $STATUS"
echo "   $CORS_HEADER"
echo "   Body: $BODY"
if [[ "$STATUS" == "200" ]] && [[ "$CORS_HEADER" == *"velaro-shop.ro"* ]]; then
  echo "   ✅ PASS - Store origin allowed (order belongs to this store)"
elif [[ "$STATUS" == "403" ]]; then
  echo "   ⚠️  INFO - Store origin blocked (order might belong to different store)"
else
  echo "   ❓ CHECK - Unexpected response"
fi
echo ""

# Test 4: Store domain with www
echo "4️⃣  Test: Store domain with www (www.velaro-shop.ro)"
RESPONSE=$(curl -s -i -H "Origin: https://www.velaro-shop.ro" "$ENDPOINT" 2>&1)
CORS_HEADER=$(echo "$RESPONSE" | grep -i "access-control-allow-origin" | head -1)
STATUS=$(echo "$RESPONSE" | grep "HTTP/" | tail -1 | awk '{print $2}')
echo "   Status: $STATUS"
echo "   $CORS_HEADER"
if [[ "$STATUS" == "200" ]] && [[ "$CORS_HEADER" == *"www.velaro-shop.ro"* ]]; then
  echo "   ✅ PASS - WWW variant allowed"
elif [[ "$STATUS" == "403" ]]; then
  echo "   ⚠️  INFO - WWW variant blocked (order might belong to different store)"
else
  echo "   ❓ CHECK - Unexpected response"
fi
echo ""

# Test 5: Unauthorized domain (should be blocked)
echo "5️⃣  Test: Unauthorized domain (hacker-site.com)"
RESPONSE=$(curl -s -i -H "Origin: https://hacker-site.com" "$ENDPOINT" 2>&1)
CORS_HEADER=$(echo "$RESPONSE" | grep -i "access-control-allow-origin" | head -1)
STATUS=$(echo "$RESPONSE" | grep "HTTP/" | tail -1 | awk '{print $2}')
BODY=$(echo "$RESPONSE" | tail -1)
echo "   Status: $STATUS"
echo "   $CORS_HEADER"
echo "   Body: $BODY"
if [[ "$STATUS" == "403" ]] && [[ "$BODY" == *"Origin not allowed"* ]]; then
  echo "   ✅ PASS - Unauthorized origin blocked with 403"
else
  echo "   ❌ FAIL - Unauthorized origin should be blocked"
fi
echo ""

# Test 6: OPTIONS preflight for .ro domain
echo "6️⃣  Test: OPTIONS preflight (velaro-shop.ro)"
RESPONSE=$(curl -s -i -X OPTIONS -H "Origin: https://velaro-shop.ro" "$ENDPOINT" 2>&1)
CORS_HEADER=$(echo "$RESPONSE" | grep -i "access-control-allow-origin" | head -1)
STATUS=$(echo "$RESPONSE" | grep "HTTP/" | tail -1 | awk '{print $2}')
echo "   Status: $STATUS"
echo "   $CORS_HEADER"
if [[ "$STATUS" == "204" ]] && [[ "$CORS_HEADER" == *"velaro-shop.ro"* ]]; then
  echo "   ✅ PASS - Preflight allows .ro domains"
else
  echo "   ❌ FAIL - Preflight should allow .ro domains"
fi
echo ""

# Test 7: No origin header
echo "7️⃣  Test: No Origin header (direct request)"
RESPONSE=$(curl -s -i "$ENDPOINT" 2>&1)
CORS_HEADER=$(echo "$RESPONSE" | grep -i "access-control-allow-origin" | head -1)
STATUS=$(echo "$RESPONSE" | grep "HTTP/" | tail -1 | awk '{print $2}')
echo "   Status: $STATUS"
echo "   $CORS_HEADER"
if [[ "$STATUS" == "403" ]]; then
  echo "   ✅ PASS - Requests without origin are blocked"
else
  echo "   ⚠️  INFO - Request without origin returned $STATUS"
fi
echo ""

echo "=============================================="
echo "🏁 Test complete!"
echo ""
echo "Note: Tests 3-4 depend on the order's store.url in the database."
echo "If the order belongs to a store with url='velaro-shop.ro', tests 3-4 should pass."
