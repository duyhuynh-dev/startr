from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

import httpx
from sqlmodel import Session

from app.core.cache import CACHE_TTL_LONG, cache_service
from app.core.config import settings
from app.models.profile import Profile
from app.schemas.diligence import DiligenceSummary, Metric, RiskFlag
from app.services.etl.data_sources import (
    ClearbitSource, 
    CrunchbaseSource, 
    ApolloSource, 
    HunterSource, 
    OpenAISource,
    PDLSource,
)

logger = logging.getLogger(__name__)


class DiligenceService:
    """
    Automated due diligence service with multi-source ETL pipeline, rule-based checks, and AI summaries.
    
    Data Sources:
    - Apollo.io: Company enrichment (funding, tech stack, employee count)
    - Hunter.io: Email verification and domain intelligence
    - OpenAI: AI-powered company research and narrative generation
    - Proxycurl: LinkedIn company and founder data
    - Crunchbase: Funding rounds and investor data (enterprise)
    - Clearbit: Company enrichment (enterprise)
    """

    DILIGENCE_CACHE_TTL = CACHE_TTL_LONG  # 1 hour

    def __init__(self):
        # Initialize all data sources
        self.apollo = ApolloSource()
        self.hunter = HunterSource()
        self.openai = OpenAISource()
        self.pdl = PDLSource()
        self.crunchbase = CrunchbaseSource()
        self.clearbit = ClearbitSource()
        
        # Log which sources are available
        sources_status = {
            "apollo": self.apollo.enabled,
            "hunter": self.hunter.enabled,
            "openai": self.openai.enabled,
            "pdl": self.pdl.enabled,
            "crunchbase": self.crunchbase.enabled,
            "clearbit": self.clearbit.enabled,
        }
        enabled_sources = [k for k, v in sources_status.items() if v]
        logger.info(f"DiligenceService initialized with sources: {enabled_sources or ['none (using stubs)']}")

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

        # LLM-based strengths and concerns (what's good / what's bad about the company)
        strengths, concerns = self._generate_llm_strengths_concerns(profile, metrics, risks)

        summary = DiligenceSummary(
            profile_id=profile_id,
            score=score,
            metrics=metrics,
            risks=risks,
            narrative=narrative,
            strengths=strengths,
            concerns=concerns,
            sources_used=external_data.get("sources_used", []),
            external_data=self._sanitize_external_data(external_data),
            generated_at=datetime.utcnow(),
        )

        # Cache the result
        cache_service.set(cache_key, summary.model_dump(mode="json"), self.DILIGENCE_CACHE_TTL)

        return summary

    def _run_etl_pipeline(self, profile: Profile) -> Dict[str, Any]:
        """Run ETL pipeline to fetch external data from multiple sources."""
        company_name = profile.company_name or profile.full_name
        domain = profile.company_url
        founder_email = profile.email

        data = {
            "profile_data": {
                "revenue_run_rate": profile.revenue_run_rate,
                "team_size": profile.team_size,
                "runway_months": profile.runway_months,
                "focus_sectors": profile.focus_sectors,
                "location": profile.location,
                "company_name": company_name,
                "domain": domain,
            },
            "sources_used": [],
        }

        # Apollo.io - Primary company enrichment
        if self.apollo.enabled:
            logger.info(f"Fetching Apollo data for {company_name}")
            data["apollo"] = self.apollo.fetch_company_data(company_name, domain)
            if data["apollo"].get("status") == "success":
                data["sources_used"].append("apollo")
                
                # Also get founder data if email available
                if founder_email:
                    data["apollo_founder"] = self.apollo.fetch_person_data(founder_email)

        # Hunter.io - Email verification
        if self.hunter.enabled and founder_email:
            logger.info(f"Verifying email via Hunter: {founder_email}")
            data["hunter_email"] = self.hunter.verify_email(founder_email)
            if data["hunter_email"].get("status") == "success":
                data["sources_used"].append("hunter")
            
            # Also get domain intelligence
            if domain:
                data["hunter_domain"] = self.hunter.fetch_company_data(company_name, domain)

        # OpenAI - AI company research
        if self.openai.enabled:
            logger.info(f"Running AI research for {company_name}")
            data["openai"] = self.openai.fetch_company_data(company_name, domain)
            if data["openai"].get("status") == "success":
                data["sources_used"].append("openai")

        # PDL - People Data Labs enrichment
        if self.pdl.enabled:
            logger.info(f"Fetching PDL data for {company_name}")
            data["pdl"] = self.pdl.fetch_company_data(company_name, domain)
            if data["pdl"].get("status") == "success":
                data["sources_used"].append("pdl")
            
            # Also get founder data if email available
            if founder_email:
                data["pdl_founder"] = self.pdl.fetch_person_data(email=founder_email)

        # Legacy sources (Crunchbase, Clearbit) - enterprise APIs
        if self.crunchbase.enabled:
            data["crunchbase"] = self.crunchbase.fetch_company_data(company_name, domain)
            if data["crunchbase"].get("status") == "success":
                data["sources_used"].append("crunchbase")
                
        if self.clearbit.enabled:
            data["clearbit"] = self.clearbit.fetch_company_data(company_name, domain)
            if data["clearbit"].get("status") == "success":
                data["sources_used"].append("clearbit")

        logger.info(f"ETL pipeline completed for {company_name}. Sources: {data['sources_used']}")
        return data

    def _run_rule_based_checks(
        self, profile: Profile, external_data: Dict
    ) -> tuple[List[Metric], List[RiskFlag]]:
        """Run rule-based checks on profile and external data from all sources."""
        metrics: List[Metric] = []
        risks: List[RiskFlag] = []

        # === PROFILE DATA CHECKS ===

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

        # Revenue check
        revenue_run_rate = profile.revenue_run_rate
        if revenue_run_rate:
            annual_revenue = revenue_run_rate * 12
            metrics.append(
                Metric(
                    name="Annual Revenue (ARR)",
                    value=f"${annual_revenue:,.0f}",
                    trend="up",
                    confidence=0.6,
                )
            )

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

        # === APOLLO DATA CHECKS ===
        apollo_data = external_data.get("apollo", {})
        if apollo_data.get("status") == "success":
            # Funding data
            if apollo_data.get("total_funding"):
                metrics.append(
                    Metric(
                        name="Total Funding (Apollo)",
                        value=f"${apollo_data['total_funding']:,.0f}" if isinstance(apollo_data['total_funding'], (int, float)) else str(apollo_data['total_funding']),
                        trend="up",
                        confidence=0.85,
                    )
                )
            
            # Employee count verification
            apollo_employees = apollo_data.get("employee_count")
            if apollo_employees and team_size:
                # Check if self-reported matches external data
                variance = abs(apollo_employees - team_size) / max(team_size, 1)
                if variance > 0.5:  # More than 50% difference
                    risks.append(
                        RiskFlag(
                            code="EMPLOYEE_COUNT_MISMATCH",
                            severity="medium",
                            description=f"Self-reported team size ({team_size}) differs significantly from Apollo data ({apollo_employees}).",
                        )
                    )
                else:
                    metrics.append(
                        Metric(
                            name="Employee Count (Verified)",
                            value=apollo_employees,
                            trend="flat",
                            confidence=0.9,
                        )
                    )
            
            # Technologies/Tech Stack
            if apollo_data.get("technologies"):
                metrics.append(
                    Metric(
                        name="Tech Stack",
                        value=f"{len(apollo_data['technologies'])} technologies",
                        trend="flat",
                        confidence=0.8,
                    )
                )
            
            # Latest funding round
            if apollo_data.get("latest_funding_round"):
                metrics.append(
                    Metric(
                        name="Latest Round",
                        value=apollo_data["latest_funding_round"],
                        trend="up",
                        confidence=0.85,
                    )
                )

        # === HUNTER EMAIL VERIFICATION ===
        hunter_email = external_data.get("hunter_email", {})
        if hunter_email.get("status") == "success":
            email_result = hunter_email.get("result", "unknown")
            email_score = hunter_email.get("score", 0)
            
            metrics.append(
                Metric(
                    name="Email Verification",
                    value=f"{email_result.title()} ({email_score}%)",
                    trend="up" if email_result == "deliverable" else "down",
                    confidence=email_score / 100 if email_score else 0.5,
                )
            )
            
            if email_result == "undeliverable":
                risks.append(
                    RiskFlag(
                        code="EMAIL_UNDELIVERABLE",
                        severity="high",
                        description="Founder's email address is undeliverable. This is a major red flag.",
                    )
                )
            elif email_result == "risky":
                risks.append(
                    RiskFlag(
                        code="EMAIL_RISKY",
                        severity="medium",
                        description="Founder's email has deliverability issues. Verify contact information.",
                    )
                )
            
            if hunter_email.get("disposable"):
                risks.append(
                    RiskFlag(
                        code="DISPOSABLE_EMAIL",
                        severity="high",
                        description="Founder is using a disposable email address. Major credibility concern.",
                    )
                )

        # === OPENAI ANALYSIS ===
        openai_data = external_data.get("openai", {})
        if openai_data.get("status") == "success":
            # AI-identified strengths
            if openai_data.get("strengths"):
                metrics.append(
                    Metric(
                        name="Key Strengths (AI)",
                        value=f"{len(openai_data['strengths'])} identified",
                        trend="up",
                        confidence=0.7,
                    )
                )
            
            # AI-identified risks
            ai_risks = openai_data.get("risks", [])
            for ai_risk in ai_risks[:2]:  # Max 2 AI-identified risks
                risks.append(
                    RiskFlag(
                        code="AI_IDENTIFIED_RISK",
                        severity="low",
                        description=f"AI Analysis: {ai_risk}",
                    )
                )
            
            # Business model
            if openai_data.get("business_model"):
                metrics.append(
                    Metric(
                        name="Business Model",
                        value=openai_data["business_model"],
                        trend="flat",
                        confidence=0.7,
                    )
                )
            
            # Competitors
            if openai_data.get("competitors"):
                metrics.append(
                    Metric(
                        name="Known Competitors",
                        value=f"{len(openai_data['competitors'])} identified",
                        trend="flat",
                        confidence=0.65,
                    )
                )

        # === PDL (PEOPLE DATA LABS) ===
        pdl_data = external_data.get("pdl", {})
        if pdl_data.get("status") == "success":
            # Company type
            company_type = pdl_data.get("type")
            if company_type:
                metrics.append(
                    Metric(
                        name="Company Type",
                        value=company_type.title(),
                        trend="flat",
                        confidence=0.9,
                    )
                )
            
            # Employee count from PDL
            pdl_employees = pdl_data.get("employee_count")
            if pdl_employees:
                metrics.append(
                    Metric(
                        name="Employees (PDL)",
                        value=f"{pdl_employees:,}",
                        trend="flat",
                        confidence=0.85,
                    )
                )
            
            # Funding from PDL
            pdl_funding = pdl_data.get("total_funding")
            if pdl_funding:
                metrics.append(
                    Metric(
                        name="Total Funding (PDL)",
                        value=f"${pdl_funding:,.0f}" if isinstance(pdl_funding, (int, float)) else str(pdl_funding),
                        trend="up",
                        confidence=0.85,
                    )
                )
            
            # LinkedIn URL presence
            if pdl_data.get("linkedin_url"):
                metrics.append(
                    Metric(
                        name="LinkedIn Presence",
                        value="Verified",
                        trend="up",
                        confidence=0.9,
                    )
                )
        
        # Founder data from PDL
        pdl_founder = external_data.get("pdl_founder", {})
        if pdl_founder.get("status") == "success":
            # Founder experience
            experience = pdl_founder.get("experience", [])
            if experience:
                metrics.append(
                    Metric(
                        name="Founder Experience",
                        value=f"{len(experience)} past roles",
                        trend="up" if len(experience) >= 3 else "flat",
                        confidence=0.8,
                    )
                )
            
            # Founder education
            education = pdl_founder.get("education", [])
            if education:
                metrics.append(
                    Metric(
                        name="Founder Education",
                        value=education[0].get("school", "N/A") if education else "N/A",
                        trend="flat",
                        confidence=0.8,
                    )
                )

        # === DATA GAP CHECKS ===
        missing_critical = []
        if not revenue_run_rate:
            missing_critical.append("revenue data")
        if not runway_months:
            missing_critical.append("runway information")
        if not team_size:
            missing_critical.append("team size")
        if not profile.company_url:
            missing_critical.append("company website")

        if missing_critical:
            risks.append(
                RiskFlag(
                    code="DATA_GAP",
                    severity="medium",
                    description=f"Missing critical data: {', '.join(missing_critical)}. Consider requesting from founder.",
                )
            )

        # === VERIFICATION STATUS ===
        verification = profile.verification or {}
        if not verification.get("soft_verified") and not verification.get("manual_reviewed"):
            risks.append(
                RiskFlag(
                    code="UNVERIFIED_PROFILE",
                    severity="medium",
                    description="Profile not yet verified. Consider manual review before proceeding.",
                )
            )

        # === DATA SOURCE COVERAGE ===
        sources_used = external_data.get("sources_used", [])
        if not sources_used:
            risks.append(
                RiskFlag(
                    code="NO_EXTERNAL_DATA",
                    severity="medium",
                    description="No external data sources available. Analysis based solely on self-reported data.",
                )
            )
        elif len(sources_used) >= 3:
            metrics.append(
                Metric(
                    name="Data Sources",
                    value=f"{len(sources_used)} sources verified",
                    trend="up",
                    confidence=0.9,
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
        """Generate narrative summary using OpenAI or fallback to template."""
        company_name = profile.company_name or profile.full_name
        
        # Try AI-powered narrative first
        if self.openai.enabled:
            try:
                metrics_data = [{"name": m.name, "value": m.value, "trend": m.trend} for m in metrics]
                risks_data = [{"code": r.code, "severity": r.severity, "description": r.description} for r in risks]
                
                ai_narrative = self.openai.generate_diligence_narrative(
                    company_name=company_name,
                    metrics=metrics_data,
                    risks=risks_data,
                    external_data=external_data,
                )
                
                if ai_narrative and len(ai_narrative) > 50:
                    return ai_narrative
            except Exception as e:
                logger.warning(f"AI narrative generation failed: {e}")

        # Fallback to template-based narrative
        narrative_parts = []
        
        # Opening
        sources_used = external_data.get("sources_used", [])
        if sources_used:
            narrative_parts.append(
                f"Due diligence report for {company_name}, compiled from {len(sources_used)} external data source(s): {', '.join(sources_used)}."
            )
        else:
            narrative_parts.append(f"Due diligence report for {company_name} based on self-reported data.")

        # Key metrics summary
        if metrics:
            revenue_metric = next((m for m in metrics if "revenue" in m.name.lower()), None)
            team_metric = next((m for m in metrics if "team" in m.name.lower() or "employee" in m.name.lower()), None)
            runway_metric = next((m for m in metrics if "runway" in m.name.lower()), None)
            
            metric_highlights = []
            if revenue_metric:
                metric_highlights.append(f"revenue of {revenue_metric.value}")
            if team_metric:
                metric_highlights.append(f"team size of {team_metric.value}")
            if runway_metric:
                metric_highlights.append(f"{runway_metric.value} months runway")
            
            if metric_highlights:
                narrative_parts.append(f"Key metrics show {', '.join(metric_highlights)}.")

        # Risk summary
        high_risks = [r for r in risks if r.severity == "high"]
        medium_risks = [r for r in risks if r.severity == "medium"]
        
        if high_risks:
            narrative_parts.append(f"⚠️ ALERT: {len(high_risks)} high-severity risk(s) identified that require immediate attention.")
            for risk in high_risks[:2]:
                narrative_parts.append(f"• {risk.description}")
        
        if medium_risks and not high_risks:
            narrative_parts.append(f"Found {len(medium_risks)} moderate concerns to review.")

        # External data highlights
        apollo_data = external_data.get("apollo", {})
        if apollo_data.get("status") == "success" and apollo_data.get("total_funding"):
            narrative_parts.append(f"External data confirms total funding of ${apollo_data['total_funding']:,.0f}." if isinstance(apollo_data['total_funding'], (int, float)) else "")
        
        openai_data = external_data.get("openai", {})
        if openai_data.get("status") == "success" and openai_data.get("summary"):
            narrative_parts.append(f"AI Analysis: {openai_data['summary']}")

        # Closing recommendation
        if not high_risks and len(medium_risks) <= 2:
            narrative_parts.append("Overall, this profile shows reasonable indicators for further discussion.")
        elif high_risks:
            narrative_parts.append("Recommend addressing high-severity risks before proceeding.")
        else:
            narrative_parts.append("Consider requesting additional documentation to address data gaps.")

        return " ".join([p for p in narrative_parts if p])

    def _build_profile_context(self, profile: Profile) -> str:
        """Build a text summary of the profile for LLM context."""
        parts = []
        company = profile.company_name or profile.full_name
        parts.append(f"Company: {company}")
        if profile.headline:
            parts.append(f"Headline: {profile.headline}")
        if profile.location:
            parts.append(f"Location: {profile.location}")
        if profile.revenue_run_rate is not None:
            parts.append(f"Revenue run rate (MRR): ${profile.revenue_run_rate:,.0f}")
        if profile.team_size is not None:
            parts.append(f"Team size: {profile.team_size}")
        if profile.runway_months is not None:
            parts.append(f"Runway: {profile.runway_months} months")
        if profile.focus_markets:
            parts.append(f"Focus markets: {', '.join(profile.focus_markets)}")
        if profile.niche_moat:
            parts.append(f"Market position / moat: {profile.niche_moat[:500]}")
        if profile.market_sentiment:
            parts.append(f"Market sentiment: {profile.market_sentiment}")
        if profile.prompts:
            for i, p in enumerate(profile.prompts):
                if isinstance(p, dict) and p.get("content"):
                    parts.append(f"Prompt {i + 1}: {p['content'][:300]}")
        return "\n".join(parts)

    def _generate_llm_strengths_concerns(
        self, profile: Profile, metrics: List[Metric], risks: List[RiskFlag]
    ) -> tuple[List[str], List[str]]:
        """Use LLM to analyze the company and return strengths (good) and concerns (bad). Falls back to rule-based if LLM unavailable."""
        api_key = getattr(settings, "openai_api_key", None) or (settings.model_dump().get("openai_api_key") if hasattr(settings, "model_dump") else None)
        if not api_key:
            return self._fallback_strengths_concerns(profile, metrics, risks)

        context = self._build_profile_context(profile)
        metrics_str = json.dumps([{"name": m.name, "value": m.value, "trend": m.trend} for m in metrics], indent=2)
        risks_str = json.dumps([{"code": r.code, "severity": r.severity, "description": r.description} for r in risks], indent=2)

        prompt = f"""You are a venture capital analyst. Based ONLY on the following profile and metrics, list what is GOOD about this company (strengths) and what is BAD or RISKY (concerns). Be specific and concise. Use 3-6 bullet points for each.

Profile and data:
{context}

Metrics:
{metrics_str}

Risk flags:
{risks_str}

Respond with a valid JSON object with exactly two keys: "strengths" (array of strings) and "concerns" (array of strings). No other text."""

        try:
            with httpx.Client(timeout=45.0) as client:
                resp = client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={
                        "model": "gpt-4o-mini",
                        "messages": [
                            {"role": "system", "content": "You output only valid JSON with keys 'strengths' and 'concerns'. No markdown."},
                            {"role": "user", "content": prompt},
                        ],
                        "temperature": 0.3,
                        "max_tokens": 600,
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                content = (data.get("choices") or [{}])[0].get("message", {}).get("content", "") or "{}"
                # Strip markdown code block if present
                if "```" in content:
                    content = content.split("```")[1]
                    if content.startswith("json"):
                        content = content[4:]
                out = json.loads(content.strip())
                strengths = list(out.get("strengths") or [])[:8]
                concerns = list(out.get("concerns") or [])[:8]
                return (strengths, concerns)
        except Exception as e:
            logger.warning("LLM strengths/concerns failed: %s", e)
        return self._fallback_strengths_concerns(profile, metrics, risks)

    def _fallback_strengths_concerns(
        self, profile: Profile, metrics: List[Metric], risks: List[RiskFlag]
    ) -> tuple[List[str], List[str]]:
        """Rule-based strengths and concerns when LLM is not available."""
        strengths: List[str] = []
        concerns: List[str] = []
        if profile.revenue_run_rate and profile.revenue_run_rate > 0:
            strengths.append(f"Disclosed revenue run rate (${profile.revenue_run_rate:,.0f}/mo) indicates traction.")
        if profile.team_size and profile.team_size >= 2:
            strengths.append(f"Team size ({profile.team_size}) suggests capacity to execute.")
        if profile.runway_months is not None:
            if profile.runway_months >= 18:
                strengths.append(f"Runway of {profile.runway_months} months provides buffer for execution.")
            elif profile.runway_months < 12:
                concerns.append(f"Runway under 12 months ({profile.runway_months} mo) is a liquidity risk.")
        if profile.focus_markets:
            strengths.append(f"Clear focus markets: {', '.join(profile.focus_markets[:3])}.")
        if profile.prompts and any(isinstance(p, dict) and p.get("content") for p in profile.prompts):
            strengths.append("Founder has provided narrative responses (profile completeness).")
        for r in risks:
            if r.severity == "high":
                concerns.append(r.description)
            elif r.severity == "medium":
                concerns.append(r.description)
        if not strengths:
            strengths.append("Profile has basic company and role information.")
        if not concerns:
            concerns.append("Limited data available; consider requesting more detail.")
        return (strengths[:8], concerns[:8])

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
            strengths=[],
            concerns=[],
            generated_at=datetime.utcnow(),
        )

    def _sanitize_external_data(self, external_data: Dict) -> Dict[str, Any]:
        """Sanitize external data for frontend display (remove sensitive/internal fields)."""
        sanitized = {}
        if not isinstance(external_data, dict):
            return sanitized
        # Apollo - key company insights
        if "apollo" in external_data and external_data["apollo"].get("status") == "success":
            apollo = external_data["apollo"]
            sanitized["apollo"] = {
                "company_name": apollo.get("company_name"),
                "industry": apollo.get("industry"),
                "employee_count": apollo.get("employee_count"),
                "total_funding": apollo.get("total_funding"),
                "latest_funding_round": apollo.get("latest_funding_round"),
                "location": apollo.get("location"),
                "technologies": apollo.get("technologies", [])[:5],
                "linkedin_url": apollo.get("linkedin_url"),
            }
        if "hunter_email" in external_data and external_data["hunter_email"].get("status") == "success":
            hunter = external_data["hunter_email"]
            sanitized["email_verification"] = {
                "result": hunter.get("result"),
                "score": hunter.get("score"),
                "disposable": hunter.get("disposable"),
                "webmail": hunter.get("webmail"),
            }
        if "openai" in external_data and external_data["openai"].get("status") == "success":
            openai = external_data["openai"]
            sanitized["ai_analysis"] = {
                "summary": openai.get("summary"),
                "business_model": openai.get("business_model"),
                "strengths": openai.get("strengths", []),
                "risks": openai.get("risks", []),
                "competitors": openai.get("competitors", []),
                "market_size": openai.get("market_size"),
            }
        if "pdl" in external_data and external_data["pdl"].get("status") == "success":
            pdl = external_data["pdl"]
            sanitized["pdl"] = {
                "company_name": pdl.get("company_name"),
                "industry": pdl.get("industry"),
                "employee_count": pdl.get("employee_count"),
                "employee_range": pdl.get("employee_count_range"),
                "total_funding": pdl.get("total_funding"),
                "latest_funding_round": pdl.get("latest_funding_round"),
                "company_type": pdl.get("type"),
                "location": pdl.get("location"),
                "linkedin_url": pdl.get("linkedin_url"),
                "tags": pdl.get("tags", [])[:5],
            }
        if "pdl_founder" in external_data and external_data["pdl_founder"].get("status") == "success":
            founder = external_data["pdl_founder"]
            sanitized["founder"] = {
                "full_name": founder.get("full_name"),
                "headline": founder.get("headline"),
                "company": founder.get("company"),
                "linkedin_url": founder.get("linkedin_url"),
                "skills": founder.get("skills", [])[:5],
                "experience": founder.get("experience", [])[:3],
                "education": founder.get("education", [])[:2],
            }
        return sanitized


diligence_service = DiligenceService()
