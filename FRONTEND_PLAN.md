# Frontend Implementation Plan - Complete Step-by-Step

## 🎯 Goal
Build a working VC matching platform frontend that allows:
1. Users to sign up/login
2. Create profiles (investor or founder)
3. Browse and match with other users
4. Message matched users
5. Manage their profile

---

## 📋 COMPLETE STEP-BY-STEP PLAN

### PHASE 1: Foundation & Setup ✅

#### Step 1.1: Project Setup
- [x] Next.js 15 project initialized
- [x] TypeScript configured
- [x] Tailwind CSS configured
- [ ] **NECESSARY:** Yes - Foundation
- [ ] Verify all dependencies installed

#### Step 1.2: Project Structure
- [ ] Create folder structure:
  ```
  frontend/src/
    ├── app/              # Next.js App Router
    │   ├── (auth)/      # Auth routes group
    │   ├── (dashboard)/ # Protected routes
    │   └── layout.tsx
    ├── components/      # Reusable UI components
    │   ├── ui/         # Base components (buttons, inputs, etc.)
    │   └── features/   # Feature-specific components
    ├── lib/            # Utilities, API client, hooks
    ├── hooks/          # Custom React hooks
    ├── types/          # TypeScript types
    └── styles/         # Global styles
  ```
- [ ] **NECESSARY:** Yes - Organization
- [ ] Status: ⏳ TODO

#### Step 1.3: API Client Setup
- [x] Axios client configured
- [x] React Query setup
- [ ] **NECESSARY:** Yes - Data fetching
- [ ] Add error handling
- [ ] Add request/response interceptors
- [ ] Status: 🔄 PARTIAL

#### Step 1.4: Environment Configuration
- [x] `.env.local` created
- [ ] **NECESSARY:** Yes - Config
- [ ] Verify backend URL configuration
- [ ] Status: ✅ DONE

---

### PHASE 2: Authentication (Simplified) 🔐

#### Step 2.1: Auth Context/Provider
- [ ] Create `AuthContext` and `AuthProvider`
- [ ] Store JWT tokens (access + refresh)
- [ ] Handle token refresh
- [ ] **NECESSARY:** Yes - Auth state management
- [ ] **COMPLEXITY:** Medium
- [ ] Status: ⏳ TODO

#### Step 2.2: Login Page
- [ ] Email/password form
- [ ] Form validation
- [ ] Error handling
- [ ] Redirect after login
- [ ] **NECESSARY:** Yes - Core feature
- [ ] **COMPLEXITY:** Low
- [ ] Status: ⏳ TODO

#### Step 2.3: Signup Page
- [ ] Email/password form
- [ ] Role selection (Investor/Founder)
- [ ] Form validation
- [ ] Redirect to onboarding after signup
- [ ] **NECESSARY:** Yes - Core feature
- [ ] **COMPLEXITY:** Low
- [ ] Status: ⏳ TODO

#### Step 2.4: Protected Routes Wrapper
- [ ] Create `ProtectedRoute` component
- [ ] Redirect to login if not authenticated
- [ ] Check token expiration
- [ ] **NECESSARY:** Yes - Security
- [ ] **COMPLEXITY:** Low
- [ ] Status: ⏳ TODO

#### Step 2.5: Password Reset Flow
- [ ] Request reset page (enter email)
- [ ] Reset password page (with token)
- [ ] **NECESSARY:** Optional - Good UX
- [ ] **COMPLEXITY:** Low
- [ ] **PRIORITY:** Low (can add later)
- [ ] Status: ⏳ TODO (LOW PRIORITY)

#### Step 2.6: OAuth (LinkedIn/Google) - SKIP FOR MVP
- [ ] **NECESSARY:** No - Not essential for MVP
- [ ] **PRIORITY:** Low
- [ ] Status: ❌ SKIP

---

### PHASE 3: Onboarding Flow 👤

#### Step 3.1: Onboarding Layout/Wrapper
- [ ] Multi-step form wrapper
- [ ] Progress indicator
- [ ] Navigation (Next/Back buttons)
- [ ] **NECESSARY:** Yes - Core UX
- [ ] **COMPLEXITY:** Medium
- [ ] Status: ⏳ TODO

#### Step 3.2: Role Selection (If not done in signup)
- [ ] Investor/Founder selection
- [ ] Clear descriptions
- [ ] **NECESSARY:** Yes - Core feature
- [ ] **COMPLEXITY:** Low
- [ ] Status: ⏳ TODO

#### Step 3.3: Basic Info Step
- [ ] Full name
- [ ] Email (pre-filled)
- [ ] Location
- [ ] Headline/bio
- [ ] **NECESSARY:** Yes - Core feature
- [ ] **COMPLEXITY:** Low
- [ ] Status: ⏳ TODO

