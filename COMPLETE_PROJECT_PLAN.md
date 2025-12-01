# Complete Project Implementation Plan - FINALIZED

## 🎯 Project Goal

Build a working VC matching platform MVP that allows:

1. Users to sign up/login
2. Create investor or founder profiles
3. Browse and discover profiles
4. Like/pass on profiles
5. Match with mutual likes
6. Message matched users
7. Manage profiles

---

## 📊 CURRENT STATUS

### ✅ Backend - COMPLETE

- [x] FastAPI application structure
- [x] PostgreSQL + SQLModel models (profiles, matches, messages)
- [x] Redis caching
- [x] Profile CRUD endpoints
- [x] Matching service (likes, matches)
- [x] Messaging service
- [x] Discovery feed service
- [x] Prompt templates
- [x] Admin endpoints
- [x] JWT authentication (email/password)
- [x] Database migrations
- [x] Basic tests

### ✅ Frontend - PARTIAL

- [x] Next.js 15 project setup
- [x] TypeScript configured
- [x] Tailwind CSS configured
- [x] API client setup
- [x] React Query setup
- [ ] Everything else - TODO

---

## 📋 COMPLETE IMPLEMENTATION PLAN

## PART 1: BACKEND CLEANUP & FINALIZATION

### Step 1.1: Remove Plaid Integration Only ❌

**Status:** ⏳ TODO  
**Priority:** HIGH  
**Necessary:** YES - Plaid not needed for VC matching  
**Time:** 30 minutes

**Tasks:**

- [ ] Remove Plaid integration code from diligence service
- [ ] Remove PlaidSource class from ETL data sources
- [ ] Remove Plaid configuration from settings
- [ ] Remove Plaid-related documentation files
- [ ] Clean up all Plaid references in code

**Files to modify:**

- `backend/app/services/diligence.py` - Remove Plaid references
- `backend/app/services/etl/data_sources.py` - Remove PlaidSource class
- `backend/app/core/config.py` - Remove Plaid config variables
- Delete: `backend/PLAID_*.md` documentation files

**Keep everything else:**

- ✅ OAuth (Firebase, Google, LinkedIn) - KEEP
- ✅ WebSockets/Real-time - KEEP
- ✅ ETL pipeline (Crunchbase, Clearbit) - KEEP
- ✅ File storage (MinIO/S3) - KEEP
- ✅ All other features - KEEP

### Step 1.2: Verify Core APIs Work ✅

**Status:** ⏳ TODO  
**Priority:** HIGH  
**Necessary:** YES - Must work before frontend  
**Time:** 2 hours

**Tasks:**

- [ ] Test `/api/v1/auth/signup` - Works
- [ ] Test `/api/v1/auth/login` - Works
- [ ] Test `/api/v1/profiles` - CRUD works
- [ ] Test `/api/v1/feed/discover` - Returns profiles
- [ ] Test `/api/v1/matches/like` - Works
- [ ] Test `/api/v1/matches` - Returns matches
- [ ] Test `/api/v1/messaging/threads` - Returns conversations
- [ ] Test `/api/v1/messaging/send` - Sends messages
- [ ] Verify all endpoints return correct data

### Step 1.3: Create API Documentation 📚

**Status:** ⏳ TODO  
**Priority:** MEDIUM  
**Necessary:** YES - Need to know endpoints  
**Time:** 1 hour

**Tasks:**

- [ ] Document all essential endpoints
- [ ] Add request/response examples
- [ ] Document authentication flow
- [ ] Create quick reference guide

---

## PART 2: FRONTEND FOUNDATION

### Step 2.1: Project Structure Setup 📁

**Status:** ⏳ TODO  
**Priority:** HIGH  
**Necessary:** YES - Organization  
**Time:** 30 minutes

**Tasks:**

- [ ] Create folder structure:
  ```
  frontend/src/
    ├── app/
    │   ├── (auth)/          # Login, signup
    │   ├── (dashboard)/     # Protected routes
    │   │   ├── discover/    # Discovery feed
    │   │   ├── likes/       # Likes queue
    │   │   ├── messages/    # Messaging
    │   │   └── profile/     # Profile management
    │   └── onboarding/      # Onboarding flow
    ├── components/
    │   ├── ui/              # Button, Input, Card, etc.
    │   └── features/        # Feature-specific components
    ├── hooks/               # useAuth, useProfile, etc.
    ├── lib/
    │   ├── api/            # API endpoint functions
    │   └── utils/          # Utilities
    └── types/              # TypeScript types
  ```

### Step 2.2: Complete API Client 🔌

**Status:** ⏳ TODO  
**Priority:** HIGH  
**Necessary:** YES - Data fetching  
**Time:** 1 hour

