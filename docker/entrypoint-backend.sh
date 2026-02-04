#!/bin/sh
set -e

# Copy Welcome.md to workspace if it doesn't exist and workspace is empty
if [ -d /workspace ] && [ -z "$(ls -A /workspace 2>/dev/null)" ]; then
  if [ -f /app/defaults/Welcome.md ]; then
    cp /app/defaults/Welcome.md /workspace/Welcome.md
    echo "Welcome.md copied to workspace"
  fi
fi

# Execute the main command
exec "$@"
