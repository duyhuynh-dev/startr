# Hinge-Style VC Matching Platform - Implementation Guide

## ✅ COMPLETED (Database & Models)

### Database Schema
- ✅ **Likes table**: Added `prompt_id` (like specific prompts) and `like_type` (standard/rose/superlike)
- ✅ **Matches table**: Added `match_outcome` (met/didnt_meet/still_talking)
- ✅ **Profiles table**: Added `photos` (array of photos) and `dealbreakers` (hard filters)
- ✅ **New tables**:
  - `passes` - Track when users skip (X) profiles
  - `profile_views` - Track viewed profiles to avoid duplicates
  - `daily_limits` - Track daily like/rose usage

### Models & Schemas
- ✅ Enhanced Like model with prompt-specific likes and rose functionality
- ✅ Added Pass, ProfileView, DailyLimit models
- ✅ Added PhotoItem and Dealbreakers schemas
- ✅ Profile completeness calculation (property on BaseProfile)

---

## 🔄 IN PROGRESS (Backend Services & Endpoints)

### Priority 1: Enhanced Matching Logic

#### 1.1 Update Matching Service (`backend/app/services/matching.py`)
**Status**: PENDING
**Tasks**:
- [ ] Check daily limits before allowing like
- [ ] Support prompt-specific likes (save prompt_id)
- [ ] Support roses/super likes (different like_type)
- [ ] Increment daily limit counters
- [ ] Prioritize roses in likes queue

**Code Location**: `backend/app/services/matching.py`

#### 1.2 Create Pass Endpoint
**Status**: PENDING
**Tasks**:
- [ ] POST /api/v1/matches/pass - Record when user passes on profile
- [ ] Store pass in database
- [ ] Add to Redis cache for fast filtering

**New File**: `backend/app/api/v1/endpoints/matches.py` (update existing)

#### 1.3 Enhanced Discovery Feed
**Status**: PENDING
**Tasks**:
- [ ] Filter out passed profiles (from last 30 days)
- [ ] Filter out already viewed profiles
- [ ] Apply dealbreaker filters (hard exclusions)
- [ ] Track profile views when user sees them
- [ ] Return "Most Compatible" daily pick

**Code Location**: `backend/app/services/discovery.py`

---

## 📱 FRONTEND IMPLEMENTATION

### Priority 2: Core User Flow

#### 2.1 Discover/Swipe Interface
**File**: `frontend/src/pages/Discover.tsx`
**Features**:
- Swipeable card stack (use react-swipeable or react-tinder-card)
- Show profile photos in gallery
- Display prompts with responses
- Actions: Like (with comment), Pass (X), Rose
- Show daily likes remaining
- "Most Compatible" badge on first card

#### 2.2 Profile Card Component
**File**: `frontend/src/components/ProfileCard.tsx`
**Features**:
- Photo gallery with dots navigation
- Prompt responses below photos
- Tap photo to see caption
- Role-specific fields (firm/company)
- Verification badges
- Profile completeness indicator

#### 2.3 Likes Queue ("Likes You")
**File**: `frontend/src/pages/LikesQueue.tsx`
**Features**:
- Grid/list of people who liked you
- Show which prompt they liked (highlight)
- Show their note/comment
- Rose indicators (special styling)
- Tap to accept (match) or pass

#### 2.4 Matches Screen
**File**: `frontend/src/pages/Matches.tsx`
**Features**:
- List of all matches
- Last message preview
- Unread count badges
- Tap to open chat

#### 2.5 Chat Interface
**File**: `frontend/src/pages/Chat.tsx`
**Features**:
- Threading with match
- Real-time updates (WebSocket)
- Typing indicators
- Read receipts
- Send messages
- Show other person's profile at top

#### 2.6 Profile Editing
**File**: `frontend/src/pages/EditProfile.tsx`
**Features**:
- Upload multiple photos (up to 6)
- Add photo captions
- Edit prompts (3+ required)
- Set dealbreaker preferences
- Profile completeness progress bar
- Role-specific fields

---

## 🎯 HINGE FEATURES CHECKLIST

### Core Matching Loop
- ✅ Browse discovery feed
- ⏳ Like profiles (standard)
- ⏳ Like specific prompts with comment
- ⏳ Send roses (1 per day, premium feature)
- ⏳ Pass (X) on profiles
- ✅ Get matched when both like
- ✅ Message matches