**Tasks:**

- [ ] Add error handling to API client
- [ ] Add request/response interceptors
- [ ] Add token refresh logic
- [ ] Create API endpoint functions for:
  - [ ] Auth (signup, login, logout, refresh)
  - [ ] Profiles (get, update, create)
  - [ ] Feed (discover, likes-queue)
  - [ ] Matches (like, pass, list)
  - [ ] Messaging (threads, messages, send)
  - [ ] Prompts (get templates)

### Step 2.3: UI Components Library 🎨

**Status:** ⏳ TODO  
**Priority:** HIGH  
**Necessary:** YES - Reusable components  
**Time:** 3 hours

**Tasks:**

- [ ] Button component (primary, secondary, danger)
- [ ] Input component (text, email, password)
- [ ] Card component
- [ ] Modal/Dialog component
- [ ] Toast/Notification component
- [ ] Loading spinner
- [ ] Form components (Select, Checkbox, Multi-select)
- [ ] Error message component

---

## PART 3: AUTHENTICATION

### Step 3.1: Auth Context & Provider 🔐

**Status:** ⏳ TODO  
**Priority:** HIGH  
**Necessary:** YES - Auth state  
**Time:** 2 hours

**Tasks:**

- [ ] Create `AuthContext`
- [ ] Create `AuthProvider`
- [ ] Store tokens in localStorage
- [ ] Handle token refresh
- [ ] Create `useAuth` hook
- [ ] Handle logout

### Step 3.2: Login Page 🔑

**Status:** ⏳ TODO  
**Priority:** HIGH  
**Necessary:** YES - Core feature  
**Time:** 2 hours

**Tasks:**

- [ ] Create login page at `/login`
- [ ] Email/password form
- [ ] Form validation (Zod)
- [ ] Error handling
- [ ] Redirect to discovery after login
- [ ] Link to signup page

### Step 3.3: Signup Page ✍️

**Status:** ⏳ TODO  
**Priority:** HIGH  
**Necessary:** YES - Core feature  
**Time:** 2 hours

**Tasks:**

- [ ] Create signup page at `/signup`
- [ ] Email/password form
- [ ] Role selection (Investor/Founder)
- [ ] Form validation
- [ ] Redirect to onboarding after signup
- [ ] Link to login page

### Step 3.4: Protected Route Wrapper 🛡️

**Status:** ⏳ TODO  
**Priority:** HIGH  
**Necessary:** YES - Security  
**Time:** 1 hour

**Tasks:**

- [ ] Create `ProtectedRoute` component
- [ ] Check authentication
- [ ] Redirect to login if not authenticated
- [ ] Wrap all dashboard routes

---

## PART 4: ONBOARDING FLOW

### Step 4.1: Onboarding Wrapper 📝

**Status:** ⏳ TODO  
**Priority:** HIGH  
**Necessary:** YES - User setup  
**Time:** 2 hours

**Tasks:**

- [ ] Create multi-step form wrapper
- [ ] Progress indicator
- [ ] Next/Back buttons
- [ ] Form state management

### Step 4.2: Basic Info Step 👤

**Status:** ⏳ TODO  
**Priority:** HIGH  
**Necessary:** YES - Core data  
**Time:** 1 hour

**Tasks:**

- [ ] Full name input
- [ ] Email (pre-filled, read-only)
- [ ] Location input
- [ ] Headline/bio textarea
- [ ] Validation

### Step 4.3: Investor Form 💼

**Status:** ⏳ TODO  
**Priority:** HIGH  
**Necessary:** YES - Investor setup  
**Time:** 2 hours

**Tasks:**

- [ ] Firm name input
- [ ] Check size (min/max) inputs
- [ ] Focus sectors (multi-select)
- [ ] Focus stages (multi-select)
- [ ] Accreditation checkbox
- [ ] Validation

### Step 4.4: Founder Form 🚀

**Status:** ⏳ TODO  
**Priority:** HIGH  
**Necessary:** YES - Founder setup  
**Time:** 2 hours

**Tasks:**

- [ ] Company name input
- [ ] Company URL input
- [ ] Revenue run rate input
- [ ] Team size input
- [ ] Runway (months) input
- [ ] Focus markets (multi-select)
- [ ] Validation

### Step 4.5: Prompts Setup 💬

**Status:** ⏳ TODO  
**Priority:** HIGH  
**Necessary:** YES - Hinge-style feature  
**Time:** 2 hours

**Tasks:**

- [ ] Fetch prompt templates from API
- [ ] Display 2-3 prompts to answer
- [ ] Text input for each answer
- [ ] Save answers to profile

### Step 4.6: Onboarding Completion ✅

**Status:** ⏳ TODO  
**Priority:** HIGH  
**Necessary:** YES - Complete flow  
**Time:** 1 hour

