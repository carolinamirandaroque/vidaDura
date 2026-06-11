#!/usr/bin/env bash
set -euo pipefail

npm ci --include=dev
cd apps/api
npx prisma generate
cd ../..
npm run build:api:deploy
cd apps/api
npx prisma db push
