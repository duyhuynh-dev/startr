#!/bin/bash

# ============================================================
# DuckDNS Setup Script
# Configures automatic IP updates for DuckDNS
# ============================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}"
echo "============================================================"
echo "  DuckDNS Auto-Update Setup"
echo "============================================================"
echo -e "${NC}"

# Get DuckDNS details
read -p "Enter your DuckDNS subdomain (without .duckdns.org): " SUBDOMAIN
read -p "Enter your DuckDNS token: " TOKEN

if [ -z "$SUBDOMAIN" ] || [ -z "$TOKEN" ]; then
    echo -e "${RED}Error: Subdomain and token are required${NC}"
    exit 1
fi

# Create DuckDNS update script
echo -e "${GREEN}[1/3] Creating DuckDNS update script...${NC}"

mkdir -p ~/duckdns
cat > ~/duckdns/duck.sh <<EOF
#!/bin/bash
echo url="https://www.duckdns.org/update?domains=${SUBDOMAIN}&token=${TOKEN}&ip=" | curl -k -o ~/duckdns/duck.log -K -
EOF

chmod 700 ~/duckdns/duck.sh

# Test the script
echo -e "${GREEN}[2/3] Testing DuckDNS update...${NC}"
~/duckdns/duck.sh
cat ~/duckdns/duck.log
echo ""

# Set up cron job
echo -e "${GREEN}[3/3] Setting up cron job (updates every 5 minutes)...${NC}"

# Remove existing duckdns cron if any
crontab -l 2>/dev/null | grep -v "duck.sh" | crontab - 2>/dev/null || true

# Add new cron job
(crontab -l 2>/dev/null; echo "*/5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1") | crontab -

echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}  DuckDNS Setup Complete! 🦆${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo -e "Your domain: ${GREEN}${SUBDOMAIN}.duckdns.org${NC}"
echo -e "IP will update automatically every 5 minutes."
echo ""
echo -e "To manually update IP: ~/duckdns/duck.sh"
echo -e "To check last update:  cat ~/duckdns/duck.log"
echo ""
