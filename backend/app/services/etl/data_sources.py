"""
ETL Data Sources for external API integrations.
Implements Crunchbase and Clearbit integrations with proper error handling.
"""

from __future__ import annotations

import logging
import time
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
from urllib.parse import quote

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
