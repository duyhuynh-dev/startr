"""Seed data script for development.

Creates sample:
- Prompt templates (for investors and founders)
- Profiles (investors and founders with prompts)
- Likes and matches

Usage:
    python scripts/seed_data.py [--clear] [--count N]

Options:
    --clear: Clear all existing data before seeding
    --count N: Number of profiles to create per role (default: 15, total ~30)
"""

from __future__ import annotations

import argparse
import sys
from datetime import datetime
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import delete, select
from sqlmodel import Session

from app.core.config import settings
from app.db.session import engine
from app.models.match import DailyLimit, Like, Match, Pass, ProfileView
from app.models.message import Message
from app.models.notification import Notification
from app.models.profile import Profile
from app.models.prompt_template import PromptTemplate
from app.models.startup_of_month import StartupOfMonth
from app.models.user import User
from app.schemas.profile import PromptResponse

# Sample prompt templates
INVESTOR_PROMPTS = [
    {"text": "What gets you excited about a startup?", "category": "mission", "display_order": 1},
    {"text": "What's your investment thesis?", "category": "thesis", "display_order": 2},
    {"text": "What's one trait you look for in founders?", "category": "preferences", "display_order": 3},
    {"text": "What's the best piece of advice you've given a startup?", "category": "advice", "display_order": 4},
    {"text": "What industry are you most bullish on right now?", "category": "sectors", "display_order": 5},
]

FOUNDER_PROMPTS = [
    {"text": "What problem are you solving?", "category": "mission", "display_order": 1},
    {"text": "What's your biggest win so far?", "category": "traction", "display_order": 2},
    {"text": "What makes your team special?", "category": "team", "display_order": 3},
    {"text": "What's your long-term vision?", "category": "mission", "display_order": 4},
    {"text": "What kind of investor are you looking for?", "category": "preferences", "display_order": 5},
]

