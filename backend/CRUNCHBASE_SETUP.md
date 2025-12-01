# How to Get Crunchbase API Key

**⚠️ UPDATE:** Crunchbase now requires contacting sales for API access. This guide explains your options.

## Important Note

Crunchbase has moved to a **sales-based model** for API access. You cannot simply sign up and get an API key - you need to contact their sales team first. This is common for enterprise APIs.

## Your Options

### Option 1: Contact Sales (Recommended if you need API access)

1. **Visit Crunchbase:**
   - Go to: https://www.crunchbase.com/
   - Or: https://data.crunchbase.com/

2. **Click "Talk With Sales":**
   - This button appears in the header/navigation
   - You'll be redirected to a contact form or chat

3. **What to Say:**
   - Explain you're building a VC × Startup matching platform
   - You need API access for automated due diligence
   - Mention you need to fetch company funding data, investors, and employee counts
   - Ask about their API plans and pricing

4. **After Contacting Sales:**
   - They'll likely schedule a call or send you information
   - They'll explain pricing tiers (Basic, Enterprise, etc.)
   - Once you sign up, they'll provide your API key

5. **Add API Key to Project:**
   - Once you receive your API key
   - Open `backend/.env`
   - Add:
     ```env
     CRUNCHBASE_API_KEY=your_actual_key_here
     ```
   - Restart your backend server

### Option 2: Start Free Trial First

1. **Click "Start Free Trial":**
   - This may give you account access
   - Some trials include limited API access
   - After trial, you can contact sales from within your account

2. **From Your Account:**
   - Navigate to Account Settings → Integrations → Crunchbase API
   - If API access isn't available, use the in-app "Contact Sales" option

### Option 3: Skip for Now (Recommended for MVP)

**The system works perfectly without Crunchbase!**
- ETL pipeline returns stub data when API key is missing
- You can focus on other features first
- Add Crunchbase later when you have:
  - Budget for API costs
  - Active users who need the data
  - Time to go through sales process

**This is totally fine for MVP development!**

## Pricing Information

Crunchbase offers different tiers:
- **Free Tier:** Limited requests per month (good for testing)
- **Paid Tiers:** Higher request limits for production use

Check their pricing page for current rates: https://data.crunchbase.com/pricing

## Verification

To verify your API key is working:

```python
from app.services.etl.data_sources import CrunchbaseSource

# Test the connection
source = CrunchbaseSource()
print(f"Crunchbase enabled: {source.enabled}")

# Try fetching data
if source.enabled:
    data = source.fetch_company_data("Stripe")
    print(f"Status: {data.get('status')}")
```

## Troubleshooting

**"API key not working":**
- Make sure you copied the entire key (they can be long)
- Check that there are no extra spaces
- Verify the key hasn't expired
- Check your API usage limits in the Crunchbase dashboard

**"Rate limit exceeded":**
- You've hit your monthly request limit
- Wait until the limit resets, or upgrade your plan
- The system automatically retries with backoff

**"Not found" errors:**
- Some companies may not be in Crunchbase's database
- Try using the company's website domain as well
- The system will return stub data if not found

## Alternative Options

If you can't get a Crunchbase API key immediately:
- The system works without it (returns stub data)
- You can add it later when you're ready
- Other sources (Clearbit) can supplement the data

## API Documentation

Once you have access, check out:
- API Documentation: https://data.crunchbase.com/v4/docs
- Getting Started Guide: https://data.crunchbase.com/v4/docs/getting-started
- API Reference: https://data.crunchbase.com/v4/docs/api-reference

## Next Steps

After adding your API key:
1. ✅ Restart the backend server
2. ✅ Check logs to confirm API is enabled
3. ✅ Test with a sample company
4. ✅ Monitor your API usage in Crunchbase dashboard

---

**Note:** The ETL pipeline gracefully handles missing API keys, so you can continue development even without it!

