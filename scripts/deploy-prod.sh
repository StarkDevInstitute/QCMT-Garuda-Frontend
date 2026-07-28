#!/usr/bin/env bash
set -euo pipefail

APP_NAME="scmtv-prod"
ECOSYSTEM_FILE="ecosystem.config.cjs"

npm run build

if npx pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  npx pm2 restart "$APP_NAME" --update-env
else
  npx pm2 start "$ECOSYSTEM_FILE" --only "$APP_NAME"
fi

npx pm2 save
npx pm2 status "$APP_NAME"
