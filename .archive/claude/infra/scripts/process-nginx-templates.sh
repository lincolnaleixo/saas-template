#!/bin/bash
#
# Process nginx template files with environment variables
# This script is called by prod.sh to generate nginx configs

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NGINX_CONF_DIR="${SCRIPT_DIR}/../nginx/conf.d"

# Create processed directory
mkdir -p "${NGINX_CONF_DIR}/processed"

# Function to process template
process_template() {
    local template_file=$1
    local output_file=$2
    
    # Use envsubst to replace variables
    envsubst '${DOMAIN_NAME} ${API_PORT} ${FRONTEND_PORT}' < "$template_file" > "$output_file"
    
    echo "✓ Processed $(basename $template_file) → $(basename $output_file)"
}

# Process templates based on SSL availability
if [ -d "${SCRIPT_DIR}/../certbot/conf/live/${DOMAIN_NAME}" ]; then
    # SSL certificates exist - use SSL config
    process_template \
        "${NGINX_CONF_DIR}/default.conf.template" \
        "${NGINX_CONF_DIR}/processed/default.conf"
else
    # No SSL yet - use non-SSL config
    process_template \
        "${NGINX_CONF_DIR}/default-nossl.conf.template" \
        "${NGINX_CONF_DIR}/processed/default.conf"
fi

echo "✓ Nginx configuration processed successfully"