# EC2 HTTPS + CORS Deployment Guide

## Complete solution for deploying backend with HTTPS and Vercel frontend CORS

This guide provides a complete, tested solution for:

- ✅ Setting up HTTPS on EC2 using nginx and Let's Encrypt
- ✅ Configuring CORS to support Vercel preview deployments (wildcard patterns)
- ✅ Fixing Mixed Content errors (HTTPS frontend → HTTP backend)
- ✅ Handling dynamic Vercel preview URLs

---

## ⚡ Quick Start (Amazon Linux 2)

If you're on **Amazon Linux 2**, here's the condensed version:

**Prerequisites:**

1. ✅ Set up SSH access (see Step 0)
2. ✅ Connect to your EC2 instance

**On EC2 instance:**

```bash
# 1. Update system
sudo yum update -y

# 2. Install nginx
sudo yum install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# 3. Install Certbot (requires EPEL)
sudo amazon-linux-extras install epel -y
sudo yum install -y certbot python3-certbot-nginx

# 4. Create certbot webroot
sudo mkdir -p /var/www/certbot
sudo chown -R nginx:nginx /var/www/certbot

# 5. Setup nginx config (see Step 3)
# 6. Get SSL certificate (see Step 4)
# 7. Configure backend CORS (see Step 5)
```

**Key differences for Amazon Linux:**

- Uses `yum` instead of `apt`
- Uses `nginx:nginx` user/group instead of `www-data:www-data`
- Requires EPEL repository for Certbot: `sudo amazon-linux-extras install epel -y`
- nginx config location: `/etc/nginx/conf.d/` (same as Ubuntu)

---

## Prerequisites

- EC2 instance running **Amazon Linux 2** (or Ubuntu - instructions included)
- AWS account with EC2 instance launched
- Domain or subdomain (we use DuckDNS - free!)
- Backend API running on port 8000 (e.g., Docker Compose)
- AWS Security Groups configured for ports 80 and 443

---

## Step 0: SSH to EC2

**Connect to your EC2 instance:**

```bash
# If you have a .pem file from AWS:
chmod 400 ~/Downloads/your-key.pem
ssh -i ~/Downloads/your-key.pem ec2-user@YOUR_EC2_PUBLIC_IP

# If you're using your own SSH key:
ssh -i ~/.ssh/id_rsa ec2-user@YOUR_EC2_PUBLIC_IP

# Replace YOUR_EC2_PUBLIC_IP with your actual EC2 IP
# For Ubuntu, use 'ubuntu' instead of 'ec2-user'
```

---

## Step 1: Set up DuckDNS (Free Subdomain)

### 1.1 Create DuckDNS account

