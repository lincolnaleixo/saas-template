#!/bin/bash

# Initialize Let's Encrypt SSL certificates
# This script should be run once during initial setup

set -e

# Change to script directory
cd "$(dirname "$0")"

# Load environment variables from parent directory
if [ -f ../../.env ]; then
  export $(cat ../../.env | grep -v '^#' | xargs)
elif [ -f ../.env ]; then
  export $(cat ../.env | grep -v '^#' | xargs)
fi

# Check required variables
if [ -z "$DOMAIN_NAME" ]; then
  echo "Error: DOMAIN_NAME is not set in .env file"
  exit 1
fi

if [ -z "$LETSENCRYPT_EMAIL" ]; then
  echo "Error: LETSENCRYPT_EMAIL is not set in .env file"
  exit 1
fi

# Create necessary directories
mkdir -p ./certbot/conf
mkdir -p ./certbot/www

echo "### Processing nginx templates..."
# Process nginx templates first
../scripts/process-nginx-templates.sh

# Use SSL config
cp ../nginx/conf.d/processed/default.conf ../nginx/conf.d/processed/active.conf

echo "### Starting Nginx for initial certificate request..."
docker compose -f ../docker-compose.prod.yml up -d nginx

echo "### Waiting for Nginx to start..."
sleep 5

# Check if certificates already exist
if [ -d "./certbot/conf/live/$DOMAIN_NAME" ]; then
  echo "### Certificates already exist for $DOMAIN_NAME"
  read -p "Do you want to renew them? (y/N) " decision
  if [ "$decision" != "y" ]; then
    echo "Keeping existing certificates."
    exit 0
  fi
fi

echo "### Requesting Let's Encrypt certificate for $DOMAIN_NAME..."

# Test certificate first (staging)
if [ "$STAGING" = "1" ]; then
  echo "### Using Let's Encrypt staging environment..."
  docker compose -f ../docker-compose.prod.yml run --rm --entrypoint "\
    certbot certonly --webroot -w /var/www/certbot \
      --staging \
      --email $LETSENCRYPT_EMAIL \
      -d $DOMAIN_NAME \
      -d www.$DOMAIN_NAME \
      --agree-tos \
      --no-eff-email \
      --force-renewal" certbot
else
  # Production certificate
  docker compose -f ../docker-compose.prod.yml run --rm --entrypoint "\
    certbot certonly --webroot -w /var/www/certbot \
      --email $LETSENCRYPT_EMAIL \
      -d $DOMAIN_NAME \
      -d www.$DOMAIN_NAME \
      --agree-tos \
      --no-eff-email \
      --force-renewal" certbot
fi

echo "### Certificate obtained successfully!"

# Create a symlink for the certificate to a generic location
if [ -d "./certbot/conf/live/$DOMAIN_NAME" ]; then
  echo "### Creating certificate symlink..."
  rm -f "./certbot/conf/live/certificate"
  ln -s "$DOMAIN_NAME" "./certbot/conf/live/certificate"
fi

# Create a temporary self-signed certificate for initial HTTPS setup if needed
if [ ! -f "./certbot/conf/live/$DOMAIN_NAME/fullchain.pem" ]; then
  echo "### Creating temporary self-signed certificate..."
  mkdir -p "./certbot/conf/live/$DOMAIN_NAME"
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout "./certbot/conf/live/$DOMAIN_NAME/privkey.pem" \
    -out "./certbot/conf/live/$DOMAIN_NAME/fullchain.pem" \
    -subj "/CN=$DOMAIN_NAME"

  # Create symlink for temp cert too
  rm -f "./certbot/conf/live/certificate"
  ln -s "$DOMAIN_NAME" "./certbot/conf/live/certificate"
fi

echo "### Switching to SSL configuration..."
# Stop nginx
docker compose -f ../docker-compose.prod.yml stop nginx

# Switch to SSL config
cp ../nginx/conf.d/processed/default.conf ../nginx/conf.d/processed/active.conf

# Start nginx with SSL configuration
echo "### Starting Nginx with SSL configuration..."
docker compose -f ../docker-compose.prod.yml up -d nginx

echo "### SSL initialization complete!"
echo "### Your site should now be available at https://$DOMAIN_NAME"

echo "### SSL setup complete!"
