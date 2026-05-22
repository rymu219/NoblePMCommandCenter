# Deploy to Railway

The app is Postgres-only. Local dev points at any Postgres reachable via
`DATABASE_URL`. Production runs on Railway with a managed Postgres add-on.

## One-time setup (Railway, ~10 minutes)

1. Create a new Railway project: <https://railway.com/new>
2. Inside that project: **+ New → Database → Add PostgreSQL**.
3. **+ New → GitHub Repo → rymu219/noblepmcommandcenter**.
4. On the web service that Railway just created, open **Variables** and add:
   - `DATABASE_URL` — click **Add Reference → Postgres → DATABASE_URL** so it
     auto-injects the Postgres connection string.
   - `AUTH_SECRET` — a random 32+ char string. Generate one with
     `openssl rand -hex 32` locally and paste the result.
   - `ADMIN_EMAIL` (optional, default `ryan@nobleplastics.local`)
   - `ADMIN_NAME` (optional, default `Ryan`)
   - `ADMIN_PASSWORD` (recommended — override the default
     `nobleplastics` before going public).
5. Click **Deploy**. Railway will:
   - install deps via Nixpacks (config in `nixpacks.toml`),
   - run `npx prisma generate` then `npm run build`,
   - on container start, run `npm run deploy:db` (= `prisma db push` then
     seed the admin user + `999-999` Misc bucket), then `npm start`.
6. Open the generated `*.up.railway.app` URL, sign in as `ADMIN_EMAIL`
   with `ADMIN_PASSWORD`.

## Every subsequent push to `claude/pensive-albattani-9ULEs` (or main)

Railway auto-redeploys. `npm run deploy:db` runs on each container boot so
schema changes apply automatically. The seed is idempotent — it only ever
upserts the admin user; it never overwrites your real data.

## Adding the rest of the team

After you sign in as admin, go to **Admin → (Users coming in v2.6+)** or
add them directly in the Railway Postgres console for now:

```sql
INSERT INTO "User" (id, email, name, "passwordHash", role, department, active)
VALUES (
  gen_random_uuid()::text,
  'kenneth@nobleplastics.local',
  'Kenneth',
  -- bcrypt hash of 'nobleplastics' — generate your own per-user
  '$2a$10$...',
  'engineer',
  'engineering',
  true
);
```

A proper "invite engineer" admin screen is on the v2 backlog.

## Migrating off Railway to a Noble-owned stack

The path is just: stand up Postgres somewhere Noble owns (RDS / Cloud SQL
/ self-hosted), `pg_dump` from Railway, `psql` into the new host, then
update `DATABASE_URL` wherever the app runs. No code changes needed.

## Running locally against the Railway DB

Once deployed:

```bash
git clone https://github.com/rymu219/noblepmcommandcenter.git
cd noblepmcommandcenter
npm install
cat > .env <<'EOF'
DATABASE_URL="<paste Railway Postgres URL — Variables tab on the DB service>"
AUTH_SECRET="<paste the same AUTH_SECRET>"
EOF
npm run dev
```

This is the fastest way to debug a production issue from a laptop.

## Running locally against a fresh local Postgres

```bash
docker run -d --name noble-pg \
  -e POSTGRES_PASSWORD=noble -e POSTGRES_USER=noble -e POSTGRES_DB=noble_pm \
  -p 5432:5432 postgres:16

cat > .env <<'EOF'
DATABASE_URL="postgresql://noble:noble@localhost:5432/noble_pm"
AUTH_SECRET="dev-secret-replace-in-production-please-32chars"
EOF

npm install
npm run db:push      # apply schema
npm run db:seed      # seed Ryan + 999-999 Misc
npm run dev
```
