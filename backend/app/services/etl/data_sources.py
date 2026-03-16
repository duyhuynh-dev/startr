"""
ETL Data Sources for external API integrations.
Implements multiple data sources: Apollo, Hunter, OpenAI, Proxycurl, Crunchbase, Clearbit.
"""

from __future__ import annotations

import logging
import time
import json
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from urllib.parse import quote, urlparse

import httpx

logger = logging.getLogger(__name__)


class DataSource(ABC):
    """Base class for external data sources (Crunchbase, Clearbit, etc.)."""

    @abstractmethod
    def fetch_company_data(self, company_name: str, domain: Optional[str] = None) -> Dict[str, Any]:
        """Fetch company data from the source."""
        pass

    @abstractmethod
    def fetch_financial_data(self, company_name: str, domain: Optional[str] = None) -> Dict[str, Any]:
        """Fetch financial data from the source."""
        pass

    def _make_request(
        self, url: str, headers: Dict[str, str], params: Optional[Dict[str, Any]] = None, max_retries: int = 3
    ) -> Optional[Dict[str, Any]]:
        """Make HTTP request with retry logic."""
        for attempt in range(max_retries):
            try:
                with httpx.Client(timeout=10.0) as client:
                    response = client.get(url, headers=headers, params=params)
                    response.raise_for_status()
                    return response.json()
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429:  # Rate limit
                    wait_time = 2 ** attempt
                    logger.warning(f"Rate limited, waiting {wait_time}s before retry {attempt + 1}/{max_retries}")
                    time.sleep(wait_time)
                    continue
                if e.response.status_code == 404:
                    return None
                logger.error(f"HTTP error {e.response.status_code}: {e}")
                return None
            except httpx.RequestError as e:
                logger.error(f"Request error: {e}")
                if attempt < max_retries - 1:
                    time.sleep(1)
                    continue
                return None
            except Exception as e:
                logger.error(f"Unexpected error: {e}")
                return None
        return None


class CrunchbaseSource(DataSource):
    """Crunchbase API integration using Crunchbase Data API v4."""

    BASE_URL = "https://api.crunchbase.com/v4"

    def __init__(self, api_key: Optional[str] = None):
        from app.core.config import settings

        self.api_key = api_key or settings.crunchbase_api_key
        self.enabled = bool(self.api_key and self.api_key != "demo_key")

        if not self.enabled:
            logger.info("Crunchbase API not configured (CRUNCHBASE_API_KEY not set)")

    def fetch_company_data(self, company_name: str, domain: Optional[str] = None) -> Dict[str, Any]:
        """Fetch company data from Crunchbase."""
        if not self.enabled:
            return {
                "company_name": company_name,
                "domain": domain,
                "source": "crunchbase",
                "status": "not_configured",
            }

        try:
            # Search for organization by name
            search_url = f"{self.BASE_URL}/searches/organizations"
            headers = {
                "X-cb-user-key": self.api_key,
                "Content-Type": "application/json",
            }
            params = {
                "field_ids": [
                    "name",
                    "website",
                    "short_description",
                    "founded_on",
                    "employee_count",
                    "categories",
                    "funding_total",
                    "last_funding_on",
                    "num_funding_rounds",
                ],
                "query": [{"type": "name", "operator": "contains", "value": company_name}],
                "limit": 1,
            }

            response = self._make_request(search_url, headers, params={"request": params})
            if not response:
                return self._stub_response(company_name, domain)

            entities = response.get("entities", [])
            if not entities:
                return self._stub_response(company_name, domain, status="not_found")

            entity = entities[0]
            properties = entity.get("properties", {})

            # Extract funding information
            funding_stages = []
            funding_total = properties.get("funding_total", {}).get("value")
            last_funding = properties.get("last_funding_on", {}).get("value")

            return {
                "company_name": properties.get("name", {}).get("value") or company_name,
                "domain": properties.get("website", {}).get("value") or domain,
                "source": "crunchbase",
                "founded_year": properties.get("founded_on", {}).get("value", "").split("-")[0] if properties.get("founded_on", {}).get("value") else None,
                "funding_stages": funding_stages,
                "total_funding": funding_total,
                "last_funding_date": last_funding,
                "investors": [],
                "employees": properties.get("employee_count", {}).get("value"),
                "industry": [cat.get("value", "") for cat in properties.get("categories", {}).get("items", [])],
                "status": "success",
            }
        except Exception as e:
            logger.error(f"Error fetching Crunchbase data for {company_name}: {e}")
            return self._stub_response(company_name, domain, status="error")

    def fetch_financial_data(self, company_name: str, domain: Optional[str] = None) -> Dict[str, Any]:
        """Fetch financial data from Crunchbase."""
        # Use company data which includes funding information
        company_data = self.fetch_company_data(company_name, domain)

        return {
            "company_name": company_name,
            "source": "crunchbase",
            "revenue_range": None,  # Crunchbase doesn't provide revenue
            "valuation": company_data.get("total_funding"),
            "funding_rounds": company_data.get("funding_stages", []),
            "status": company_data.get("status", "stub"),
        }

    def _stub_response(self, company_name: str, domain: Optional[str], status: str = "stub") -> Dict[str, Any]:
        """Return stub response when API is unavailable."""
        return {
            "company_name": company_name,
            "domain": domain,
            "source": "crunchbase",
            "founded_year": None,
            "funding_stages": [],
            "total_funding": None,
            "last_funding_date": None,
            "investors": [],
            "employees": None,
            "industry": None,
            "status": status,
        }


