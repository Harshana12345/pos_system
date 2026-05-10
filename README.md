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