1. Go to https://www.duckdns.org/
2. Sign in with GitHub/Google
3. Create a subdomain (e.g., `myapp-api.duckdns.org`)
4. Copy your **token** (you'll need it)

### 1.2 Update DNS record

On DuckDNS website, add your EC2 public IP to the subdomain.

**OR** via API (run on EC2):

```bash
# Replace with your values
SUBDOMAIN="myapp-api"
TOKEN="your-duckdns-token"
PUBLIC_IP=$(curl -s https://checkip.amazonaws.com)

curl "https://www.duckdns.org/update?domains=$SUBDOMAIN&token=$TOKEN&ip=$PUBLIC_IP"
```

### 1.3 Verify DNS

```bash
dig +short myapp-api.duckdns.org
# Should return your EC2 IP
```

---

## Step 2: Install nginx and Certbot

### 2.1 Install nginx (Amazon Linux 2)

```bash
# Amazon Linux 2
sudo yum update -y
sudo yum install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# Verify nginx is running
sudo systemctl status nginx
```

**For Ubuntu/Debian:**

```bash
sudo apt update
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 2.2 Install Certbot (Amazon Linux 2)

Amazon Linux 2 requires EPEL repository for certbot:

```bash
# Amazon Linux 2 - Install EPEL and Certbot
sudo amazon-linux-extras install epel -y
sudo yum install -y certbot python3-certbot-nginx

# Verify installation
certbot --version
```

**For Ubuntu/Debian:**

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 2.3 Create webroot for Let's Encrypt

```bash
# Amazon Linux 2
sudo mkdir -p /var/www/certbot
sudo chown -R nginx:nginx /var/www/certbot

# Verify permissions
ls -la /var/www/certbot
```

**For Ubuntu/Debian:**

```bash
sudo mkdir -p /var/www/certbot
sudo chown -R www-data:www-data /var/www/certbot
```

---

## Step 3: Create nginx Configuration

### 3.1 Create config file

```bash
sudo nano /etc/nginx/conf.d/backend.conf
```

### 3.2 Paste this configuration

**Replace `myapp-api.duckdns.org` with your subdomain:**

```nginx
# Upstream backend server
upstream backend {
    server localhost:8000;
}

# HTTP server - redirect to HTTPS
server {
    listen 80;
    server_name myapp-api.duckdns.org;

    # Allow Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl;
    http2 on;
    server_name myapp-api.duckdns.org;

    # SSL certificates (will be added by Certbot)
    ssl_certificate /etc/letsencrypt/live/myapp-api.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/myapp-api.duckdns.org/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Increase client body size for file uploads
    client_max_body_size 10M;

    # Proxy settings
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Port $server_port;

    # WebSocket support (if needed)
    location /api/v1/realtime/ws/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket timeouts
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    # API endpoints
    location /api/ {
        # Handle CORS preflight requests
        if ($request_method = OPTIONS) {
            add_header 'Access-Control-Allow-Origin' '$http_origin' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS, PATCH' always;
            add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With' always;
            add_header 'Access-Control-Allow-Credentials' 'true' always;
            add_header 'Access-Control-Max-Age' 3600 always;
            add_header 'Content-Length' 0;
            add_header 'Content-Type' 'text/plain charset=UTF-8';
            return 204;
        }

        # Pass through to backend
        proxy_pass http://backend;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;

        # Add CORS headers for actual requests
        add_header 'Access-Control-Allow-Origin' '$http_origin' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
    }

    # Health check
    location /healthz {
        proxy_pass http://backend;
        access_log off;
    }
}
```

### 3.3 Temporary HTTP-only config for initial certbot run

**Before getting the SSL certificate, temporarily use this:**

```bash
sudo nano /etc/nginx/conf.d/backend.conf
```

```nginx
# Upstream backend server
upstream backend {
    server localhost:8000;
}

# HTTP server (temporary - for certbot)
server {
    listen 80;
    server_name myapp-api.duckdns.org;

    # Allow Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Pass through to backend (temporary)
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /healthz {
        proxy_pass http://backend;
    }
}
```

### 3.4 Test and reload nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 4: Get SSL Certificate

### 4.1 Obtain certificate

```bash
# Replace with your email and subdomain
sudo certbot certonly --webroot \
  -w /var/www/certbot \
  -d myapp-api.duckdns.org \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email
```

### 4.2 If certbot fails with "connection refused" (Amazon Linux)

**Common issues on Amazon Linux:**

1. **nginx not running:**

```bash
sudo systemctl status nginx
sudo systemctl start nginx
```

2. **Firewall blocking (though AWS Security Groups should handle this):**

```bash
# Check if firewalld is active (usually not on Amazon Linux)
sudo systemctl status firewalld

# If active and blocking, allow ports (optional - AWS Security Groups handle this)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

3. **Backend not running:**

```bash
# Check if backend is running
curl http://localhost:8000/healthz

# If using Docker Compose
docker-compose ps
```

4. **DNS not resolving:**

```bash
dig +short myapp-api.duckdns.org
# Should return your EC2 public IP
```

5. **nginx config errors:**

```bash
sudo nginx -t
# Fix any errors before running certbot
```

### 4.3 Replace nginx config with full HTTPS version

After successful certificate generation, use the full HTTPS config from Step 3.2:

```bash
sudo nano /etc/nginx/conf.d/backend.conf
# Paste the full HTTPS config from Step 3.2
sudo nginx -t
sudo systemctl reload nginx
```

### 4.4 Test HTTPS

```bash
curl https://myapp-api.duckdns.org/healthz
# Should return {"status":"ok"} or similar
```

---

## Step 5: Backend CORS Configuration

### 5.1 FastAPI CORS Middleware Setup

**File: `backend/app/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

def create_application() -> FastAPI:
    app = FastAPI(...)

    # ... other middleware ...

    # CORS configuration - MUST be added LAST (outermost layer)
    # Filter out wildcard patterns from exact origins
    exact_origins = [origin for origin in settings.cors_origins if "*" not in origin]
    # Extract wildcard patterns for regex matching
    wildcard_patterns = [origin for origin in settings.cors_origins if "*" in origin]

    # Convert wildcard patterns to regex (e.g., "https://*.vercel.app" -> r"https://.*\.vercel\.app")
    origin_regex_patterns = []
    for pattern in wildcard_patterns:
        # Convert wildcard to regex: escape dots, replace * with .*
        regex = pattern.replace(".", r"\.").replace("*", ".*")
        origin_regex_patterns.append(regex)

    # Combine regex patterns if any exist
    origin_regex = "|".join([f"^{p}$" for p in origin_regex_patterns]) if origin_regex_patterns else None

    app.add_middleware(
        CORSMiddleware,
        allow_origins=exact_origins if exact_origins else [],
        allow_origin_regex=origin_regex,  # This handles wildcard patterns!
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    return app
```

### 5.2 Settings Configuration

**File: `backend/app/core/config.py`**

```python
from pydantic import field_validator
from pydantic_settings import BaseSettings
import json
from typing import List, Union

class Settings(BaseSettings):
    # ... other settings ...

    # CORS Configuration
    # Supports exact origins and wildcard patterns (e.g., "https://*.vercel.app")
    cors_origins: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://*.vercel.app",  # Allow all Vercel preview deployments
    ]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        """Parse CORS origins from JSON string or comma-separated string."""
        if isinstance(v, str):
            # Try parsing as JSON first
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except (json.JSONDecodeError, TypeError):
                pass
            # Fall back to comma-separated
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v
```

### 5.3 Optional: CORS Utility Functions

**File: `backend/app/core/cors.py`** (optional, for custom CORS logic)

```python
"""CORS utility functions for consistent header generation."""

import re
from typing import Dict, List, Optional
from fastapi import Request
from app.core.config import settings

def matches_pattern(origin: str, pattern: str) -> bool:
    """Check if an origin matches a wildcard pattern."""
    regex_pattern = pattern.replace(".", r"\.").replace("*", ".*")
    return bool(re.match(f"^{regex_pattern}$", origin))

def is_origin_allowed(origin: str, allowed_origins: Optional[List[str]] = None) -> bool:
    """Check if an origin is allowed for CORS."""
    if not origin:
        return False

    origins = allowed_origins or settings.cors_origins

    if "*" in origins:
        return True

    for allowed_origin in origins:
        if allowed_origin == origin:
            return True
        if "*" in allowed_origin and matches_pattern(origin, allowed_origin):
            return True

    return False
```

---

## Step 6: Docker Compose Environment Variables

### 6.1 Update docker-compose.prod.yml

```yaml
services:
  backend:
    image: your-backend-image
    environment:
      # ... other vars ...
      # CRITICAL: Pass CORS_ORIGINS with wildcard support
      CORS_ORIGINS: ${CORS_ORIGINS:-["https://*.vercel.app","http://localhost:3000","http://127.0.0.1:3000"]}
    ports:
      - "8000:8000"
```

### 6.2 Update .env file on EC2

```bash
# .env file on EC2
CORS_ORIGINS=["https://*.vercel.app","http://localhost:3000","http://127.0.0.1:3000"]
```

**Important:** Use JSON array format or comma-separated string. Both work thanks to the validator.

---

## Step 7: Vercel Frontend Configuration

### 7.1 Update API base URL

**File: `frontend/.env.production` or `frontend/.env.local`**

```env
NEXT_PUBLIC_API_URL=https://myapp-api.duckdns.org/api
```

### 7.2 Vercel Environment Variables

In Vercel dashboard → Project Settings → Environment Variables:

```
NEXT_PUBLIC_API_URL=https://myapp-api.duckdns.org/api
```

---

## Step 8: Test Everything

### 8.1 Test HTTPS endpoint

```bash
curl https://myapp-api.duckdns.org/healthz
```

### 8.2 Test CORS preflight

```bash
curl -X OPTIONS https://myapp-api.duckdns.org/api/auth/signup \
  -H "Origin: https://myapp-zeta.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v
```

**Expected response:**

```
< HTTP/2 204
< access-control-allow-origin: https://myapp-zeta.vercel.app
< access-control-allow-methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
< access-control-allow-credentials: true
```

### 8.3 Test from browser console (Vercel frontend)

```javascript
fetch("https://myapp-api.duckdns.org/api/healthz", {
  credentials: "include",
})
  .then((r) => r.json())
  .then(console.log);
```

---

## Step 9: Auto-renewal SSL Certificate

### 9.1 Test renewal

```bash
sudo certbot renew --dry-run
```

### 9.2 Auto-renewal (Amazon Linux)

Certbot usually sets up auto-renewal automatically. Verify:

```bash
# Check if renewal timer is set up
sudo systemctl status certbot-renew.timer

# Enable if not running (Amazon Linux)
sudo systemctl enable certbot-renew.timer
sudo systemctl start certbot-renew.timer

# Test renewal manually
sudo certbot renew --dry-run
```

**Alternative: Manual cron job (if timer doesn't work):**

```bash
# Edit crontab
sudo crontab -e

# Add this line (runs daily at 2 AM):
0 2 * * * /usr/bin/certbot renew --quiet && /usr/bin/systemctl reload nginx
```

---

## Common Issues & Fixes

### Issue 1: `502 Bad Gateway`

**Cause:** Backend not running or wrong port
**Fix:**

```bash
# Check if backend is running
curl http://localhost:8000/healthz

# Check nginx upstream
sudo nginx -t
```

### Issue 2: `Mixed Content Error`

**Cause:** Frontend on HTTPS, backend on HTTP
**Fix:** Follow Step 4 to get SSL certificate and use HTTPS nginx config

### Issue 3: `CORS Policy Error: No 'Access-Control-Allow-Origin' header`

**Cause:** Vercel preview URL not in CORS_ORIGINS
**Fix:**

- Add `"https://*.vercel.app"` to `CORS_ORIGINS` (wildcard pattern)
- Ensure `allow_origin_regex` is configured in FastAPI CORS middleware
- Restart backend after changing CORS_ORIGINS

### Issue 4: `nginx: cannot load certificate`

**Cause:** Certificate not yet obtained
**Fix:** Use temporary HTTP config first, then get cert, then switch to HTTPS config

### Issue 5: `listen ... http2` deprecated warning

**Fix:** Use `listen 443 ssl;` followed by `http2 on;` (not `listen 443 ssl http2;`)

### Issue 6: Backend crashes on startup (CORS_ORIGINS error)

**Cause:** CORS_ORIGINS not set in docker-compose
**Fix:** Add `CORS_ORIGINS: ${CORS_ORIGINS:-[]}` with a default value

### Issue 7: DuckDNS subdomain not resolving

**Fix:**

```bash
# Update IP manually (Amazon Linux)
SUBDOMAIN="myapp-api"
TOKEN="your-duckdns-token"
PUBLIC_IP=$(curl -s https://checkip.amazonaws.com)

curl "https://www.duckdns.org/update?domains=$SUBDOMAIN&token=$TOKEN&ip=$PUBLIC_IP"

# Verify
dig +short myapp-api.duckdns.org
```

### Issue 8: `certbot: command not found` (Amazon Linux)

**Cause:** EPEL repository not installed
**Fix:**

```bash
sudo amazon-linux-extras install epel -y
sudo yum install -y certbot python3-certbot-nginx
```

### Issue 9: nginx config file location different (Amazon Linux)

**Note:** Amazon Linux uses `/etc/nginx/conf.d/` same as Ubuntu, but main config is at `/etc/nginx/nginx.conf`

**Verify nginx config location:**

```bash
# Check main config
sudo nginx -T | grep "include"

# Should show: include /etc/nginx/conf.d/*.conf;
```

---

## Quick Checklist

- [ ] DuckDNS subdomain created and pointing to EC2 IP
- [ ] nginx installed and configured
- [ ] SSL certificate obtained via Certbot
- [ ] Full HTTPS nginx config applied
- [ ] Backend CORS middleware configured with `allow_origin_regex`
- [ ] `CORS_ORIGINS` includes `"https://*.vercel.app"` wildcard
- [ ] Docker Compose has `CORS_ORIGINS` environment variable
- [ ] Frontend `NEXT_PUBLIC_API_URL` points to HTTPS backend
- [ ] AWS Security Groups allow ports 80 and 443
- [ ] Test: `curl https://your-subdomain.duckdns.org/healthz`
- [ ] Test: CORS preflight request succeeds

---

## Summary

**Key Points:**

1. **Wildcard CORS** is essential for Vercel preview deployments (`https://*.vercel.app`)
2. Use `allow_origin_regex` in FastAPI CORS middleware for wildcard patterns
3. nginx handles CORS preflight OPTIONS requests at the proxy layer
4. SSL certificate must be obtained before using full HTTPS config
5. Always test with `curl` before testing from browser

**Why This Works:**

- Vercel generates random preview URLs (e.g., `myapp-abc123.vercel.app`)
- You can't know these URLs in advance
- Wildcard pattern `https://*.vercel.app` matches ALL Vercel preview URLs
- FastAPI's `allow_origin_regex` handles the pattern matching
- nginx adds CORS headers as a backup layer

---

## Additional Resources

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [nginx CORS Configuration](https://enable-cors.org/server_nginx.html)
- [FastAPI CORS Middleware](https://fastapi.tiangolo.com/tutorial/cors/)
- [DuckDNS Setup Guide](https://www.duckdns.org/install.jsp)

---

**Last Updated:** Based on production deployment fixes
**Tested on:** EC2 **Amazon Linux 2** (primary), Ubuntu 20.04, Vercel frontend, FastAPI backend

**Note:** This guide is optimized for Amazon Linux 2, with Ubuntu instructions provided as alternatives where they differ.