class ClearbitSource(DataSource):
    """Clearbit API integration for company enrichment."""

    BASE_URL = "https://company.clearbit.com/v2"

    def __init__(self, api_key: Optional[str] = None):
        from app.core.config import settings

        self.api_key = api_key or settings.clearbit_api_key
        self.enabled = bool(self.api_key and self.api_key != "demo_key")

        if not self.enabled:
            logger.info("Clearbit API not configured (CLEARBIT_API_KEY not set)")

    def fetch_company_data(self, company_name: str, domain: Optional[str] = None) -> Dict[str, Any]:
        """Fetch company data from Clearbit."""
        if not self.enabled:
            return {
                "company_name": company_name,
                "domain": domain,
                "source": "clearbit",
                "status": "not_configured",
            }

        # Clearbit requires domain, try to extract from company_name if not provided
        search_domain = domain
        if not search_domain and "@" in company_name:
            search_domain = company_name.split("@")[1] if "@" in company_name else None

        if not search_domain:
            # Try name-to-domain API
            try:
                name_url = f"https://company.clearbit.com/v2/companies/find"
                headers = {"Authorization": f"Bearer {self.api_key}"}
                params = {"name": company_name}

                response = self._make_request(name_url, headers, params)
                if response:
                    search_domain = response.get("domain")
            except Exception as e:
                logger.warning(f"Failed to find domain for {company_name}: {e}")

        if not search_domain:
            return {
                "company_name": company_name,
                "domain": domain,
                "source": "clearbit",
                "status": "domain_required",
            }

        try:
            # Fetch company by domain
            url = f"{self.BASE_URL}/companies/find"
            headers = {"Authorization": f"Bearer {self.api_key}"}
            params = {"domain": search_domain}

            response = self._make_request(url, headers, params)
            if not response:
                return self._stub_response(company_name, domain, status="not_found")

            return {
                "company_name": response.get("name", company_name),
                "domain": response.get("domain", domain),
                "source": "clearbit",
                "industry": response.get("category", {}).get("industry") if isinstance(response.get("category"), dict) else None,
                "employee_count": response.get("metrics", {}).get("employees") if isinstance(response.get("metrics"), dict) else None,
                "location": f"{response.get('geo', {}).get('city', '')}, {response.get('geo', {}).get('state', '')}".strip(", ") if isinstance(response.get("geo"), dict) else None,
                "tech_stack": response.get("tech", []),
                "description": response.get("description"),
                "status": "success",
            }
        except Exception as e:
            logger.error(f"Error fetching Clearbit data for {company_name}: {e}")
            return self._stub_response(company_name, domain, status="error")

    def fetch_financial_data(self, company_name: str, domain: Optional[str] = None) -> Dict[str, Any]:
        """Clearbit doesn't provide financial data directly."""
        return {"source": "clearbit", "status": "not_available"}

    def _stub_response(self, company_name: str, domain: Optional[str], status: str = "stub") -> Dict[str, Any]:
        """Return stub response when API is unavailable."""
        return {
            "company_name": company_name,
            "domain": domain,
            "source": "clearbit",
            "industry": None,
            "employee_count": None,
            "location": None,
            "tech_stack": [],
            "status": status,
        }


