#!/bin/sh
set -e

PUID=${PUID:-1000}
PGID=${PGID:-1000}

# Adjust node user UID/GID if needed
CURRENT_UID=$(id -u node)
CURRENT_GID=$(id -g node)

if [ "$PGID" != "$CURRENT_GID" ]; then
  delgroup node 2>/dev/null || true
  addgroup -g "$PGID" node
  addgroup node node
  echo "GID changed: $CURRENT_GID -> $PGID"
fi

if [ "$PUID" != "$CURRENT_UID" ]; then
  sed -i "s/^node:x:${CURRENT_UID}:/node:x:${PUID}:/" /etc/passwd
  echo "UID changed: $CURRENT_UID -> $PUID"
fi

# Fix ownership of app and workspace directories
chown node:node /app
chown node:node /workspace 2>/dev/null || true

# Copy Welcome.md to workspace if it doesn't exist and workspace is empty
if [ -d /workspace ] && [ -z "$(ls -A /workspace 2>/dev/null)" ]; then
  if [ -f /app/defaults/Welcome.md ]; then
    cp /app/defaults/Welcome.md /workspace/Welcome.md
    chown node:node /workspace/Welcome.md
    echo "Welcome.md copied to workspace"
  fi
fi

# Drop privileges and execute the main command
exec su-exec node "$@"
