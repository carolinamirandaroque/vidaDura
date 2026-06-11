#!/usr/bin/env bash
set -euo pipefail

npm ci --include=dev
npm run build:api:deploy
cd apps/api
npx prisma generate
npx prisma db push
