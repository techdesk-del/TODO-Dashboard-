#!/bin/sh
# ============================================================
# UrbanGaon AI Todo Platform — Synology DS925+ Auto-Update Script
# Triggered via: Synology DSM Task Scheduler (every 2-5 minutes)
# ============================================================

PROJECT_DIR="/volume1/docker/urbangaon-todo"
LOG_FILE="$PROJECT_DIR/deploy.log"
LOCK_FILE="/tmp/nas_auto_update.lock"
BRANCH="main"

# Ensure docker and git paths are in PATH
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/syno/bin:$PATH"

# Prevent concurrent builds
if [ -f "$LOCK_FILE" ]; then
  exit 0
fi

cd "$PROJECT_DIR" || exit 1

# Prevent git dubious ownership error on Synology DSM
git config --global --add safe.directory "$PROJECT_DIR" >/dev/null 2>&1

# Timestamp logger
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Fetch remote changes without merging
git fetch origin "$BRANCH" --quiet 2>> "$LOG_FILE"

# Compare local commit with remote commit
LOCAL_HASH=$(git rev-parse HEAD 2>/dev/null)
REMOTE_HASH=$(git rev-parse origin/"$BRANCH" 2>/dev/null)

if [ -n "$REMOTE_HASH" ] && [ "$LOCAL_HASH" != "$REMOTE_HASH" ]; then
  touch "$LOCK_FILE"
  log "🚀 New commit detected on $BRANCH ($LOCAL_HASH -> $REMOTE_HASH). Starting auto-deployment..."

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
  rm -f "$LOCK_FILE"
else
  # No changes detected; silent exit
  exit 0
fi
