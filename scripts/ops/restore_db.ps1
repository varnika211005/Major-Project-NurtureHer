param(
    [Parameter(Mandatory=$true)][string]$BackupFile,
    [string]$Container = "nurtureher-db",
    [string]$Database = "nurtureher",
    [string]$User = "nurtureher"
)

if (!(Test-Path $BackupFile)) {
    throw "Backup file not found: $BackupFile"
}

Get-Content $BackupFile -Raw | gunzip | docker exec -i $Container psql -U $User -d $Database
Write-Host "Restore completed from $BackupFile"