# Sample profile data
SAMPLE_INVESTORS = [
    {
        "full_name": "Alex Chen",
        "email": "alex.chen@sequoia.vc",
        "headline": "Partner at Sequoia Capital",
        "location": "San Francisco, CA",
        "firm": "Sequoia Capital",
        "check_size_min": 500000,
        "check_size_max": 5000000,
        "focus_sectors": ["AI/ML", "Enterprise SaaS", "Fintech"],
        "focus_stages": ["Seed", "Series A"],
        "accreditation_note": "Accredited investor since 2015",
        "prompts": [
            {"prompt_id": "inv_mission", "content": "I'm passionate about founders who are solving real problems with deep technical moats."},
            {"prompt_id": "inv_thesis", "content": "I focus on B2B SaaS companies with strong unit economics and network effects."},
            {"prompt_id": "inv_prefs", "content": "I value resilience and product vision above all else in founders."},
        ],
    },
    {
        "full_name": "Sarah Johnson",
        "email": "sarah.j@a16z.com",
        "headline": "Principal at Andreessen Horowitz",
        "location": "Menlo Park, CA",
        "firm": "Andreessen Horowitz",
        "check_size_min": 1000000,
        "check_size_max": 10000000,
        "focus_sectors": ["Web3", "Crypto", "Infrastructure"],
        "focus_stages": ["Pre-seed", "Seed", "Series A"],
        "prompts": [
            {"prompt_id": "inv_mission", "content": "I'm excited by companies building the infrastructure for the next generation of the internet."},
            {"prompt_id": "inv_sectors", "content": "Web3 and crypto infrastructure are where I'm putting most of my attention right now."},
        ],
    },
    {
        "full_name": "Michael Park",
        "email": "mike.park@ycombinator.com",
        "headline": "Partner at Y Combinator",
        "location": "Mountain View, CA",
        "firm": "Y Combinator",
        "check_size_min": 125000,
        "check_size_max": 500000,
        "focus_sectors": ["Consumer", "Marketplaces", "AI"],
        "focus_stages": ["Pre-seed"],
        "prompts": [
            {"prompt_id": "inv_advice", "content": "Focus on making something people want, everything else is secondary."},
            {"prompt_id": "inv_prefs", "content": "I look for founders who can execute fast and learn from customers."},
        ],
    },
    {
        "full_name": "Emma Rodriguez",
        "email": "emma@firstround.com",
        "headline": "Partner at First Round Capital",
        "location": "San Francisco, CA",
        "firm": "First Round Capital",
        "check_size_min": 250000,
        "check_size_max": 2000000,
        "focus_sectors": ["Healthcare", "BioTech", "Marketplaces"],
        "focus_stages": ["Seed", "Series A"],
        "accreditation_note": "Accredited investor",
        "prompts": [
            {"prompt_id": "inv_mission", "content": "I'm excited about companies that improve healthcare outcomes and accessibility."},
            {"prompt_id": "inv_thesis", "content": "Healthcare innovation with regulatory savvy is where I see the biggest opportunities."},
        ],
    },
    {
        "full_name": "David Kim",
        "email": "david@lightspeed.vc",
        "headline": "Partner at Lightspeed Venture Partners",
        "location": "Palo Alto, CA",
        "firm": "Lightspeed Venture Partners",
        "check_size_min": 500000,
        "check_size_max": 5000000,
        "focus_sectors": ["Enterprise", "Security", "Developer Tools"],
        "focus_stages": ["Seed", "Series A", "Series B"],
        "prompts": [
            {"prompt_id": "inv_thesis", "content": "I invest in enterprise software companies that developers actually want to use."},
            {"prompt_id": "inv_sectors", "content": "Developer tools and security are hot right now - lots of pain points to solve."},
        ],
    },
    {
        "full_name": "Priya Sharma",
        "email": "priya@accel.com",
        "headline": "Partner at Accel",
        "location": "London, UK",
        "firm": "Accel",
        "check_size_min": 2000000,
        "check_size_max": 15000000,
        "focus_sectors": ["SaaS", "Fintech", "Cybersecurity"],
        "focus_stages": ["Series A", "Series B"],
        "prompts": [
            {"prompt_id": "inv_mission", "content": "I back founders building category-defining software in large markets."},
            {"prompt_id": "inv_thesis", "content": "Unit economics and repeatable GTM matter more than hype in this market."},
        ],
    },
    {
        "full_name": "Marcus Webb",
        "email": "marcus@greylock.com",
        "headline": "Partner at Greylock Partners",
        "location": "San Francisco, CA",
        "firm": "Greylock Partners",
        "check_size_min": 3000000,
        "check_size_max": 20000000,
        "focus_sectors": ["Enterprise Software", "AI/ML", "Infrastructure"],
        "focus_stages": ["Seed", "Series A", "Series B"],
        "accreditation_note": "Accredited investor",
        "prompts": [
            {"prompt_id": "inv_thesis", "content": "I look for technical founders with a clear wedge into a big problem."},
            {"prompt_id": "inv_sectors", "content": "AI applied to enterprise workflows is the biggest opportunity of the decade."},
        ],
    },
    {
        "full_name": "Yuki Tanaka",
        "email": "yuki@softbank.vc",
        "headline": "Director at SoftBank Vision Fund",
        "location": "Tokyo, Japan",
        "firm": "SoftBank Vision Fund",
        "check_size_min": 10000000,
        "check_size_max": 100000000,
        "focus_sectors": ["AI", "Robotics", "Mobility", "Fintech"],
        "focus_stages": ["Series B", "Series C+", "Growth"],
        "prompts": [
            {"prompt_id": "inv_mission", "content": "We back companies that can scale to hundreds of millions of users."},
            {"prompt_id": "inv_advice", "content": "Think globally from day one and build for multiple markets."},
        ],
    },
    {
        "full_name": "Nina Patel",
        "email": "nina@benchmark.com",
        "headline": "Principal at Benchmark",
        "location": "San Francisco, CA",
        "firm": "Benchmark",
        "check_size_min": 5000000,
        "check_size_max": 25000000,
        "focus_sectors": ["Marketplaces", "Consumer", "SaaS"],
        "focus_stages": ["Series A", "Series B"],
        "prompts": [
            {"prompt_id": "inv_thesis", "content": "I focus on companies with strong retention and organic growth."},
            {"prompt_id": "inv_prefs", "content": "Founder-market fit and speed of execution are what I look for first."},
        ],
    },
    {
        "full_name": "James O'Brien",
        "email": "james@indexventures.com",
        "headline": "Partner at Index Ventures",
        "location": "London, UK",
        "firm": "Index Ventures",
        "check_size_min": 1000000,
        "check_size_max": 10000000,
        "focus_sectors": ["DevTools", "Infrastructure", "Security"],
        "focus_stages": ["Seed", "Series A"],
        "prompts": [
            {"prompt_id": "inv_mission", "content": "I love backing developer-first companies that become infrastructure."},
            {"prompt_id": "inv_sectors", "content": "The best dev tools feel like magic - they disappear into the workflow."},
        ],
    },
    {
        "full_name": "Sofia Rivera",
        "email": "sofia@insightpartners.com",
        "headline": "Vice President at Insight Partners",
        "location": "New York, NY",
        "firm": "Insight Partners",
        "check_size_min": 5000000,
        "check_size_max": 50000000,
        "focus_sectors": ["Software", "Healthcare IT", "EdTech"],
        "focus_stages": ["Series B", "Series C+", "Growth"],
        "prompts": [
            {"prompt_id": "inv_thesis", "content": "We help software companies scale through operational support and M&A."},
            {"prompt_id": "inv_advice", "content": "Build your board and metrics early - they become your compass at scale."},
        ],
    },
    {
        "full_name": "Omar Hassan",
        "email": "omar@bessemer.com",
        "headline": "Partner at Bessemer Venture Partners",
        "location": "San Francisco, CA",
        "firm": "Bessemer Venture Partners",
        "check_size_min": 2000000,
        "check_size_max": 15000000,
        "focus_sectors": ["Cloud", "Fintech", "Healthcare"],
        "focus_stages": ["Series A", "Series B"],
        "accreditation_note": "Accredited investor",
        "prompts": [
            {"prompt_id": "inv_mission", "content": "I invest in companies that make complex systems simple and scalable."},
            {"prompt_id": "inv_sectors", "content": "Cloud-native and API-first are table stakes for the next generation of software."},
        ],
    },
    {
        "full_name": "Lily Zhang",
        "email": "lily@nea.com",
        "headline": "Partner at NEA",
        "location": "Menlo Park, CA",
        "firm": "New Enterprise Associates",
        "check_size_min": 3000000,
        "check_size_max": 20000000,
        "focus_sectors": ["Healthcare", "Biotech", "Enterprise"],
        "focus_stages": ["Seed", "Series A", "Series B"],
        "prompts": [
            {"prompt_id": "inv_thesis", "content": "I look for breakthrough science and strong teams in healthcare."},
            {"prompt_id": "inv_prefs", "content": "Regulatory strategy and clinical design matter as much as the science."},
        ],
    },
    {
        "full_name": "Ryan Foster",
        "email": "ryan@foundersfund.com",
        "headline": "Partner at Founders Fund",
        "location": "San Francisco, CA",
        "firm": "Founders Fund",
        "check_size_min": 1000000,
        "check_size_max": 20000000,
        "focus_sectors": ["Space", "Defense", "AI", "Biotech"],
        "focus_stages": ["Pre-seed", "Seed", "Series A"],
        "prompts": [
            {"prompt_id": "inv_mission", "content": "We back founders building the future others are afraid to fund."},
            {"prompt_id": "inv_advice", "content": "Contrarian ideas need contrarian capital - we're here for the outliers."},
        ],
    },
    {
        "full_name": "Anya Kowalski",
        "email": "anya@generalcatalyst.com",
        "headline": "Managing Director at General Catalyst",
        "location": "San Francisco, CA",
        "firm": "General Catalyst",
        "check_size_min": 5000000,
        "check_size_max": 30000000,
        "focus_sectors": ["Fintech", "Healthcare", "Climate"],
        "focus_stages": ["Series A", "Series B", "Growth"],
        "prompts": [
            {"prompt_id": "inv_thesis", "content": "Responsible innovation in regulated industries is our sweet spot."},
            {"prompt_id": "inv_sectors", "content": "Climate and health are the two biggest markets of the next 20 years."},
        ],
    },
]

