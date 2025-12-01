# VC Matching Platform - Feature Audit

**Goal:** Identify what's ESSENTIAL vs. UNNECESSARY for MVP to avoid wasting time.

## 🎯 CORE MVP FEATURES (Must Have)

### 1. **Profiles** ✅ KEEP
- **Why:** Essential - need investor/founder profiles
- **What:** Already implemented well
- **Status:** ✅ Done

### 2. **Basic Authentication** ✅ KEEP (Simplified)
- **Why:** Users need to sign up/login
- **What to KEEP:**
  - ✅ Email/password signup/login
  - ✅ JWT tokens
  - ✅ Password reset (optional but good UX)
- **What to REMOVE/SIMPLIFY:**
  - ❌ **Firebase Auth** - Overkill, adds complexity
  - ❌ **LinkedIn OAuth** - Nice-to-have, not essential
  - ❌ **Google OAuth** - Nice-to-have, not essential
  - ✅ **Email verification** - Keep (simple SMTP)

### 3. **Matching** ✅ KEEP
- **Why:** Core feature - investors/founders need to like/match
- **What:** Already implemented well
- **Status:** ✅ Done

### 4. **Messaging** ✅ KEEP (Simplified)
- **Why:** Core feature - matched users need to chat
- **What to KEEP:**
  - ✅ Threaded messages
  - ✅ Unread counts
- **What to REMOVE/SIMPLIFY:**
  - ❌ **WebSockets** - Start with REST API polling, add WebSockets later if needed
  - ❌ **Typing indicators** - Nice-to-have, not essential for MVP
  - ❌ **Online status** - Nice-to-have, not essential for MVP

### 5. **Discovery Feed** ✅ KEEP (Simplified)
- **Why:** Core feature - need to browse profiles
- **What to KEEP:**
  - ✅ Profile cards
  - ✅ Like/Pass actions
  - ✅ Basic ranking
- **What to REMOVE/SIMPLIFY:**
  - ❌ **ML ranking** - Start with simple rules (sector match, stage match), add ML later
  - ❌ **Complex re-ranking** - Overkill for MVP

### 6. **Onboarding** ✅ KEEP
- **Why:** Users need to set up profiles
- **What:** Need to build frontend
- **Status:** ⏳ Pending

---

## ❌ UNNECESSARY FOR MVP (Remove/Simplify)

### 1. **Plaid Integration** ❌ REMOVE
- **Why not needed:** Already identified - bank transactions not needed for VC matching
- **Action:** Already disabled, can remove code entirely

### 2. **Clearbit Integration** ❌ REMOVE
- **Why not needed:** Not working, using stub data anyway
- **Action:** Remove from ETL pipeline, just use profile fields

### 3. **Crunchbase Integration** ⚠️ OPTIONAL
- **Why optional:** Nice-to-have for funding data, but not essential for MVP
- **Action:** Keep as optional, works fine with stub data

### 4. **Complex ETL Pipeline** ❌ SIMPLIFY
- **Why not needed:** For MVP, self-reported data is enough
- **Action:** 
  - Remove Plaid, Clearbit from ETL
  - Keep Crunchbase optional (stub data)
  - Focus on profile fields only

### 5. **WebSockets/Real-time** ❌ REMOVE FOR MVP
- **Why not needed:** Can start with REST API polling
- **Action:** 
  - Remove WebSocket endpoints
  - Remove realtime services
  - Use simple REST polling (e.g., check for new messages every 5s)
- **Add later:** If users request it

### 6. **Multiple OAuth Providers** ❌ SIMPLIFY
- **Why not needed:** One OAuth provider is enough for MVP
- **Action:**
  - Keep email/password (essential)
  - Keep ONE OAuth (LinkedIn recommended for professional network)
  - Remove Google OAuth
  - Remove Firebase Auth (overkill)

### 7. **Complex ML Ranking** ❌ SIMPLIFY
- **Why not needed:** Simple rule-based matching is enough for MVP
- **Action:**
  - Keep basic ML embeddings for similarity (if already working)
  - Remove complex re-ranking logic
  - Use simple rules: sector match, stage match, location
- **Add later:** When you have real user data to train on

### 8. **File Storage (MinIO/S3)** ⚠️ OPTIONAL FOR MVP
- **Why optional:** Can start without file uploads
- **Action:**
  - Remove file upload endpoints for MVP
  - Users can share links in messages
  - Add file uploads later if needed

### 9. **Complex Due Diligence** ❌ SIMPLIFY
- **Why not needed:** Self-reported data is enough for matching
- **Action:**
  - Keep simple diligence checks (runway, revenue from profile)
  - Remove ETL pipeline integration
  - Remove complex rule-based checks
  - Show basic metrics only (revenue, runway, team size)

