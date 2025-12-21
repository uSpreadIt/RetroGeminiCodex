#!/bin/sh
set -e

# Fix permissions for mounted volumes at runtime
# This runs as root before switching to the app user

if [ -d "/data" ]; then
    # Ensure the data directory is writable by UID 1000
    chown -R 1000:1000 /data 2>/dev/null || true
    chmod 755 /data 2>/dev/null || true
    echo "[Entrypoint] Fixed /data permissions"
fi

# Switch to non-root user and execute the command
exec su-exec 1000:1000 "$@"
