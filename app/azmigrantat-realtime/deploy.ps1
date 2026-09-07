$ErrorActionPreference = "Stop"

$Server = "almalinux@185.228.26.171"
$RemotePath = "/home/almalinux/apps/azmigrantat-realtime"
$RemoteArchive = "/tmp/azmigrantat-realtime-deploy.tar.gz"
$LocalArchive = Join-Path $env:TEMP "azmigrantat-realtime-deploy.tar.gz"

Write-Host "1/6 Formatting code..." -ForegroundColor Cyan
npm run format

if ($LASTEXITCODE -ne 0) {
    throw "Automatic formatting failed."
}

Write-Host "2/6 Checking formatting..." -ForegroundColor Cyan
npm run format:check

if ($LASTEXITCODE -ne 0) {
    throw "Formatting check failed."
}

Write-Host "3/6 Checking TypeScript build..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
    throw "TypeScript build failed."
}

Write-Host "Running automated tests..." -ForegroundColor Cyan
npm test

if ($LASTEXITCODE -ne 0) {
    throw "Tests failed. Deployment was cancelled."
}

Write-Host "4/6 Creating deployment archive..." -ForegroundColor Cyan

try {
    [System.IO.File]::Delete($LocalArchive)
}
catch {
    Write-Warning "Temporary archive could not be deleted: $LocalArchive"
}

tar --exclude="./node_modules" --exclude="./dist" --exclude="./.git" --exclude="./.vscode" --exclude="./.env" --exclude="./deploy.ps1" -czf $LocalArchive .

if ($LASTEXITCODE -ne 0) {
    throw "Could not create deployment archive."
}

Write-Host "5/6 Uploading archive..." -ForegroundColor Cyan
scp $LocalArchive "${Server}:${RemoteArchive}"

if ($LASTEXITCODE -ne 0) {
    throw "Could not upload deployment archive."
}

Write-Host "6/6 Installing and restarting server..." -ForegroundColor Cyan

$RemoteCommand = "set -e; cd '$RemotePath'; tar -xzf '$RemoteArchive'; rm -f '$RemoteArchive'; npm ci; npm run build; pm2 restart 0 --update-env; pm2 save; pm2 status"

ssh $Server $RemoteCommand

if ($LASTEXITCODE -ne 0) {
    throw "Remote deployment failed."
}

try {
    [System.IO.File]::Delete($LocalArchive)
}
catch {
    Write-Warning "Temporary archive could not be deleted: $LocalArchive"
}

Write-Host ""
Write-Host "Deployment completed successfully." -ForegroundColor Green
