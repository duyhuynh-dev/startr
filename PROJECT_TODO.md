# VC × Startup Matching Platform - Project TODO

This document tracks all remaining tasks across backend, ML, and frontend development.

## ✅ Completed Backend Tasks

- [x] FastAPI application structure and routing
- [x] SQLModel/PostgreSQL integration with profiles, matches, messages, prompts
- [x] Redis caching layer for profiles, feeds, compatibility scores
- [x] Profile CRUD endpoints (investor/founder profiles with prompts)
- [x] Matching service (likes, matches, mutual interest)
- [x] Messaging service (threaded conversations, unread counts)
- [x] Prompt templates CRUD endpoints
- [x] Discovery feed service (ranked profiles, likes queue, standouts)
- [x] Due diligence service with ETL pipeline stubs (Crunchbase, Clearbit, Plaid)
- [x] Admin endpoints (verification review, startup-of-month curation, stats)
- [x] Error handling and validation
- [x] Rate limiting and security middleware
- [x] Alembic migrations setup
- [x] Seed data script
- [x] Pytest testing framework with fixtures
- [x] Profile endpoint tests

## ✅ Completed ML Tasks

- [x] Sentence transformer embeddings service
- [x] PyTorch recommendation engine
- [x] Re-ranking service (combines ML + diligence + engagement)
- [x] ML integration into discovery feed
- [x] ML API endpoints (embeddings, similarity, ranking)
- [x] Graceful fallback when ML dependencies missing

---

## 🔄 Backend Tasks (Remaining)

### 1. Database Migrations (backend-migrations)

**Status:** Pending  
**Priority:** High  
**Description:** Create initial Alembic migration for all models.

**Tasks:**

- Generate initial migration: `alembic revision --autogenerate -m "Initial schema"`
- Review and test migration
- Create migration documentation

**External Dependencies:** None

---

### 2. Complete ETL Pipeline Integration (backend-etl)

**Status:** Pending  
**Priority:** Medium  
**Description:** Implement actual API integrations for Crunchbase, Clearbit, and Plaid.

**Tasks:**

- Crunchbase API integration (fetch company data, funding rounds)
- Clearbit enrichment (company details, employee count, revenue estimates)
- Plaid integration (financial data with OAuth flow)
- Error handling and rate limiting for external APIs
- Add retry logic and caching for API responses

**External Dependencies:** 🔑 **API Keys Required**

- **Crunchbase API Key**
  - Sign up: https://data.crunchbase.com/
  - Get API key: https://data.crunchbase.com/v4/docs/getting-started
  - Add to `.env`: `CRUNCHBASE_API_KEY=your_key_here`
- **Clearbit API Key**
  - Sign up: https://dashboard.clearbit.com/
  - Get API key from dashboard
  - Add to `.env`: `CLEARBIT_API_KEY=your_key_here`
- **Plaid API Keys**
  - Sign up: https://dashboard.plaid.com/signup
  - Get credentials: https://dashboard.plaid.com/team/keys
  - Add to `.env`:
    ```
    PLAID_CLIENT_ID=your_client_id
    PLAID_SECRET=your_secret
    PLAID_ENVIRONMENT=sandbox  # or production
    ```

---

### 3. Authentication & Authorization (backend-auth)

**Status:** Not Started  
**Priority:** High  
**Description:** Implement user authentication and authorization.

**Tasks:**

- JWT token generation and validation
- OAuth integration (LinkedIn, Google)
- Firebase Auth integration (as per architecture)
- Password reset flow
- Email verification
- Role-based access control (RBAC)
- Protected route middleware

**External Dependencies:** 🔑 **API Keys Required**

- **Firebase Auth**
  - Create project: https://console.firebase.google.com/
  - Get config: Project Settings > General > Your apps
  - Add to `.env`:
    ```
    FIREBASE_PROJECT_ID=your_project_id
    FIREBASE_PRIVATE_KEY=your_private_key
    FIREBASE_CLIENT_EMAIL=your_client_email
    ```