### Discovery & Feed
- ✅ ML-based compatibility scoring
- ✅ Standouts (top 10 most compatible)
- ⏳ Most Compatible daily pick
- ⏳ Filter by dealbreakers (hard filters)
- ⏳ Don't show passed profiles
- ⏳ Don't show already viewed profiles
- ✅ Likes queue ("People who liked you")

### Profiles
- ✅ Prompt-based profiles (3+ prompts)
- ⏳ Photo gallery (up to 6 photos)
- ⏳ Photo captions
- ⏳ Profile completeness tracking
- ✅ Verification badges
- ⏳ Dealbreaker preferences

### Messaging
- ✅ Real-time chat with WebSocket
- ✅ Typing indicators
- ✅ Read receipts
- ✅ Unread counts
- ⏳ Message reactions (nice-to-have)
- ⏳ Ice breaker suggestions (nice-to-have)

### Gamification & Limits
- ⏳ 10 likes per day limit
- ⏳ 1 rose per day limit
- ⏳ Track daily usage
- ⏳ Show remaining likes
- ⏳ Encourage profile completion

---

## 🚀 QUICKSTART IMPLEMENTATION ORDER

### Phase 1: Backend Enhancements (1-2 hours)
1. ✅ Database migrations (DONE)
2. Update matching service with daily limits
3. Create pass endpoint
4. Enhance discovery feed with filters
5. Add Most Compatible endpoint

### Phase 2: Frontend Core (2-3 hours)
1. Set up frontend project structure
2. Build ProfileCard component
3. Build Discover page with swipe
4. Build LikesQueue page
5. Build Matches page
6. Build Chat page

### Phase 3: Integration & Testing (1 hour)
1. Connect frontend to backend APIs
2. Test complete flow: Discover → Like → Match → Chat
3. Test dealbreakers and limits
4. Test real-time messaging

---

## 📊 CURRENT STATUS

**Backend**: 85% Complete
- ✅ Core matching infrastructure
- ✅ Real-time messaging
- ✅ ML discovery & ranking
- ✅ Database schema for all features
- ⏳ Daily limits enforcement
- ⏳ Pass tracking
- ⏳ Enhanced filtering

**Frontend**: 0% Complete
- ⏳ Need to build all UI components
- ⏳ Need to integrate with APIs
- ⏳ Need to test full flow

---

## 🎨 TECH STACK RECOMMENDATIONS

### Frontend
- **Framework**: React + TypeScript
- **Routing**: React Router
- **State**: Zustand or React Context
- **API**: Axios with React Query
- **WebSocket**: native WebSocket API
- **Swipe**: react-swipeable or framer-motion
- **UI**: Tailwind CSS or Material-UI
- **Forms**: React Hook Form

### Already Built (Backend)
- ✅ FastAPI
- ✅ PostgreSQL
- ✅ Redis
- ✅ WebSocket
- ✅ PyTorch ML
- ✅ Alembic migrations

---

## 🔑 KEY API ENDPOINTS

### Discovery & Feed
- `GET /api/v1/feed/discover` - Get personalized discovery feed
- `GET /api/v1/feed/standouts` - Get top 10 most compatible
- `GET /api/v1/feed/most-compatible` - Get daily "Most Compatible" pick (TO BUILD)
- `GET /api/v1/feed/likes-queue` - Get people who liked you

### Matching
- `POST /api/v1/matches/likes` - Send like (standard or rose, with optional prompt_id and note)
- `POST /api/v1/matches/pass` - Pass on profile (TO BUILD)
- `GET /api/v1/matches` - Get all matches
- `GET /api/v1/matches/limits` - Get daily limits status (TO BUILD)

### Messaging
- `GET /api/v1/messages` - Get all conversations
- `GET /api/v1/messages/{match_id}` - Get messages in thread
- `POST /api/v1/messages` - Send message
- `WS /api/v1/realtime/ws/{profile_id}` - WebSocket for real-time updates

### Profiles
- `GET /api/v1/profiles/{id}` - Get profile
- `PUT /api/v1/profiles/{id}` - Update profile
- `POST /api/v1/profiles` - Create profile

---

## 💡 NEXT STEPS

1. **Now**: Finish backend enhancements (pass endpoint, limits, filters)
2. **Next**: Build frontend with priority on discover flow
3. **Then**: Integration testing
4. **Finally**: Polish UI/UX and deploy

**Estimated time to MVP**: 4-6 hours of focused work

---

Generated: 2025-11-30
