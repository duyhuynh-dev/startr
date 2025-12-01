# Generate Test Accounts for Testing

## The Problem

After matching your two accounts (`duy.hnb11@gmail.com` investor and `duy1@gmail.com` founder), the discovery feed is empty because:
- ✅ Matched profiles are correctly excluded from discovery (expected behavior)
- ❌ With only 2 accounts, there are no other profiles to discover

## Solution: Generate Synthetic Test Accounts

Run this command to generate test accounts:

```bash
cd backend
poetry run python -m scripts.generate_synthetic_data --investors 5 --founders 10
```

This will create:
- 5 investor profiles
- 10 founder profiles
- All with email format: `investor1@synthetic.test`, `founder1@synthetic.test`, etc.
- Password: `password123` for all test accounts

## Quick Test Setup

1. **Generate test accounts:**
   ```bash
   cd backend
   poetry run python -m scripts.generate_synthetic_data --investors 5 --founders 10
   ```

2. **Login with your investor account** (`duy.hnb11@gmail.com`)
   - You'll now see 10 founder profiles in discovery feed (excluding the one you matched)

3. **Test liking:**
   - Like some founders from discovery
   - Check your Likes page to see matches

4. **Test messaging:**
   - Go to Messages page
   - Start conversations with matched profiles

## Your Real Accounts Are Safe

- Synthetic accounts use `@synthetic.test` email domain
- Your real accounts (`duy.hnb11@gmail.com`, `duy1@gmail.com`) are preserved
- The script only creates/removes synthetic accounts

## Clear Synthetic Data (Optional)

To remove all synthetic test accounts:
```bash
cd backend
poetry run python -m scripts.generate_synthetic_data --clear
```

This only removes `@synthetic.test` accounts, keeping your real accounts!

