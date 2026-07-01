#!/bin/bash
# VERDICT — Start everything: Docker containers + Next.js frontend
# Usage: bash start.sh

set -e

echo "═══════════════════════════════════════════════════════════"
echo "  VERDICT — Starting local dev environment"
echo "═══════════════════════════════════════════════════════════"
echo ""

# 1. Clean up old containers
echo "[1/4] Cleaning up old containers..."
docker rm -f midnight-proof-server midnight-indexer midnight-node 2>/dev/null || true

# 2. Start Docker containers
echo "[2/4] Starting Midnight containers (node, indexer, proof-server)..."
cd counter-cli
docker compose -f standalone.yml up -d
cd ..

# 3. Wait for node + indexer to be healthy
echo "[3/4] Waiting for services..."
echo -n "  Node: "
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:9944/health > /dev/null 2>&1; then
    echo "healthy"
    break
  fi
  sleep 2
  echo -n "."
done

echo -n "  Indexer: "
for i in $(seq 1 60); do
  if curl -sf -X POST http://127.0.0.1:8088/api/v3/graphql \
    -H "Content-Type: application/json" \
    -d '{"query":"{ block { height } }"}' > /dev/null 2>&1; then
    echo "healthy"
    break
  fi
  sleep 2
  echo -n "."
done

echo -n "  Proof Server: "
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:6300/version > /dev/null 2>&1; then
    echo "healthy (v$(curl -sf http://127.0.0.1:6300/version))"
    break
  fi
  sleep 2
  echo -n "."
done

# 4. Start Next.js
echo "[4/4] Starting VERDICT frontend..."
cd verdict
npx next dev --port 3000 &
NEXT_PID=$!
cd ..

sleep 3
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  VERDICT is running"
echo ""
echo "  Frontend:     http://localhost:3000"
echo "  Node:         http://127.0.0.1:9944"
echo "  Indexer:      http://127.0.0.1:8088/api/v3/graphql"
echo "  Proof Server: http://127.0.0.1:6300"
echo ""
echo "  API endpoints:"
echo "    GET  /api/status   — network health + block height"
echo "    GET  /api/feed     — live verification feed"
echo "    GET  /api/rulesets — deployed rulesets"
echo "    GET  /api/wallet   — wallet info (triggers init)"
echo "    POST /api/deploy   — deploy contract"
echo "    POST /api/compile  — English → Compact (Gemini)"
echo ""
echo "  Press Ctrl+C to stop"
echo "═══════════════════════════════════════════════════════════"

# Trap Ctrl+C to clean shutdown
trap "echo ''; echo 'Shutting down...'; kill $NEXT_PID 2>/dev/null; cd counter-cli && docker compose -f standalone.yml down; echo 'Done.'; exit 0" INT

wait $NEXT_PID
