"""
Market & Niche Intelligence – Enrichment script.

Runs founder/company profiles through an LLM (OpenAI GPT-4o) to generate:
- financial_health (estimated_runway, funding_velocity)
- market_sentiment
- niche_moat (one-sentence reasoning trace)
- competitor_gap (list)
- intelligence_sources (URLs for verifiability)

Usage:
    python scripts/enrich_profiles.py [--limit N] [--dry-run]

Requires: OPENAI_API_KEY in .env
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import httpx
from sqlalchemy import select
from sqlmodel import Session

from app.core.config import settings
from app.db.session import engine
from app.models.profile import Profile

OPENAI_MODEL = "gpt-4o"
LIMIT_DEFAULT = 20

SYSTEM_PROMPT = """You are a venture capital analyst performing a 3-point diligence analysis. 
Respond ONLY with valid JSON. No markdown, no explanation outside the JSON."""

USER_PROMPT_TEMPLATE = """Input:
- Company Name: {company_name}
- Founder / Bio: {founder_bio}
- Product / Description: {product_description}

Task: Perform a 3-point Diligence Analysis.

1. Financials: Based on revenue run rate (if provided), team size, and runway, estimate burn and funding velocity. Output estimated_runway_months (number or null) and funding_velocity (e.g. "Strong", "Moderate", "Early").

2. Market Reaction: Infer common sentiment for this niche (e.g. DevTools = bullish, Crypto = mixed). Output market_sentiment: one of "Bullish", "Mixed", "Cautious", "Unknown".

3. Niche Fit: In one sentence, state what differentiates this company from typical competitors (technical or go-to-market). Output niche_moat: a single string. Also output competitor_gap: a list of 2-4 short strings (e.g. "Better UX for SMB", "API-first").

4. Verifiability: Output sources: a list of 0-3 placeholder URLs you would use to verify (e.g. "https://crunchbase.com", "https://linkedin.com/company/..."). Use the company name in paths where relevant.

Output strictly this JSON (no other text):
{{
  "financial_health": {{
    "estimated_runway_months": <number or null>,
    "funding_velocity": "<string>"
  }},
  "market_sentiment": "<string>",
  "niche_moat": "<one sentence>",
  "competitor_gap": ["<string>", "<string>", ...],
  "sources": ["<url>", ...]
}}"""


def _get(profile: Profile, key: str, default=None):
    """Get attribute from profile (works for both ORM and Row-like)."""
    if hasattr(profile, key):
        return getattr(profile, key, default)
    if hasattr(profile, "_mapping"):
        return profile._mapping.get(key, default)
    return default


def build_founder_context(profile: Profile) -> tuple[str, str, str]:
    """Extract company name, founder bio, and product description from profile."""
    company_name = _get(profile, "company_name") or "Unknown"
    founder_bio = _get(profile, "headline") or ""
    prompts = _get(profile, "prompts") or []
    for p in prompts:
        if isinstance(p, dict) and p.get("content"):
            founder_bio += "\n" + p["content"]
    founder_bio = (founder_bio or "Not provided").strip()
    product_description = founder_bio
    focus_markets = _get(profile, "focus_markets") or []
    if focus_markets:
        product_description += f"\nFocus markets: {', '.join(focus_markets)}"
    rev = _get(profile, "revenue_run_rate")
    if rev is not None:
        product_description += f"\nRevenue run rate: ${rev:,.0f}"
    team = _get(profile, "team_size")
    if team is not None:
        product_description += f"\nTeam size: {team}"
    runway = _get(profile, "runway_months")
    if runway is not None:
        product_description += f"\nRunway: {runway} months"
    return company_name, founder_bio, (product_description or "Not provided").strip()


def call_openai(company_name: str, founder_bio: str, product_description: str) -> dict | None:
    """Call OpenAI API and return parsed JSON or None."""
    api_key = getattr(settings, "openai_api_key", None) or settings.model_dump().get("openai_api_key")
    if not api_key:
        print("  ⚠ OPENAI_API_KEY not set; skipping LLM call.")
        return None
    prompt = USER_PROMPT_TEMPLATE.format(
        company_name=company_name,
        founder_bio=founder_bio[:2000],
        product_description=product_description[:2000],
    )
    try:
        with httpx.Client(timeout=60.0) as client:
            resp = client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model": OPENAI_MODEL,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.2,
                    "max_tokens": 800,
                },
            )
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"  ✗ OpenAI error: {e}")
        return None

    content = content.strip()
    if content.startswith("```"):
        content = re.sub(r"^```\w*\n?", "", content)
        content = re.sub(r"\n?```\s*$", "", content)
    content = content.strip()
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        print(f"  ✗ Invalid JSON: {content[:200]}...")
        return None


def apply_enrichment(profile: Profile, data: dict) -> None:
    """Write enrichment data onto profile (in memory)."""
    fh = data.get("financial_health") or {}
    setattr(profile, "financial_health", {
        "estimated_runway_months": fh.get("estimated_runway_months"),
        "funding_velocity": fh.get("funding_velocity"),
    })
    setattr(profile, "market_sentiment", data.get("market_sentiment"))
    setattr(profile, "niche_moat", data.get("niche_moat"))
    setattr(profile, "competitor_gap", data.get("competitor_gap") or [])
    setattr(profile, "intelligence_sources", data.get("sources") or [])


def main() -> None:
    import argparse
    parser = argparse.ArgumentParser(description="Enrich founder profiles with Market & Niche Intelligence")
    parser.add_argument("--limit", type=int, default=LIMIT_DEFAULT, help=f"Max founder profiles to enrich (default {LIMIT_DEFAULT})")
    parser.add_argument("--dry-run", action="store_true", help="Do not write to DB")
    args = parser.parse_args()

    if not getattr(settings, "openai_api_key", None):
        print("Set OPENAI_API_KEY in .env to run enrichment.")
        sys.exit(1)

    print("=" * 60)
    print("Market & Niche Intelligence – Enrichment")
    print("=" * 60)

    with Session(engine) as session:
        stmt = select(Profile.id).where(Profile.role == "founder").limit(args.limit)
        founder_ids = [row[0] for row in session.exec(stmt).all()]
        print(f"Found {len(founder_ids)} founder profile(s).")

        for i, profile_id in enumerate(founder_ids, 1):
            profile = session.get(Profile, profile_id)
            if not profile:
                continue
            company_name, founder_bio, product_description = build_founder_context(profile)
            full_name = _get(profile, "full_name") or "Unknown"
            print(f"\n[{i}/{len(founder_ids)}] {full_name} – {company_name}")
            data = call_openai(company_name, founder_bio, product_description)
            if not data:
                continue
            apply_enrichment(profile, data)
            print(f"  ✓ sentiment={_get(profile, 'market_sentiment')} niche_moat={( _get(profile, 'niche_moat') or '')[:50]}...")
            if not args.dry_run:
                session.add(profile)
                session.commit()
                session.refresh(profile)
                print("  ✓ Saved to DB.")

    print("\n" + "=" * 60)
    print("Enrichment complete.")
    print("=" * 60)


if __name__ == "__main__":
    main()