#### Step 3.4: Profile Photo Upload - SKIP FOR MVP
- [ ] **NECESSARY:** No - Not essential
- [ ] **PRIORITY:** Low
- [ ] Status: ❌ SKIP (users can add later)

#### Step 3.5: Investor-Specific Onboarding
- [ ] Firm name
- [ ] Check size (min/max)
- [ ] Focus sectors (multi-select)
- [ ] Focus stages (multi-select)
- [ ] Accreditation checkbox
- [ ] **NECESSARY:** Yes - Core feature
- [ ] **COMPLEXITY:** Medium
- [ ] Status: ⏳ TODO

#### Step 3.6: Founder-Specific Onboarding
- [ ] Company name
- [ ] Company URL
- [ ] Revenue run rate
- [ ] Team size
- [ ] Runway (months)
- [ ] Focus markets
- [ ] **NECESSARY:** Yes - Core feature
- [ ] **COMPLEXITY:** Medium
- [ ] Status: ⏳ TODO

#### Step 3.7: Prompts Setup
- [ ] Show prompt templates (from API)
- [ ] Allow user to answer 2-3 prompts
- [ ] **NECESSARY:** Yes - Core feature (Hinge-style)
- [ ] **COMPLEXITY:** Medium
- [ ] Status: ⏳ TODO

#### Step 3.8: Onboarding Completion
- [ ] Submit all data to API
- [ ] Show success message
- [ ] Redirect to discovery feed
- [ ] **NECESSARY:** Yes - Core flow
- [ ] **COMPLEXITY:** Low
- [ ] Status: ⏳ TODO

---

### PHASE 4: Discovery Feed (Simplified) 🔍

#### Step 4.1: Discovery Feed Layout
- [ ] Full-screen card stack layout
- [ ] Card component structure
- [ ] **NECESSARY:** Yes - Core feature
- [ ] **COMPLEXITY:** Medium
- [ ] Status: ⏳ TODO

#### Step 4.2: Profile Card Component
- [ ] Display profile info:
  - Name, headline, location
  - Prompts (2-3)
  - Key metrics (revenue, runway, team - for founders)
  - Focus sectors/stages (for investors)
- [ ] Basic styling (card design)
- [ ] **NECESSARY:** Yes - Core feature
- [ ] **COMPLEXITY:** Medium
- [ ] Status: ⏳ TODO

#### Step 4.3: Swipe Actions (Simplified)
- [ ] "Interested" button
- [ ] "Pass" button
- [ ] Optional: "Note" button
- [ ] No complex swipe gestures (keep it simple)
- [ ] **NECESSARY:** Yes - Core feature
- [ ] **COMPLEXITY:** Low (simple buttons)
- [ ] Status: ⏳ TODO

#### Step 4.4: Fetch Profiles API Integration
- [ ] Call `/api/v1/feed/discover` endpoint
- [ ] Handle pagination/loading more
- [ ] Handle empty states
- [ ] **NECESSARY:** Yes - Core feature
- [ ] **COMPLEXITY:** Low
- [ ] Status: ⏳ TODO

#### Step 4.5: Like/Pass Actions
- [ ] Call `/api/v1/matches/like` or `/api/v1/matches/pass`
- [ ] Show next profile after action
- [ ] Handle match notifications
- [ ] **NECESSARY:** Yes - Core feature
- [ ] **COMPLEXITY:** Low
- [ ] Status: ⏳ TODO

#### Step 4.6: Loading States
- [ ] Skeleton loaders
- [ ] Loading spinner
- [ ] **NECESSARY:** Yes - Good UX
- [ ] **COMPLEXITY:** Low
- [ ] Status: ⏳ TODO

#### Step 4.7: Empty States
- [ ] "No more profiles" message
- [ ] Refresh button
- [ ] **NECESSARY:** Yes - Good UX
- [ ] **COMPLEXITY:** Low
- [ ] Status: ⏳ TODO

---

### PHASE 5: Likes Queue (Simplified) ❤️

#### Step 5.1: Likes Queue Page
- [ ] List of profiles that liked you
- [ ] Basic list/card layout
- [ ] **NECESSARY:** Yes - Core feature
- [ ] **COMPLEXITY:** Low
- [ ] Status: ⏳ TODO

#### Step 5.2: Fetch Likes API Integration
- [ ] Call `/api/v1/feed/likes-queue` endpoint
- [ ] Display profiles
- [ ] **NECESSARY:** Yes - Core feature
- [ ] **COMPLEXITY:** Low
- [ ] Status: ⏳ TODO

