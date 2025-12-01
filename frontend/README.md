# VC × Startup Matching Platform - Frontend

Next.js 15 frontend application for the VC × Startup Matching Platform.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend API running at `http://localhost:8000`

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your configuration:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
```

3. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── layout.tsx    # Root layout with providers
│   │   └── page.tsx      # Home page
│   ├── lib/              # Utilities and shared code
│   │   ├── api-client.ts # Axios instance with auth
│   │   ├── api/          # API endpoint functions
│   │   │   ├── auth.ts   # Authentication API
│   │   │   └── types.ts  # TypeScript types
│   │   └── react-query.tsx # React Query provider
│   └── components/       # React components (to be added)
├── public/               # Static assets
└── package.json
```

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Data Fetching:** TanStack Query (React Query)
- **HTTP Client:** Axios
- **Validation:** Zod (for form validation)

## 🔌 API Integration

The frontend communicates with the FastAPI backend via the API client in `src/lib/api-client.ts`. 

All API endpoints are organized in `src/lib/api/`:
- `auth.ts` - Authentication endpoints
- `types.ts` - Shared TypeScript types matching backend schemas

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 🔐 Authentication

Authentication is handled via JWT tokens stored in localStorage:
- `access_token` - Short-lived access token
- `refresh_token` - Long-lived refresh token

The API client automatically:
- Adds the access token to all requests
- Refreshes the token when it expires
- Redirects to login on authentication failure

## 🎨 Development

### Adding New API Endpoints

1. Add TypeScript types in `src/lib/api/types.ts`
2. Create endpoint functions in `src/lib/api/[resource].ts`
3. Use React Query hooks in components

### Styling

This project uses Tailwind CSS. Add utility classes directly to components.

## 📚 Next Steps

- [ ] Authentication UI (login, signup, OAuth)
- [ ] Onboarding flow
- [ ] Discovery feed
- [ ] Profile management
- [ ] Messaging interface
- [ ] Admin dashboard