SAMPLE_FOUNDERS = [
    {
        "full_name": "Jamie Taylor",
        "email": "jamie@techstartup.io",
        "headline": "Founder & CEO at TechStartup",
        "location": "Austin, TX",
        "company_name": "TechStartup",
        "company_url": "https://techstartup.io",
        "revenue_run_rate": 1200000.0,
        "team_size": 12,
        "runway_months": 18,
        "focus_markets": ["US", "Canada"],
        "prompts": [
            {"prompt_id": "found_mission", "content": "We're solving the problem of inefficient team collaboration for remote-first companies."},
            {"prompt_id": "found_traction", "content": "We just hit $100K MRR with 50+ enterprise customers in our first year."},
            {"prompt_id": "found_team", "content": "Our team has 50+ years combined experience at companies like Slack and Notion."},
        ],
    },
    {
        "full_name": "Casey Martinez",
        "email": "casey@aihealth.ai",
        "headline": "Co-founder at AIHealth",
        "location": "Boston, MA",
        "company_name": "AIHealth",
        "company_url": "https://aihealth.ai",
        "revenue_run_rate": 2400000.0,
        "team_size": 18,
        "runway_months": 12,
        "focus_markets": ["US"],
        "prompts": [
            {"prompt_id": "found_mission", "content": "We're using AI to democratize access to personalized healthcare diagnostics."},
            {"prompt_id": "found_traction", "content": "We've processed over 100K patient cases with 95% accuracy and partnered with 10 major hospital systems."},
            {"prompt_id": "found_vision", "content": "Our vision is to make healthcare diagnostics as accessible as a Google search."},
        ],
    },
    {
        "full_name": "Jordan Lee",
        "email": "jordan@cryptopay.com",
        "headline": "Founder at CryptoPay",
        "location": "New York, NY",
        "company_name": "CryptoPay",
        "company_url": "https://cryptopay.com",
        "revenue_run_rate": 500000.0,
        "team_size": 8,
        "runway_months": 24,
        "focus_markets": ["Global"],
        "prompts": [
            {"prompt_id": "found_mission", "content": "We're building the Stripe for crypto payments - making it easy for businesses to accept crypto."},
            {"prompt_id": "found_traction", "content": "We're processing $2M+ in monthly payment volume with 200+ merchants on our platform."},
            {"prompt_id": "found_prefs", "content": "We're looking for investors who understand both fintech and crypto, and can help us navigate regulation."},
        ],
    },
    {
        "full_name": "Riley Chen",
        "email": "riley@edutech.io",
        "headline": "CEO at EduTech",
        "location": "Seattle, WA",
        "company_name": "EduTech",
        "company_url": "https://edutech.io",
        "revenue_run_rate": 1800000.0,
        "team_size": 15,
        "runway_months": 15,
        "focus_markets": ["US", "UK", "Australia"],
        "prompts": [
            {"prompt_id": "found_mission", "content": "We're revolutionizing online education with AI-powered personalized learning paths."},
            {"prompt_id": "found_traction", "content": "We have 50K+ active students and partnerships with 20 universities."},
            {"prompt_id": "found_team", "content": "Our founding team includes former engineers from Khan Academy and Coursera."},
        ],
    },
    {
        "full_name": "Taylor Brown",
        "email": "taylor@greentech.co",
        "headline": "Co-founder at GreenTech",
        "location": "Portland, OR",
        "company_name": "GreenTech",
        "company_url": "https://greentech.co",
        "revenue_run_rate": 900000.0,
        "team_size": 10,
        "runway_months": 20,
        "focus_markets": ["US", "Europe"],
        "prompts": [
            {"prompt_id": "found_mission", "content": "We're building software to help businesses reduce their carbon footprint by 50%+."},
            {"prompt_id": "found_traction", "content": "We've helped 100+ companies reduce emissions, saving them $5M+ in carbon credits."},
            {"prompt_id": "found_vision", "content": "Our vision is a world where every business tracks and optimizes their environmental impact."},
        ],
    },
    {
        "full_name": "Morgan Reed",
        "email": "morgan@devopsify.io",
        "headline": "CEO at DevOpsify",
        "location": "Denver, CO",
        "company_name": "DevOpsify",
        "company_url": "https://devopsify.io",
        "revenue_run_rate": 2400000.0,
        "team_size": 22,
        "runway_months": 14,
        "focus_markets": ["US", "Europe"],
        "prompts": [
            {"prompt_id": "found_mission", "content": "We automate CI/CD and infrastructure so engineering teams can ship faster."},
            {"prompt_id": "found_traction", "content": "400+ teams use us; we're at $200K MRR with 95% retention."},
            {"prompt_id": "found_team", "content": "Ex-Google and AWS engineers; we've lived the pain we're solving."},
        ],
    },
    {
        "full_name": "Chris Okonkwo",
        "email": "chris@paystack.africa",
        "headline": "Founder at PayStack Africa",
        "location": "Lagos, Nigeria",
        "company_name": "PayStack Africa",
        "company_url": "https://paystack.africa",
        "revenue_run_rate": 3600000.0,
        "team_size": 45,
        "runway_months": 18,
        "focus_markets": ["West Africa", "East Africa"],
        "prompts": [
            {"prompt_id": "found_mission", "content": "We're building the payments backbone for African businesses and creators."},
            {"prompt_id": "found_traction", "content": "Processing $1B+ annually; 500K+ businesses on the platform."},
            {"prompt_id": "found_vision", "content": "Every African business should have Stripe-grade payments in one integration."},
        ],
    },
    {
        "full_name": "Sam Liu",
        "email": "sam@deepmed.io",
        "headline": "Co-founder at DeepMed",
        "location": "Boston, MA",
        "company_name": "DeepMed",
        "company_url": "https://deepmed.io",
        "revenue_run_rate": 1800000.0,
        "team_size": 28,
        "runway_months": 16,
        "focus_markets": ["US", "EU"],
        "prompts": [
            {"prompt_id": "found_mission", "content": "We use AI to accelerate drug discovery and reduce clinical trial failure."},
            {"prompt_id": "found_traction", "content": "Two pharma partnerships; our models have predicted 3 successful Phase II outcomes."},
            {"prompt_id": "found_prefs", "content": "We want investors with deep biotech and regulatory experience."},
        ],
    },
    {
        "full_name": "Jordan Blake",
        "email": "jordan@stackly.dev",
        "headline": "Founder at Stackly",
        "location": "San Francisco, CA",
        "company_name": "Stackly",
        "company_url": "https://stackly.dev",
        "revenue_run_rate": 600000.0,
        "team_size": 6,
        "runway_months": 22,
        "focus_markets": ["US"],
        "prompts": [
            {"prompt_id": "found_mission", "content": "We're the Figma for backend APIs - design, mock, and ship in one place."},
            {"prompt_id": "found_traction", "content": "10K+ developers; $50K MRR; YC W24."},
            {"prompt_id": "found_team", "content": "Previously at Stripe and Vercel; we eat our own dog food."},
        ],
    },
    {
        "full_name": "Aria Kim",
        "email": "aria@mindfulhr.com",
        "headline": "CEO at MindfulHR",
        "location": "Chicago, IL",
        "company_name": "MindfulHR",
        "company_url": "https://mindfulhr.com",
        "revenue_run_rate": 1500000.0,
        "team_size": 14,
        "runway_months": 20,
        "focus_markets": ["US", "Canada"],
        "prompts": [
            {"prompt_id": "found_mission", "content": "We help mid-market companies build inclusive culture with data-driven HR tools."},
            {"prompt_id": "found_traction", "content": "80+ customers; 40% improvement in retention where we're deployed."},
            {"prompt_id": "found_vision", "content": "Every employee should have a great manager; we make that measurable."},
        ],
    },
    {
        "full_name": "Diego Morales",
        "email": "diego@agriwise.co",
        "headline": "Founder at AgriWise",
        "location": "Mexico City, Mexico",
        "company_name": "AgriWise",
        "company_url": "https://agriwise.co",
        "revenue_run_rate": 800000.0,
        "team_size": 11,
        "runway_months": 18,
        "focus_markets": ["Latin America", "US"],
        "prompts": [
            {"prompt_id": "found_mission", "content": "We use satellite and IoT data to help farmers optimize yield and reduce waste."},
            {"prompt_id": "found_traction", "content": "50K+ hectares under management; 15% average yield increase."},
            {"prompt_id": "found_prefs", "content": "Looking for investors who care about food security and climate resilience."},
        ],
    },
    {
        "full_name": "Quinn Adams",
        "email": "quinn@securelayer.io",
        "headline": "Co-founder at SecureLayer",
        "location": "Austin, TX",
        "company_name": "SecureLayer",
        "company_url": "https://securelayer.io",
        "revenue_run_rate": 3200000.0,
        "team_size": 35,
        "runway_months": 12,
        "focus_markets": ["US", "UK", "EU"],
        "prompts": [
            {"prompt_id": "found_mission", "content": "We provide real-time supply chain security and compliance for enterprises."},
            {"prompt_id": "found_traction", "content": "Fortune 500 customers; we've prevented $20M+ in fraud and compliance fines."},
            {"prompt_id": "found_team", "content": "Ex-Palantir and CrowdStrike; we've seen attacks from the inside."},
        ],
    },
    {
        "full_name": "Zara Khan",
        "email": "zara@voicefirst.ai",
        "headline": "CEO at VoiceFirst AI",
        "location": "London, UK",
        "company_name": "VoiceFirst AI",
        "company_url": "https://voicefirst.ai",
        "revenue_run_rate": 1200000.0,
        "team_size": 18,
        "runway_months": 15,
        "focus_markets": ["UK", "EU", "US"],
        "prompts": [
            {"prompt_id": "found_mission", "content": "We build voice AI that actually understands context and accents."},
            {"prompt_id": "found_traction", "content": "20+ enterprise pilots; 98% accuracy on non-English and accented speech."},
            {"prompt_id": "found_vision", "content": "Voice should be the primary interface for the next billion users."},
        ],
    },
    {
        "full_name": "Evan Park",
        "email": "evan@carbonledger.com",
        "headline": "Founder at CarbonLedger",
        "location": "Berlin, Germany",
        "company_name": "CarbonLedger",
        "company_url": "https://carbonledger.com",
        "revenue_run_rate": 1400000.0,
        "team_size": 12,
        "runway_months": 20,
        "focus_markets": ["EU", "US"],
        "prompts": [
            {"prompt_id": "found_mission", "content": "We help companies measure and report Scope 3 emissions with audit-grade data."},
            {"prompt_id": "found_traction", "content": "100+ enterprises; aligned with EU CSRD and SEC climate rules."},
            {"prompt_id": "found_prefs", "content": "We want investors who understand climate tech and regulatory tailwinds."},
        ],
    },
    {
        "full_name": "Jordan Reese",
        "email": "jordan@talentmatch.io",
        "headline": "Co-founder at TalentMatch",
        "location": "Toronto, Canada",
        "company_name": "TalentMatch",
        "company_url": "https://talentmatch.io",
        "revenue_run_rate": 900000.0,
        "team_size": 9,
        "runway_months": 24,
        "focus_markets": ["North America"],
        "prompts": [
            {"prompt_id": "found_mission", "content": "We use ML to match candidates to roles based on potential, not just keywords."},
            {"prompt_id": "found_traction", "content": "30+ companies; 2x hire quality and 50% faster time-to-fill in pilots."},
            {"prompt_id": "found_vision", "content": "Hiring should be about fit and growth, not resume keyword bingo."},
        ],
    },
]


