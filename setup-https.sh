#!/bin/bash

# ============================================================
# HTTPS Setup Script for Startr Backend
# Sets up Nginx + Let's Encrypt SSL Certificate
# ============================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}"
echo "============================================================"
echo "  Startr HTTPS Setup Script"
echo "  Nginx + Let's Encrypt SSL Certificate"
echo "============================================================"
echo -e "${NC}"

# Get domain from user
read -p "Enter your domain (e.g., startr-api.duckdns.org): " DOMAIN

if [ -z "$DOMAIN" ]; then
    echo -e "${RED}Error: Domain cannot be empty${NC}"
    exit 1
fi

# Get email for Let's Encrypt
read -p "Enter your email (for Let's Encrypt notifications): " EMAIL

if [ -z "$EMAIL" ]; then
    echo -e "${RED}Error: Email cannot be empty${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Setting up HTTPS for: ${DOMAIN}${NC}"
echo ""

# Step 1: Install Nginx and Certbot
echo -e "${GREEN}[1/5] Installing Nginx and Certbot...${NC}"
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

# Step 2: Create Nginx configuration
echo -e "${GREEN}[2/5] Creating Nginx configuration...${NC}"

sudo tee /etc/nginx/sites-available/startr-api > /dev/null <<EOF
server {
    listen 80;
    server_name ${DOMAIN};

    # For Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        
        # WebSocket support
        proxy_buffering off;
    }
}
EOF

# Step 3: Enable the site
echo -e "${GREEN}[3/5] Enabling Nginx site...${NC}"

# Remove default site if exists
sudo rm -f /etc/nginx/sites-enabled/default

# Enable startr-api site
sudo ln -sf /etc/nginx/sites-available/startr-api /etc/nginx/sites-enabled/

# Test nginx config
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

# Step 4: Get SSL Certificate
echo -e "${GREEN}[4/5] Obtaining SSL certificate from Let's Encrypt...${NC}"
echo ""
echo -e "${YELLOW}Note: Make sure your domain (${DOMAIN}) points to this server's IP!${NC}"
echo ""

sudo certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --email ${EMAIL} --redirect

# Step 5: Set up auto-renewal
echo -e "${GREEN}[5/5] Setting up auto-renewal...${NC}"

# Test renewal
sudo certbot renew --dry-run

# Ensure certbot timer is enabled
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}  HTTPS Setup Complete! 🎉${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo -e "Your API is now available at:"
echo -e "  ${GREEN}https://${DOMAIN}/api${NC}"
echo -e "  ${GREEN}https://${DOMAIN}/api/docs${NC}"
echo -e "  ${GREEN}https://${DOMAIN}/healthz${NC}"
echo ""
echo -e "SSL certificate will auto-renew before expiration."
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Update your Vercel environment variable:"
echo -e "   NEXT_PUBLIC_API_URL=https://${DOMAIN}/api"
echo ""
echo -e "2. Update CORS in your backend .env:"
echo -e "   CORS_ORIGINS=[\"https://your-app.vercel.app\"]"
echo ""
echo -e "3. Restart backend after updating CORS:"
echo -e "   docker-compose -f docker-compose.prod.yml restart backend"
echo ""
