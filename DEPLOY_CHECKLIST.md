# Pre-deploy checklist – Startr web application

Use this before deploying the frontend (e.g. Vercel) and backend (e.g. Railway, Render, Fly).

---

## 1. Environment variables

### Frontend (Next.js / Vercel)

| Variable | Required | Description |
|---------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | **Yes** (prod) | Full API base URL, e.g. `https://api.yourdomain.com/api/v1` |
| `NEXT_PUBLIC_WS_URL` | No | WebSocket URL; if omitted, derived from `NEXT_PUBLIC_API_URL` (http→ws, https→wss) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | For prod CAPTCHA | **Deployment**: use your Cloudflare Turnstile *production* site key here. In dev, leave unset to use the key from the backend API. |

- Local defaults: API `http://localhost:8012/api/v1`, WS `ws://localhost:8012/api/v1/realtime/ws`.
- For production, set `NEXT_PUBLIC_API_URL` to your live backend. Build-time only; no restart needed after change.
- **Cloudflare Turnstile**: Use a *different* site (and keys) for production vs development. In Cloudflare Dashboard create a site for your production domain and use that site’s key as `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in Vercel; set the same site’s secret as `TURNSTILE_SECRET_KEY` (and optionally `TURNSTILE_SITE_KEY`) on the backend so server-side verification uses the production key.

### Backend (FastAPI)

| Variable | Required (prod) | Notes |
|----------|------------------|-------|
| `SECRET_KEY` | **Yes** | Change from default; use a long random string |
| `DATABASE_URL` | **Yes** | PostgreSQL connection string |
| `REDIS_URL` | Recommended | For rate limiting and diligence cache |
| `FRONTEND_URL` | **Yes** (if using email) | e.g. `https://app.yourdomain.com` for password reset / verification links |
| `CORS_ORIGINS` | **Yes** | Comma-separated or JSON list; include your frontend origin(s), e.g. `https://yourapp.vercel.app` |
| `OPENAI_API_KEY` | Optional | For diligence LLM strengths/concerns; falls back to rule-based if missing |
| `APOLLO_API_KEY`, `HUNTER_API_KEY` | Optional | For diligence ETL; features degrade gracefully if unset |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | For prod CAPTCHA | Use your Turnstile *production* site keys here so server-side verification matches the frontend. Frontend uses `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in deploy when set. |
| SMTP_* | Optional | For password reset and email verification |

---

## 2. CORS

- Backend already allows `https://*.vercel.app` (wildcard).
- For a custom domain, add the exact origin to `CORS_ORIGINS`, e.g. `https://startr.yourdomain.com`.
- Local dev: `http://localhost:3000` and `http://127.0.0.1:3000` are always allowed when no other origins are set.

---

## 3. Security

- [ ] **SECRET_KEY**: Never use the default in production; generate a new one.
- [ ] **Database**: Use a managed PostgreSQL instance; restrict network access.
- [ ] **HTTPS**: Serve frontend and API over HTTPS in production.
- [ ] **Secrets**: Do not commit `.env`; use the host’s env/secret storage (e.g. Vercel, Railway).

---

## 4. Feature readiness

| Feature | Status | Notes |
|---------|--------|-------|
| Auth (email/password) | Ready | Turnstile optional; login/signup work without it |
| Google OAuth | Ready | Set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`; add production redirect URIs in Google Console |
| Onboarding | Ready | Role-based (investor/founder); prompts and profile fields |
| Discover feed | Ready | Filters, pagination, venture fit, diligence sidebar |
| Due diligence | Ready | LLM strengths/concerns when `OPENAI_API_KEY` set; CORS and 500 fixes applied |
| Likes / matches / messaging | Ready | WebSocket for real-time; ensure WS URL is correct in prod |
| Profile & settings | Ready | Edit profile, complete onboarding from profile page |
| Error handling | Ready | Root and global error boundaries; API errors surfaced in UI |

---

## 5. Done

- **Custom 404**: `app/not-found.tsx` added.
- **Console logs**: Verbose logs gated to development only.
- **Metadata**: App title set to “Startr” in `layout.tsx`.
- **Turnstile (deployment)**: Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in Vercel to your production Turnstile site key; set `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` on the backend to the same production site so verification works.

---

## 6. Deploy steps

1. **Backend**
   - Set env vars (especially `SECRET_KEY`, `DATABASE_URL`, `CORS_ORIGINS`, `FRONTEND_URL`).
   - Run migrations if you use Alembic (e.g. `alembic upgrade head`).
   - Expose health check: `GET /healthz` (no auth).

2. **Frontend**
   - Set `NEXT_PUBLIC_API_URL` (and optionally `NEXT_PUBLIC_WS_URL`) to the deployed backend.
   - Build: `npm run build` (or use Vercel’s build).
   - Confirm API and WebSocket base URLs in Network tab after deploy.

3. **Post-deploy**
   - Log in and complete onboarding.
   - Open Discover, like a profile, open Due Diligence for a profile.
   - Send a test message and confirm WebSocket updates (e.g. typing, new message).
   - Test password reset / email verification if SMTP is configured.

---

## 7. Quick reference

- **API prefix**: `/api` (routes under `/api/v1/...`).
- **Frontend defaults**: API `http://localhost:8012/api/v1`, WS derived from that.
- **Backend health**: `GET /healthz` → `{"status":"ok"}`.
