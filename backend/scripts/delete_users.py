"""Script to delete specific test users from the database."""

import sys
sys.path.insert(0, '.')

from sqlalchemy import text
from app.db.session import engine

# Users to delete
EMAILS_TO_DELETE = [
    "huynhduymath@gmail.com",
    "dhuynh@wesleyan.edu",
    "duy.hnb11@gmail.com",
]

def delete_users():
    """Delete specified users and their related data."""
    
    with engine.connect() as conn:
        for email in EMAILS_TO_DELETE:
            print(f"\n🗑️  Deleting user: {email}")
            
            try:
                # Get profile ID first
                result = conn.execute(
                    text("SELECT id FROM profiles WHERE email = :email"),
                    {"email": email}
                )
                profile_row = result.fetchone()
                profile_id = profile_row[0] if profile_row else None
                
                if profile_id:
                    print(f"   Found profile ID: {profile_id}")
                    
                    # 1. Delete messages first (references matches)
                    try:
                        # Get all match IDs for this profile
                        match_result = conn.execute(
                            text("SELECT id FROM matches WHERE founder_id = :pid OR investor_id = :pid"),
                            {"pid": profile_id}
                        )
                        match_ids = [row[0] for row in match_result.fetchall()]
                        
                        if match_ids:
                            for match_id in match_ids:
                                result = conn.execute(
                                    text("DELETE FROM messages WHERE match_id = :mid"),
                                    {"mid": match_id}
                                )
                                if result.rowcount > 0:
                                    print(f"   Deleted {result.rowcount} messages from match {match_id[:8]}...")
                    except Exception as e:
                        print(f"   Note: {e}")
                    
                    # 2. Delete likes
                    try:
                        result = conn.execute(
                            text("DELETE FROM likes WHERE sender_id = :pid OR recipient_id = :pid"),
                            {"pid": profile_id}
                        )
                        if result.rowcount > 0:
                            print(f"   Deleted {result.rowcount} likes")
                    except Exception as e:
                        print(f"   Note: {e}")
                    
                    # 3. Delete matches (after messages)
                    try:
                        result = conn.execute(
                            text("DELETE FROM matches WHERE founder_id = :pid OR investor_id = :pid"),
                            {"pid": profile_id}
                        )
                        if result.rowcount > 0:
                            print(f"   Deleted {result.rowcount} matches")
                    except Exception as e:
                        print(f"   Note: {e}")
                    
                    # 4. Delete passes
                    try:
                        result = conn.execute(
                            text("DELETE FROM passes WHERE user_id = :pid OR passed_profile_id = :pid"),
                            {"pid": profile_id}
                        )
                        if result.rowcount > 0:
                            print(f"   Deleted {result.rowcount} passes")
                    except Exception as e:
                        print(f"   Note: {e}")
                    
                    # 5. Delete profile_views
                    try:
                        result = conn.execute(
                            text("DELETE FROM profile_views WHERE viewer_id = :pid OR viewed_profile_id = :pid"),
                            {"pid": profile_id}
                        )
                        if result.rowcount > 0:
                            print(f"   Deleted {result.rowcount} profile views")
                    except Exception as e:
                        print(f"   Note: {e}")
                    
                    # 6. Delete daily_limits
                    try:
                        result = conn.execute(
                            text("DELETE FROM daily_limits WHERE profile_id = :pid"),
                            {"pid": profile_id}
                        )
                        if result.rowcount > 0:
                            print(f"   Deleted {result.rowcount} daily limits")
                    except Exception as e:
                        print(f"   Note: {e}")
                    
                    # 7. Delete user FIRST (before profile, due to foreign key)
                    result = conn.execute(
                        text("DELETE FROM users WHERE email = :email"),
                        {"email": email}
                    )
                    if result.rowcount > 0:
                        print(f"   ✓ Deleted user")
                    
                    # 8. Delete profile AFTER user
                    result = conn.execute(
                        text("DELETE FROM profiles WHERE id = :pid"),
                        {"pid": profile_id}
                    )
                    print(f"   ✓ Deleted profile")
                    
                else:
                    # No profile found, just try to delete user
                    result = conn.execute(
                        text("DELETE FROM users WHERE email = :email"),
                        {"email": email}
                    )
                    if result.rowcount > 0:
                        print(f"   ✓ Deleted user (no profile found)")
                    else:
                        print(f"   User not found")
                
                # Commit after each user
                conn.commit()
                
            except Exception as e:
                print(f"   ❌ Error: {e}")
                conn.rollback()
                continue
        
        print("\n" + "=" * 50)
        print("✅ Cleanup complete!")

if __name__ == "__main__":
    print("=" * 50)
    print("Deleting test users from database...")
    print("=" * 50)
    delete_users()