- **LinkedIn OAuth**
  - Create app: https://www.linkedin.com/developers/apps
  - Get credentials from app settings
  - Add to `.env`:
    ```
    LINKEDIN_CLIENT_ID=your_client_id
    LINKEDIN_CLIENT_SECRET=your_client_secret
    LINKEDIN_REDIRECT_URI=http://localhost:3000/auth/linkedin/callback
    ```
- **Google OAuth**
  - Create credentials: https://console.cloud.google.com/apis/credentials
  - Add to `.env`:
    ```
    GOOGLE_CLIENT_ID=your_client_id
    GOOGLE_CLIENT_SECRET=your_client_secret
    GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
    ```

---

### 4. File Upload & Storage (backend-storage)

**Status:** Not Started  
**Priority:** Medium  
**Description:** Implement file uploads for verification documents and attachments.

**Tasks:**

- MinIO/S3 integration for file storage
- File upload endpoints (verification docs, profile photos, attachments)
- File validation (type, size limits)
- Signed URL generation for downloads
- Image resizing/optimization
- Cleanup of orphaned files

**External Dependencies:** 🔑 **Configuration Required**

- **MinIO (Self-hosted)**
  - Docker compose already set up: `docker-compose.dev.yml`
  - Configure: `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`
- **AWS S3 (Alternative)**
  - Create bucket: https://s3.console.aws.amazon.com/
  - Get credentials: IAM > Users > Access Keys
  - Add to `.env`:
    ```
    AWS_ACCESS_KEY_ID=your_access_key
    AWS_SECRET_ACCESS_KEY=your_secret_key
    AWS_S3_BUCKET=your_bucket_name
    AWS_REGION=us-east-1
    ```

---

### 5. Real-time Features (backend-realtime)

**Status:** Not Started  
**Priority:** Medium  
**Description:** WebSocket support for real-time messaging and notifications.

**Tasks:**

- Socket.io or WebSocket integration
- Real-time message delivery
- Typing indicators
- Online/offline status
- Push notifications integration
- Connection management

**External Dependencies:** 🔑 **Optional**

- **Firebase Cloud Messaging (FCM)**
  - Enable in Firebase Console: Cloud Messaging
  - Get server key: Project Settings > Cloud Messaging
  - Add to `.env`: `FCM_SERVER_KEY=your_server_key`

---

### 6. Additional Backend Tests (backend-tests)

**Status:** In Progress  
**Priority:** High  
**Description:** Complete test coverage for all endpoints and services.

**Tasks:**

- Test matching service (likes, matches)
- Test messaging service (threads, messages)
- Test discovery feed (ranking, caching)
- Test diligence service (ETL integration)
- Test admin endpoints
- Integration tests for full flows
- Performance/load tests

**External Dependencies:** None

---

### 7. API Documentation (backend-docs)

**Status:** Partial  
**Priority:** Medium  
**Description:** Complete OpenAPI/Swagger documentation with examples.

**Tasks:**

- Add comprehensive examples to all endpoints
- Document authentication flow
- Document error codes and responses
- Add request/response schemas with examples
- Generate Postman collection

**External Dependencies:** None

---

## 🔄 ML Tasks (Remaining)

### 1. Embedding Caching (ml-cache)

**Status:** Pending  
**Priority:** High  
**Description:** Cache profile embeddings in Redis to avoid recomputation.

**Tasks:**

- Add cache keys for embeddings
- Cache profile embeddings when computed
- Invalidate cache when profile updated
- Add cache methods to embedding service

**External Dependencies:** None

---

### 2. Batch Prediction Endpoints (ml-batch)

**Status:** Pending  
**Priority:** Medium  
**Description:** Add batch operations for efficiency.

**Tasks:**

- `POST /api/v1/ml/embeddings/batch` - Batch embeddings
- `POST /api/v1/ml/similarity/batch` - Batch similarities
- `POST /api/v1/ml/profiles/rank/batch` - Batch ranking

**External Dependencies:** None

---

### 3. ML Health Check (ml-health)

**Status:** Pending  
**Priority:** Medium  
**Description:** Health check endpoint for ML service status.