### 10. **Admin Dashboard** ⚠️ SIMPLIFY
- **Why optional:** Can use database directly for MVP
- **Action:**
  - Keep basic admin endpoints (if needed for manual review)
  - Remove complex admin dashboard for MVP
  - Add admin UI later

### 11. **Analytics/Monitoring** ❌ REMOVE FOR MVP
- **Why not needed:** Not essential for MVP
- **Action:** Remove from TODO list, add after launch

### 12. **Feature Flags** ❌ REMOVE FOR MVP
- **Why not needed:** Not essential for MVP
- **Action:** Remove from TODO list

---

## 📋 STREAMLINED MVP STACK

### Backend (Simplified):
```
✅ FastAPI
✅ PostgreSQL (profiles, matches, messages)
✅ Redis (caching, rate limiting)
✅ JWT auth (email/password + 1 OAuth)
✅ Basic REST APIs (no WebSockets)
✅ Simple rule-based matching (no complex ML)
```

### Remove from Backend:
```
❌ Plaid
❌ Clearbit  
❌ Complex ETL pipeline
❌ WebSockets/realtime
❌ Firebase Auth
❌ Multiple OAuth providers
❌ Complex ML re-ranking
❌ File storage (for now)
❌ Complex diligence automation
```

### Frontend (Essential Only):
```
✅ Next.js setup
✅ Authentication (email/password, 1 OAuth)
✅ Onboarding flow
✅ Discovery feed (simple cards)
✅ Matching (like/pass)
✅ Messaging (simple chat, polling)
✅ Profile management
```

### Remove from Frontend:
```
❌ Real-time updates (use polling)
❌ Complex animations (keep simple)
❌ File uploads (for now)
❌ Admin dashboard (for now)
❌ Analytics (for now)
```

---

## 🎯 PRIORITY ORDER (MVP Focus)

### Phase 1: Core Backend (Complete)
1. ✅ Profiles API
2. ✅ Matching API  
3. ✅ Messaging API (REST, no WebSockets)
4. ✅ Basic Discovery Feed
5. ✅ Simple Auth (email/password + LinkedIn OAuth)

### Phase 2: Core Frontend
1. ⏳ Authentication UI
2. ⏳ Onboarding flow
3. ⏳ Discovery feed (simple cards)
4. ⏳ Messaging UI (simple chat, polling)
5. ⏳ Profile management

### Phase 3: Polish (After MVP Works)
1. ⏳ Better matching (add ML if needed)
2. ⏳ File uploads (if users request)
3. ⏳ Real-time messaging (if users request)
4. ⏳ Admin dashboard (if needed)

---

## 🗑️ FILES TO REMOVE/REFACTOR

### Remove Entirely:
- `backend/app/services/etl/data_sources.py` → Simplify to just Crunchbase stub
- `backend/app/services/realtime.py` → Remove
- `backend/app/services/realtime_broadcast.py` → Remove
- `backend/app/api/v1/endpoints/realtime.py` → Remove
- `backend/app/services/storage_service.py` → Remove (or make optional)
- `backend/app/api/v1/endpoints/storage.py` → Remove (or make optional)
- Multiple Plaid/Clearbit docs → Remove or consolidate

### Simplify:
- `backend/app/services/diligence.py` → Use only profile fields, remove ETL
- `backend/app/services/discovery.py` → Remove complex ML re-ranking
- `backend/app/services/auth_service.py` → Remove Firebase/Google OAuth
- `backend/app/services/oauth_service.py` → Keep only LinkedIn

### Keep but Optional:
- ML embeddings (if already working, keep; if not, remove)
- Crunchbase integration (keep as optional/stub)
- File storage (can add later)

---

## 💡 RECOMMENDATION

**Start with MINIMAL MVP:**
1. Email/password auth (no OAuth initially)
2. Simple profiles
3. Basic matching (like/pass)
4. Simple messaging (REST polling)
5. Basic discovery feed (simple rules, no ML)
6. Self-reported financials only

**Add complexity ONLY when users request it:**
- OAuth → If signup friction is high
- ML ranking → If matching quality is poor
- Real-time → If messaging feels slow
- File uploads → If users request it
- Complex diligence → If VCs request it

**YAGNI Principle:** "You Aren't Gonna Need It"
- Don't build what users haven't asked for
- Start simple, add complexity later
- Focus on core matching experience first

---

## ✅ NEXT STEPS

1. **Remove unnecessary features** (Plaid, Clearbit, WebSockets, etc.)
2. **Simplify authentication** (email/password only, or +1 OAuth)
3. **Simplify matching** (rule-based, no complex ML)
4. **Simplify messaging** (REST polling, no WebSockets)
5. **Focus on frontend** (core UI for MVP)

**Goal:** Working MVP in 2-3 weeks, not 6 months!

