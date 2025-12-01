# Quick Guide: Generate Test Accounts

## Simple Commands

Since your backend server is already running (which means dependencies are installed), you can generate test accounts easily:

### Option 1: Use the script directly (if backend is running)
```bash
cd backend
poetry run python -m scripts.generate_synthetic_data --investors 5 --founders 10
```

### Option 2: If poetry has issues, install dependencies directly
```bash
cd backend
pip install sqlmodel psycopg redis
PYTHONPATH=. python3 -m scripts.generate_synthetic_data --investors 5 --founders 10
```

### Option 3: Use the same Python environment as your backend server
If your backend is running with uvicorn, check which Python it's using and use that same environment.

## What Gets Created

- ✅ 5 investor profiles (`investor1@synthetic.test` through `investor5@synthetic.test`)
- ✅ 10 founder profiles (`founder1@synthetic.test` through `founder10@synthetic.test`)
- ✅ All use password: `password123`
- ✅ Your real accounts are safe (they use `@gmail.com` emails)

## After Generation

1. Login with `duy.hnb11@gmail.com` (investor)
2. You'll see 10 founder profiles in discovery (excluding the matched one)
3. Test liking, matching, and messaging!

## Your Real Accounts

- ✅ `duy.hnb11@gmail.com` - Safe!
- ✅ `duy1@gmail.com` - Safe!
- ❌ Only `@synthetic.test` accounts will be created/removed