**Tasks:**

- `GET /api/v1/ml/health` - Model availability, device, status

**External Dependencies:** None

---

### 4. ML Tests (ml-tests)

**Status:** Pending  
**Priority:** High  
**Description:** Comprehensive tests for ML services.

**Tasks:**

- Unit tests with mocked models
- Integration tests for endpoints
- Test fallback behavior
- Test caching

**External Dependencies:** None (tests mock models to avoid downloads)

---

### 5. ML Documentation (ml-docs)

**Status:** Partial  
**Priority:** Medium  
**Description:** Document ML setup and configuration.

**Tasks:**

- Setup instructions
- Model download process
- Performance tuning guide
- GPU/MPS setup instructions

**External Dependencies:**

- **HuggingFace Models** (auto-downloaded, no API key needed)
  - Models cached at: `~/.cache/huggingface/transformers/`
  - First download requires internet connection

---

## 🎨 Frontend Tasks (Not Started)

### 1. Scaffold Next.js Project (frontend-setup)

**Status:** Not Started  
**Priority:** High  
**Description:** Initialize Next.js 15 project with TypeScript and Tailwind.

**Tasks:**

- Create Next.js project: `npx create-next-app@latest frontend --typescript --tailwind`
- Configure project structure (app router)
- Set up Tailwind CSS configuration
- Configure environment variables
- Set up API client (axios/fetch wrapper)
- Add React Query/SWR for data fetching
- Configure TypeScript paths and aliases

**External Dependencies:** None

---

### 2. Authentication UI (frontend-auth)

**Status:** Not Started  
**Priority:** High  
**Description:** Build authentication pages and flows.

**Tasks:**

- Login page (email/password)
- Sign up page (with role selection)
- OAuth buttons (LinkedIn, Google)
- Password reset flow
- Email verification page
- Protected route wrapper
- Auth context/state management

**External Dependencies:** 🔑 **Same as backend-auth**

- Firebase Auth config (client-side)
- OAuth redirect URIs configured

---

### 3. Onboarding Flow (frontend-onboarding)

**Status:** Not Started  
**Priority:** High  
**Description:** Multi-step onboarding for investors and founders.

**Tasks:**

- Role selection screen
- Investor onboarding form (firm, check size, sectors, stages)
- Founder onboarding form (company, revenue, team, runway)
- Prompt builder UI (answer template questions)
- Profile photo upload
- Progress indicator
- Form validation

**External Dependencies:**

- File upload API endpoints (backend-storage)

---

### 4. Discovery Feed UI (frontend-discovery)

**Status:** Not Started  
**Priority:** High  
**Description:** Hinge-style card stack for browsing profiles.

**Tasks:**

- Card component with swipe gestures (Framer Motion)
- Profile card layout (prompts, KPIs, badges)
- Swipe actions (Interested, Pass, Note)
- Navigation (swipe, buttons)
- Loading states and skeletons
- Error handling
- Infinite scroll/pagination

**External Dependencies:** None

---

### 5. Due Diligence Sidebar (frontend-diligence)

**Status:** Not Started  
**Priority:** Medium  
**Description:** Sidebar showing diligence metrics and badges.

**Tasks:**

- Sidebar component (slide-in/overlay)
- Metric cards (revenue, runway, team size)
- Badge system (Green/Amber/Red)
- Risk/opportunity highlights
- Expandable sections
- Data visualization (charts?)

**External Dependencies:** None

---

### 6. Likes Queue / Standouts (frontend-likes)

**Status:** Not Started  
**Priority:** Medium  
**Description:** Queue of profiles that liked you, prioritized by ML.

**Tasks:**

- Likes queue page/component
- Priority sorting (ML-ranked)
- Standout profiles highlight
- Quick actions (like back, pass)
- Notification badges

**External Dependencies:** None

---

### 7. Messaging UI (frontend-messaging)

**Status:** Not Started  
**Priority:** High  
**Description:** Threaded conversation interface.

**Tasks:**

