#!/bin/bash
# HTTPS Setup Script for EC2 with DuckDNS
# Run this on your EC2 instance

set -e  # Exit on error

echo "🔒 HTTPS Setup Script for DuckDNS"
echo "=================================="
echo ""

# Configuration
DUCKDNS_SUBDOMAIN="startr-api"
DUCKDNS_TOKEN="e2fe5b37-1af8-4c01-bc44-f03fc24a9cac"
DUCKDNS_DOMAIN="${DUCKDNS_SUBDOMAIN}.duckdns.org"
EMAIL="your-email@example.com"  # CHANGE THIS to your email

# Get EC2 public IP
EC2_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
echo "📍 EC2 Public IP: $EC2_IP"
echo ""

# Step 1: Update DuckDNS
echo "Step 1: Updating DuckDNS..."
curl -s "https://www.duckdns.org/update?domains=${DUCKDNS_SUBDOMAIN}&token=${DUCKDNS_TOKEN}&ip=${EC2_IP}"
echo ""
echo "✅ DuckDNS updated!"
echo ""

# Wait for DNS propagation
echo "⏳ Waiting 30 seconds for DNS propagation..."
sleep 30

# Step 2: Install nginx
echo ""
echo "Step 2: Installing nginx..."
sudo dnf update -y
sudo dnf install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
echo "✅ nginx installed!"
echo ""

# Step 3: Install Certbot
echo "Step 3: Installing Certbot..."
sudo dnf install certbot python3-certbot-nginx -y
echo "✅ Certbot installed!"
echo ""

# Step 4: Create directory for Let's Encrypt
echo "Step 4: Creating directories..."
sudo mkdir -p /var/www/certbot
echo "✅ Directories created!"
echo ""

# Step 5: Configure firewall
echo "Step 5: Configuring firewall..."
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
echo "✅ Firewall configured!"
echo ""

# Step 6: Create nginx configuration
echo "Step 6: Creating nginx configuration..."
sudo tee /etc/nginx/conf.d/backend.conf > /dev/null <<NGINX_CONFIG
# Upstream backend server
upstream backend {
    server localhost:8000;
}

# HTTP server - redirect to HTTPS
server {
    listen 80;
    server_name ${DUCKDNS_DOMAIN};
    
    # Allow Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name ${DUCKDNS_DOMAIN};

    # SSL certificates (will be added by Certbot)
    ssl_certificate /etc/letsencrypt/live/${DUCKDNS_DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DUCKDNS_DOMAIN}/privkey.pem;

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
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header X-Forwarded-Host \$host;
    proxy_set_header X-Forwarded-Port \$server_port;

    # WebSocket support
    location /api/v1/realtime/ws/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
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
NGINX_CONFIG

# Test nginx configuration
sudo nginx -t
echo "✅ nginx configuration created!"
echo ""

# Step 7: Stop nginx temporarily for standalone certbot
echo "Step 7: Stopping nginx temporarily for SSL certificate..."
sudo systemctl stop nginx

# Step 8: Get SSL certificate
echo "Step 8: Getting SSL certificate from Let's Encrypt..."
echo "⚠️  IMPORTANT: Make sure port 80 is open in your EC2 Security Group!"
echo ""
read -p "Press Enter to continue with SSL certificate setup..."

sudo certbot certonly --standalone \
  -d ${DUCKDNS_DOMAIN} \
  --email ${EMAIL} \
  --agree-tos \
  --non-interactive \
  --preferred-challenges http

echo "✅ SSL certificate obtained!"
echo ""

# Step 9: Start nginx
echo "Step 9: Starting nginx..."
sudo systemctl start nginx
sudo systemctl reload nginx
echo "✅ nginx started!"
echo ""

# Step 10: Verify
echo "Step 10: Verifying setup..."
echo ""
echo "Testing HTTPS backend..."
sleep 2
curl -k https://${DUCKDNS_DOMAIN}/healthz || echo "⚠️  Backend might not be responding yet"

echo ""
echo "=================================="
echo "✅ SETUP COMPLETE!"
echo "=================================="
echo ""
echo "Your backend HTTPS URL: https://${DUCKDNS_DOMAIN}/api/v1"
echo "WebSocket URL: wss://${DUCKDNS_DOMAIN}/api/v1/realtime/ws"
echo ""
echo "Next steps:"
echo "1. Update backend CORS in .env file"
echo "2. Restart backend"
echo "3. Update Vercel environment variables"
echo "4. Test from frontend!"







