#!/bin/bash
# Generate secure passwords for your .env file

echo "🔐 Generating secure passwords..."
echo ""
echo "Copy these into your backend/.env file:"
echo ""
echo "# Generated on $(date)"
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-32)"
echo "REDIS_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-32)"
echo "SECRET_KEY=$(openssl rand -hex 32)"
echo "MINIO_ROOT_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-32)"