#### Step 5.3: Quick Actions
- [ ] "Like Back" button
- [ ] "Pass" button
- [ ] View profile button
- [ ] **NECESSARY:** Yes - Core feature
- [ ] **COMPLEXITY:** Low
- [ ] Status: ⏳ TODO

#### Step 5.4: Match Notification
- [ ] Show notification when mutual like
- [ ] Redirect to messaging
- [ ] **NECESSARY:** Yes - Core feature
- [ ] **COMPLEXITY:** Low
- [ ] Status: ⏳ TODO

---

### PHASE 6: Messaging (Simplified) 💬

#### Step 6.1: Messages List Page
- [ ] List of conversations (matches)
- [ ] Show last message preview
- [ ] Unread count badges
- [ ] **NECESSARY:** Yes - Core feature
- [ ] **COMPLEXITY:** Medium
- [ ] Status: ⏳ TODO

#### Step 6.2: Fetch Conversations API
- [ ] Call `/api/v1/matches` endpoint
- [ ] Get list of matches/conversations
- [ ] **NECESSARY:** Yes - Core feature
- [ ] **COMPLEXITY:** Low
- [ ] Status: ⏳ TODO

#### Step 6.3: Message Thread View
- [ ] Display messages in thread
- [ ] Scroll to bottom
- [ ] Show sender info
- [ ] Show timestamps
- [ ] **NECESSARY:** Yes - Core feature
- [ ] **COMPLEXITY:** Medium
- [ ] Status: ⏳ TODO

#### Step 6.4: Fetch Messages API
- [ ] Call `/api/v1/messaging/threads/{match_id}/messages`
- [ ] Display messages
- [ ] **NECESSARY:** Yes - Core feature
- [ ] **COMPLEXITY:** Low
- [ ] Status: ⏳ TODO

#### Step 6.5: Send Message
- [ ] Message input field
- [ ] Send button
- [ ] Call `/api/v1/messaging/send` endpoint
- [ ] Update UI after send
- [ ] **NECESSARY:** Yes - Core feature
- [ ] **COMPLEXITY:** Low
- [ ] Status: ⏳ TODO

#### Step 6.6: Polling for New Messages (Simplified)
- [ ] Poll `/api/v1/messaging/threads/{match_id}/messages` every 5-10 seconds
- [ ] Update UI with new messages
- [ ] **NECESSARY:** Yes - Need to receive messages
- [ ] **COMPLEXITY:** Low (REST polling, no WebSockets)
- [ ] Status: ⏳ TODO

#### Step 6.7: Mark as Read
- [ ] Call `/api/v1/messaging/threads/{match_id}/read` when viewing
- [ ] **NECESSARY:** Yes - Good UX
- [ ] **COMPLEXITY:** Low
- [ ] Status: ⏳ TODO

#### Step 6.8: File Attachments - SKIP FOR MVP
- [ ] **NECESSARY:** No - Not essential
- [ ] **PRIORITY:** Low
- [ ] Status: ❌ SKIP (users can share links)

#### Step 6.9: Typing Indicators - SKIP FOR MVP
- [ ] **NECESSARY:** No - Not essential
- [ ] **PRIORITY:** Low
- [ ] Status: ❌ SKIP

#### Step 6.10: Online Status - SKIP FOR MVP
- [ ] **NECESSARY:** No - Not essential
- [ ] **PRIORITY:** Low
- [ ] Status: ❌ SKIP

---

### PHASE 7: Profile Management 👤

#### Step 7.1: Profile View Page
- [ ] Display user's own profile
- [ ] Show all profile info
- [ ] Edit button
- [ ] **NECESSARY:** Yes - Core feature
- [ ] **COMPLEXITY:** Low
- [ ] Status: ⏳ TODO

#### Step 7.2: Profile Edit Page
- [ ] Edit form (similar to onboarding)
- [ ] Save changes
- [ ] **NECESSARY:** Yes - Core feature
- [ ] **COMPLEXITY:** Medium
- [ ] Status: ⏳ TODO

#### Step 7.3: Update Profile API Integration
- [ ] Call `PUT /api/v1/profiles/{id}` endpoint
- [ ] Handle success/error
- [ ] **NECESSARY:** Yes - Core feature
- [ ] **COMPLEXITY:** Low
- [ ] Status: ⏳ TODO

#### Step 7.4: Stats Dashboard - SKIP FOR MVP
- [ ] **NECESSARY:** No - Not essential
- [ ] **PRIORITY:** Low
- [ ] Status: ❌ SKIP

---

### PHASE 8: Navigation & Layout 🧭

#### Step 8.1: Main Layout Component
- [ ] Header with navigation
- [ ] Footer (optional)
- [ ] **NECESSARY:** Yes - Navigation
- [ ] **COMPLEXITY:** Low
- [ ] Status: ⏳ TODO