- Message list (conversations with preview)
- Thread view (messages, timestamps)
- Message input and send
- Typing indicators
- Read receipts
- File attachments UI
- Real-time updates (WebSocket)

**External Dependencies:**

- Real-time backend (backend-realtime)
- File upload (backend-storage)

---

### 8. Profile Management (frontend-profile)

**Status:** Not Started  
**Priority:** Medium  
**Description:** Edit profile, view stats, settings.

**Tasks:**

- Profile edit form
- Stats dashboard (matches, likes, views)
- Settings page (notifications, privacy)
- Account deletion
- Verification status display

**External Dependencies:** None

---

### 9. Admin Dashboard (frontend-admin)

**Status:** Not Started  
**Priority:** Low  
**Description:** Admin interface for moderation and curation.

**Tasks:**

- Verification review queue
- Startup-of-month curation
- Analytics dashboard
- User management
- Prompt template management

**External Dependencies:** None (backend-admin already exists)

---

### 10. Responsive Design & Polish (frontend-polish)

**Status:** Not Started  
**Priority:** Medium  
**Description:** Mobile-responsive, accessibility, animations.

**Tasks:**

- Mobile breakpoints (Tailwind responsive)
- Touch gestures optimization
- Accessibility (ARIA labels, keyboard nav)
- Loading states and transitions
- Error boundaries
- Toast notifications
- Dark mode (optional)

**External Dependencies:** None

---

## 🔧 DevOps & Deployment Tasks

### 1. Docker Setup (devops-docker)

**Status:** Partial  
**Priority:** High  
**Description:** Complete Docker configuration for development and production.

**Tasks:**

- Dockerfile for backend
- Dockerfile for frontend
- Docker Compose for local development (already exists)
- Docker Compose for production
- Health checks
- Multi-stage builds

**External Dependencies:** None

---

### 2. CI/CD Pipeline (devops-cicd)

**Status:** Not Started  
**Priority:** Medium  
**Description:** GitHub Actions for testing and deployment.

**Tasks:**

- GitHub Actions workflow (test on PR)
- Backend tests on push
- Frontend tests on push
- Linting and type checking
- Deployment workflows (Vercel for frontend, Fly.io/Heroku for backend)
- Environment variable management

**External Dependencies:** 🔑 **Required**

- **Vercel** (Frontend)
  - Connect GitHub repo: https://vercel.com/new
  - Configure environment variables
- **Fly.io / Heroku / Railway** (Backend)
  - Create account and project
  - Configure databases (Postgres, Redis)
  - Set environment variables

---

### 3. Environment Configuration (devops-env)

**Status:** Partial  
**Priority:** High  
**Description:** Complete `.env.example` files and documentation.

**Tasks:**

- Complete backend `.env.example`
- Create frontend `.env.example`
- Document all required variables
- Document optional variables
- Setup instructions

**External Dependencies:** None

---

### 4. Monitoring & Logging (devops-monitoring)

**Status:** Not Started  
**Priority:** Low  
**Description:** Production monitoring and error tracking.

**Tasks:**

- Error tracking (Sentry)
- Application monitoring (DataDog/New Relic?)
- Log aggregation
- Performance metrics
- Uptime monitoring

**External Dependencies:** 🔑 **Optional**

- **Sentry**
  - Sign up: https://sentry.io/signup/
  - Get DSN from project settings
  - Add to env: `SENTRY_DSN=your_dsn`

---

## 📊 Analytics & Feature Flags

### 1. Product Analytics (analytics-setup)

**Status:** Not Started  
**Priority:** Medium  
**Description:** Track user behavior and funnel metrics.

**Tasks:**

- Integrate Mixpanel or Amplitude
- Track key events (signup, likes, matches, messages)
- Funnel analysis setup
- Retention tracking

**External Dependencies:** 🔑 **Required**

- **Mixpanel** (or Amplitude)
  - Sign up: https://mixpanel.com/
  - Get project token
  - Add to env: `MIXPANEL_TOKEN=your_token`

---

### 2. Feature Flags (feature-flags)

**Status:** Not Started  
**Priority:** Low  
**Description:** Feature flag system for gradual rollouts.

