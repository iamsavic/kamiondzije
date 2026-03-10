# Fleet Status Manager — Web

Web aplikacija za upravljanje voznim parkom (vozila, vozači, servisi, putni nalozi, alarmi).

## Tehnologije

- **Next.js 16** (App Router), TypeScript, Tailwind CSS v4
- **Prisma 7** + PostgreSQL (adapter `@prisma/adapter-pg`)
- **NextAuth v5** (Credentials + JWT)
- **shadcn/ui** (komponente)

## Preduslovi

- Node.js 20+
- Za lokalnu bazu: [Docker](https://docs.docker.com/get-docker/) (opciono, može i instalirani PostgreSQL ili Supabase)

## Instalacija i pokretanje

```bash
cd web
npm install
```

### 1. Lokalna baza (Docker) — preporučeno

Iz **korena projekta** (folder gde je `docker-compose.yml`):

```bash
docker compose up -d
```

Kreira kontejner `fleet-db` na portu **5432** (user: `fleet`, password: `fleet`, baza: `fleet`).

U `web/.env` stavi:

```env
DATABASE_URL="postgresql://fleet:fleet@localhost:5432/fleet?schema=public"
```

Zaustavljanje baze: `docker compose down`. Podaci ostaju u Docker volumenu `fleet_pgdata`.

### 1b. Baza i env (opšte)

Kopiraj `web/.env.example` u `web/.env` i popuni:

- **DATABASE_URL** — za lokalni Docker vidi iznad; za Supabase:  
  `postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres`
- **NEXTAUTH_URL** — za dev: `http://localhost:3000`
- **NEXTAUTH_SECRET** — nasumičan string (npr. `openssl rand -base64 32`)

Napomena: Prisma 7 koristi **pg** adapter; URL mora biti običan `postgresql://`.

### 2. Migracije i seed

```bash
npm run db:migrate   # kreira tabele (prvi put: prisma migrate dev --name init)
npm run db:seed      # uloge + default admin korisnik
```

Default admin (ako nisi postavio env):

- Email: `admin@fleet.local`
- Lozinka: `admin123`

Svoje vrednosti možeš zadati pre seed-a:

```bash
SEED_ADMIN_EMAIL=admin@tvojadomena.rs SEED_ADMIN_PASSWORD=tajnalozinka npm run db:seed
```

### 3. Dev server

```bash
npm run dev
```

Otvori [http://localhost:3000](http://localhost:3000). Bićeš preusmeren na `/login`, pa na `/dashboard` nakon prijave.

## Skripte

| Komanda | Opis |
|--------|------|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Pokretanje production build-a |
| `npm run db:generate` | Prisma generate (client) |
| `npm run db:migrate` | Prisma migrate dev |
| `npm run db:seed` | Seed uloga i admin korisnika |
| `npm run db:studio` | Prisma Studio (pregled baze) |

## Struktura (kratko)

- `src/app/` — App Router (login, dashboard, API auth)
- `src/auth.ts` — NextAuth konfiguracija (Credentials, JWT, session)
- `src/lib/db.ts` — Prisma client (pg adapter)
- `src/components/ui/` — shadcn komponente
- `prisma/schema.prisma` — multi-tenant šema (Organization, User, Role, Vehicle, Driver, itd.)

## PRD

Detaljan opis proizvoda i modula je u **PRD.md** u korenu repozitorijuma.
