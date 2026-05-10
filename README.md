# POS System API

Express.js backend scaffold for a POS system.

## Scripts

- `npm.cmd install` installs dependencies on Windows PowerShell environments where `npm.ps1` is blocked.
- `npm.cmd run dev` starts the API with Node watch mode.
- `npm.cmd start` starts the API normally.
- `npm.cmd test` runs Node's built-in test runner.
- `npm.cmd --prefix frontend install` installs frontend dependencies.
- `npm.cmd run frontend:dev` starts the React development server.
- `npm.cmd run frontend:build` builds the React frontend.

## Docker Compose

Start the backend, frontend, and PostgreSQL services:

```sh
docker compose up --build
```

- Backend API: `http://localhost:3000/api/v1`
- React frontend: `http://localhost:5173`
- PostgreSQL: `localhost:5432`

The Compose setup uses named volumes for `node_modules` and PostgreSQL data.

## Database

The backend uses `pg` with a shared connection pool from `src/config/database.js`.
Set `DATABASE_URL` to configure the pool with a connection string, or use the
individual `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` values.
Optional pool settings are available through `DB_POOL_MAX`,
`DB_IDLE_TIMEOUT_MS`, and `DB_CONNECTION_TIMEOUT_MS`.

## Structure

```text
src/
  app.js
  server.js
  config/
  controllers/
  middleware/
  models/
  routes/
  services/
  utils/
  validators/
tests/
```

## Frontend

The React TypeScript app lives in `frontend/` and uses Vite.

```text
frontend/
  index.html
  package.json
  vite.config.ts
  src/
    app/
    assets/
    components/
    features/
    hooks/
    layouts/
    pages/
    routes/
    services/
    store/
    styles/
    types/
    utils/
```