**Tasks:**

- Integrate LaunchDarkly or Flagsmith
- Flag new features (ML ranking, verification, etc.)
- A/B testing setup

**External Dependencies:** 🔑 **Optional**

- **LaunchDarkly / Flagsmith**
  - Sign up and get SDK key
  - Add to env: `FEATURE_FLAG_SDK_KEY=your_key`

---

## 🔐 Security & Compliance

### 1. Security Hardening (security-hardening)

**Status:** Partial  
**Priority:** High  
**Description:** Additional security measures.

**Tasks:**

- Input sanitization review
- SQL injection prevention (already using ORM)
- XSS prevention
- CSRF protection
- Rate limiting review
- Security headers audit
- Dependency vulnerability scanning

**External Dependencies:** None

---

### 2. Compliance (compliance-setup)

**Status:** Not Started  
**Priority:** Medium  
**Description:** GDPR, SEC compliance considerations.

**Tasks:**

- Privacy policy
- Terms of service
- Cookie consent (if needed)
- Data export functionality
- Data deletion (GDPR right to be forgotten)
- Audit logging

**External Dependencies:** None

---

## 📝 Documentation

### 1. API Documentation (docs-api)

**Status:** Partial  
**Priority:** Medium  
**Description:** Complete API documentation.

**Tasks:**

- OpenAPI spec completeness
- Postman collection
- API client SDK examples (Python, JavaScript)
- Rate limit documentation
- Authentication flow documentation

**External Dependencies:** None

---

### 2. Developer Documentation (docs-dev)

**Status:** Partial  
**Priority:** Medium  
**Description:** Developer setup and contribution guides.

**Tasks:**

- Complete README with setup instructions
- Architecture documentation
- Contributing guidelines
- Development workflow
- Testing guide
- Deployment guide

**External Dependencies:** None

---

## 🚀 Quick Start Checklist

Before starting development, ensure you have:

### Backend

- [ ] PostgreSQL database running (Docker or local)
- [ ] Redis running (Docker or local)
- [ ] Backend dependencies installed: `pip install -e '.[dev]'`
- [ ] `.env` file configured with database URLs
- [ ] Run migrations: `alembic upgrade head`

### ML (Optional)

- [ ] Install ML dependencies: `pip install -e '.[ml]'`
- [ ] Internet connection for first model download
- [ ] Set `ML_ENABLED=true` in `.env`

### Frontend (Not Yet Started)

- [ ] Node.js 18+ installed
- [ ] Create Next.js project
- [ ] Install dependencies: `npm install`
- [ ] Configure `.env.local` with API URL

---

## 📌 Priority Order

1. **High Priority (Complete MVP)**

   - Backend: Auth, Storage, Remaining tests
   - Frontend: Setup, Auth, Onboarding, Discovery, Messaging
   - DevOps: Docker, CI/CD, Environment config

2. **Medium Priority (Enhanced Features)**

   - Backend: ETL integrations, Real-time, Admin enhancements
   - Frontend: Likes queue, Due diligence sidebar, Profile management
   - ML: Caching, Batch endpoints, Health check, Tests

3. **Low Priority (Nice to Have)**
   - Analytics, Feature flags, Monitoring
   - Compliance, Additional documentation
   - Performance optimizations

---

## 🔗 External Service Summary

### Required for MVP

- ✅ PostgreSQL (Docker/self-hosted)
- ✅ Redis (Docker/self-hosted)
- 🔑 Firebase Auth (for authentication)
- 🔑 File storage (MinIO or AWS S3)

### Optional but Recommended

- 🔑 Crunchbase API (for due diligence)
- 🔑 Clearbit API (for enrichment)
- 🔑 Plaid API (for financial data)
- 🔑 Mixpanel/Amplitude (analytics)
- 🔑 Sentry (error tracking)

### Auto-downloaded (No API Key)

- ✅ HuggingFace models (sentence-transformers)
- ✅ PyTorch models (if using pretrained)

---

**Last Updated:** [Current Date]  
**Maintainer:** Development Team

