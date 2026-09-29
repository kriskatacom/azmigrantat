#!/usr/bin/env bash

set -euo pipefail

SERVER="almalinux@185.228.26.171"
REMOTE_PATH="/home/almalinux/apps/azmigrantat-realtime"
REMOTE_ARCHIVE="/tmp/azmigrantat-realtime-deploy.tar.gz"
LOCAL_ARCHIVE="$(mktemp --suffix=.tar.gz /tmp/azmigrantat-realtime-deploy.XXXXXX)"

cleanup() {
    rm -f "$LOCAL_ARCHIVE"
}
trap cleanup EXIT

echo "1/7 Formatting code..."
npm run format

echo "2/7 Checking formatting..."
npm run format:check

echo "3/7 Building locally..."
npm run build

echo "4/7 Running automated tests..."
npm test

echo "5/7 Creating deployment archive..."
tar \
    --exclude="./node_modules" \
    --exclude="./.git" \
    --exclude="./.vscode" \
    --exclude="./.env" \
    --exclude="./secrets" \
    --exclude="./coverage" \
    --exclude="./deploy.ps1" \
    --exclude="./deploy.sh" \
    -czf "$LOCAL_ARCHIVE" .

echo "6/7 Uploading archive..."
scp "$LOCAL_ARCHIVE" "${SERVER}:${REMOTE_ARCHIVE}"

echo "7/7 Installing production dependencies and restarting..."
ssh "$SERVER" "
    set -e

    cd '$REMOTE_PATH'

    tar -xzf '$REMOTE_ARCHIVE'
    rm -f '$REMOTE_ARCHIVE'

    npm ci --omit=dev --no-audit --no-fund

    pm2 restart azmigrantat-realtime --update-env
    pm2 save
    pm2 status

    sleep 2
    curl -f http://127.0.0.1:3001/health
"

echo
echo "Deployment completed successfully."