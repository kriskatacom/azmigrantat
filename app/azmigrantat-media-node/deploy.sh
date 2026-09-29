#!/usr/bin/env bash

set -euo pipefail

SERVER="root@185.199.38.75"
REMOTE_PATH="/opt/azmigrantat/media-node"
REMOTE_ARCHIVE="/tmp/azmigrantat-media-node-deploy.tar.gz"
LOCAL_ARCHIVE="$(mktemp --suffix=.tar.gz /tmp/azmigrantat-media-node-deploy.XXXXXX)"

cleanup() {
    rm -f "$LOCAL_ARCHIVE"
}
trap cleanup EXIT

echo "1/5 Checking TypeScript build..."
npm run build

echo "2/5 Running tests..."
npm test

echo "3/5 Creating deployment archive..."
tar \
    --exclude="./node_modules" \
    --exclude="./dist" \
    --exclude="./.git" \
    --exclude="./.vscode" \
    --exclude="./.env" \
    --exclude="./coverage" \
    --exclude="./deploy.sh" \
    -czf "$LOCAL_ARCHIVE" .

echo "4/5 Uploading to dedicated server..."
scp "$LOCAL_ARCHIVE" "${SERVER}:${REMOTE_ARCHIVE}"

echo "5/5 Building and restarting media-node..."
ssh "$SERVER" "
    set -e

    cd '$REMOTE_PATH'

    tar -xzf '$REMOTE_ARCHIVE'
    rm -f '$REMOTE_ARCHIVE'

    echo 'Building Docker image...'
    docker compose build media-node

    echo 'Recreating media-node...'
    docker compose up -d --force-recreate media-node

    sleep 5

    echo
    echo 'Container status:'
    docker compose ps

    echo
    echo 'Health check:'
    curl -f http://127.0.0.1:3002/health

    echo
    echo
    echo 'Recent media-node logs:'
    docker logs --tail 30 azmigrantat-media-node
"

echo
echo "Dedicated media-node deployment completed successfully."