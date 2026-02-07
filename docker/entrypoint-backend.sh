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

# Fix ownership of app directory
chown node:node /app

# Build list of all volume mount paths
WORKSPACE_ROOT=${WORKSPACE_ROOT:-/workspace}
VOLUME_PATHS="$WORKSPACE_ROOT"

if [ -n "$WORKSPACE_PATHS" ]; then
  # WORKSPACE_PATHS overrides: extract mount paths (format: name1:/path1,name2:/path2)
  VOLUME_PATHS=""
  for entry in $(echo "$WORKSPACE_PATHS" | tr ',' ' '); do
    mount_path=$(echo "$entry" | cut -d':' -f2- | xargs)
    if [ -n "$mount_path" ]; then
      VOLUME_PATHS="$VOLUME_PATHS $mount_path"
    fi
  done
elif [ -n "$EXTRA_VOLUMES" ]; then
  # EXTRA_VOLUMES: add extra mount paths alongside WORKSPACE_ROOT
  for entry in $(echo "$EXTRA_VOLUMES" | tr ',' ' '); do
    mount_path=$(echo "$entry" | cut -d':' -f2- | xargs)
    if [ -n "$mount_path" ]; then
      VOLUME_PATHS="$VOLUME_PATHS $mount_path"
    fi
  done
fi

# Fix ownership of all volume directories
for vol_path in $VOLUME_PATHS; do
  if [ -d "$vol_path" ]; then
    chown node:node "$vol_path" 2>/dev/null || echo "Warning: could not chown $vol_path"
    echo "Volume $vol_path: permissions set for node ($PUID:$PGID)"
  fi
done

# Copy Welcome.md to workspace if it doesn't exist and workspace is empty
if [ -d "$WORKSPACE_ROOT" ] && [ -z "$(ls -A "$WORKSPACE_ROOT" 2>/dev/null)" ]; then
  if [ -f /app/defaults/Welcome.md ]; then
    cp /app/defaults/Welcome.md "$WORKSPACE_ROOT/Welcome.md"
    chown node:node "$WORKSPACE_ROOT/Welcome.md"
    echo "Welcome.md copied to workspace"
  fi
fi

# Drop privileges and execute the main command
exec su-exec node "$@"
