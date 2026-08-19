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

echo "1/6 Formatting code..."
npm run format

echo "2/6 Checking formatting..."
npm run format:check

echo "3/6 Checking TypeScript build..."
npm run build

echo "Running automated tests..."
npm test

echo "4/6 Creating deployment archive..."
tar \
    --exclude="./node_modules" \
    --exclude="./dist" \
    --exclude="./.git" \
    --exclude="./.vscode" \
    --exclude="./.env" \
    --exclude="./deploy.ps1" \
    --exclude="./deploy.sh" \
    -czf "$LOCAL_ARCHIVE" .

echo "5/6 Uploading archive..."
scp "$LOCAL_ARCHIVE" "${SERVER}:${REMOTE_ARCHIVE}"

echo "6/6 Installing and restarting server..."
ssh "$SERVER" "
    set -e
    cd '$REMOTE_PATH'
    tar -xzf '$REMOTE_ARCHIVE'
    rm -f '$REMOTE_ARCHIVE'
    npm ci
    npm run build
    pm2 restart 0 --update-env
    pm2 save
    pm2 status
"

echo
echo "Deployment completed successfully."
