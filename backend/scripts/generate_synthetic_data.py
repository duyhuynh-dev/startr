"""
Generate synthetic test data for MVP testing.

This script creates realistic test profiles (investors and founders) 
to test the platform without needing real users.

Usage:
    python -m scripts.generate_synthetic_data [--investors N] [--founders N] [--clear]
"""

from __future__ import annotations

import argparse
import random
import sys
from datetime import datetime
from pathlib import Path
from typing import List

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlmodel import Session, select

from app.core.auth import get_password_hash
from app.db.session import engine
from app.models.profile import Profile
from app.models.prompt_template import PromptTemplate
from app.models.user import User


# Realistic data pools for generating synthetic profiles
INVESTOR_NAMES = [
    "Sarah Chen", "Michael Rodriguez", "Emily Johnson", "David Kim", "Jennifer Park",
    "James Anderson", "Lisa Wang", "Robert Taylor", "Amanda White", "Christopher Brown",
    "Jessica Lee", "Daniel Martinez", "Nicole Garcia", "Matthew Thompson", "Rachel Green",
    "Andrew Davis", "Lauren Wilson", "Kevin Moore", "Michelle Jackson", "Brian Harris",
]

FOUNDER_NAMES = [
    "Alex Rivera", "Priya Patel", "Jordan Smith", "Samira Hassan", "Marcus Williams",
    "Zoe Chen", "Tyler Jones", "Luna Rodriguez", "Ryan O'Brien", "Maya Kumar",
    "Cameron Lee", "Sofia Martinez", "Dylan Brown", "Isabella Garcia", "Ethan Wilson",
    "Ava Thompson", "Noah Davis", "Olivia Anderson", "Liam Johnson", "Emma Taylor",
    "Mason Moore", "Sophia White", "Logan Harris", "Mia Jackson", "Lucas Green",
    "Charlotte Lewis", "Aiden Clark", "Amelia Young", "Carter King", "Harper Scott",
    "Sebastian Adams", "Aria Baker", "Henry Nelson", "Ella Hill", "Owen Mitchell",
    "Layla Perez", "Wyatt Roberts", "Scarlett Turner", "Grayson Phillips", "Violet Campbell",
    "Leo Parker", "Chloe Evans", "Jack Edwards", "Penelope Collins", "Luke Stewart",
]

FIRMS = [
    "Andreessen Horowitz", "Sequoia Capital", "Accel Partners", "Benchmark Capital",
    "First Round Capital", "GV (Google Ventures)", "Lightspeed Venture Partners",
    "Greylock Partners", "Khosla Ventures", "NEA (New Enterprise Associates)",
    "Index Ventures", "Spark Capital", "Union Square Ventures", "Founders Fund",
    "General Catalyst", "Insight Partners", "Battery Ventures", "Redpoint Ventures",
    "Norwest Venture Partners", "Mayfield Fund",
]

LOCATIONS = [
    "San Francisco, CA", "New York, NY", "Palo Alto, CA", "Boston, MA",
    "Los Angeles, CA", "Austin, TX", "Seattle, WA", "Chicago, IL",
    "Denver, CO", "Miami, FL", "London, UK", "Singapore", "Berlin, Germany",
]

SECTORS = [
    "AI/ML", "SaaS", "Fintech", "Healthcare", "EdTech", "E-commerce",
    "Biotech", "Enterprise Software", "Consumer", "Hardware", "Blockchain",
    "Climate Tech", "Cybersecurity", "Marketplace", "Developer Tools",
]

STAGES = [
    "Pre-seed", "Seed", "Series A", "Series B", "Series C+", "Growth",
]

COMPANY_NAMES = [
    "CloudSync", "DataFlow", "HealthBridge", "EduPath", "SecureNet",
    "MarketPulse", "CodeForge", "GreenTech Solutions", "MindLink AI",
    "SwiftPay", "TeamSync", "VisionAI", "QuickBuild", "SmartRoute",
    "ByteStream", "NextGen Labs", "InnovateHub", "CoreTech Systems",
]

INVESTOR_HEADLINES = [
    "Partner at {firm}", "Venture Partner at {firm}", "Principal at {firm}",
    "Managing Director at {firm}", "Investor at {firm}",
]

FOUNDER_HEADLINES = [
    "Founder & CEO at {company}", "Co-Founder at {company}", "CEO & Founder of {company}",
    "Founder of {company}", "CEO at {company}",
]

INVESTOR_PROMPT_ANSWERS = [
    "I'm passionate about backing mission-driven founders who are solving real problems at scale.",
    "I look for strong technical teams building in underserved markets with clear product-market fit.",
    "The best startups combine innovative technology with deep market understanding and exceptional execution.",
    "I'm excited by founders who have domain expertise and are building solutions they personally need.",
    "I invest in companies that can become category-defining leaders with sustainable competitive advantages.",
    "The ideal startup has a clear path to $100M+ revenue with strong unit economics and defensible moats.",
    "I look for founders with authentic vision, technical depth, and the ability to recruit exceptional talent.",
    "The most compelling startups solve problems that are 10x better than existing solutions.",
]

