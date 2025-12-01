# Security Hardening Guide

This document outlines security measures implemented and recommendations for production.

## 🔒 Security Features Implemented

### 1. Security Headers

**Location:** `app/core/security_middleware.py`

Security headers are automatically added to all responses:

- ✅ `X-Content-Type-Options: nosniff` - Prevents MIME type sniffing
- ✅ `X-Frame-Options: DENY` - Prevents clickjacking attacks
- ✅ `X-XSS-Protection: 1; mode=block` - Enables XSS protection
- ✅ `Referrer-Policy: strict-origin-when-cross-origin` - Controls referrer information
- ✅ `Permissions-Policy` - Restricts browser features
- ✅ `Content-Security-Policy` - Restricts resource loading

**Note:** CSP is currently permissive for Swagger UI. Tighten for production.

### 2. Input Sanitization

**Location:** `app/core/security_middleware.py`

Middleware automatically detects and blocks:
- ✅ SQL injection patterns
- ✅ XSS attack patterns
- ✅ Suspicious query parameters

### 3. Authentication & Authorization

- ✅ JWT token-based authentication
- ✅ Password hashing with bcrypt
- ✅ Token expiration and refresh
- ✅ OAuth 2.0 integration (LinkedIn, Google, Firebase)
- ✅ Password reset with secure tokens
- ✅ Email verification flow

### 4. Rate Limiting

**Location:** `app/core/rate_limit.py`

- ✅ Redis-backed rate limiting
- ✅ Configurable limits per endpoint
- ✅ IP-based rate limiting
- ✅ Different limits for authenticated users

### 5. SQL Injection Prevention

- ✅ Using SQLModel ORM (parameterized queries)
- ✅ No raw SQL queries
- ✅ Input validation with Pydantic

### 6. CORS Configuration

Configured in `app/main.py` - currently allows all origins. **Tighten for production.**

### 7. File Upload Security

**Location:** `app/services/storage_service.py`

- ✅ File type validation
- ✅ File size limits
- ✅ Image optimization
- ✅ Secure file paths

## 🔍 Security Audit Checklist

### Production Readiness

- [ ] Change `SECRET_KEY` to strong random value
- [ ] Configure `ALLOWED_HOSTS` properly
- [ ] Tighten CORS configuration
- [ ] Review and tighten CSP headers
- [ ] Enable HTTPS only (force redirect)
- [ ] Configure secure session cookies
- [ ] Review rate limiting limits
- [ ] Enable SQL query logging in development only
- [ ] Configure secure headers for production

### Dependency Security

Run dependency vulnerability scans regularly:

```bash
# Install safety
pip install safety

# Scan dependencies
safety check

# Or use pip-audit
pip install pip-audit
pip-audit
```

### Database Security

- [ ] Use strong database passwords
- [ ] Enable SSL/TLS for database connections
- [ ] Restrict database network access
- [ ] Regular backups
- [ ] Review database user permissions

### Environment Variables

- [ ] All secrets in environment variables (not hardcoded)
- [ ] `.env` file in `.gitignore`
- [ ] Use secrets management in production (AWS Secrets Manager, etc.)
- [ ] Rotate secrets regularly

### API Security

- [ ] All endpoints require authentication (except public ones)
- [ ] Admin endpoints protected
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] Output sanitization where needed

### Logging & Monitoring

- [ ] Log security events (failed logins, suspicious activity)
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Monitor for suspicious patterns
- [ ] Set up alerting

## 🛡️ Security Best Practices

### Password Requirements

Currently enforced:
- Minimum 8 characters (via Pydantic validation)
- Bcrypt hashing (adaptive cost factor)

**Recommendation:** Add complexity requirements (uppercase, lowercase, numbers, special chars)

### Token Security

- Access tokens expire in 30 minutes
- Refresh tokens expire in 7 days
- Tokens signed with HS256 algorithm
- Secret key must be strong (change from default)

### OAuth Security

- State parameter for CSRF protection
- Token validation
- User ID verification

### File Upload Security

- File type whitelist
- File size limits (10MB default)
- Image optimization to prevent malicious files
- Signed URLs for secure access

## 🔧 Security Hardening Scripts

See `scripts/security_audit.py` for automated security checks.

## 📚 Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [FastAPI Security Best Practices](https://fastapi.tiangolo.com/advanced/security/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)

## 🚨 Incident Response

If a security issue is discovered:

1. **Immediate:** Disable affected endpoints if critical
2. **Assess:** Determine scope and impact
3. **Mitigate:** Apply fixes and patches
4. **Notify:** Alert affected users if needed
5. **Document:** Record incident and resolution

## 🔄 Regular Security Tasks

### Weekly
- Review error logs for suspicious patterns
- Check for failed login attempts

### Monthly
- Run dependency vulnerability scans
- Review access logs
- Update dependencies with security patches

### Quarterly
- Full security audit
- Penetration testing (consider)
- Review and update security policies

