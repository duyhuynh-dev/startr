#!/usr/bin/env python3
"""Check for dependency vulnerabilities."""

import subprocess
import sys


def check_safety():
    """Check dependencies using safety."""
    print("Checking dependencies with safety...")
    try:
        result = subprocess.run(
            ["safety", "check"],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            print("✅ No known vulnerabilities found")
            return True
        else:
            print("⚠️  Vulnerabilities found:")
            print(result.stdout)
            return False
    except FileNotFoundError:
        print("ℹ️  safety not installed. Install with: pip install safety")
        return None


def check_pip_audit():
    """Check dependencies using pip-audit."""
    print("\nChecking dependencies with pip-audit...")
    try:
        result = subprocess.run(
            ["pip-audit"],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            print("✅ No known vulnerabilities found")
            return True
        else:
            print("⚠️  Vulnerabilities found:")
            print(result.stdout)
            return False
    except FileNotFoundError:
        print("ℹ️  pip-audit not installed. Install with: pip install pip-audit")
        return None


def main():
    """Run dependency vulnerability checks."""
    print("=" * 60)
    print("DEPENDENCY VULNERABILITY SCAN")
    print("=" * 60)
    print()
    
    safety_result = check_safety()
    audit_result = check_pip_audit()
    
    if safety_result is None and audit_result is None:
        print("\n⚠️  No vulnerability scanners installed.")
        print("Install one of:")
        print("  pip install safety")
        print("  pip install pip-audit")
        sys.exit(1)
    
    if safety_result is False or audit_result is False:
        print("\n❌ Vulnerabilities detected. Update dependencies.")
        sys.exit(1)
    
    print("\n✅ Dependency check complete")


if __name__ == "__main__":
    main()

