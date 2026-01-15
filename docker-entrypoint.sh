#!/bin/sh
set -e

# Fix permissions for mounted volumes at runtime
# This runs as root before switching to the app user

current_uid="$(id -u)"

if [ -d "/data" ]; then
    if [ "$current_uid" -eq 0 ]; then
        # Ensure the data directory is writable by UID 1000
        chown -R 1000:1000 /data 2>/dev/null || true
        chmod 755 /data 2>/dev/null || true
        echo "[Entrypoint] Fixed /data permissions"
    else
        echo "[Entrypoint] Running as UID ${current_uid}; skipping permission fix for /data"
    fi
fi

# Switch to non-root user and execute the command
if [ "$current_uid" -eq 0 ]; then
    exec su-exec 1000:1000 "$@"
fi

exec "$@"