class ApolloSource(DataSource):
    """Apollo.io API integration for company and people enrichment."""

    BASE_URL = "https://api.apollo.io/v1"

    def __init__(self, api_key: Optional[str] = None):
        from app.core.config import settings

        self.api_key = api_key or settings.apollo_api_key
        self.enabled = bool(self.api_key)

        if not self.enabled:
            logger.info("Apollo API not configured (APOLLO_API_KEY not set)")

    def fetch_company_data(self, company_name: str, domain: Optional[str] = None) -> Dict[str, Any]:
        """Fetch company data from Apollo.io."""
        if not self.enabled:
            return self._stub_response(company_name, domain, status="not_configured")

        try:
            # Apollo's organization enrichment endpoint
            url = f"{self.BASE_URL}/organizations/enrich"
            headers = {
                "Content-Type": "application/json",
                "Cache-Control": "no-cache",
            }
            
            # Apollo uses domain for lookup
            if domain:
                # Clean domain (remove protocol, www, path)
                clean_domain = domain.replace("https://", "").replace("http://", "").replace("www.", "").split("/")[0]
                params = {"api_key": self.api_key, "domain": clean_domain}
            else:
                # Fall back to name search
                params = {"api_key": self.api_key, "name": company_name}

            response = self._make_request(url, headers, params)
            if not response or not response.get("organization"):
                return self._stub_response(company_name, domain, status="not_found")

            org = response["organization"]
            
            return {
                "company_name": org.get("name", company_name),
                "domain": org.get("primary_domain", domain),
                "source": "apollo",
                "description": org.get("short_description"),
                "industry": org.get("industry"),
                "employee_count": org.get("estimated_num_employees"),
                "employee_range": org.get("employee_count_range"),
                "founded_year": org.get("founded_year"),
                "location": f"{org.get('city', '')}, {org.get('state', '')}, {org.get('country', '')}".strip(", "),
                "linkedin_url": org.get("linkedin_url"),
                "twitter_url": org.get("twitter_url"),
                "facebook_url": org.get("facebook_url"),
                "total_funding": org.get("total_funding"),
                "latest_funding_round": org.get("latest_funding_round_type"),
                "latest_funding_amount": org.get("latest_funding_amount"),
                "technologies": org.get("technologies", []),
                "keywords": org.get("keywords", []),
                "annual_revenue": org.get("annual_revenue"),
                "annual_revenue_printed": org.get("annual_revenue_printed"),
                "status": "success",
            }
        except Exception as e:
            logger.error(f"Error fetching Apollo data for {company_name}: {e}")
            return self._stub_response(company_name, domain, status="error")

    def fetch_financial_data(self, company_name: str, domain: Optional[str] = None) -> Dict[str, Any]:
        """Fetch financial data from Apollo (included in company data)."""
        company_data = self.fetch_company_data(company_name, domain)
        return {
            "company_name": company_name,
            "source": "apollo",
            "total_funding": company_data.get("total_funding"),
            "latest_funding_round": company_data.get("latest_funding_round"),
            "latest_funding_amount": company_data.get("latest_funding_amount"),
            "annual_revenue": company_data.get("annual_revenue"),
            "status": company_data.get("status", "stub"),
        }

    def fetch_person_data(self, email: str) -> Dict[str, Any]:
        """Fetch person data from Apollo by email."""
        if not self.enabled:
            return {"email": email, "source": "apollo", "status": "not_configured"}

        try:
            url = f"{self.BASE_URL}/people/match"
            headers = {"Content-Type": "application/json"}
            data = {
                "api_key": self.api_key,
                "email": email,
            }

            with httpx.Client(timeout=10.0) as client:
                response = client.post(url, headers=headers, json=data)
                response.raise_for_status()
                result = response.json()

            if not result.get("person"):
                return {"email": email, "source": "apollo", "status": "not_found"}

            person = result["person"]
            return {
                "email": email,
                "source": "apollo",
                "name": person.get("name"),
                "title": person.get("title"),
                "linkedin_url": person.get("linkedin_url"),
                "company": person.get("organization", {}).get("name"),
                "seniority": person.get("seniority"),
                "departments": person.get("departments", []),
                "status": "success",
            }
        except Exception as e:
            logger.error(f"Error fetching Apollo person data for {email}: {e}")
            return {"email": email, "source": "apollo", "status": "error"}

    def _stub_response(self, company_name: str, domain: Optional[str], status: str = "stub") -> Dict[str, Any]:
        return {
            "company_name": company_name,
            "domain": domain,
            "source": "apollo",
            "status": status,
        }