**Tasks:**

- [ ] Submit all data to API
- [ ] Create profile
- [ ] Show success message
- [ ] Redirect to discovery feed

---

## PART 5: DISCOVERY FEED

### Step 5.1: Discovery Feed Layout 🔍

**Status:** ⏳ TODO  
**Priority:** HIGH  
**Necessary:** YES - Core feature  
**Time:** 2 hours

**Tasks:**

- [ ] Create discovery page at `/discover`
- [ ] Full-screen card stack layout
- [ ] Card container component
- [ ] Responsive design

### Step 5.2: Profile Card Component 🎴

**Status:** ⏳ TODO  
**Priority:** HIGH  
**Necessary:** YES - Core feature  
**Time:** 3 hours

**Tasks:**

- [ ] Display profile info:
  - Name, headline, location
  - Prompts (2-3 answers)
  - Key metrics (for founders: revenue, runway, team)
  - Focus sectors/stages (for investors)
- [ ] Card styling
- [ ] Responsive layout

### Step 5.3: Like/Pass Actions ❤️

**Status:** ⏳ TODO  
**Priority:** HIGH  
**Necessary:** YES - Core feature  
**Time:** 2 hours

**Tasks:**

- [ ] "Interested" button
- [ ] "Pass" button
- [ ] Optional "Note" button
- [ ] Call API on action
- [ ] Show next profile after action
- [ ] Handle match notification

### Step 5.4: Feed API Integration 🔌

**Status:** ⏳ TODO  
**Priority:** HIGH  
**Necessary:** YES - Core feature  
**Time:** 2 hours

**Tasks:**

- [ ] Fetch profiles from `/api/v1/feed/discover`
- [ ] Handle pagination
- [ ] Loading states
- [ ] Empty states ("No more profiles")
- [ ] Error handling

---

## PART 6: LIKES QUEUE

### Step 6.1: Likes Queue Page ❤️

**Status:** ⏳ TODO  
**Priority:** HIGH  
**Necessary:** YES - Core feature  
**Time:** 2 hours

**Tasks:**

- [ ] Create likes queue page at `/likes`
- [ ] List layout
- [ ] Display profiles that liked you
- [ ] Show profile cards

### Step 6.2: Likes API Integration 🔌

**Status:** ⏳ TODO  
**Priority:** HIGH  
**Necessary:** YES - Core feature  
**Time:** 1 hour

**Tasks:**

- [ ] Fetch from `/api/v1/feed/likes-queue`
- [ ] Display profiles
- [ ] Loading states
- [ ] Empty states

### Step 6.3: Quick Actions ⚡

**Status:** ⏳ TODO  
**Priority:** HIGH  
**Necessary:** YES - Core feature  
**Time:** 1 hour

**Tasks:**

- [ ] "Like Back" button
- [ ] "Pass" button
- [ ] Handle match when mutual like
- [ ] Redirect to messages on match

---

## PART 7: MESSAGING

### Step 7.1: Messages List 📋

**Status:** ⏳ TODO  
**Priority:** HIGH  
**Necessary:** YES - Core feature  
**Time:** 2 hours

**Tasks:**

- [ ] Create messages page at `/messages`
- [ ] List of conversations (matches)
- [ ] Show last message preview
- [ ] Unread count badges
- [ ] Click to open thread

### Step 7.2: Message Thread 💬

**Status:** ⏳ TODO  
**Priority:** HIGH  
**Necessary:** YES - Core feature  
**Time:** 3 hours

**Tasks:**

- [ ] Thread view component
- [ ] Display messages in chronological order
- [ ] Show sender info
- [ ] Show timestamps
- [ ] Scroll to bottom
- [ ] Message input field
- [ ] Send button

### Step 7.3: Messaging API Integration 🔌

**Status:** ⏳ TODO  
**Priority:** HIGH  
**Necessary:** YES - Core feature  
**Time:** 2 hours

**Tasks:**

- [ ] Fetch conversations from `/api/v1/matches`
- [ ] Fetch messages from `/api/v1/messaging/threads/{id}/messages`
- [ ] Send message via `/api/v1/messaging/send`
- [ ] Mark as read via `/api/v1/messaging/threads/{id}/read`

### Step 7.4: Message Polling 🔄

**Status:** ⏳ TODO  
**Priority:** HIGH  
**Necessary:** YES - Receive messages  
**Time:** 1 hour

**Tasks:**

- [ ] Poll for new messages every 5-10 seconds
- [ ] Update UI with new messages
- [ ] Only poll when thread is open
- [ ] Handle errors gracefully

---

## PART 8: PROFILE MANAGEMENT

### Step 8.1: Profile View Page 👤

