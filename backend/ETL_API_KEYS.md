# ETL API Keys Quick Reference

This document lists all API keys needed for the ETL pipeline and how to get them.

## Required vs Optional

**All ETL API keys are OPTIONAL.** The system will work without them, returning stub data. Add them gradually as you get access to each service.

## API Keys Needed

### 1. Crunchbase API Key

**Purpose:** Fetch company funding data, investors, employee count, and industry information.

**Where to get it:**
1. Visit: https://data.crunchbase.com/
2. Sign up for an account
3. Go to: https://data.crunchbase.com/v4/docs/getting-started
4. Copy your API key

**Add to `backend/.env`:**
```env
CRUNCHBASE_API_KEY=your_api_key_here
```

**What it enables:**
- Company funding rounds and amounts
- Investor information
- Employee count
- Founded year
- Industry categories

---

### 2. Clearbit API Key

**Purpose:** Company enrichment data including employee count, industry, tech stack, and location.

**Where to get it:**
1. Visit: https://dashboard.clearbit.com/
2. Create an account
3. Go to Dashboard → Settings → API Keys
4. Copy your API key

**Add to `backend/.env`:**
```env
CLEARBIT_API_KEY=your_api_key_here
```

**What it enables:**
- Company enrichment data
- Employee count estimates
- Industry classification
- Tech stack information
- Geographic location data

---

### 3. Plaid API Keys (Client ID + Secret)

**Purpose:** Financial data verification including cash balance and revenue (requires user consent via OAuth).

**Where to get it:**
1. Visit: https://dashboard.plaid.com/signup
2. Create a developer account
3. Go to: https://dashboard.plaid.com/team/keys
4. Copy your `Client ID` and `Secret`

**Add to `backend/.env`:**
```env
PLAID_CLIENT_ID=your_client_id
PLAID_SECRET=your_secret_key
PLAID_ENVIRONMENT=sandbox  # Use "sandbox" for testing, "production" when ready
```

**What it enables:**
- Verified financial data (requires user to connect bank account)
- Cash balance information
- Revenue verification
- Transaction history (for revenue calculation)

**Note:** Plaid requires frontend integration (Plaid Link) to complete the OAuth flow. See [Plaid Quickstart](https://plaid.com/docs/quickstart/) for frontend integration details.

---

## Complete .env Example

Here's what your `.env` file might look like with all ETL keys:

```env
# ... other settings ...

# ETL API Keys (all optional)
CRUNCHBASE_API_KEY=cb_1234567890abcdef
CLEARBIT_API_KEY=sk_abcdef1234567890
PLAID_CLIENT_ID=your_client_id_here
PLAID_SECRET=your_secret_key_here
PLAID_ENVIRONMENT=sandbox
```

## Verification

To check if your API keys are working:

1. **Check logs:** When the ETL pipeline runs, it will log whether APIs are configured
2. **Test manually:**
   ```python
   from app.services.etl.data_sources import CrunchbaseSource, ClearbitSource
   
   cb = CrunchbaseSource()
   print(f"Crunchbase enabled: {cb.enabled}")
   
   cl = ClearbitSource()
   print(f"Clearbit enabled: {cl.enabled}")
   ```

## Cost Considerations

- **Crunchbase:** Usually has free tier with limited requests, paid tiers for production
- **Clearbit:** Free tier available, paid for higher volume
- **Plaid:** Free in sandbox, pricing varies in production based on transactions

## Troubleshooting

- **Keys not working?** Check that you copied the full key (some are long)
- **Rate limited?** The system automatically retries with exponential backoff
- **Still getting stub data?** Check application logs for error messages

See `ETL_SETUP.md` for more detailed documentation.