class HunterSource(DataSource):
    """Hunter.io API integration for email verification and domain search."""

    BASE_URL = "https://api.hunter.io/v2"

    def __init__(self, api_key: Optional[str] = None):
        from app.core.config import settings

        self.api_key = api_key or settings.hunter_api_key
        self.enabled = bool(self.api_key)

        if not self.enabled:
            logger.info("Hunter API not configured (HUNTER_API_KEY not set)")

    def fetch_company_data(self, company_name: str, domain: Optional[str] = None) -> Dict[str, Any]:
        """Fetch company/domain data from Hunter.io."""
        if not self.enabled:
            return {"company_name": company_name, "domain": domain, "source": "hunter", "status": "not_configured"}

        if not domain:
            return {"company_name": company_name, "source": "hunter", "status": "domain_required"}

        try:
            # Clean domain
            clean_domain = domain.replace("https://", "").replace("http://", "").replace("www.", "").split("/")[0]
            
            url = f"{self.BASE_URL}/domain-search"
            headers = {}
            params = {
                "api_key": self.api_key,
                "domain": clean_domain,
            }

            response = self._make_request(url, headers, params)
            if not response or not response.get("data"):
                return {"company_name": company_name, "domain": domain, "source": "hunter", "status": "not_found"}

            data = response["data"]
            return {
                "company_name": data.get("organization", company_name),
                "domain": data.get("domain", domain),
                "source": "hunter",
                "email_pattern": data.get("pattern"),
                "total_emails_found": len(data.get("emails", [])),
                "department_breakdown": self._get_department_breakdown(data.get("emails", [])),
                "industry": data.get("industry"),
                "company_type": data.get("company_type"),
                "headcount": data.get("headcount"),
                "status": "success",
            }
        except Exception as e:
            logger.error(f"Error fetching Hunter data for {domain}: {e}")
            return {"company_name": company_name, "domain": domain, "source": "hunter", "status": "error"}

    def verify_email(self, email: str) -> Dict[str, Any]:
        """Verify an email address using Hunter.io."""
        if not self.enabled:
            return {"email": email, "source": "hunter", "status": "not_configured"}

        try:
            url = f"{self.BASE_URL}/email-verifier"
            headers = {}
            params = {
                "api_key": self.api_key,
                "email": email,
            }

            response = self._make_request(url, headers, params)
            if not response or not response.get("data"):
                return {"email": email, "source": "hunter", "status": "error"}

            data = response["data"]
            return {
                "email": email,
                "source": "hunter",
                "status": "success",
                "result": data.get("result"),  # "deliverable", "undeliverable", "risky", "unknown"
                "score": data.get("score"),  # 0-100 confidence
                "disposable": data.get("disposable", False),
                "webmail": data.get("webmail", False),
                "mx_records": data.get("mx_records", False),
                "smtp_server": data.get("smtp_server", False),
                "accept_all": data.get("accept_all"),
            }
        except Exception as e:
            logger.error(f"Error verifying email {email}: {e}")
            return {"email": email, "source": "hunter", "status": "error"}

    def fetch_financial_data(self, company_name: str, domain: Optional[str] = None) -> Dict[str, Any]:
        """Hunter doesn't provide financial data."""
        return {"source": "hunter", "status": "not_available"}

    def _get_department_breakdown(self, emails: List[Dict]) -> Dict[str, int]:
        """Get breakdown of emails by department."""
        breakdown: Dict[str, int] = {}
        for email in emails:
            dept = email.get("department", "unknown")
            breakdown[dept] = breakdown.get(dept, 0) + 1
        return breakdown


