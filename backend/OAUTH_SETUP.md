# OAuth Setup Guide

Quick reference for setting up OAuth providers for the VC × Startup Matching Platform.

## 🔗 Quick Links

### LinkedIn OAuth
- **Developer Portal**: https://www.linkedin.com/developers/apps
- **Documentation**: https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2

### Google OAuth
- **Google Cloud Console**: https://console.cloud.google.com/
- **Credentials Page**: https://console.cloud.google.com/apis/credentials
- **OAuth 2.0 Setup**: https://developers.google.com/identity/protocols/oauth2

### Firebase Auth
- **Firebase Console**: https://console.firebase.google.com/
- **Documentation**: https://firebase.google.com/docs/auth

---

## 📋 Step-by-Step Setup

### 1. LinkedIn OAuth

1. **Create LinkedIn App**
   - Go to: https://www.linkedin.com/developers/apps
   - Click **"Create app"**
   - Fill in:
     - App name: `VC Matcher` (or your choice)
     - Company: Your company name
     - App use: Select appropriate option
     - Website URL: `http://localhost:8000` (for dev)
     - Privacy policy URL: (optional for dev)
   - Accept terms and create

2. **Configure OAuth**
   - Go to **"Auth"** tab in your app
   - Under **"Redirect URLs"**, add:
     ```
     http://localhost:8000/api/v1/auth/oauth/linkedin/callback
     ```
   - For production, also add your production URL

3. **Get Credentials**
   - In the **"Auth"** tab, you'll see:
     - **Client ID** → Copy to `LINKEDIN_CLIENT_ID`
     - **Client Secret** → Copy to `LINKEDIN_CLIENT_SECRET`

4. **Add to `.env`**
   ```env
   LINKEDIN_CLIENT_ID=your_actual_client_id_here
   LINKEDIN_CLIENT_SECRET=your_actual_client_secret_here
   ```

---

### 2. Google OAuth

1. **Create Google Cloud Project**
   - Go to: https://console.cloud.google.com/
   - Click **"Create Project"** (or select existing)
   - Enter project name: `VC Matcher` (or your choice)
   - Click **"Create"**

2. **Enable Google+ API** (or Google Identity API)
   - Go to: https://console.cloud.google.com/apis/library
   - Search for **"Google+ API"** or **"Google Identity API"**
   - Click on it and click **"Enable"**

3. **Create OAuth Credentials**
   - Go to: https://console.cloud.google.com/apis/credentials
   - Click **"Create Credentials"** > **"OAuth client ID"**
   - If prompted, configure OAuth consent screen:
     - User Type: **External** (for testing) or **Internal** (for Google Workspace)
     - App name: `VC Matcher`
     - User support email: Your email
     - Developer contact: Your email
     - Click **"Save and Continue"** through the steps
   - Back to credentials:
     - Application type: **Web application**
     - Name: `VC Matcher Web Client`
     - Authorized redirect URIs: Add:
       ```
       http://localhost:8000/api/v1/auth/oauth/google/callback
       ```
     - Click **"Create"**

4. **Get Credentials**
   - A popup will show:
     - **Client ID** → Copy to `GOOGLE_CLIENT_ID`
     - **Client secret** → Copy to `GOOGLE_CLIENT_SECRET`

5. **Add to `.env`**
   ```env
   GOOGLE_CLIENT_ID=your_actual_client_id_here
   GOOGLE_CLIENT_SECRET=your_actual_client_secret_here
   ```

---

### 3. Firebase Auth

1. **Create Firebase Project**
   - Go to: https://console.firebase.google.com/
   - Click **"Add project"** (or select existing)
   - Enter project name: `VC Matcher` (or your choice)
   - Disable Google Analytics (optional for dev)
   - Click **"Create project"**

2. **Enable Authentication**
   - In Firebase Console, go to **"Authentication"** in left sidebar
   - Click **"Get started"**
   - Enable **Email/Password** sign-in method (and any others you want)
   - Click **"Save"**

3. **Get Service Account Credentials**
   - Go to **Project Settings** (gear icon) > **"Service accounts"** tab
   - Click **"Generate new private key"**
   - A JSON file will download - **keep this secure!**

4. **Extract Credentials from JSON**
   - Open the downloaded JSON file
   - You'll see something like:
     ```json
     {
       "type": "service_account",
       "project_id": "your-project-id",
       "private_key_id": "...",
       "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
       "client_email": "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com",
       ...
     }
     ```
   - Extract these values:
     - `project_id` → `FIREBASE_PROJECT_ID`
     - `private_key` → `FIREBASE_PRIVATE_KEY` (keep the quotes and `\n` as-is)
     - `client_email` → `FIREBASE_CLIENT_EMAIL`

5. **Add to `.env`**
   ```env
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
   ```
   
   **Important**: For `FIREBASE_PRIVATE_KEY`, keep the entire key including:
   - The quotes around it
   - The `\n` newline characters (they'll be interpreted correctly)
   - The `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines

---

## 🔄 Redirect URLs for Production

When deploying to production, update the redirect URLs:

- **LinkedIn**: Add your production URL to the app's redirect URLs list
- **Google**: Add production URL to OAuth client's authorized redirect URIs
- **Firebase**: No redirect URL needed (uses Firebase SDK)

Example production URLs:
```
https://yourdomain.com/api/v1/auth/oauth/linkedin/callback
https://yourdomain.com/api/v1/auth/oauth/google/callback
```

---

## ✅ Verification

After adding credentials to `.env`, restart your FastAPI server:

```bash
cd backend
uvicorn app.main:app --reload
```

The OAuth endpoints will be available at:
- `/api/v1/auth/oauth/linkedin/authorize` - Get LinkedIn auth URL
- `/api/v1/auth/oauth/google/authorize` - Get Google auth URL
- `/api/v1/auth/oauth/firebase/authorize` - Get Firebase auth URL

---

## 🛠️ Troubleshooting

### LinkedIn
- **"Invalid redirect URI"**: Make sure the redirect URL in your app matches exactly (including `http://` vs `https://`)
- **"App not approved"**: LinkedIn requires app approval for production use

### Google
- **"redirect_uri_mismatch"**: Check that the redirect URI in OAuth client matches exactly
- **"Access blocked"**: Make sure OAuth consent screen is configured

### Firebase
- **"Invalid private key"**: Make sure you copied the entire key including quotes and newlines
- **"Permission denied"**: Ensure the service account has proper permissions

---

## 📝 Notes

- All OAuth providers require HTTPS in production
- Keep your client secrets secure - never commit them to git
- The `.env` file is already in `.gitignore` for security
- For development, `http://localhost:8000` is fine
- For production, you'll need to update redirect URLs to your production domain



