"""
Free alternatives for company enrichment.
These are free/public APIs that can replace Clearbit for personal projects.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from app.services.etl.data_sources import DataSource

logger = logging.getLogger(__name__)


class OpenCorporatesSource(DataSource):
    """
    OpenCorporates API - Free tier available for company verification and basic data.
    URL: https://opencorporates.com/info/api
    """

    BASE_URL = "https://api.opencorporates.com/v0.4"

    def __init__(self, api_token: Optional[str] = None):
        """
        Initialize OpenCorporates source.
        
        Args:
            api_token: Optional API token (free tier available without token,
                      but with rate limits)
        """
        self.api_token = api_token
        self.enabled = True  # Always enabled - free tier available

    def fetch_company_data(self, company_name: str, domain: Optional[str] = None) -> Dict[str, Any]:
        """Fetch company data from OpenCorporates."""
        try:
            # Search for company by name
            search_url = f"{self.BASE_URL}/companies/search"
            params = {
                "q": company_name,
                "format": "json",
            }
            
            if self.api_token:
                params["api_token"] = self.api_token

            # Use simple requests (OpenCorporates allows free access)
            import httpx
            with httpx.Client(timeout=10.0) as client:
                response = client.get(search_url, params=params)
                response.raise_for_status()
                data = response.json()

            companies = data.get("results", {}).get("companies", [])
            if not companies:
                return self._stub_response(company_name, domain, status="not_found")

            # Get first match
            company = companies[0].get("company", {})
            
            return {
                "company_name": company.get("name", company_name),
                "domain": domain,
                "source": "opencorporates",
                "industry": None,  # Not available in free tier
                "employee_count": None,  # Not available
                "location": self._format_location(company.get("registered_address")),
                "tech_stack": [],
                "description": None,
                "status": "success",
                "company_number": company.get("company_number"),
                "jurisdiction": company.get("jurisdiction_code"),
            }
        except Exception as e:
            logger.warning(f"Error fetching OpenCorporates data for {company_name}: {e}")
            return self._stub_response(company_name, domain, status="error")

    def fetch_financial_data(self, company_name: str, domain: Optional[str] = None) -> Dict[str, Any]:
        """OpenCorporates doesn't provide financial data."""
        return {"source": "opencorporates", "status": "not_available"}

    def _format_location(self, address: Optional[Dict[str, Any]]) -> Optional[str]:
        """Format address into location string."""
        if not address:
            return None
        parts = []
        if address.get("locality"):
            parts.append(address["locality"])
        if address.get("region"):
            parts.append(address["region"])
        if address.get("country"):
            parts.append(address["country"])
        return ", ".join(parts) if parts else None

    def _stub_response(self, company_name: str, domain: Optional[str], status: str = "stub") -> Dict[str, Any]:
        """Return stub response when API is unavailable."""
        return {
            "company_name": company_name,
            "domain": domain,
            "source": "opencorporates",
            "industry": None,
            "employee_count": None,
            "location": None,
            "tech_stack": [],
            "status": status,
        }


class SimpleWebScrapingSource(DataSource):
    """
    Simple web scraping source - uses basic public data sources.
    This is a placeholder for custom web scraping implementation.
    
    Note: Always respect robots.txt and terms of service.
    """

    def __init__(self):
        self.enabled = True  # Can always try basic scraping

    def fetch_company_data(self, company_name: str, domain: Optional[str] = None) -> Dict[str, Any]:
        """
        Basic company data from public sources.
        
        This is a stub implementation. For production, you could:
        - Scrape company websites (with permission)
        - Use public LinkedIn data (respecting terms)
        - Parse company directories
        """
        # For now, return stub data
        # In the future, you could implement actual scraping here
        logger.info(f"Web scraping not implemented yet for {company_name}")
        
        return {
            "company_name": company_name,
            "domain": domain,
            "source": "web_scraping",
            "industry": None,
            "employee_count": None,
            "location": None,
            "tech_stack": [],
            "status": "not_implemented",
        }

    def fetch_financial_data(self, company_name: str, domain: Optional[str] = None) -> Dict[str, Any]:
        """Web scraping doesn't provide financial data."""
        return {"source": "web_scraping", "status": "not_available"}


# For personal projects, replace ClearbitSource with a free alternative
# You can use OpenCorporatesSource or just stick with stub data

