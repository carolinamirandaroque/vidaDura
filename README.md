# VidaDura

Plataforma de gestão pessoal e colaborativa — calendário, tarefas hierárquicas, eventos, divisão de despesas e contactos.

## Stack

| Camada | Tecnologias |
|--------|-------------|
| Monorepo | Turborepo, npm workspaces |
| Frontend | React, Vite, TypeScript, TailwindCSS, shadcn/ui, TanStack Query, Zustand, React Router, PWA |
| Backend | NestJS, Prisma, PostgreSQL, JWT, Google OAuth, WebSockets |
| Shared | `@lifehub/types`, `@lifehub/utils`, `@lifehub/ui` |

## Estrutura

```
apps/
  api/     # NestJS backend
  web/     # React frontend (PWA)
packages/
  types/   # TypeScript types partilhados
  utils/   # Utilitários (tasks, expenses, dates)
  ui/      # Componentes shadcn/ui
```

## Pré-requisitos

- Node.js >= 20
- Docker (para PostgreSQL)

## Setup

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar PostgreSQL
docker compose up -d

# 3. Configurar variáveis de ambiente
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 4. Gerar Prisma client e aplicar schema
npm run db:generate
npm run db:push

# 5. Seed inicial
npm run db:seed

# 6. Iniciar em desenvolvimento
npm run dev
```

- **Frontend**: http://localhost:5173
- **API**: http://localhost:3001/api
- **Swagger**: http://localhost:3001/api/docs

## Contas de teste (seed)

| Email | Password |
|-------|----------|
| maria@vidadura.pt | password123 |
| carolina@vidadura.pt | password123 |

Sem conexões pré-criadas — ideal para testar pedidos de contacto e partilha de secções de compras.

## Módulos API

| Módulo | Endpoints |
|--------|-----------|
| Auth | register, login, refresh, logout, Google OAuth |
| Users | profile, search |
| Connections | send/accept/reject/remove, contacts |
| Calendars | CRUD, members (owner/editor/viewer) |
| Events | CRUD, invites, recurrence |
| Tasks | CRUD, tree, reorder, filters |
| Expenses | CRUD, balances, debts |
| Notifications | list, mark read, WebSocket |
| Dashboard | aggregated overview |

## Arquitetura

Clean Architecture no backend:

```
src/
  common/           # Guards, decorators, mappers
  infrastructure/   # Prisma, WebSocket
  modules/          # Feature modules
    auth/
      dto/
      strategies/
      auth.controller.ts
      auth.service.ts
      auth.module.ts
```

Cada módulo segue: **Controller → Service → Repository → Prisma**

## Scripts

```bash
npm run dev          # Inicia api + web
npm run build        # Build de produção
npm run test         # Testes
npm run db:generate  # Prisma generate
npm run db:push      # Aplica schema
npm run db:seed      # Dados iniciais
```

## PWA

A app web é instalável em Android, iOS e Desktop com:
- Service Worker com cache inteligente
- Network-first para API
- Offline-first para assets estáticos
- Sincronização automática ao voltar online

## Google OAuth

Configura no [Google Cloud Console](https://console.cloud.google.com/):
1. Cria OAuth 2.0 credentials
2. Adiciona redirect URI: `http://localhost:3001/api/auth/google/callback`
3. Preenche `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no `.env`