class OpenAISource(DataSource):
    """OpenAI API for AI-powered company research."""

    def __init__(self, api_key: Optional[str] = None):
        from app.core.config import settings

        self.api_key = api_key or settings.openai_api_key
        self.enabled = bool(self.api_key)

        if not self.enabled:
            logger.info("OpenAI API not configured (OPENAI_API_KEY not set)")

    def fetch_company_data(self, company_name: str, domain: Optional[str] = None) -> Dict[str, Any]:
        """Use OpenAI to research and analyze a company."""
        if not self.enabled:
            return {"company_name": company_name, "domain": domain, "source": "openai", "status": "not_configured"}

        try:
            prompt = f"""Research the company "{company_name}"{f' (website: {domain})' if domain else ''} and provide a JSON response with the following structure:
{{
    "summary": "2-3 sentence company description",
    "industry": "primary industry",
    "business_model": "B2B, B2C, marketplace, etc.",
    "stage": "Pre-seed, Seed, Series A, etc. or 'Unknown'",
    "strengths": ["strength 1", "strength 2", "strength 3"],
    "risks": ["risk 1", "risk 2"],
    "competitors": ["competitor 1", "competitor 2"],
    "market_size": "estimated market size or 'Unknown'",
    "notable_info": "any notable news, funding, or achievements"
}}

If you don't have information about this company, return {{"status": "unknown_company", "summary": "Unable to find information about this company."}}

Respond ONLY with valid JSON, no additional text."""

            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "gpt-4o-mini",  # Cost-effective model
                        "messages": [
                            {"role": "system", "content": "You are a due diligence analyst researching companies for venture capital investors. Provide accurate, factual information only. If unsure, say so."},
                            {"role": "user", "content": prompt},
                        ],
                        "temperature": 0.3,
                        "max_tokens": 500,
                    },
                )
                response.raise_for_status()
                result = response.json()

            content = result["choices"][0]["message"]["content"]
            
            # Parse JSON response
            try:
                # Clean up response (remove markdown code blocks if present)
                content = content.strip()
                if content.startswith("```"):
                    content = content.split("```")[1]
                    if content.startswith("json"):
                        content = content[4:]
                content = content.strip()
                
                ai_data = json.loads(content)
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse OpenAI response as JSON: {content[:200]}")
                return {
                    "company_name": company_name,
                    "domain": domain,
                    "source": "openai",
                    "summary": content[:500],
                    "status": "partial",
                }

            return {
                "company_name": company_name,
                "domain": domain,
                "source": "openai",
                "summary": ai_data.get("summary"),
                "industry": ai_data.get("industry"),
                "business_model": ai_data.get("business_model"),
                "estimated_stage": ai_data.get("stage"),
                "strengths": ai_data.get("strengths", []),
                "risks": ai_data.get("risks", []),
                "competitors": ai_data.get("competitors", []),
                "market_size": ai_data.get("market_size"),
                "notable_info": ai_data.get("notable_info"),
                "status": "success" if ai_data.get("status") != "unknown_company" else "unknown_company",
            }
        except Exception as e:
            logger.error(f"Error fetching OpenAI analysis for {company_name}: {e}")
            return {"company_name": company_name, "domain": domain, "source": "openai", "status": "error"}

    def fetch_financial_data(self, company_name: str, domain: Optional[str] = None) -> Dict[str, Any]:
        """OpenAI doesn't provide real-time financial data."""
        return {"source": "openai", "status": "not_available"}

    def generate_diligence_narrative(
        self, 
        company_name: str, 
        metrics: List[Dict], 
        risks: List[Dict],
        external_data: Dict
    ) -> str:
        """Generate a comprehensive due diligence narrative using AI."""
        if not self.enabled:
            return "AI narrative generation not available (OpenAI API not configured)."

        try:
            prompt = f"""You are a venture capital analyst writing a due diligence summary for "{company_name}".

Based on the following data, write a 3-4 paragraph professional due diligence summary:

**Metrics:**
{json.dumps(metrics, indent=2)}

**Risk Flags:**
{json.dumps(risks, indent=2)}

**External Data:**
{json.dumps(external_data, indent=2)}

Write in a professional, objective tone. Highlight key strengths and flag important concerns. Be specific with numbers when available. End with a brief recommendation or next steps for the investor."""

            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "gpt-4o-mini",
                        "messages": [
                            {"role": "system", "content": "You are a senior venture capital analyst providing due diligence summaries. Be concise, factual, and actionable."},
                            {"role": "user", "content": prompt},
                        ],
                        "temperature": 0.4,
                        "max_tokens": 600,
                    },
                )
                response.raise_for_status()
                result = response.json()

            return result["choices"][0]["message"]["content"]
        except Exception as e:
            logger.error(f"Error generating narrative for {company_name}: {e}")
            return f"Due diligence summary for {company_name}. Unable to generate AI narrative at this time."


