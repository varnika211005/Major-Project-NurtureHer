param(
    [string]$OutputDir = "backups",
    [string]$Container = "nurtureher-db",
    [string]$Database = "nurtureher",
    [string]$User = "nurtureher"
)

New-Item -ItemType Directory -Force $OutputDir | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$file = Join-Path $OutputDir "nurtureher_$timestamp.sql.gz"
docker exec $Container pg_dump -U $User $Database | gzip > $file
Write-Host "Backup written to $file"

