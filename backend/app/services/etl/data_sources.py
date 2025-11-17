from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional


class DataSource(ABC):
    """Base class for external data sources (Crunchbase, Clearbit, Plaid, etc.)."""

    @abstractmethod
    def fetch_company_data(self, company_name: str, domain: Optional[str] = None) -> Dict[str, Any]:
        """Fetch company data from the source."""
        pass

    @abstractmethod
    def fetch_financial_data(self, company_name: str, domain: Optional[str] = None) -> Dict[str, Any]:
        """Fetch financial data from the source."""
        pass


class CrunchbaseSource(DataSource):
    """Crunchbase API integration (stub for now)."""

    def __init__(self, api_key: Optional[str] = None):
        from app.core.config import settings
        self.api_key = api_key or settings.crunchbase_api_key or "demo_key"

    def fetch_company_data(self, company_name: str, domain: Optional[str] = None) -> Dict[str, Any]:
        """Fetch company data from Crunchbase."""
        # TODO: Implement actual Crunchbase API call
        # For now, return stub data
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
            "status": "stub",
        }

    def fetch_financial_data(self, company_name: str, domain: Optional[str] = None) -> Dict[str, Any]:
        """Fetch financial data from Crunchbase."""
        # TODO: Implement actual Crunchbase financial API call
        return {
            "company_name": company_name,
            "source": "crunchbase",
            "revenue_range": None,
            "valuation": None,
            "funding_rounds": [],
            "status": "stub",
        }


class ClearbitSource(DataSource):
    """Clearbit API integration (stub for now)."""

    def __init__(self, api_key: Optional[str] = None):
        from app.core.config import settings
        self.api_key = api_key or settings.clearbit_api_key or "demo_key"

    def fetch_company_data(self, company_name: str, domain: Optional[str] = None) -> Dict[str, Any]:
        """Fetch company data from Clearbit."""
        # TODO: Implement actual Clearbit API call
        return {
            "company_name": company_name,
            "domain": domain,
            "source": "clearbit",
            "industry": None,
            "employee_count": None,
            "location": None,
            "tech_stack": [],
            "status": "stub",
        }

    def fetch_financial_data(self, company_name: str, domain: Optional[str] = None) -> Dict[str, Any]:
        """Clearbit doesn't provide financial data directly."""
        return {"source": "clearbit", "status": "not_available"}


class PlaidSource(DataSource):
    """Plaid integration for revenue verification (stub for now)."""

    def __init__(self, client_id: Optional[str] = None, secret: Optional[str] = None):
        from app.core.config import settings
        self.client_id = client_id or settings.plaid_client_id or "demo_client_id"
        self.secret = secret or settings.plaid_secret or "demo_secret"
        self.environment = settings.plaid_environment

    def fetch_company_data(self, company_name: str, domain: Optional[str] = None) -> Dict[str, Any]:
        """Plaid doesn't provide company data."""
        return {"source": "plaid", "status": "not_available"}

    def fetch_financial_data(self, company_name: str, domain: Optional[str] = None) -> Dict[str, Any]:
        """Fetch verified financial data from Plaid (requires user consent)."""
        # TODO: Implement actual Plaid API call with OAuth flow
        # This requires founder to connect their bank account
        return {
            "company_name": company_name,
            "source": "plaid",
            "revenue_verified": False,
            "monthly_revenue": None,
            "revenue_trend": None,
            "cash_balance": None,
            "status": "stub",
        }