def clear_all_data(session: Session) -> None:
    """Clear all existing data (order respects FK: notifications -> messages, then rest)."""
    print("Clearing existing data...")
    session.exec(delete(Notification))
    session.exec(delete(Message))
    session.exec(delete(Match))
    session.exec(delete(Like))
    session.exec(delete(Pass))
    session.exec(delete(ProfileView))
    session.exec(delete(DailyLimit))
    session.exec(delete(StartupOfMonth))
    session.exec(delete(User))
    session.exec(delete(Profile))
    session.exec(delete(PromptTemplate))
    session.commit()
    print("✓ All data cleared")


def seed_prompt_templates(session: Session) -> list[str]:
    """Seed prompt templates and return template ID map."""
    print("\nSeeding prompt templates...")
    
    template_ids = {}
    
    # Investor templates
    for idx, prompt_data in enumerate(INVESTOR_PROMPTS):
        template_id = f"inv_{prompt_data['category']}"
        existing = session.exec(
            select(PromptTemplate).where(PromptTemplate.id == template_id)
        ).first()
        
        if not existing:
            template = PromptTemplate(
                id=template_id,
                text=prompt_data["text"],
                role="investor",
                category=prompt_data["category"],
                display_order=prompt_data["display_order"],
                is_active=True,
            )
            session.add(template)
            template_ids[template_id] = template_id
            print(f"  ✓ Created investor template: {prompt_data['text'][:50]}...")
        else:
            template_ids[template_id] = template_id
    
    # Founder templates
    for idx, prompt_data in enumerate(FOUNDER_PROMPTS):
        template_id = f"found_{prompt_data['category']}"
        existing = session.exec(
            select(PromptTemplate).where(PromptTemplate.id == template_id)
        ).first()
        
        if not existing:
            template = PromptTemplate(
                id=template_id,
                text=prompt_data["text"],
                role="founder",
                category=prompt_data["category"],
                display_order=prompt_data["display_order"],
                is_active=True,
            )
            session.add(template)
            template_ids[template_id] = template_id
            print(f"  ✓ Created founder template: {prompt_data['text'][:50]}...")
        else:
            template_ids[template_id] = template_id
    
    session.commit()
    print(f"✓ Seeded {len(template_ids)} prompt templates")
    return template_ids


