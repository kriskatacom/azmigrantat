$ErrorActionPreference = "Stop"

$Server = "almalinux@185.228.26.171"
$RemotePath = "/home/almalinux/apps/azmigrantat-realtime"
$RemoteArchive = "/tmp/azmigrantat-realtime-download.tar.gz"

$LocalPath = (Get-Location).Path
$LocalArchive = Join-Path $LocalPath ".server-download.tar.gz"

Write-Host "1/4 Creating archive on VPS..." -ForegroundColor Cyan

$CreateArchiveCommand = "set -e; cd '$RemotePath'; rm -f '$RemoteArchive'; tar --exclude='./node_modules' --exclude='*/node_modules' -czf '$RemoteArchive' ."

ssh $Server $CreateArchiveCommand

if ($LASTEXITCODE -ne 0) {
    throw "Could not create archive on VPS."
}

Write-Host "2/4 Downloading archive..." -ForegroundColor Cyan

scp "${Server}:${RemoteArchive}" $LocalArchive

if ($LASTEXITCODE -ne 0) {
    ssh $Server "rm -f '$RemoteArchive'"
    throw "Could not download archive from VPS."
}

Write-Host "3/4 Extracting files..." -ForegroundColor Cyan

tar -xzf $LocalArchive -C $LocalPath

if ($LASTEXITCODE -ne 0) {
    throw "Could not extract downloaded archive."
}

Write-Host "4/4 Cleaning temporary files..." -ForegroundColor Cyan

ssh $Server "rm -f '$RemoteArchive'"

try {
    [System.IO.File]::Delete($LocalArchive)
}
catch {
    Write-Warning "Temporary local archive could not be deleted: $LocalArchive"
}

Write-Host ""
Write-Host "Download completed successfully." -ForegroundColor Green
