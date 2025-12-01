# Frontend Testing Guide

## Prerequisites

1. **Backend must be running** on `http://localhost:8000`
2. **PostgreSQL** and **Redis** must be running (via Docker Compose)
3. **Frontend dependencies** installed

## Quick Start

### 1. Start Backend Services

```bash
# From project root
docker-compose -f docker-compose.dev.yml up -d

# Verify services are running
docker-compose -f docker-compose.dev.yml ps
```

### 2. Start Backend API

```bash
cd backend
# Activate virtual environment (if using one)
source .venv/bin/activate  # or: source venv/bin/activate

# Start backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend should be available at: `http://localhost:8000`
API docs at: `http://localhost:8000/api/docs`

### 3. Start Frontend

```bash
cd frontend
npm install  # If not already installed
npm run dev
```

Frontend should be available at: `http://localhost:3000`

## Testing Flow

### Step 1: Sign Up
1. Navigate to `http://localhost:3000/signup`
2. Fill in:
   - Full Name: `Test User`
   - Email: `test@example.com`
   - Role: Select `Investor` or `Founder`
   - Password: `password123`
   - Confirm Password: `password123`
3. Click "Create Account"
4. **Expected**: Redirected to onboarding page

### Step 2: Onboarding
1. **Step 1 - Basic Info:**
   - Full Name: `Test User`
   - Location: `San Francisco, CA`
   - Headline: `Test headline`
   - Click "Next"

2. **Step 2 - Role-specific:**
   - **If Investor:**
     - Firm: `Test Ventures`
     - Min Check: `50000`
     - Max Check: `500000`
     - Select sectors (e.g., AI/ML, SaaS)
     - Select stages (e.g., Seed, Series A)
     - Click "Next"
   - **If Founder:**
     - Company Name: `Test Startup`
     - Company URL: `https://teststartup.com`
     - Revenue: `10000`
     - Team Size: `5`
     - Runway: `18`
     - Focus Markets: `B2B SaaS, Enterprise`
     - Click "Next"

3. **Step 3 - Prompts:**
   - Answer 2-3 prompt questions
   - Click "Complete Profile"
   - **Expected**: Redirected to discovery feed

### Step 3: Discovery Feed
1. Should see profile cards
2. **Test Like:**
   - Click "Interested" button
   - **Expected**: Next profile appears
3. **Test Pass:**
   - Click "Pass" button
   - **Expected**: Next profile appears
4. Navigate through profiles

### Step 4: Likes Queue
1. Navigate to `/likes` (click "Likes" in navbar)
2. **Expected**: See profiles that liked you (if any)
3. Test "Like Back" button if profiles exist
4. Test "Pass" button

### Step 5: Messaging
1. **Navigate to Messages:**
   - Click "Messages" in navbar
   - **Expected**: See conversation list (empty if no matches)

2. **Create a Match First:**
   - Go to `/discover`
   - Like a profile
   - Have that profile like you back (or use another account)
   - **Expected**: Match created

3. **Send Messages:**
   - Click on a conversation
   - Type a message
   - Click "Send"
   - **Expected**: Message appears in thread

### Step 6: Profile
1. Navigate to `/profile` (click "Profile" in navbar)
2. **Expected**: See your profile information
3. Test "Edit" button (if implemented)

## Testing with Multiple Users

### User 1: Investor
1. Sign up as Investor
2. Complete onboarding
3. Browse founders in discovery

### User 2: Founder
1. Sign up as Founder (different email)
2. Complete onboarding
3. Like User 1 back
4. Send messages

## Common Issues

### Backend not responding
- Check if backend is running: `curl http://localhost:8000/api/v1/healthz`
- Check backend logs for errors
- Verify `.env` file is configured

### CORS errors
- Backend should allow `http://localhost:3000`
- Check `backend/app/main.py` for CORS settings

### Authentication errors
- Clear browser localStorage
- Try signing up again
- Check backend logs for token errors

### No profiles in discovery
- Make sure you have other profiles in database
- Check backend `/api/v1/feed/discover` endpoint
- Verify profile creation worked

## API Endpoints to Test Directly

```bash
# Health check
curl http://localhost:8000/api/v1/healthz

# Sign up
curl -X POST http://localhost:8000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "role": "investor",
    "full_name": "Test User"
  }'

# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

## Checklist

- [ ] Backend running on port 8000
- [ ] Frontend running on port 3000
- [ ] Can access `http://localhost:3000`
- [ ] Sign up works
- [ ] Onboarding completes
- [ ] Discovery feed loads
- [ ] Like/Pass buttons work
- [ ] Likes queue displays
- [ ] Messages page loads
- [ ] Can send messages
- [ ] Profile page displays correctly
- [ ] Navigation works

## Next Steps After Testing

1. Fix any bugs discovered
2. Add missing features (WebSocket, profile editing, etc.)
3. Improve UI/UX
4. Add error handling
5. Add loading states
6. Deploy to production