**Status:** ⏳ TODO  
**Priority:** MEDIUM  
**Necessary:** YES - User needs to see profile  
**Time:** 1 hour

**Tasks:**

- [ ] Create profile page at `/profile`
- [ ] Display user's own profile
- [ ] Show all profile info
- [ ] Edit button

### Step 8.2: Profile Edit Page ✏️

**Status:** ⏳ TODO  
**Priority:** MEDIUM  
**Necessary:** YES - Users need to edit  
**Time:** 2 hours

**Tasks:**

- [ ] Create edit form
- [ ] Pre-fill existing data
- [ ] Allow editing all fields
- [ ] Save changes
- [ ] Redirect to profile view

---

## PART 9: NAVIGATION & LAYOUT

### Step 9.1: Main Layout 🧭

**Status:** ⏳ TODO  
**Priority:** HIGH  
**Necessary:** YES - Navigation  
**Time:** 2 hours

**Tasks:**

- [ ] Create main layout component
- [ ] Header with navigation
- [ ] Footer (optional)
- [ ] Wrap all dashboard routes

### Step 9.2: Navigation Bar 📱

**Status:** ⏳ TODO  
**Priority:** HIGH  
**Necessary:** YES - Navigation  
**Time:** 1 hour

**Tasks:**

- [ ] Discovery feed link
- [ ] Likes queue link
- [ ] Messages link
- [ ] Profile link
- [ ] Logout button
- [ ] Active route highlighting

### Step 9.3: Mobile Responsive 📱

**Status:** ⏳ TODO  
**Priority:** MEDIUM  
**Necessary:** YES - Mobile users  
**Time:** 2 hours

**Tasks:**

- [ ] Mobile-friendly navigation
- [ ] Responsive layouts
- [ ] Touch-friendly buttons
- [ ] Mobile menu (hamburger)

---

## PART 10: ERROR HANDLING & POLISH

### Step 10.1: Error Boundaries 🛡️

**Status:** ⏳ TODO  
**Priority:** MEDIUM  
**Necessary:** YES - Error handling  
**Time:** 1 hour

**Tasks:**

- [ ] Create error boundary component
- [ ] Fallback UI
- [ ] Error logging

### Step 10.2: API Error Handling ⚠️

**Status:** ⏳ TODO  
**Priority:** HIGH  
**Necessary:** YES - Good UX  
**Time:** 1 hour

**Tasks:**

- [ ] Handle API errors
- [ ] Show user-friendly error messages
- [ ] Toast notifications for errors

### Step 10.3: Form Validation ✅

**Status:** ⏳ TODO  
**Priority:** HIGH  
**Necessary:** YES - Good UX  
**Time:** 2 hours

**Tasks:**

- [ ] Client-side validation (Zod)
- [ ] Show validation errors
- [ ] Disable submit on invalid
- [ ] Real-time validation feedback

### Step 10.4: Loading States ⏳

**Status:** ⏳ TODO  
**Priority:** MEDIUM  
**Necessary:** YES - Good UX  
**Time:** 1 hour

**Tasks:**

- [ ] Loading spinners
- [ ] Skeleton loaders
- [ ] Disable buttons during loading

---

## 📊 SUMMARY

### ✅ BACKEND (Part 1)

- Steps: 3
- Time: ~3.5 hours
- Status: Remove Plaid only, verify APIs

### ✅ FRONTEND (Parts 2-10)

- Steps: 35
- Time: ~50 hours
- Status: Build from scratch

### **TOTAL**

- **Steps:** 38 essential steps
- **Time:** ~53.5 hours (~7 days of focused work)
- **Priority:** Build MVP systematically

---

## 🎯 IMPLEMENTATION ORDER

1. **Part 1: Backend Cleanup** (6 hours) → Ensure backend is clean and working
2. **Part 2: Frontend Foundation** (4.5 hours) → Set up structure and components
3. **Part 3: Authentication** (7 hours) → Users can sign up/login
4. **Part 4: Onboarding** (10 hours) → Users can create profiles
5. **Part 5: Discovery Feed** (9 hours) → Users can browse profiles
6. **Part 6: Likes Queue** (4 hours) → Users can see who liked them
7. **Part 7: Messaging** (8 hours) → Users can message matches
8. **Part 8: Profile Management** (3 hours) → Users can edit profiles
9. **Part 9: Navigation** (5 hours) → Easy navigation
10. **Part 10: Polish** (5 hours) → Error handling, loading states

---

## ✅ FINALIZED PLAN

**Once you approve, we'll:**

1. Start with Part 1 (Backend Cleanup)
2. Move through each part systematically
3. Test each part before moving forward
4. Keep you updated on progress

**Ready to start implementation?**
