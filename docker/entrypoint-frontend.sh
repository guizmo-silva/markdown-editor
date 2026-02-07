#!/bin/sh
set -e

# Generate runtime config with the backend API port
API_PORT=${API_PORT:-3011}

cat > /app/public/runtime-config.js <<EOF
window.__RUNTIME_CONFIG__ = { apiPort: "${API_PORT}" };
EOF

echo "Runtime config: API_PORT=${API_PORT}"

# Execute the main command
exec "$@"
