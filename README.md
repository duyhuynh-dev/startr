## VC × Startup Matching Platform (Web-First, Hinge-Style)

[Architecture overview lives in `ARCHITECTURE.md`](./ARCHITECTURE.md) for quick reference on folder layout and future placeholders.

### Product Snapshot

- Hinge-inspired web experience: prompt-driven investor and founder profiles, stacked discovery cards, actions like `Interested`, `Pass`, or note. Cards highlight prompts, KPIs, deal preferences, and due-diligence badges on a single canvas so investors can skim quickly.
- Mutual interest opens threaded conversations with attachments, shared data rooms, and optional video-intro requests. Likes queue mirrors Hinge “Standouts” by surfacing the most relevant inbound interest plus ML-ranked “Priority” cards.
- Automated due-diligence sidebar surfaces key metrics (revenue, runway, team size, compliance flags) gathered via ETL pipelines; badges and color chips summarize trust level at a glance.
- Admin dashboard curates “Startup of the Month,” controls prompt templates, and monitors verification queues.
- Analytics cockpit tracks match funnels, verification completion, and quality metrics to guide future experiments.

### Core Stack (MVP 2025)

- **Frontend:** Next.js 15 + TypeScript with App Router for SEO-friendly SSR, Tailwind for rapid theming, Radix UI primitives for accessible cards/dialogs, React Query/SWR for cached mutations, Framer Motion for micro-interactions, optional Socket.io hooks for live messaging alerts.
- **Backend:** FastAPI services split into user/profile, matching, messaging, and diligence micro-APIs; Postgres (SQLModel or Prisma) with row-level security per role; Redis for feed caching, priority queues, and rate limiting; MinIO/S3-compatible storage for documents and verification uploads.
- **ML Layer:** PyTorch + TorchRec for candidate generation, sentence transformers (InstructorXL or all-MiniLM) for prompt embeddings, TorchServe for deployment, re-ranking module that considers due-diligence scores and engagement signals; later, Torch Geometric for graph-based preference propagation.
- **Auth & Notifications:** Firebase Auth for email/phone OTP + LinkedIn OAuth; Firebase Cloud Messaging/Web Push for likes/match alerts; Clerk/Auth0 optional future swap once budgets allow.
- **Data & Analytics:** Prefect or Airflow orchestrating ETL into Feast feature store; dbt modeling inside Postgres warehouse; Mixpanel/Amplitude for product analytics; OpenTelemetry traces piped to Grafana Cloud or SigNoz for observability.

### Verification Strategy (Free-First)

- Split onboarding (Investor vs Founder); dynamic forms capture thesis or KPIs while tracking completion. Progress bar reinforces trust-building steps.
- OTP via Firebase handles baseline proof. LinkedIn/Google OAuth import public data; system cross-references roles (e.g., “Partner at XYZ Capital”) to award “Soft Verified” badge automatically.
- Founders: domain/email verification (DNS lookup + MX match) and Crunchbase/API lookups to ensure company existence; manual overrides for stealth startups.
- Investors: self-attested accreditation statement stored in Postgres, optional PDF upload (investor letter, bank proof) stored encrypted in MinIO. Admin review queue (FastAPI + Next.js dashboard) approves or rejects.
- Continuous monitoring: PyTorch anomaly detection on login patterns, repeated copy/paste bios, or unrealistic funding claims; flagged accounts throttled until reviewed.
- Gov ID scans stay optional, gated behind high-risk activities (deal rooms, large attachment sharing). Architecture keeps verification provider pluggable for later Persona/Onfido integration.

### Automated Due Diligence

- ETL pulls Crunchbase snapshots, public YC/Seed lists, Clearbit enrichment, and optional Plaid-read financial data (with user consent) into a feature store; diffs tracked nightly.
- Rule-based checks compute runway (cash / burn), ARR growth, team size vs revenue, regional compliance, and mismatch detection (claimed revenue vs public filings). Each rule emits a severity score.
- LLM-assisted summaries via LangChain + open models (Mistral, Llama-3) transform raw metrics into digestible “Key Risks / Opportunities” paragraphs displayed in the sidebar.
- Overall diligence score feeds the PyTorch re-ranker plus UI badges (Green/Amber/Red). Admins can override or append notes.
- Historical diligence snapshots stored for audit logs; anomalies trigger notifications to both parties before conversations proceed.

### Key User Flows

1. **Onboarding:** Role selection splits form logic; investors define sector focus, check accreditation boxes, and connect LinkedIn. Founders add mission prompts, KPIs, and optional deck uploads. Progress bar highlights verification steps and expected completion time.
2. **Discover:** ML-ranked cards show prompts, diligence scores, and shared connections. Users tap `Interested` (with optional note) or `Pass`. Passes feed negative feedback into the recommender; interested actions queue in recipients’ “Likes You” list.
3. **Likes Queue / Standouts:** Recipients see inbound interest sorted by predicted relevance and verification level. Premium segment (later) surfaces “Standouts” curated via re-ranker weighting.
4. **Messaging:** Once both parties tap `Interested`, a match record spawns a threaded chat with attachments, templated intros, and quick due-diligence share buttons. Verification status gates features (e.g., unverified founders cannot send files).
5. **Startup of the Month & Admin Ops:** Automated aggregation selects top-performing founders; admins confirm and publish highlight cards. Admin tools also manage verification queue, prompt templates, and manual diligence overrides.

### MVP Roadmap

1. **Foundation:** Next.js onboarding + discovery UI backed by FastAPI mock endpoints; Firebase Auth + LinkedIn OAuth wired; Postgres schema scaffolded via Prisma/SQLModel migrations.
2. **Matching Core:** Build likes/match/messaging REST endpoints; seed Postgres with synthetic investors/founders; implement Redis-backed queues for likes and match notifications.
3. **Baseline ML:** Train PyTorch similarity service using sentence embeddings + rule filters; deploy via TorchServe; connect Discover feed + Standouts to ML API with fallbacks.
4. **Due Diligence & Verification:** Implement ETL scripts (Prefect) ingesting public datasets; render diligence sidebar; ship admin review dashboard for manual verification/diligence overrides.
5. **Polish & Deploy:** Add verification badges, analytics events, observability, and continuous delivery (GitHub Actions ➜ Vercel + Fly.io/Fargate). Run closed beta, gather feedback, iterate on ML weighting.

### Backend Status

- `backend/pyproject.toml` defines FastAPI + PyTorch + tooling dependencies.
- FastAPI app ships v1 endpoints for profiles, prompts, matches, and diligence summaries backed by SQLModel (Postgres) and Redis for like queues.
- Configuration handled through `pydantic-settings`; CORS + health check wired; routers grouped under `/api/v1/*`.
- Backend README documents setup (`uv sync` or pip) and next integration steps (Postgres, Redis, ML pipelines).
- Local infrastructure spins up via `docker-compose.dev.yml` (Postgres 16 + Redis 7).

### Open Questions

- Which external datasets deliver best coverage for diligence without high cost (Crunchbase, YC lists, Dealroom, open SEC filings)?
- When should optional ID scans or paid verification vendors be enabled, and what KPIs trigger that investment?
- What compliance obligations (SEC, FINRA, GDPR) apply once investor messaging includes deal specifics or attachments?
- How to verify investors/founders at onboarding while keeping friction low—what manual review SLA is acceptable?
- What success metrics (match-to-intro rate, verified user percentage) define MVP completion?
