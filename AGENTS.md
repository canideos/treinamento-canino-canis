# AGENTS.md

## What this project is

A single static HTML page (`dog_training_pdf.html`) — a Portuguese-language dog
training manual. There is no backend, no package manager, no build step and no
external service, so no credentials are required.

## Running it

```bash
docker compose -f docker-compose.base44.yml up -d --build
```

- Everything runs in the single `web` service (`node:22-alpine`), serving the
  bind-mounted working tree on host port 3000.
- The dev server is `.base44/dev-server.mjs`, a zero-dependency Node script. It
  maps `/` to `dog_training_pdf.html` (the repo has no `index.html`), serves the
  other files as-is, and injects a small live-reload snippet that polls
  `/__base44_version`.
- Because the server watches file mtimes, edits to `.html`/`.css`/`.js` files
  reload the preview automatically — no restart and no `reload_preview` needed.
  If a change does not show up, restart the service with
  `docker compose -f docker-compose.base44.yml restart web`.

## Verifying it works

```bash
curl -sS localhost:3000/ | grep -c 'Manual Completo'
docker compose -f docker-compose.base44.yml ps
```

The healthcheck probes `/` and greps for `Manual Completo`.

## Notes

- If a new page is added and should be the landing page, add an `index.html`
  (the dev server prefers it over `dog_training_pdf.html`).
- Nothing to migrate, seed, or compile — a page edit is a deploy.
