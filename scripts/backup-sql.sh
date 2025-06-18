#!/usr/bin/env bash
#
# Database Backup Script with Schema Versioning
# =============================================
#
# This script creates comprehensive PostgreSQL database backups that include:
# - Complete database dump (schema + data)
# - Git commit hash for code correlation
# - Database migration version tracking
# - Automatic compression and rotation
#
# Usage:
#   ./scripts/backup-sql.sh              # Run manually
#   Automatically run by git.ts during commits
#
# Backup naming format:
#   backup_YYYYMMDD_HHMMSS_GITCOMMIT_SCHEMAVERSION.sql.gz
#
# Features:
#   - Automatic backup rotation (keeps last N backups)
#   - Compressed backups to save space
#   - Metadata tracking in JSON files
#   - Easy restoration commands
#
# Configuration:
#   Set in .env.local:
#   - PROJECT_NAME: Used for container name
#   - DB_NAME: Database to backup
#   - DB_USER: PostgreSQL user
#   - BACKUP_DIR: Where to store backups
#   - MAX_BACKUPS: Number of backups to keep
#

# Exit on error, undefined vars, pipe failures
set -euo pipefail

# Load environment variables
if [ -f .env.local ]; then
    set -a
    source .env.local
    set +a
elif [ -f .env.production ]; then
    set -a
    source .env.production
    set +a
fi

# Configuration with defaults
PROJECT_NAME="${PROJECT_NAME:-myapp}"
DB_CONTAINER="${PROJECT_NAME}-db"
DB_NAME="${DB_NAME:-$PROJECT_NAME}"
DB_USER="${DB_USER:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
MAX_BACKUPS="${MAX_BACKUPS:-10}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate backup metadata
# ========================

# Get current timestamp in format: YYYYMMDD_HHMMSS
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Get current git commit hash (short version)
# This helps correlate backups with specific code versions
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "no-git")

# Get database migration version from schema hash file
# This tracks which migration version the database is at
MIGRATION_VERSION="unknown"
if [ -f "./migrations/.schema-hash" ]; then
    # Use first 8 characters of the schema hash for brevity
    MIGRATION_VERSION=$(cat "./migrations/.schema-hash" | cut -c1-8)
fi

echo -e "${BLUE}🔄 Starting database backup...${NC}"
echo -e "   Container: ${DB_CONTAINER}"
echo -e "   Database: ${DB_NAME}"
echo -e "   Git commit: ${GIT_COMMIT}"
echo -e "   Schema version: ${MIGRATION_VERSION}"

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    echo -e "${YELLOW}⚠️  Warning: Database container '${DB_CONTAINER}' is not running${NC}"
    echo -e "   Starting container..."
    
    # Try to start the container
    if ! docker start "${DB_CONTAINER}" 2>/dev/null; then
        echo -e "${RED}❌ Could not start database container${NC}"
        echo -e "   Make sure to run './scripts/dev.sh' first"
        exit 1
    fi
    
    # Wait for database to be ready
    echo -e "   Waiting for database to be ready..."
    sleep 5
fi

# Create backup filename with metadata
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}_${GIT_COMMIT}_${MIGRATION_VERSION}.sql"
METADATA_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}_${GIT_COMMIT}_${MIGRATION_VERSION}.json"

# Perform the backup
echo -e "${BLUE}📦 Creating backup...${NC}"
if docker exec "${DB_CONTAINER}" pg_dump -U "${DB_USER}" "${DB_NAME}" > "${BACKUP_FILE}" 2>/dev/null; then
    # Compress the backup
    gzip "${BACKUP_FILE}"
    BACKUP_FILE="${BACKUP_FILE}.gz"
    
    # Get backup size
    BACKUP_SIZE=$(ls -lh "${BACKUP_FILE}" | awk '{print $5}')
    
    # Create metadata file
    cat > "${METADATA_FILE}" <<EOF
{
  "timestamp": "${TIMESTAMP}",
  "git_commit": "${GIT_COMMIT}",
  "schema_version": "${MIGRATION_VERSION}",
  "database": "${DB_NAME}",
  "size": "${BACKUP_SIZE}",
  "file": "$(basename "${BACKUP_FILE}")"
}
EOF
    
    echo -e "${GREEN}✅ Backup created successfully!${NC}"
    echo -e "   File: ${BACKUP_FILE}"
    echo -e "   Size: ${BACKUP_SIZE}"
else
    echo -e "${RED}❌ Backup failed!${NC}"
    rm -f "${BACKUP_FILE}" "${METADATA_FILE}" 2>/dev/null
    exit 1
fi

# Clean up old backups (keep only the last N backups)
echo -e "${BLUE}🧹 Cleaning up old backups...${NC}"
BACKUP_COUNT=$(ls -1 "${BACKUP_DIR}"/backup_*.sql.gz 2>/dev/null | wc -l)

if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
    # Find and remove oldest backups
    ls -1t "${BACKUP_DIR}"/backup_*.sql.gz | tail -n +$((MAX_BACKUPS + 1)) | while read -r old_backup; do
        # Also remove associated metadata file
        metadata_file="${old_backup%.sql.gz}.json"
        echo -e "   Removing: $(basename "$old_backup")"
        rm -f "$old_backup" "$metadata_file"
    done
    echo -e "${GREEN}✅ Cleaned up $((BACKUP_COUNT - MAX_BACKUPS)) old backup(s)${NC}"
else
    echo -e "   No cleanup needed (${BACKUP_COUNT}/${MAX_BACKUPS} backups)"
fi

# Add backup files to .gitignore if not already there
if ! grep -q "^backups/" .gitignore 2>/dev/null; then
    echo -e "\n# Database backups\nbackups/" >> .gitignore
    echo -e "${YELLOW}ℹ️  Added 'backups/' to .gitignore${NC}"
fi

echo -e "\n${GREEN}✅ Database backup completed successfully!${NC}"
echo -e "${BLUE}ℹ️  To restore from this backup, run:${NC}"
echo -e "   gunzip -c ${BACKUP_FILE} | docker exec -i ${DB_CONTAINER} psql -U ${DB_USER} ${DB_NAME}"