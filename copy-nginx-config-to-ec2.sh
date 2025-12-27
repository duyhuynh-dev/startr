#!/bin/bash
# Script to help copy the correct nginx config to EC2

echo "📋 Complete nginx config with HTTPS"
echo "====================================="
echo ""
echo "Copy this entire block and run it ON EC2:"
echo ""
echo "----------------------------------------"
cat << 'EOF'

cat > /tmp/backend.conf << 'NGINXCONF'
# Upstream backend server
upstream backend {
    server localhost:8000;
}

# HTTP server - redirect to HTTPS
server {
    listen 80;
    server_name startr-api.duckdns.org;
    
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
    server_name startr-api.duckdns.org;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/startr-api.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/startr-api.duckdns.org/privkey.pem;

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

    # WebSocket support
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
        proxy_pass http://backend;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Health check
    location /healthz {
        proxy_pass http://backend;
        access_log off;
    }
}
NGINXCONF

sudo cp /tmp/backend.conf /etc/nginx/conf.d/backend.conf
sudo nginx -t
sudo systemctl reload nginx
sudo ss -tlnp | grep :443
curl https://startr-api.duckdns.org/healthz

EOF
echo "----------------------------------------"







