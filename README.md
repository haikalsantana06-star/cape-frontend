# CAPE Frontend

React + Tailwind frontend for desk occupancy detection.

## Development

```bash
cd frontend
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | _(empty)_ | Backend API base URL (e.g. `https://your-api.railway.app`) |

Local dev: no env var needed — Vite proxy ke `http://localhost:8000`.
Production: set `VITE_API_URL` ke URL Railway backend.
