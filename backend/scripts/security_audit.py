#!/usr/bin/env python3
"""Security audit script to check for common security issues."""

import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.config import settings


def check_secret_key():
    """Check if secret key is changed from default."""
    default_key = "your-secret-key-change-in-production"
    if settings.secret_key == default_key:
        print("❌ SECURITY ISSUE: SECRET_KEY is still using default value!")
        print("   Change SECRET_KEY in .env file to a strong random value")
        return False
    print("✅ SECRET_KEY is configured")
    return True


def check_allowed_hosts():
    """Check if allowed hosts are configured."""
    if "*" in settings.allowed_hosts:
        print("⚠️  WARNING: ALLOWED_HOSTS includes '*' (allows all hosts)")
        print("   Consider restricting to specific domains in production")
        return False
    print("✅ ALLOWED_HOSTS is configured")
    return True


def check_database_ssl():
    """Check if database URL suggests SSL."""
    if settings.database_url.startswith("postgresql://") and "?sslmode=require" not in settings.database_url:
        print("⚠️  WARNING: Database connection may not use SSL")
        print("   Consider adding ?sslmode=require for production")
        return False
    print("✅ Database SSL configuration appears correct")
    return True


def check_rate_limiting():
    """Check if rate limiting is enabled."""
    if not settings.rate_limit_enabled:
        print("⚠️  WARNING: Rate limiting is disabled")
        print("   Enable rate limiting in production")
        return False
    print("✅ Rate limiting is enabled")
    return True


def check_cors_config():
    """Check CORS configuration."""
    # This is checked in main.py, just warn here
    print("ℹ️  INFO: Review CORS configuration in app/main.py")
    print("   Ensure only trusted origins are allowed in production")
    return True


def check_env_file():
    """Check if .env file exists and has sensitive values."""
    env_file = Path(".env")
    if env_file.exists():
        print("✅ .env file exists")
        
        # Check if .env is in .gitignore
        gitignore = Path(".gitignore")
        if gitignore.exists():
            content = gitignore.read_text()
            if ".env" in content:
                print("✅ .env is in .gitignore")
            else:
                print("⚠️  WARNING: .env is not in .gitignore")
                return False
    else:
        print("⚠️  WARNING: .env file not found")
        print("   Create .env from .env.example")
    return True


def main():
    """Run security audit checks."""
    print("=" * 60)
    print("SECURITY AUDIT")
    print("=" * 60)
    print()
    
    checks = [
        ("Secret Key", check_secret_key),
        ("Allowed Hosts", check_allowed_hosts),
        ("Database SSL", check_database_ssl),
        ("Rate Limiting", check_rate_limiting),
        ("CORS Config", check_cors_config),
        (".env File", check_env_file),
    ]
    
    results = []
    for name, check_func in checks:
        print(f"\n[{name}]")
        try:
            result = check_func()
            results.append((name, result))
        except Exception as e:
            print(f"❌ Error checking {name}: {e}")
            results.append((name, False))
    
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    print(f"\nPassed: {passed}/{total}")
    
    if passed < total:
        print("\n⚠️  Some security checks failed. Review the issues above.")
        sys.exit(1)
    else:
        print("\n✅ All security checks passed!")
        sys.exit(0)


if __name__ == "__main__":
    main()

