# Synthetic Test Data Generator

This script generates realistic synthetic test data for MVP testing, allowing you to test all features without needing real users.

## Why Synthetic Data?

For MVP testing, synthetic data helps you:
- ✅ Test all UI/UX flows end-to-end
- ✅ Fix bugs without waiting for real users
- ✅ Validate matching algorithms with diverse profiles
- ✅ Test at scale (20 VCs, 50 founders recommended)
- ✅ Iterate quickly on features

Once features are stable, recruit real users (20 VCs, 50 founders) to validate actual matching dynamics.

## Usage

### Generate Default Data (20 investors, 50 founders)

```bash
cd backend
python -m scripts.generate_synthetic_data
```

### Custom Counts

```bash
# 30 investors, 100 founders
python -m scripts.generate_synthetic_data --investors 30 --founders 100

# Just 10 investors for quick testing
python -m scripts.generate_synthetic_data --investors 10 --founders 5
```

### Clear Existing Synthetic Data

```bash
# Clear all synthetic data and regenerate
python -m scripts.generate_synthetic_data --clear
```

## What Gets Generated

### Investor Profiles (20 default)
- ✅ Realistic names, firms, locations
- ✅ Check sizes ($25K - $5M)
- ✅ Focus sectors (AI/ML, SaaS, Fintech, etc.)
- ✅ Focus stages (Pre-seed through Growth)
- ✅ 2-3 prompt answers
- ✅ Verification badges

### Founder Profiles (50 default)
- ✅ Realistic names, company names
- ✅ Revenue, team size, runway
- ✅ Focus markets
- ✅ 2-3 prompt answers
- ✅ Company URLs

### User Accounts
Each profile gets an associated user account:
- Email: `investor1@synthetic.test`, `founder1@synthetic.test`, etc.
- Password: `password123` (all test accounts)

## Test Account Login

All synthetic accounts can be logged in with:
- Email: `investor1@synthetic.test` (or `founder1@synthetic.test`)
- Password: `password123`

## Example Output

```
Generating 20 investor profiles...
  Created 5/20 investors...
  Created 10/20 investors...
  Created 15/20 investors...
  Created 20/20 investors...
✅ Created 20 investor profiles

Generating 50 founder profiles...
  Created 10/50 founders...
  Created 20/50 founders...
  Created 30/50 founders...
  Created 40/50 founders...
  Created 50/50 founders...
✅ Created 50 founder profiles

============================================================
✅ Successfully generated synthetic test data!
   - 20 investors
   - 50 founders

All test accounts use password: password123
Test emails format: investor1@synthetic.test, founder1@synthetic.test
============================================================
```

## Data Features

### Realistic Variety
- **Firms**: Andreessen Horowitz, Sequoia, Accel, Benchmark, etc.
- **Locations**: SF, NYC, Boston, Austin, London, etc.
- **Sectors**: AI/ML, SaaS, Fintech, Healthcare, EdTech, etc.
- **Stages**: Pre-seed through Growth
- **Company Names**: CloudSync, DataFlow, HealthBridge, etc.

### Prompt Answers
Each profile gets 2-3 realistic prompt answers that vary by role:
- **Investors**: Investment thesis, what excites them, founder traits
- **Founders**: Problem they're solving, vision, traction

## Clearing Data

To remove only synthetic data (keeps your real account):

```bash
python -m scripts.generate_synthetic_data --clear
```

This identifies synthetic accounts by email domain (`@synthetic.test`) and removes them while preserving your real account.

## Next Steps

1. **Generate test data**: Run the script with your desired counts
2. **Test features**: Login with synthetic accounts and test:
   - Discovery feed
   - Profile viewing
   - Liking/passing
   - Matching
   - Messaging
3. **Iterate**: Fix bugs, improve UX based on testing
4. **Recruit real users**: Once stable, bring in 20 VCs + 50 founders

## Tips

- Start with smaller counts (10/20) for quick testing
- Use `--clear` to reset and regenerate fresh data
- All synthetic emails end with `@synthetic.test` for easy identification
- Default password `password123` works for all test accounts

