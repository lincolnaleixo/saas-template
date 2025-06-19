#!/bin/bash
# Process nginx configuration templates

set -e

# Load environment variables
if [ -f .env ]; then
    source .env
elif [ -f .env.production ]; then
    source .env.production
else
    echo "Error: No .env or .env.production file found!"
    exit 1
fi

# Set defaults for optional variables
API_PORT=${API_PORT:-8000}
PROJECT_NAME=${PROJECT_NAME:-app}

echo "Processing nginx configuration templates..."
echo "PROJECT_NAME: $PROJECT_NAME"
echo "DOMAIN_NAME: $DOMAIN_NAME"
echo "API_PORT: $API_PORT"

# Create processed config directory
mkdir -p ./nginx/conf.d/processed

# Process templates
for template in ./nginx/conf.d/*.conf; do
    filename=$(basename "$template")
    output="./nginx/conf.d/processed/$filename"
    
    echo "Processing $filename..."
    
    # Replace environment variables
    envsubst '${PROJECT_NAME} ${DOMAIN_NAME} ${API_PORT}' < "$template" > "$output"
done

echo "Nginx configuration templates processed successfully!"