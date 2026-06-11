#!/usr/bin/env bash
set -euo pipefail

# Render sets NODE_ENV=production which skips devDependencies (@types/*, nest CLI).
export NPM_CONFIG_PRODUCTION=false
export NODE_ENV=development

npm ci --include=dev
cd apps/api
npx prisma generate
npx prisma db execute --schema prisma/schema.prisma --file prisma/sql/migrate-hub-event-type.sql 2>/dev/null || true
cd ../..
npm run build:api:deploy
cd apps/api
npx prisma db push
