"""
Fix user profile links - links existing profiles to users by email.

This script fixes cases where:
- User exists but profile_id is null
- Profile exists but isn't linked to user
- Profile_id points to non-existent profile

Usage:
    python -m scripts.fix_user_profile_link [--email user@example.com]
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlmodel import Session, select

from app.db.session import engine
from app.models.user import User
from app.models.profile import Profile


def fix_user_profile_link(session: Session, email: str) -> bool:
    """Fix profile link for a specific user by email."""
    # Find user
    user = session.exec(select(User).where(User.email == email)).first()
    if not user:
        print(f"❌ User not found: {email}")
        return False
    
    print(f"✅ Found user: {user.id}")
    print(f"   Current profile_id: {user.profile_id}")
    
    # Check if current profile_id is valid
    if user.profile_id:
        profile = session.get(Profile, user.profile_id)
        if profile:
            print(f"✅ Profile is already correctly linked!")
            print(f"   Profile ID: {profile.id}")
            print(f"   Full Name: {profile.full_name}")
            print(f"   Role: {profile.role}")
            return True
        else:
            print(f"⚠️  Profile ID {user.profile_id} doesn't exist - will fix...")
    
    # Find profile by email
    profile = session.exec(select(Profile).where(Profile.email == email)).first()
    if not profile:
        print(f"❌ No profile found with email: {email}")
        print(f"   User needs to complete onboarding first")
        return False
    
    print(f"✅ Found profile: {profile.id}")
    print(f"   Full Name: {profile.full_name}")
    print(f"   Role: {profile.role}")
    
    # Link profile to user
    user.profile_id = profile.id
    session.add(user)
    session.commit()
    
    print(f"✅ Linked profile {profile.id} to user {user.id}")
    return True


def main():
    parser = argparse.ArgumentParser(description="Fix user profile links")
    parser.add_argument(
        "--email",
        type=str,
        help="Email of user to fix (default: dhuynh@wesleyan.edu)",
        default="dhuynh@wesleyan.edu",
    )
    
    args = parser.parse_args()
    
    with Session(engine) as session:
        print(f"Fixing profile link for: {args.email}")
        print("=" * 60)
        
        success = fix_user_profile_link(session, args.email)
        
        print("=" * 60)
        if success:
            print("✅ Profile link fixed successfully!")
        else:
            print("❌ Could not fix profile link. Check the errors above.")


if __name__ == "__main__":
    main()

