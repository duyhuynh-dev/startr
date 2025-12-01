# ETL Pipeline Setup Guide

This guide explains how to set up and use the ETL (Extract, Transform, Load) pipeline for external data sources.

## Overview

The ETL pipeline integrates with external APIs to enrich profile data:
- **Crunchbase** - Company information, funding rounds, investors (Optional, requires sales contact)
- **Clearbit** - Company enrichment, employee count, industry data (Optional)
- **Plaid** - Financial data verification (requires user consent, Optional)

**🆓 IMPORTANT:** All API keys are **completely optional**. The system works perfectly without them using stub data - perfect for personal projects with zero costs!

## API Key Setup

### Crunchbase API

1. **Sign up for Crunchbase Data API:**
   - Visit: https://data.crunchbase.com/
   - Sign up for an account
   - Get your API key from: https://data.crunchbase.com/v4/docs/getting-started

2. **Add to `.env`:**
   ```env
   CRUNCHBASE_API_KEY=your_api_key_here
   ```

3. **What it provides:**
   - Company funding information
   - Investor details
   - Employee count
   - Founded year
   - Industry categories

### Clearbit API

1. **Sign up for Clearbit:**
   - Visit: https://dashboard.clearbit.com/
   - Create an account
   - Get your API key from the dashboard

2. **Add to `.env`:**
   ```env
   CLEARBIT_API_KEY=your_api_key_here
   ```

3. **What it provides:**
   - Company enrichment data
   - Employee count
   - Industry classification
   - Tech stack information
   - Location data

### Plaid API (Financial Data)

1. **Sign up for Plaid:**
   - Visit: https://dashboard.plaid.com/signup
   - Create a developer account
   - Get your credentials from: https://dashboard.plaid.com/team/keys

2. **Add to `.env`:**
   ```env
   PLAID_CLIENT_ID=your_client_id
   PLAID_SECRET=your_secret_key
   PLAID_ENVIRONMENT=sandbox  # or "production" when ready
   ```

3. **What it provides:**
   - Verified financial data (requires user consent)
   - Cash balance
   - Revenue verification
   - Transaction history

4. **Note:** Plaid requires a frontend OAuth flow (Plaid Link) to connect user bank accounts. See [Plaid Quickstart](https://plaid.com/docs/quickstart/) for integration details.

## Usage

The ETL pipeline is automatically called when generating due diligence summaries:

```python
from app.services.diligence import diligence_service

# Generate diligence summary (ETL runs automatically)
summary = diligence_service.generate_summary(session, profile_id)
```

## Graceful Degradation

The pipeline gracefully handles missing API keys:
- Returns stub data with `status: "not_configured"`
- Logs warnings but doesn't fail
- Due diligence service continues to work with available data

## Rate Limiting

All API integrations include:
- Automatic retry logic (3 attempts)
- Rate limit handling (exponential backoff)
- Request timeout (10 seconds)

## Caching

ETL results are cached in Redis for 1 hour to:
- Reduce API calls
- Improve response time
- Stay within API rate limits

## Testing

Test ETL integrations (when API keys are configured):

```python
from app.services.etl.data_sources import CrunchbaseSource, ClearbitSource

# Test Crunchbase
crunchbase = CrunchbaseSource()
data = crunchbase.fetch_company_data("Stripe")
print(data)

# Test Clearbit
clearbit = ClearbitSource()
data = clearbit.fetch_company_data("Stripe", domain="stripe.com")
print(data)
```

## Troubleshooting

### API not working

1. **Check API keys:**
   ```bash
   # In backend directory
   python scripts/security_audit.py
   ```

2. **Check logs:**
   - ETL errors are logged at `ERROR` level
   - Check application logs for details

3. **Test API key:**
   ```python
   from app.services.etl.data_sources import CrunchbaseSource
   source = CrunchbaseSource()
   print(f"Enabled: {source.enabled}")
   ```

### Rate limiting

- ETL automatically retries with exponential backoff
- Consider reducing request frequency if you hit limits
- Results are cached to minimize API calls

### Missing data

- Some APIs require specific information (e.g., Clearbit needs domain)
- Check that profile data includes required fields
- APIs may not have data for all companies

## Next Steps

- [ ] Implement Plaid Link frontend integration
- [ ] Add more data sources (e.g., SEC filings)
- [ ] Set up scheduled ETL jobs (Prefect/Airflow)
- [ ] Add data validation and normalization

