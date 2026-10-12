# Backup And Restore

Create a backup from local Docker:

```powershell
.\scripts\ops\backup_db.ps1
```

Restore a backup:

```powershell
.\scripts\ops\restore_db.ps1 -BackupFile .\backups\nurtureher_YYYYMMDD_HHMMSS.sql.gz
```

Production recommendations:

- Enable daily automated PostgreSQL backups.
- Keep point-in-time recovery enabled.
- Store backups in encrypted object storage.
- Test restores monthly in a non-production environment.

