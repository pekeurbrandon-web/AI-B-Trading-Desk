# Docker deployment (compose + optional Caddy TLS)

This branch adds a simple Docker-based deployment that makes it easy to run the app with persistent data and to add AI keys at runtime.

Included files:
- Dockerfile
- docker-compose.yml (includes an optional Caddy service for automatic TLS under the 'tls' profile)
- .dockerignore
- .env.example
- Caddyfile

Quick start (no TLS):
1. Copy .env.example to .env and set APP_ACCESS_TOKEN (and optionally ANTHROPIC_API_KEY or others).
2. Create a data directory if you want to preserve data: mkdir -p data
3. Build and start:
   docker compose up -d --build
4. Visit: http://localhost:3000 and unlock with your APP_ACCESS_TOKEN.

With TLS (Caddy):
1. Set DOMAIN and CADDY_EMAIL in your .env and ensure your domain's DNS points to this host.
2. Start with the tls profile enabled:
   docker compose --profile tls up -d --build
3. Caddy will automatically obtain certificates for DOMAIN and reverse-proxy to the app.

Notes about AI keys and persistence:
- The container mounts ./data into the container's /app/data. The app writes keys to data/keys.json when you set them through the Settings UI, so you can start the container and paste API keys in the running app; they will be persisted on the host.
- Alternatively, pre-populate ANTHROPIC_API_KEY (or OPENAI_API_KEY) in .env before starting.
- For durable DB-backed persistence that survives container redeploys without relying on host volumes, create a Supabase project and run supabase_schema.sql from the repo, then set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env.

Security reminders:
- Do NOT commit .env or data/keys.json to the repository.
- Use a long random APP_ACCESS_TOKEN before exposing the app publicly.
- Keep SUPABASE_SERVICE_KEY secret.
