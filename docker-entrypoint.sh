#!/bin/sh
set -e
mkdir -p /app/saves
if [ "$(id -u)" = "0" ]; then
  chown -R node:node /app/saves
  exec su-exec node "$@"
fi
exec "$@"