#### Step 8.2: Navigation Bar
- [ ] Discovery feed link
- [ ] Likes queue link
- [ ] Messages link
- [ ] Profile link
- [ ] Logout button
- [ ] **NECESSARY:** Yes - Navigation
- [ ] **COMPLEXITY:** Low
- [ ] Status: ⏳ TODO

#### Step 8.3: Mobile Responsive Design
- [ ] Mobile-friendly navigation
- [ ] Responsive layouts
- [ ] **NECESSARY:** Yes - Mobile users
- [ ] **COMPLEXITY:** Medium
- [ ] Status: ⏳ TODO

---

### PHASE 9: UI Components Library 🎨

#### Step 9.1: Base UI Components
- [ ] Button component
- [ ] Input component
- [ ] Card component
- [ ] Modal/Dialog component
- [ ] Toast/Notification component
- [ ] **NECESSARY:** Yes - Reusable components
- [ ] **COMPLEXITY:** Medium
- [ ] Status: ⏳ TODO

#### Step 9.2: Form Components
- [ ] Text input
- [ ] Select dropdown
- [ ] Multi-select
- [ ] Checkbox
- [ ] Radio buttons
- [ ] **NECESSARY:** Yes - Forms needed
- [ ] **COMPLEXITY:** Medium
- [ ] Status: ⏳ TODO

#### Step 9.3: Loading Components
- [ ] Spinner
- [ ] Skeleton loader
- [ ] **NECESSARY:** Yes - Good UX
- [ ] **COMPLEXITY:** Low
- [ ] Status: ⏳ TODO

---

### PHASE 10: Error Handling & Polish ✨

#### Step 10.1: Error Boundaries
- [ ] React error boundary component
- [ ] Fallback UI
- [ ] **NECESSARY:** Yes - Error handling
- [ ] **COMPLEXITY:** Low
- [ ] Status: ⏳ TODO

#### Step 10.2: Error Messages
- [ ] API error handling
- [ ] User-friendly error messages
- [ ] **NECESSARY:** Yes - Good UX
- [ ] **COMPLEXITY:** Low
- [ ] Status: ⏳ TODO

#### Step 10.3: Toast Notifications
- [ ] Success messages
- [ ] Error messages
- [ ] Info messages
- [ ] **NECESSARY:** Yes - Good UX
- [ ] **COMPLEXITY:** Low
- [ ] Status: ⏳ TODO

#### Step 10.4: Form Validation
- [ ] Client-side validation
- [ ] Show validation errors
- [ ] **NECESSARY:** Yes - Good UX
- [ ] **COMPLEXITY:** Medium
- [ ] Status: ⏳ TODO

---

## 📊 SUMMARY BY NECESSITY

### ✅ ESSENTIAL (Must Have for MVP):
- ✅ Auth (login/signup)
- ✅ Onboarding
- ✅ Discovery feed
- ✅ Matching (like/pass)
- ✅ Likes queue
- ✅ Messaging (simplified, polling)
- ✅ Profile management
- ✅ Navigation
- ✅ Base UI components
- ✅ Error handling

**Total Essential Steps: ~40 steps**

### ⚠️ OPTIONAL (Nice to Have):
- ⚠️ Password reset (can add later)
- ⚠️ Profile stats dashboard (not needed for MVP)

### ❌ SKIP FOR MVP:
- ❌ OAuth (LinkedIn/Google)
- ❌ Profile photo upload
- ❌ File attachments in messages
- ❌ Typing indicators
- ❌ Online status
- ❌ WebSockets (use polling)
- ❌ Complex animations

---

## 🎯 IMPLEMENTATION ORDER

1. **Foundation** (Steps 1.1-1.4) → 1 day
2. **Authentication** (Steps 2.1-2.4) → 1 day
3. **Onboarding** (Steps 3.1-3.8) → 2 days
4. **Discovery Feed** (Steps 4.1-4.7) → 2 days
5. **Likes Queue** (Steps 5.1-5.4) → 1 day
6. **Messaging** (Steps 6.1-6.7) → 2 days
7. **Profile Management** (Steps 7.1-7.3) → 1 day
8. **Navigation** (Steps 8.1-8.3) → 1 day
9. **UI Components** (Steps 9.1-9.3) → 2 days (parallel with other work)
10. **Error Handling** (Steps 10.1-10.4) → 1 day

**Total Estimated Time: ~13 days**

---

## ✅ FINALIZED PLAN (After Review)

**Once you review and approve, we'll:**
1. Create detailed implementation checklist
2. Set up file structure
3. Implement step by step
4. Test each phase before moving to next

**Ready to finalize and start implementation?**