class PDLSource(DataSource):
    """People Data Labs API for company and people enrichment."""

    BASE_URL = "https://api.peopledatalabs.com/v5"

    def __init__(self, api_key: Optional[str] = None):
        from app.core.config import settings

        self.api_key = api_key or settings.pdl_api_key
        self.enabled = bool(self.api_key)

        if not self.enabled:
            logger.info("PDL API not configured (PDL_API_KEY not set)")

    def fetch_company_data(self, company_name: str, domain: Optional[str] = None) -> Dict[str, Any]:
        """Fetch company data from People Data Labs."""
        if not self.enabled:
            return {"company_name": company_name, "domain": domain, "source": "pdl", "status": "not_configured"}

        try:
            url = f"{self.BASE_URL}/company/enrich"
            headers = {"X-Api-Key": self.api_key}
            
            # PDL prefers domain for lookup
            params = {}
            if domain:
                clean_domain = domain.replace("https://", "").replace("http://", "").replace("www.", "").split("/")[0]
                params["website"] = clean_domain
            else:
                params["name"] = company_name

            response = self._make_request(url, headers, params)
            if not response:
                return {"company_name": company_name, "domain": domain, "source": "pdl", "status": "not_found"}

            return {
                "company_name": response.get("name", company_name),
                "domain": response.get("website", domain),
                "source": "pdl",
                "description": response.get("summary"),
                "industry": response.get("industry"),
                "employee_count": response.get("employee_count"),
                "employee_count_range": response.get("size"),
                "founded_year": response.get("founded"),
                "location": self._format_location(response.get("location")),
                "linkedin_url": response.get("linkedin_url"),
                "twitter_url": response.get("twitter_url"),
                "facebook_url": response.get("facebook_url"),
                "total_funding": response.get("total_funding_raised"),
                "latest_funding_round": response.get("latest_funding_stage"),
                "latest_funding_date": response.get("latest_funding_date"),
                "tags": response.get("tags", []),
                "type": response.get("type"),  # private, public, nonprofit, etc.
                "ticker": response.get("ticker"),
                "status": "success",
            }
        except Exception as e:
            logger.error(f"Error fetching PDL company data for {company_name}: {e}")
            return {"company_name": company_name, "domain": domain, "source": "pdl", "status": "error"}

    def fetch_person_data(self, email: str = None, linkedin_url: str = None, name: str = None, company: str = None) -> Dict[str, Any]:
        """Fetch person data from People Data Labs."""
        if not self.enabled:
            return {"source": "pdl", "status": "not_configured"}

        if not any([email, linkedin_url, name]):
            return {"source": "pdl", "status": "insufficient_params"}

        try:
            url = f"{self.BASE_URL}/person/enrich"
            headers = {"X-Api-Key": self.api_key}
            params = {"min_likelihood": 5}  # Require decent match confidence
            
            if email:
                params["email"] = email
            if linkedin_url:
                params["profile"] = linkedin_url
            if name:
                params["name"] = name
            if company:
                params["company"] = company

            response = self._make_request(url, headers, params)
            if not response or not response.get("data"):
                return {"source": "pdl", "status": "not_found"}

            data = response.get("data", {})
            return {
                "source": "pdl",
                "full_name": data.get("full_name"),
                "first_name": data.get("first_name"),
                "last_name": data.get("last_name"),
                "headline": data.get("job_title"),
                "company": data.get("job_company_name"),
                "linkedin_url": data.get("linkedin_url"),
                "location": self._format_location(data.get("location")),
                "industry": data.get("industry"),
                "skills": data.get("skills", [])[:10],
                "experience": self._format_experience(data.get("experience", [])),
                "education": self._format_education(data.get("education", [])),
                "emails": data.get("emails", []),
                "phone_numbers": data.get("phone_numbers", []),
                "likelihood": response.get("likelihood"),
                "status": "success",
            }
        except Exception as e:
            logger.error(f"Error fetching PDL person data: {e}")
            return {"source": "pdl", "status": "error"}

    def fetch_financial_data(self, company_name: str, domain: Optional[str] = None) -> Dict[str, Any]:
        """Fetch financial data from PDL (included in company data)."""
        company_data = self.fetch_company_data(company_name, domain)
        return {
            "company_name": company_name,
            "source": "pdl",
            "total_funding": company_data.get("total_funding"),
            "latest_funding_round": company_data.get("latest_funding_round"),
            "latest_funding_date": company_data.get("latest_funding_date"),
            "status": company_data.get("status", "stub"),
        }

    def _format_location(self, location: Optional[Dict]) -> Optional[str]:
        """Format location dict to string."""
        if not location:
            return None
        parts = []
        if location.get("locality"):
            parts.append(location["locality"])
        if location.get("region"):
            parts.append(location["region"])
        if location.get("country"):
            parts.append(location["country"])
        return ", ".join(parts) if parts else None

    def _format_experience(self, experiences: List[Dict]) -> List[Dict]:
        """Format experience data."""
        formatted = []
        for exp in experiences[:5]:  # Last 5 jobs
            formatted.append({
                "title": exp.get("title", {}).get("name") if isinstance(exp.get("title"), dict) else exp.get("title"),
                "company": exp.get("company", {}).get("name") if isinstance(exp.get("company"), dict) else exp.get("company"),
                "start_date": exp.get("start_date"),
                "end_date": exp.get("end_date"),
                "is_primary": exp.get("is_primary", False),
            })
        return formatted

    def _format_education(self, education: List[Dict]) -> List[Dict]:
        """Format education data."""
        formatted = []
        for edu in education[:3]:  # Top 3 education entries
            formatted.append({
                "school": edu.get("school", {}).get("name") if isinstance(edu.get("school"), dict) else edu.get("school"),
                "degree": edu.get("degrees", [None])[0] if edu.get("degrees") else None,
                "field": edu.get("majors", [None])[0] if edu.get("majors") else None,
                "start_date": edu.get("start_date"),
                "end_date": edu.get("end_date"),
            })
        return formatted
