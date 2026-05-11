# Petloo Dashboard

Dashboard interno de gestão de assinaturas da Petloo. Consome a API da Pagar.me v5
e armazena os dados num PostgreSQL (Supabase) próprio para permitir consultas
rápidas, relatórios cruzados e visão completa da saúde de cada cliente.

## Stack

- **Next.js 14** (App Router) + **TypeScript strict**
- **Supabase** (PostgreSQL + Auth) — service role no backend
- **TailwindCSS** + **Shadcn/ui** + **Recharts** + **TanStack Table v8**
- **Zod** para validação, **date-fns** (pt-BR) para datas

## Setup local

### 1. Pré-requisitos

- Node.js 20+
- Conta no [Supabase](https://supabase.com) (plano free serve)
- Conta na [Pagar.me](https://pagar.me) com `secret_key` (sandbox no início)
- (Opcional) Supabase CLI: `npm i -g supabase`

### 2. Instalar dependências

```bash
npm install
```

### 3. Criar o projeto Supabase

1. Acesse https://supabase.com/dashboard, crie um novo projeto.
2. Em **Project Settings → API**, copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` (secret) → `SUPABASE_SERVICE_ROLE_KEY`

### 4. Aplicar a migration

**Opção A — Painel do Supabase (mais simples):**

1. Vá em **SQL Editor** → **New query**.
2. Cole o conteúdo de `supabase/migrations/0001_initial_schema.sql`.
3. Run.

**Opção B — Supabase CLI:**

```bash
supabase login
supabase link --project-ref <seu-project-ref>
supabase db push
```

### 5. Gerar tipos do banco (opcional, mas recomendado)

```bash
npm run db:types
```

Isso sobrescreve `types/database.ts` com tipos derivados do schema real.

### 6. Configurar variáveis de ambiente

```bash
cp .env.local.example .env.local
```

Preencha:

- **Supabase**: as três chaves do passo 3.
- **Pagar.me**: `PAGARME_SECRET_KEY` (sandbox: `sk_test_...`) e
  `PAGARME_WEBHOOK_SECRET` (definido por você ao cadastrar o webhook).
- `CRON_SECRET`: gere um valor aleatório (ex: `openssl rand -hex 32`).

### 7. Criar usuário admin

No painel Supabase: **Authentication → Users → Add user → Create new user**.
Use email + senha. Não há signup público.

### 8. Rodar

```bash
npm run dev
```

Acesse http://localhost:3000, faça login com o usuário criado.

## Próximos blocos (a implementar)

- **Bloco 2** — Cliente Pagar.me, sync inicial e endpoints `/api/sync/*`.
- **Bloco 3** — Páginas Overview, Customers list/detail.
- **Bloco 4** — Subscriptions, Invoices, Charges.
- **Bloco 5** — Webhooks + Cron.
- **Bloco 6** — Polish (loading, errors, toast, deploy).

## Estrutura

```
app/
  (auth)/login/        # tela de login
  (dashboard)/         # rotas protegidas (sidebar + topbar)
  api/                 # routes (sync, refresh, webhooks, cron)
components/            # ui, charts, tables
lib/
  pagarme/             # cliente HTTP da Pagar.me
  supabase/            # clients (browser, server, middleware)
  sync/                # lógica de upsert por recurso
  metrics/             # MRR, churn, LTV, health
  env.ts               # validação Zod das env vars
  utils.ts             # cn, formatBRL, formatDate
supabase/migrations/   # SQL versionado
types/                 # database.ts (gerado), pagarme.ts (manual)
```

## Deploy (Vercel)

1. Conecte o repo na Vercel.
2. Adicione todas as env vars do `.env.local`.
3. Configure o cron em `vercel.json` (será criado no Bloco 5).
4. Cadastre o webhook no painel da Pagar.me apontando para
   `https://<seu-dominio>/api/webhooks/pagarme` com o mesmo
   `PAGARME_WEBHOOK_SECRET`.
