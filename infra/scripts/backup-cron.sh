#!/bin/sh

# Production backup script for PostgreSQL
# Runs inside the backup container via cron

set -e

# Configuration
BACKUP_DIR="/backups"
DB_HOST="db"
DB_NAME="${POSTGRES_DB:-conkero}"
DB_USER="${POSTGRES_USER:-conkero}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/conkero-backup-${TIMESTAMP}.sql"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Starting backup of database ${DB_NAME}..."

# Perform backup
pg_dump -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" --no-password > "${BACKUP_FILE}"

# Compress backup
gzip "${BACKUP_FILE}"
BACKUP_FILE="${BACKUP_FILE}.gz"

# Check if backup was successful
if [ -f "${BACKUP_FILE}" ]; then
    SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    echo "[$(date)] Backup completed successfully: ${BACKUP_FILE} (${SIZE})"
    
    # Remove old backups
    echo "[$(date)] Removing backups older than ${RETENTION_DAYS} days..."
    find "${BACKUP_DIR}" -name "conkero-backup-*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete
    
    # List remaining backups
    echo "[$(date)] Current backups:"
    ls -lh "${BACKUP_DIR}"/conkero-backup-*.sql.gz 2>/dev/null || echo "No backups found"
else
    echo "[$(date)] ERROR: Backup failed!"
    exit 1
fi

echo "[$(date)] Backup process completed."