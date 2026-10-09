#!/bin/sh
# ============================================================
# UrbanGaon AI Todo Platform — Synology DS925+ Auto-Update Script
# Triggered via: Synology DSM Task Scheduler (every 2-5 minutes)
# ============================================================

PROJECT_DIR="/volume1/docker/urbangaon-todo"
LOG_FILE="$PROJECT_DIR/deploy.log"
BRANCH="main"

cd "$PROJECT_DIR" || exit 1

# Timestamp logger
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Fetch remote changes without merging
git fetch origin "$BRANCH" --quiet 2>> "$LOG_FILE"

# Compare local commit with remote commit
LOCAL_HASH=$(git rev-parse HEAD)
REMOTE_HASH=$(git rev-parse origin/"$BRANCH")

if [ "$LOCAL_HASH" != "$REMOTE_HASH" ]; then
  log "🚀 New commit detected on $BRANCH ($LOCAL_HASH -> $REMOTE_HASH). Starting deployment..."

  # Pull latest code
  git pull origin "$BRANCH" >> "$LOG_FILE" 2>&1

  # Ensure .env exists
  if [ ! -f .env ]; then
    log "⚠️ Warning: .env file not found. Copying .env.nas.example to .env..."
    cp .env.nas.example .env
  fi

  # Rebuild and recreate only the Next.js app container (MongoDB stays untouched)
  log "🔨 Rebuilding urbangaon-todo container..."
  docker compose up -d --build urbangaon-todo >> "$LOG_FILE" 2>&1

  # Clean up dangling images to save NAS disk space
  docker image prune -f >> "$LOG_FILE" 2>&1

  log "✅ Deployment completed successfully! Running commit: $(git rev-parse --short HEAD)"
else
  # No changes detected; silent exit to avoid log bloating
  exit 0
fi
