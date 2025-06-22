#!/usr/bin/env bash

# Project Statistics Script
# =========================
#
# This script provides comprehensive statistics and metrics about your project:
# - Code statistics (lines of code, file counts)
# - Database metrics (table counts, record counts)
# - Docker container status
# - Git repository information
# - Recent activity and commits
#
# Usage:
#   ./scripts/stats.sh
#
# Prerequisites:
#   - Docker and Docker Compose installed
#   - Git repository initialized
#   - Database container running (for DB stats)
#
# Configuration:
#   All settings loaded from .env.local
#   See .env.example for available options

# Colors for better readability
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Exit on error
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

# Configuration
PROJECT_NAME="${PROJECT_NAME:-myapp}"
DB_CONTAINER="${PROJECT_NAME}-db"
DB_NAME="${DB_NAME:-$PROJECT_NAME}"
DB_USER="${DB_USER:-postgres}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
COMPOSE_PATH="${COMPOSE_PATH:-./infra}"

# Function to execute PostgreSQL queries
execute_query() {
    docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "$1" 2>/dev/null | tr -d ' ' || echo "0"
}

# Function to count files
count_files() {
    find . -name "$1" -not -path "*/node_modules/*" -not -path "*/.next/*" -not -path "*/dist/*" -not -path "*/.git/*" 2>/dev/null | wc -l | tr -d ' '
}

# Function to count lines of code
count_lines() {
    find . -name "$1" -not -path "*/node_modules/*" -not -path "*/.next/*" -not -path "*/dist/*" -not -path "*/.git/*" -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}' || echo "0"
}

# Clear screen and show header
clear
echo -e "${BOLD}${BLUE}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${BLUE}║       ${PROJECT_NAME} Project Statistics        ║${NC}"
echo -e "${BOLD}${BLUE}╚═══════════════════════════════════════════════╝${NC}"
echo -e "${YELLOW}📅 Generated on: $(date)${NC}\n"

# CODE STATISTICS
echo -e "${BOLD}${GREEN}📊 CODE STATISTICS:${NC}"
echo -e "TypeScript files: ${BOLD}$(count_files "*.ts")${NC} ($(count_lines "*.ts") lines)"
echo -e "TSX files: ${BOLD}$(count_files "*.tsx")${NC} ($(count_lines "*.tsx") lines)"
echo -e "JavaScript files: ${BOLD}$(count_files "*.js")${NC} ($(count_lines "*.js") lines)"
echo -e "SQL files: ${BOLD}$(count_files "*.sql")${NC} ($(count_lines "*.sql") lines)"
echo -e "Shell scripts: ${BOLD}$(count_files "*.sh")${NC} ($(count_lines "*.sh") lines)"

# GIT STATISTICS
echo -e "\n${BOLD}${GREEN}🌿 GIT REPOSITORY:${NC}"
if [ -d .git ]; then
    current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
    total_commits=$(git rev-list --count HEAD 2>/dev/null || echo "0")
    last_commit=$(git log -1 --pretty=format:"%h - %s (%cr)" 2>/dev/null || echo "No commits yet")
    uncommitted=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
    
    echo -e "Current branch: ${BOLD}$current_branch${NC}"
    echo -e "Total commits: ${BOLD}$total_commits${NC}"
    echo -e "Uncommitted changes: ${BOLD}$uncommitted${NC}"
    echo -e "Last commit: $last_commit"
else
    echo -e "${YELLOW}No git repository found${NC}"
fi

# DOCKER STATISTICS
echo -e "\n${BOLD}${GREEN}🐳 DOCKER CONTAINERS:${NC}"
if docker ps >/dev/null 2>&1; then
    running_containers=$(docker ps --filter "name=${PROJECT_NAME}" --format "table {{.Names}}\t{{.Status}}" | tail -n +2)
    if [ -n "$running_containers" ]; then
        echo "$running_containers"
    else
        echo -e "${YELLOW}No ${PROJECT_NAME} containers running${NC}"
    fi
else
    echo -e "${RED}Docker is not running${NC}"
fi

# DATABASE STATISTICS
echo -e "\n${BOLD}${GREEN}🗄️  DATABASE STATISTICS:${NC}"
if docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    # Get table count
    table_count=$(execute_query "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")
    echo -e "Tables: ${BOLD}$table_count${NC}"
    
    # Get database size
    db_size=$(execute_query "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" | tr -d ' ')
    echo -e "Database size: ${BOLD}$db_size${NC}"
    
    # Show record counts for main tables if they exist
    if [ "$table_count" -gt 0 ]; then
        echo -e "\n${BOLD}Record counts:${NC}"
        
        # Check common table names
        for table in users products orders sessions; do
            count=$(execute_query "SELECT COUNT(*) FROM $table;" 2>/dev/null || echo "")
            if [ -n "$count" ] && [ "$count" != "0" ]; then
                echo -e "  $table: ${BOLD}$count${NC}"
            fi
        done
    fi
else
    echo -e "${YELLOW}Database container not running${NC}"
    echo -e "Run ${BOLD}./scripts/dev.sh${NC} to start it"
fi

# RECENT ACTIVITY
echo -e "\n${BOLD}${GREEN}📈 RECENT ACTIVITY:${NC}"
if [ -d .git ]; then
    echo -e "\nRecent commits:"
    git log --oneline -5 2>/dev/null | sed 's/^/  /' || echo "  No commits yet"
fi

# PROJECT INFO
echo -e "\n${BOLD}${GREEN}ℹ️  PROJECT INFO:${NC}"
if [ -f package.json ]; then
    project_version=$(grep -o '"version": *"[^"]*"' package.json | cut -d'"' -f4 || echo "unknown")
    echo -e "Version: ${BOLD}$project_version${NC}"
fi
echo -e "Environment: ${BOLD}${NODE_ENV:-development}${NC}"
echo -e "Project path: ${BOLD}$(pwd)${NC}"

# USEFUL COMMANDS
echo -e "\n${BOLD}${BLUE}📌 USEFUL COMMANDS:${NC}"
echo -e "  Start dev: ${BOLD}./scripts/dev.sh${NC}"
echo -e "  Deploy prod: ${BOLD}./scripts/prod.sh${NC}"
echo -e "  Backup DB: ${BOLD}./scripts/backup-sql.sh${NC}"
echo -e "  Git commit: ${BOLD}bun scripts/git.ts${NC}"
echo -e "  View logs: ${BOLD}docker compose -f ${COMPOSE_PATH}/${COMPOSE_FILE} logs -f${NC}"

echo -e "\n${BOLD}${BLUE}╚═══════════════════════════════════════════════╝${NC}\n"