FOUNDER_PROMPT_ANSWERS = [
    "We're building the future of {sector} by making {solution} accessible to everyone.",
    "Our mission is to democratize {solution} and help {target_audience} achieve their goals faster.",
    "I started this company because I experienced {problem} firsthand and knew there had to be a better way.",
    "We're combining cutting-edge technology with deep industry expertise to transform {sector}.",
    "Our platform enables {target_audience} to {value_prop} more efficiently than ever before.",
    "We're building a category-defining product that will fundamentally change how people {activity}.",
    "The vision is to become the leading platform for {sector} by focusing on user experience and innovation.",
    "We're solving a real problem that affects millions of people, and we have a clear path to scale.",
]


def get_prompt_templates(session: Session, role: str) -> List[PromptTemplate]:
    """Get active prompt templates for a role."""
    query = select(PromptTemplate).where(
        PromptTemplate.role == role,
        PromptTemplate.is_active == True
    ).order_by(PromptTemplate.display_order)
    return list(session.exec(query).all())


def generate_investor_profile(
    session: Session,
    name: str,
    email: str,
    index: int,
    prompt_templates: List[PromptTemplate],
) -> Profile:
    """Generate a synthetic investor profile."""
    firm = random.choice(FIRMS)
    location = random.choice(LOCATIONS)
    sectors = random.sample(SECTORS, k=random.randint(2, 5))
    stages = random.sample(STAGES, k=random.randint(2, 4))
    
    # Generate check size range
    min_size = random.choice([25_000, 50_000, 100_000, 250_000, 500_000])
    max_size = min_size * random.choice([2, 3, 4, 5, 10])
    
    headline_template = random.choice(INVESTOR_HEADLINES)
    headline = headline_template.format(firm=firm)
    
    # Generate prompts (2-3 random answers)
    num_prompts = random.randint(2, 3)
    selected_templates = random.sample(prompt_templates, min(num_prompts, len(prompt_templates)))
    prompts = [
        {
            "prompt_id": template.id,
            "content": random.choice(INVESTOR_PROMPT_ANSWERS),
        }
        for template in selected_templates
    ]
    
    return Profile(
        role="investor",
        full_name=name,
        email=email,
        headline=headline,
        location=location,
        firm=firm,
        check_size_min=min_size,
        check_size_max=max_size,
        focus_sectors=sectors,
        focus_stages=stages,
        prompts=prompts,
        verification={
            "soft_verified": random.choice([True, False]),
            "manual_reviewed": random.choice([True, False]),
            "accreditation_attested": random.choice([True, False]),
            "badges": ["verified_investor"] if random.random() > 0.5 else [],
        },
    )


def generate_founder_profile(
    session: Session,
    name: str,
    email: str,
    index: int,
    prompt_templates: List[PromptTemplate],
) -> Profile:
    """Generate a synthetic founder profile."""
    company = random.choice(COMPANY_NAMES)
    location = random.choice(LOCATIONS)
    sector = random.choice(SECTORS)
    
    headline_template = random.choice(FOUNDER_HEADLINES)
    headline = headline_template.format(company=company)
    
    # Generate company metrics
    revenue = random.choice([0, 5_000, 10_000, 25_000, 50_000, 100_000, 250_000])
    team_size = random.choice([1, 2, 3, 5, 8, 10, 15, 20])
    runway = random.choice([3, 6, 9, 12, 18, 24])
    markets = random.sample(LOCATIONS[:5], k=random.randint(1, 3))
    
    # Generate prompts (2-3 random answers)
    num_prompts = random.randint(2, 3)
    selected_templates = random.sample(prompt_templates, min(num_prompts, len(prompt_templates)))
    prompts = [
        {
            "prompt_id": template.id,
            "content": random.choice(FOUNDER_PROMPT_ANSWERS).format(
                sector=sector,
                solution=f"{sector.lower()} solutions",
                target_audience="businesses",
                problem="this challenge",
                activity="work",
                value_prop="operate",
            ),
        }
        for template in selected_templates
    ]
    
    return Profile(
        role="founder",
        full_name=name,
        email=email,
        headline=headline,
        location=location,
        company_name=company,
        company_url=f"https://www.{company.lower()}.com",
        revenue_run_rate=revenue,
        team_size=team_size,
        runway_months=runway,
        focus_markets=markets,
        prompts=prompts,
        verification={
            "soft_verified": random.choice([True, False]),
            "manual_reviewed": random.choice([True, False]),
            "accreditation_attested": False,
            "badges": [],
        },
    )


