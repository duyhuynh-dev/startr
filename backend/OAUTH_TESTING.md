# OAuth Testing Guide

This guide explains how to test the OAuth endpoints that have been implemented.

## ✅ Implementation Status

All OAuth endpoints are now fully implemented:
- ✅ LinkedIn OAuth (authorize + callback)
- ✅ Google OAuth (authorize + callback)
- ✅ Firebase OAuth (callback with ID token)

## 🔗 Endpoints

### 1. Get OAuth Authorization URL

**LinkedIn:**
```bash
GET /api/v1/auth/oauth/linkedin/authorize
```

**Google:**
```bash
GET /api/v1/auth/oauth/google/authorize
```

**Response:**
```json
{
  "authorization_url": "https://www.linkedin.com/oauth/v2/authorization?...",
  "state": "random-state-string-for-csrf-protection"
}
```

**Note:** Firebase doesn't use this endpoint - it uses ID tokens directly.

### 2. OAuth Callback

**LinkedIn/Google:**
```bash
POST /api/v1/auth/oauth/{provider}/callback
Content-Type: application/json

{
  "code": "authorization-code-from-provider",
  "state": "state-string-from-authorize-response"
}
```

**Firebase:**
```bash
POST /api/v1/auth/oauth/firebase/callback
Content-Type: application/json

{
  "id_token": "firebase-id-token-from-client-sdk"
}
```

**Response:**
```json
{
  "access_token": "jwt-access-token",
  "refresh_token": "jwt-refresh-token",
  "token_type": "bearer",
  "expires_in": 1800
}
```

## 🧪 Testing

### Prerequisites

1. Make sure your `.env` file has the OAuth credentials:
   ```env
   # LinkedIn
   LINKEDIN_CLIENT_ID=your_client_id
   LINKEDIN_CLIENT_SECRET=your_client_secret
   
   # Google
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   
   # Firebase
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=your_service_account_email
   ```

2. Make sure your database and Redis are running:
   ```bash
   docker-compose up -d
   ```

3. Start the FastAPI server:
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```

### Test Flow for LinkedIn/Google

1. **Get authorization URL:**
   ```bash
   curl http://localhost:8000/api/v1/auth/oauth/linkedin/authorize
   ```
   
   Response will include `authorization_url` and `state`.

2. **Open authorization URL in browser:**
   - User authorizes the app
   - Provider redirects to: `http://localhost:8000/api/v1/auth/oauth/linkedin/callback?code=AUTHORIZATION_CODE&state=STATE`

3. **Extract code from callback URL and call callback endpoint:**
   ```bash
   curl -X POST http://localhost:8000/api/v1/auth/oauth/linkedin/callback \
     -H "Content-Type: application/json" \
     -d '{
       "code": "AUTHORIZATION_CODE_FROM_URL",
       "state": "STATE_FROM_URL"
     }'
   ```

4. **Response will contain JWT tokens** - use the `access_token` for authenticated requests.

### Test Flow for Firebase

Firebase works differently - the client SDK authenticates and provides an ID token directly:

1. **Get ID token from Firebase client SDK** (frontend)
2. **Send ID token to callback endpoint:**
   ```bash
   curl -X POST http://localhost:8000/api/v1/auth/oauth/firebase/callback \
     -H "Content-Type: application/json" \
     -d '{
       "id_token": "FIREBASE_ID_TOKEN"
     }'
   ```

3. **Response will contain JWT tokens** - use the `access_token` for authenticated requests.

## 🐛 Testing Error Cases

### Missing Credentials

If OAuth credentials are not configured, you'll get a 400 error:
```bash
curl http://localhost:8000/api/v1/auth/oauth/linkedin/authorize
# Response: {"detail": "LinkedIn OAuth is not configured. Please add LINKEDIN_CLIENT_ID to .env"}
```

### Invalid Provider

```bash
curl http://localhost:8000/api/v1/auth/oauth/invalid/authorize
# Response: {"detail": "Unsupported OAuth provider: invalid. Supported: linkedin, google, firebase"}
```

### Firebase Authorization Endpoint

Firebase doesn't use the authorization endpoint:
```bash
curl http://localhost:8000/api/v1/auth/oauth/firebase/authorize
# Response: {"detail": "Firebase uses ID tokens directly. Use the callback endpoint with an id_token."}
```

## 📝 Notes

- **State parameter**: The `state` parameter is used for CSRF protection. Always verify it matches between authorize and callback requests.
- **Redirect URIs**: Make sure your redirect URIs in OAuth provider dashboards match exactly (including `http://` vs `https://` and trailing slashes).
- **Development**: For local development, use `http://localhost:8000` as your redirect URI.
- **Production**: Update redirect URIs to your production domain before deploying.

## 🔍 Using Swagger UI

The easiest way to test is via Swagger UI:

1. Start the server: `uvicorn app.main:app --reload`
2. Open: http://localhost:8000/docs
3. Navigate to `/api/v1/auth/oauth/{provider}/authorize` endpoint
4. Click "Try it out" and test

## ✅ Expected Behavior

- **First-time OAuth user**: Creates new User and Profile records, returns tokens
- **Existing OAuth user**: Logs in, updates `last_login`, returns tokens
- **Existing email user**: Links OAuth ID to existing user account
- **All OAuth users**: Marked as `is_verified=True` and `soft_verified=True`