def seed_profiles(session: Session, count: int = 5) -> dict[str, str]:
    """Seed profiles and return profile ID map (email -> id)."""
    print(f"\nSeeding {count} profiles per role...")
    
    profile_map = {}
    
    # Seed investors
    for investor_data in SAMPLE_INVESTORS[:count]:
        existing = session.exec(
            select(Profile).where(Profile.email == investor_data["email"])
        ).first()
        
        if not existing:
            prompts = [PromptResponse(**p) for p in investor_data.get("prompts", [])]
            profile = Profile(
                role="investor",
                full_name=investor_data["full_name"],
                email=investor_data["email"],
                headline=investor_data["headline"],
                location=investor_data.get("location"),
                firm=investor_data.get("firm"),
                check_size_min=investor_data.get("check_size_min"),
                check_size_max=investor_data.get("check_size_max"),
                focus_sectors=investor_data.get("focus_sectors", []),
                focus_stages=investor_data.get("focus_stages", []),
                accreditation_note=investor_data.get("accreditation_note"),
                prompts=[p.model_dump() for p in prompts],
                verification={
                    "soft_verified": True,
                    "manual_reviewed": False,
                    "accreditation_attested": bool(investor_data.get("accreditation_note")),
                    "badges": ["verified_email"],
                },
            )
            session.add(profile)
            session.flush()  # Get the ID
            profile_map[investor_data["email"]] = profile.id
            print(f"  ✓ Created investor: {investor_data['full_name']}")
        else:
            profile_map[investor_data["email"]] = existing.id
    
    # Seed founders
    for founder_data in SAMPLE_FOUNDERS[:count]:
        existing = session.exec(
            select(Profile).where(Profile.email == founder_data["email"])
        ).first()
        
        if not existing:
            prompts = [PromptResponse(**p) for p in founder_data.get("prompts", [])]
            profile = Profile(
                role="founder",
                full_name=founder_data["full_name"],
                email=founder_data["email"],
                headline=founder_data["headline"],
                location=founder_data.get("location"),
                company_name=founder_data.get("company_name"),
                company_url=founder_data.get("company_url"),
                revenue_run_rate=founder_data.get("revenue_run_rate"),
                team_size=founder_data.get("team_size"),
                runway_months=founder_data.get("runway_months"),
                focus_markets=founder_data.get("focus_markets", []),
                prompts=[p.model_dump() for p in prompts],
                verification={
                    "soft_verified": True,
                    "manual_reviewed": False,
                    "accreditation_attested": False,
                    "badges": ["verified_email"],
                },
            )
            session.add(profile)
            session.flush()  # Get the ID
            profile_map[founder_data["email"]] = profile.id
            print(f"  ✓ Created founder: {founder_data['full_name']}")
        else:
            profile_map[founder_data["email"]] = existing.id
    
    session.commit()
    print(f"✓ Seeded {len(profile_map)} profiles")
    return profile_map