def ensure_prompt_templates(session: Session) -> None:
    """Ensure prompt templates exist in the database."""
    investor_count = list(session.exec(
        select(PromptTemplate).where(PromptTemplate.role == "investor", PromptTemplate.is_active == True)
    ).all())
    founder_count = list(session.exec(
        select(PromptTemplate).where(PromptTemplate.role == "founder", PromptTemplate.is_active == True)
    ).all())
    
    if not investor_count:
        # Create default investor prompt templates
        investor_prompts = [
            ("What gets you excited about a startup?", "mission", 1),
            ("What's your investment thesis?", "thesis", 2),
            ("What's one trait you look for in founders?", "preferences", 3),
        ]
        for text, category, order in investor_prompts:
            template = PromptTemplate(
                text=text,
                role="investor",
                category=category,
                display_order=order,
                is_active=True,
            )
            session.add(template)
    
    if not founder_count:
        # Create default founder prompt templates
        founder_prompts = [
            ("What problem are you solving?", "mission", 1),
            ("What's your company's vision?", "vision", 2),
            ("What makes your startup unique?", "differentiation", 3),
        ]
        for text, category, order in founder_prompts:
            template = PromptTemplate(
                text=text,
                role="founder",
                category=category,
                display_order=order,
                is_active=True,
            )
            session.add(template)
    
    session.commit()


def clear_existing_data(session: Session) -> None:
    """Clear existing synthetic test data (keeps your real account)."""
    from app.models.match import Like, Match
    from app.models.message import Message
    
    print("Clearing existing test data...")
    
    # Delete in correct order (respecting foreign keys)
    messages = session.exec(select(Message)).all()
    for msg in messages:
        session.delete(msg)
    
    likes = session.exec(select(Like)).all()
    for like in likes:
        session.delete(like)
    
    matches = session.exec(select(Match)).all()
    for match in matches:
        session.delete(match)
    
    # Delete synthetic profiles and users (keep real ones - identified by email domain)
    synthetic_profiles = session.exec(
        select(Profile).where(Profile.email.like("%@synthetic.test"))
    ).all()
    
    for profile in synthetic_profiles:
        # Delete associated user
        user = session.exec(
            select(User).where(User.profile_id == profile.id)
        ).first()
        if user:
            session.delete(user)
        session.delete(profile)
    
    session.commit()
    print(f"Cleared {len(synthetic_profiles)} synthetic profiles and users")


def main():
    parser = argparse.ArgumentParser(description="Generate synthetic test data")
    parser.add_argument(
        "--investors",
        type=int,
        default=20,
        help="Number of investor profiles to generate (default: 20)",
    )
    parser.add_argument(
        "--founders",
        type=int,
        default=50,
        help="Number of founder profiles to generate (default: 50)",
    )
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Clear existing synthetic data before generating new data",
    )
    
    args = parser.parse_args()
    
    with Session(engine) as session:
        # Ensure prompt templates exist
        print("Ensuring prompt templates exist...")
        ensure_prompt_templates(session)
        
        # Clear existing data if requested
        if args.clear:
            clear_existing_data(session)
        
        # Get prompt templates
        investor_templates = get_prompt_templates(session, "investor")
        founder_templates = get_prompt_templates(session, "founder")
        
        if not investor_templates or not founder_templates:
            print("ERROR: No prompt templates found. Please seed prompt templates first.")
            return
        
        print(f"\nGenerating {args.investors} investor profiles...")
        investors_created = 0
        
        for i in range(args.investors):
            name = INVESTOR_NAMES[i % len(INVESTOR_NAMES)]
            email = f"investor{i+1}@synthetic.test"
            
            # Check if already exists
            existing = session.exec(select(Profile).where(Profile.email == email)).first()
            if existing:
                print(f"  Skipping {name} (already exists)")
                continue
            
            profile = generate_investor_profile(session, name, email, i, investor_templates)
            session.add(profile)
            session.flush()
            
            # Create associated user account
            user = User(
                email=email,
                password_hash=get_password_hash("password123"),  # Default password for test accounts
                profile_id=profile.id,
                is_active=True,
                is_verified=True,  # Auto-verify synthetic accounts
            )
            session.add(user)
            
            investors_created += 1
            if (i + 1) % 5 == 0:
                print(f"  Created {i + 1}/{args.investors} investors...")
        
        session.commit()
        print(f"✅ Created {investors_created} investor profiles\n")
        
        print(f"Generating {args.founders} founder profiles...")
        founders_created = 0
        
        for i in range(args.founders):
            name = FOUNDER_NAMES[i % len(FOUNDER_NAMES)]
            email = f"founder{i+1}@synthetic.test"
            
            # Check if already exists
            existing = session.exec(select(Profile).where(Profile.email == email)).first()
            if existing:
                print(f"  Skipping {name} (already exists)")
                continue
            
            profile = generate_founder_profile(session, name, email, i, founder_templates)
            session.add(profile)
            session.flush()
            
            # Create associated user account
            user = User(
                email=email,
                password_hash=get_password_hash("password123"),  # Default password for test accounts
                profile_id=profile.id,
                is_active=True,
                is_verified=True,  # Auto-verify synthetic accounts
            )
            session.add(user)
            
            founders_created += 1
            if (i + 1) % 10 == 0:
                print(f"  Created {i + 1}/{args.founders} founders...")
        
        session.commit()
        print(f"✅ Created {founders_created} founder profiles\n")
        
        print("=" * 60)
        print(f"✅ Successfully generated synthetic test data!")
        print(f"   - {investors_created} investors")
        print(f"   - {founders_created} founders")
        print(f"\nAll test accounts use password: password123")
        print(f"Test emails format: investor1@synthetic.test, founder1@synthetic.test")
        print("=" * 60)


if __name__ == "__main__":
    main()

