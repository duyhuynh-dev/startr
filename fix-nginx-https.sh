#!/bin/bash
# Script to fix nginx HTTPS configuration on EC2

echo "🔍 Checking nginx configuration..."

# Check what ports nginx is listening on
echo "1. Ports nginx is listening on:"
sudo ss -tlnp | grep nginx || echo "   No nginx processes found"

echo ""
echo "2. Current config file content (HTTPS block):"
sudo cat /etc/nginx/conf.d/backend.conf | grep -A 10 "listen 443" || echo "   ❌ HTTPS block not found!"

echo ""
echo "3. SSL certificate files exist:"
sudo ls -la /etc/letsencrypt/live/startr-api.duckdns.org/ 2>/dev/null || echo "   ❌ Certificate directory not found"

echo ""
echo "4. Testing config syntax:"
sudo nginx -t

echo ""
echo "---"
echo "If HTTPS block is missing, run this command on EC2 to fix it:"
echo ""
echo "cat > /tmp/backend-https.conf << 'NGINXEOF'"
cat nginx-backend.conf
echo "NGINXEOF"
echo ""
echo "sudo cp /tmp/backend-https.conf /etc/nginx/conf.d/backend.conf"
echo "sudo nginx -t"
echo "sudo systemctl reload nginx"







