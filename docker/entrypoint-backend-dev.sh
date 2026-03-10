#!/bin/sh
set -e

# Entrypoint simplificado para desenvolvimento
# No Docker rootless, uid 0 no container = usuário do host, então não precisamos de su-exec

WORKSPACE_ROOT=${WORKSPACE_ROOT:-/workspace}

if [ -n "$EXTRA_VOLUMES" ]; then
  for entry in $(echo "$EXTRA_VOLUMES" | tr ',' ' '); do
    mount_path=$(echo "$entry" | cut -d':' -f2- | xargs)
    if [ -n "$mount_path" ] && [ -d "$mount_path" ]; then
      chmod a+rwx "$mount_path" 2>/dev/null || true
    fi
  done
fi

exec "$@"
