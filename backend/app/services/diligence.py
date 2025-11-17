from __future__ import annotations

from random import random
from typing import List

from app.schemas.diligence import DiligenceSummary, Metric, RiskFlag


class DiligenceService:
    """Mock implementation that will be replaced by ETL + ML logic."""

    def generate_summary(self, profile_id: str) -> DiligenceSummary:
        base_score = random() * 50 + 50
        metrics: List[Metric] = [
            Metric(name="Runway (months)", value=18, trend="up", confidence=0.8),
            Metric(name="ARR Growth", value="35% YoY", trend="up", confidence=0.7),
            Metric(name="Team Size", value=12, trend="flat", confidence=0.6),
        ]
        risks = [
            RiskFlag(code="DATA_GAP", severity="medium", description="Financials self-reported"),
        ]
        narrative = (
            "Automated summary placeholder. Replace with LangChain-generated insights "
            "once ETL and LLM services are wired."
        )
        return DiligenceSummary(
            profile_id=profile_id,
            score=round(base_score, 2),
            metrics=metrics,
            risks=risks,
            narrative=narrative,
        )


diligence_service = DiligenceService()