def seed_likes_and_matches(session: Session, profile_map: dict[str, str]) -> None:
    """Seed likes and matches between profiles."""
    print("\nSeeding likes and matches...")
    
    # Get investor and founder IDs
    investor_emails = [inv["email"] for inv in SAMPLE_INVESTORS]
    founder_emails = [found["email"] for found in SAMPLE_FOUNDERS]
    
    investor_ids = [profile_map[email] for email in investor_emails if email in profile_map]
    founder_ids = [profile_map[email] for email in founder_emails if email in profile_map]
    
    if not investor_ids or not founder_ids:
        print("  ⚠ Skipping likes/matches - need both investors and founders")
        return
    
    like_count = 0
    match_count = 0
    
    # Create some likes (investors -> founders)
    # Investor 1 likes Founder 1, 2
    if len(investor_ids) >= 1 and len(founder_ids) >= 2:
        for founder_id in founder_ids[:2]:
            existing = session.exec(
                select(Like).where(
                    Like.sender_id == investor_ids[0],
                    Like.recipient_id == founder_id
                )
            ).first()
            
            if not existing:
                like = Like(
                    sender_id=investor_ids[0],
                    recipient_id=founder_id,
                    note="Love the traction! Would love to chat.",
                )
                session.add(like)
                like_count += 1
        
        # Founder 1 likes Investor 1 back (creates a match)
        existing_like = session.exec(
            select(Like).where(
                Like.sender_id == founder_ids[0],
                Like.recipient_id == investor_ids[0]
            )
        ).first()
        
        if not existing_like:
            like = Like(
                sender_id=founder_ids[0],
                recipient_id=investor_ids[0],
                note="Excited about your thesis!",
            )
            session.add(like)
            like_count += 1
            
            # Create match
            match = Match(
                founder_id=founder_ids[0],
                investor_id=investor_ids[0],
                status="pending",
            )
            session.add(match)
            match_count += 1
    
    # Investor 2 likes Founder 3
    if len(investor_ids) >= 2 and len(founder_ids) >= 3:
        existing = session.exec(
            select(Like).where(
                Like.sender_id == investor_ids[1],
                Like.recipient_id == founder_ids[2]
            )
        ).first()
        
        if not existing:
            like = Like(
                sender_id=investor_ids[1],
                recipient_id=founder_ids[2],
                note="Impressive growth metrics!",
            )
            session.add(like)
            like_count += 1
    
    session.commit()
    print(f"✓ Seeded {like_count} likes and {match_count} matches")


def main() -> None:
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Seed development data")
    parser.add_argument("--clear", action="store_true", help="Clear all existing data before seeding")
    parser.add_argument("--count", type=int, default=15, help="Number of profiles per role (default: 15, total ~30)")
    args = parser.parse_args()
    
    print("=" * 60)
    print("Seeding Development Data")
    print("=" * 60)
    
    with Session(engine) as session:
        try:
            if args.clear:
                clear_all_data(session)
            
            template_ids = seed_prompt_templates(session)
            profile_map = seed_profiles(session, count=args.count)
            seed_likes_and_matches(session, profile_map)
            
            print("\n" + "=" * 60)
            print("✓ Seeding complete!")
            print("=" * 60)
            print(f"\nDatabase: {settings.database_url.split('@')[-1] if '@' in settings.database_url else settings.database_url}")
            print(f"Created {len(template_ids)} prompt templates")
            print(f"Created {len(profile_map)} profiles")
            
        except Exception as e:
            session.rollback()
            print(f"\n✗ Error: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)


if __name__ == "__main__":
    main()

