# Fleet Status Manager

Sistem za upravljanje voznim parkom, vozačima i dokumentacijom. Detaljan opis u [PRD.md](PRD.md).

---

## Pokretanje svega lokalno

Potrebno: **Node.js 20+**, **Docker** (za bazu).

### 1. Pokreni bazu

Iz **korena projekta** (ovaj folder):

```bash
docker compose up -d
```

PostgreSQL je na `localhost:5432` (korisnik: `fleet`, lozinka: `fleet`, baza: `fleet`).

### 2. Podesi web aplikaciju

```bash
cd web
cp .env.example .env
```

U `.env` ostavi ili postavi za lokalnu bazu:

```env
DATABASE_URL="postgresql://fleet:fleet@localhost:5432/fleet?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET=neki-nasumicni-string
```

### 3. Instalacija, migracije i seed

```bash
npm install
npm run db:migrate   # prvi put: kada pita za ime migracije, unesi npr. init
npm run db:seed
```

### 4. Pokreni aplikaciju

```bash
npm run dev
```

Otvori [http://localhost:3000](http://localhost:3000). Prijava: **admin@fleet.local** / **admin123** (ili vrednosti iz `SEED_ADMIN_EMAIL` i `SEED_ADMIN_PASSWORD` ako si ih postavio pre seed-a).

### Zaustavljanje

- Aplikacija: `Ctrl+C` u terminalu gde radi `npm run dev`.
- Baza: iz korena projekta `docker compose down`. Podaci ostaju u volumenu do sledećeg `docker compose up -d`.

---

## Struktura

| Stavka | Opis |
|--------|------|
| [PRD.md](PRD.md) | Product Requirements Document |
| [docker-compose.yml](docker-compose.yml) | Lokalna PostgreSQL baza |
| [web/](web/) | Next.js aplikacija (Prisma, NextAuth, shadcn/ui) |

Više detalja za razvoj: [web/README.md](web/README.md).
