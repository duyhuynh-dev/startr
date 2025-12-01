from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlmodel import Session

from app.core.cache import CACHE_TTL_LONG, cache_service
from app.models.profile import Profile
from app.schemas.diligence import DiligenceSummary, Metric, RiskFlag
from app.services.etl.data_sources import ClearbitSource, CrunchbaseSource

# TODO: Import LangChain once we set up LLM integration
# from langchain.llms import OpenAI
# from langchain.prompts import PromptTemplate


class DiligenceService:
    """
    Automated due diligence service with ETL pipeline, rule-based checks, and LLM summaries.
    """

    DILIGENCE_CACHE_TTL = CACHE_TTL_LONG  # 1 hour

    def __init__(self):
        self.crunchbase = CrunchbaseSource()
        # Clearbit no longer available - using stub data for free personal projects
        # Can be replaced with OpenCorporatesSource or user-provided data
        self.clearbit = ClearbitSource()  # Returns stub data when API key not set

    def generate_summary(
        self, session: Session, profile_id: str, force_refresh: bool = False
    ) -> DiligenceSummary:
        """
        Generate comprehensive diligence summary for a profile.
        Uses Redis cache unless force_refresh=True.
        """
        # Check cache first
        cache_key = cache_service.get_diligence_key(profile_id)
        if not force_refresh:
            cached = cache_service.get(cache_key)
            if cached:
                return DiligenceSummary(**cached)

        # Fetch profile
        profile = session.get(Profile, profile_id)
        if not profile:
            raise ValueError(f"Profile {profile_id} not found")

        # Only generate diligence for founders (investors have different checks)
        if profile.role != "founder":
            return self._generate_investor_summary(profile)

        # Run ETL pipeline
        external_data = self._run_etl_pipeline(profile)

        # Run rule-based checks
        metrics, risks = self._run_rule_based_checks(profile, external_data)

        # Calculate overall score
        score = self._calculate_score(metrics, risks, profile)

        # Generate LLM narrative (stub for now)
        narrative = self._generate_narrative(profile, metrics, risks, external_data)

        summary = DiligenceSummary(
            profile_id=profile_id,
            score=score,
            metrics=metrics,
            risks=risks,
            narrative=narrative,
            generated_at=datetime.utcnow(),
        )

        # Cache the result
        cache_service.set(cache_key, summary.model_dump(mode="json"), self.DILIGENCE_CACHE_TTL)

        return summary

    def _run_etl_pipeline(self, profile: Profile) -> Dict[str, Any]:
        """Run ETL pipeline to fetch external data from multiple sources."""
        company_name = profile.company_name or profile.full_name
        domain = profile.company_url

        data = {
            "profile_data": {
                "revenue_run_rate": profile.revenue_run_rate,
                "team_size": profile.team_size,
                "runway_months": profile.runway_months,
                "focus_sectors": profile.focus_sectors,
                "location": profile.location,
            },
            "crunchbase": self.crunchbase.fetch_company_data(company_name, domain),
            "clearbit": self.clearbit.fetch_company_data(company_name, domain),
        }

        return data

    def _run_rule_based_checks(
        self, profile: Profile, external_data: Dict
    ) -> tuple[List[Metric], List[RiskFlag]]:
        """Run rule-based checks on profile and external data."""
        metrics: List[Metric] = []
        risks: List[RiskFlag] = []

        # Runway check
        runway_months = profile.runway_months
        if runway_months:
            metrics.append(
                Metric(
                    name="Runway (months)",
                    value=runway_months,
                    trend="up" if runway_months >= 18 else ("flat" if runway_months >= 12 else "down"),
                    confidence=0.8 if profile.verification.get("manual_reviewed") else 0.5,
                )
            )
            if runway_months < 6:
                risks.append(
                    RiskFlag(
                        code="LOW_RUNWAY",
                        severity="high",
                        description=f"Runway below 6 months ({runway_months} months remaining). High risk of cash flow issues.",
                    )
                )
            elif runway_months < 12:
                risks.append(
                    RiskFlag(
                        code="MODERATE_RUNWAY",
                        severity="medium",
                        description=f"Runway below 12 months ({runway_months} months). Consider fundraising soon.",
                    )
                )

        # Revenue consistency check
        revenue_run_rate = profile.revenue_run_rate
        if revenue_run_rate:
            annual_revenue = revenue_run_rate * 12
            metrics.append(
                Metric(
                    name="Annual Revenue (ARR)",
                    value=f"${annual_revenue:,.0f}",
                    trend="up",
                    confidence=0.6,  # Self-reported data
                )
            )

            # Check if revenue aligns with team size
            team_size = profile.team_size
            if team_size:
                rev_per_employee = annual_revenue / team_size if team_size > 0 else 0
                metrics.append(
                    Metric(
                        name="Revenue per Employee",
                        value=f"${rev_per_employee:,.0f}",
                        trend="up" if rev_per_employee > 100000 else "flat",
                        confidence=0.7,
                    )
                )

            # Revenue is self-reported (not verified)
            risks.append(
                RiskFlag(
                    code="REVENUE_UNVERIFIED",
                    severity="medium",
                    description="Revenue data is self-reported and not verified via bank statements.",
                )
            )

        # Team size check
        team_size = profile.team_size
        if team_size:
            metrics.append(
                Metric(
                    name="Team Size",
                    value=team_size,
                    trend="up" if team_size >= 10 else "flat",
                    confidence=0.8,
                )
            )
            if team_size < 3:
                risks.append(
                    RiskFlag(
                        code="SMALL_TEAM",
                        severity="low",
                        description="Team size below 3. May indicate early stage or resource constraints.",
                    )
                )

        # Data gap checks
        missing_critical = []
        if not revenue_run_rate:
            missing_critical.append("revenue data")
        if not runway_months:
            missing_critical.append("runway information")
        if not team_size:
            missing_critical.append("team size")

        if missing_critical:
            risks.append(
                RiskFlag(
                    code="DATA_GAP",
                    severity="medium",
                    description=f"Missing critical data: {', '.join(missing_critical)}. Consider requesting from founder.",
                )
            )

        # Sector alignment check (if Crunchbase data available)
        crunchbase_data = external_data.get("crunchbase", {})
        if crunchbase_data.get("industry") and profile.focus_sectors:
            cb_industry = crunchbase_data["industry"].lower()
            profile_sectors = [s.lower() for s in profile.focus_sectors]
            if not any(cb_industry in sector or sector in cb_industry for sector in profile_sectors):
                risks.append(
                    RiskFlag(
                        code="SECTOR_MISMATCH",
                        severity="low",
                        description=f"Crunchbase lists industry as '{crunchbase_data['industry']}' but profile sectors don't align.",
                    )
                )

        # Verification status check
        verification = profile.verification or {}
        if not verification.get("soft_verified") and not verification.get("manual_reviewed"):
            risks.append(
                RiskFlag(
                    code="UNVERIFIED_PROFILE",
                    severity="medium",
                    description="Profile not yet verified. Consider manual review before proceeding.",
                )
            )

        return metrics, risks

    def _calculate_score(
        self, metrics: List[Metric], risks: List[RiskFlag], profile: Profile
    ) -> float:
        """Calculate overall diligence score (0-100)."""
        base_score = 50.0

        # Boost for metrics provided
        metric_count = len(metrics)
        base_score += min(metric_count * 5, 20)

        # Boost for verification
        verification = profile.verification or {}
        if verification.get("manual_reviewed"):
            base_score += 15
        elif verification.get("soft_verified"):
            base_score += 10

        # Deduct for risks
        risk_penalties = {"low": 2, "medium": 5, "high": 10}
        for risk in risks:
            base_score -= risk_penalties.get(risk.severity, 0)

        # Boost for revenue/runway metrics
        for metric in metrics:
            if "revenue" in metric.name.lower() and isinstance(metric.value, (int, float)):
                if metric.value > 1000000:  # > $1M ARR
                    base_score += 10
            elif "runway" in metric.name.lower() and isinstance(metric.value, int):
                if metric.value >= 18:
                    base_score += 10

        return max(0.0, min(100.0, base_score))

    def _generate_narrative(
        self, profile: Profile, metrics: List[Metric], risks: List[RiskFlag], external_data: Dict
    ) -> str:
        """Generate narrative summary using LLM (stub for now)."""
        # TODO: Implement LangChain integration
        # Example:
        # prompt = PromptTemplate(
        #     input_variables=["profile", "metrics", "risks"],
        #     template="Generate a concise due diligence summary..."
        # )
        # llm = OpenAI()
        # return llm.predict(prompt.format(...))

        # Stub implementation
        narrative_parts = [
            f"Due diligence summary for {profile.company_name or profile.full_name}.",
        ]

        if metrics:
            narrative_parts.append(f"Key metrics: {len(metrics)} tracked indicators.")
            revenue_metric = next((m for m in metrics if "revenue" in m.name.lower()), None)
            if revenue_metric:
                narrative_parts.append(f"Revenue: {revenue_metric.value}")

        if risks:
            high_risks = [r for r in risks if r.severity == "high"]
            if high_risks:
                narrative_parts.append(f"⚠️ {len(high_risks)} high-severity risks identified.")
            narrative_parts.append(f"Total risk flags: {len(risks)}.")

        narrative_parts.append(
            "This is a stub summary. Replace with LangChain-generated insights once LLM integration is complete."
        )

        return " ".join(narrative_parts)

    def _generate_investor_summary(self, profile: Profile) -> DiligenceSummary:
        """Generate summary for investor profiles (different checks)."""
        metrics: List[Metric] = []
        risks: List[RiskFlag] = []

        # Check size validation
        if profile.check_size_min and profile.check_size_max:
            metrics.append(
                Metric(
                    name="Check Size Range",
                    value=f"${profile.check_size_min:,} - ${profile.check_size_max:,}",
                    trend="flat",
                    confidence=0.8,
                )
            )

        # Accreditation check
        verification = profile.verification or {}
        if verification.get("accreditation_attested"):
            metrics.append(
                Metric(name="Accreditation Status", value="Attested", trend="flat", confidence=0.7)
            )
        else:
            risks.append(
                RiskFlag(
                    code="ACCREDITATION_NOT_ATTESTED",
                    severity="medium",
                    description="Investor has not attested to accredited status. Required for certain investment activities.",
                )
            )

        # Sector/stage focus
        if profile.focus_sectors:
            metrics.append(
                Metric(
                    name="Focus Sectors",
                    value=f"{len(profile.focus_sectors)} sectors",
                    trend="flat",
                    confidence=0.9,
                )
            )

        score = self._calculate_score(metrics, risks, profile)

        return DiligenceSummary(
            profile_id=profile.id,
            score=score,
            metrics=metrics,
            risks=risks,
            narrative=f"Investor profile summary for {profile.firm or profile.full_name}. "
            f"Focus: {', '.join(profile.focus_sectors[:3]) if profile.focus_sectors else 'General'}.",
            generated_at=datetime.utcnow(),
        )


diligence_service = DiligenceService()
