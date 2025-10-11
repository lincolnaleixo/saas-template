#!/bin/bash

# Production Deployment Script for SaaS Template
# This script automates the entire production deployment process
#
# Prerequisites:
# - Vercel CLI installed and authenticated: npm i -g vercel && vercel login
# - Convex CLI installed: npm i -g convex (comes with npm install)
# - .env.local file with all required environment variables
# - Google OAuth credentials configured for localhost

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if file exists
check_file() {
    if [ ! -f "$1" ]; then
        print_error "Required file not found: $1"
        return 1
    fi
    return 0
}

# Load environment variable from .env.local
load_env_var() {
    local var_name=$1
    local value=$(grep "^${var_name}=" .env.local 2>/dev/null | cut -d '=' -f2-)
    echo "$value"
}

# Check required environment variable
check_env_var() {
    local var_name=$1
    local value=$(load_env_var "$var_name")

    if [ -z "$value" ]; then
        print_error "Missing required variable in .env.local: $var_name"
        return 1
    fi
    print_success "Found $var_name"
    return 0
}

# Main script
main() {
    print_header "SaaS Template - Production Deployment Script"

    # Step 0: Check prerequisites
    print_header "Step 0: Checking Prerequisites"

    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        print_error "Must run this script from the project root directory"
        exit 1
    fi

    # Check for .env.local
    if ! check_file ".env.local"; then
        print_error "Create .env.local with required environment variables first"
        exit 1
    fi

    # Check Vercel CLI
    if ! command_exists vercel; then
        print_error "Vercel CLI not found. Install with: npm i -g vercel"
        exit 1
    fi
    print_success "Vercel CLI installed"

    # Check if logged in to Vercel
    if ! vercel whoami &>/dev/null; then
        print_warning "Not logged in to Vercel"
        print_info "Running: vercel login"
        vercel login
    else
        print_success "Logged in to Vercel as: $(vercel whoami)"
    fi

    # Check Convex CLI
    if ! command_exists convex; then
        print_error "Convex CLI not found. Run: npm install"
        exit 1
    fi
    print_success "Convex CLI installed"

    # Verify required environment variables in .env.local
    print_info "Checking required environment variables in .env.local..."

    local required_vars=(
        "AUTH_SECRET"
        "GOOGLE_CLIENT_ID"
        "GOOGLE_CLIENT_SECRET"
        "NEXT_PUBLIC_CONVEX_URL"
    )

    local all_vars_present=true
    for var in "${required_vars[@]}"; do
        if ! check_env_var "$var"; then
            all_vars_present=false
        fi
    done

    if [ "$all_vars_present" = false ]; then
        print_error "Please add all required variables to .env.local"
        exit 1
    fi

    # Step 1: Deploy Convex to Production
    print_header "Step 1: Deploying Convex to Production"

    print_info "Deploying Convex functions..."
    if npx convex deploy --yes; then
        print_success "Convex deployed successfully"
    else
        print_error "Convex deployment failed"
        exit 1
    fi

    # Get production Convex URL
    print_info "Detecting production Convex URL..."
    PROD_CONVEX_URL=$(npx convex env get CONVEX_URL 2>/dev/null || echo "")

    if [ -z "$PROD_CONVEX_URL" ]; then
        print_warning "Could not auto-detect Convex URL"
        print_info "Please check your Convex dashboard for the production URL"
        read -p "Enter your production Convex URL (e.g., https://your-deployment.convex.cloud): " PROD_CONVEX_URL
    else
        print_success "Production Convex URL: $PROD_CONVEX_URL"
    fi

    # Step 2: Link Vercel Project
    print_header "Step 2: Linking Vercel Project"

    if [ ! -f ".vercel/project.json" ]; then
        print_info "Linking to Vercel project..."
        vercel link
    else
        print_success "Already linked to Vercel project"
    fi

    # Step 3: Set Environment Variables in Vercel
    print_header "Step 3: Setting Environment Variables in Vercel"

    print_info "Reading environment variables from .env.local..."

    # Function to set Vercel env var
    set_vercel_env() {
        local var_name=$1
        local var_value=$2
        local env_type=${3:-production}

        if [ -z "$var_value" ]; then
            print_warning "Skipping empty variable: $var_name"
            return
        fi

        print_info "Setting $var_name in Vercel ($env_type)..."
        echo "$var_value" | vercel env add "$var_name" "$env_type" --force &>/dev/null || {
            print_warning "Failed to set $var_name (might already exist)"
        }
        print_success "Set $var_name"
    }

    # Core required variables
    print_info "Setting core environment variables..."
    set_vercel_env "AUTH_SECRET" "$(load_env_var 'AUTH_SECRET')" "production"
    set_vercel_env "GOOGLE_CLIENT_ID" "$(load_env_var 'GOOGLE_CLIENT_ID')" "production"
    set_vercel_env "GOOGLE_CLIENT_SECRET" "$(load_env_var 'GOOGLE_CLIENT_SECRET')" "production"
    set_vercel_env "NEXT_PUBLIC_CONVEX_URL" "$PROD_CONVEX_URL" "production"

    # Optional variables
    print_info "Setting optional environment variables (if present)..."

    optional_vars=(
        "NEXTAUTH_URL"
        "NEXT_PUBLIC_APP_URL"
        "RESEND_API_KEY"
        "EMAIL_FROM"
        "STRIPE_SECRET_KEY"
        "STRIPE_WEBHOOK_SECRET"
        "STRIPE_AUTOMATIC_TAX_ENABLED"
        "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
        "NEXT_PUBLIC_STRIPE_PRICE_PRO"
        "NEXT_PUBLIC_STRIPE_PRICE_ULTRA"
    )

    for var in "${optional_vars[@]}"; do
        value=$(load_env_var "$var")
        if [ -n "$value" ]; then
            set_vercel_env "$var" "$value" "production"
        fi
    done

    # Step 4: Get Vercel deployment URL
    print_header "Step 4: Getting Production URL"

    print_info "Retrieving Vercel production domain..."
    VERCEL_DOMAIN=$(vercel inspect --prod 2>/dev/null | grep "Production:" | awk '{print $2}' || echo "")

    if [ -z "$VERCEL_DOMAIN" ]; then
        print_warning "Could not auto-detect Vercel domain"
        print_info "You can find it in your Vercel dashboard"
        read -p "Enter your Vercel production domain (e.g., your-app.vercel.app): " VERCEL_DOMAIN
    fi

    if [ -n "$VERCEL_DOMAIN" ]; then
        FULL_URL="https://${VERCEL_DOMAIN}"
        print_success "Production URL: $FULL_URL"

        # Update NEXTAUTH_URL if not set
        if [ -z "$(load_env_var 'NEXTAUTH_URL')" ]; then
            print_info "Setting NEXTAUTH_URL to production domain..."
            set_vercel_env "NEXTAUTH_URL" "$FULL_URL" "production"
        fi

        if [ -z "$(load_env_var 'NEXT_PUBLIC_APP_URL')" ]; then
            print_info "Setting NEXT_PUBLIC_APP_URL to production domain..."
            set_vercel_env "NEXT_PUBLIC_APP_URL" "$FULL_URL" "production"
        fi
    fi

    # Step 5: Deploy to Vercel
    print_header "Step 5: Deploying to Vercel"

    print_info "Building and deploying to production..."
    if vercel --prod --yes; then
        print_success "Successfully deployed to Vercel!"
    else
        print_error "Vercel deployment failed"
        exit 1
    fi

    # Get final production URL
    FINAL_URL=$(vercel inspect --prod 2>/dev/null | grep "URL:" | head -1 | awk '{print $2}' || echo "$FULL_URL")

    # Step 6: Post-deployment instructions
    print_header "Deployment Complete! 🎉"

    print_success "Your application has been deployed successfully!"
    echo ""
    print_info "Production URL: $FINAL_URL"
    print_info "Convex Dashboard: https://dashboard.convex.dev"
    print_info "Vercel Dashboard: https://vercel.com"

    echo ""
    print_header "⚠️  Important: Manual Steps Required"

    echo ""
    echo "1. Configure Google OAuth:"
    echo "   → Go to: https://console.cloud.google.com/apis/credentials"
    echo "   → Add this redirect URI:"
    echo "     ${FINAL_URL}/api/auth/callback/google"
    echo "   → Wait 5-10 minutes for Google to propagate changes"

    echo ""
    echo "2. (Optional) If using Stripe, set up production webhooks:"
    echo "   → Go to: https://dashboard.stripe.com/webhooks"
    echo "   → Add endpoint: ${FINAL_URL}/api/webhooks/stripe"
    echo "   → Select events: customer.subscription.* (created, updated, deleted)"
    echo "   → Copy webhook secret and add to Vercel as STRIPE_WEBHOOK_SECRET"

    echo ""
    echo "3. Test your deployment:"
    echo "   → Visit: $FINAL_URL"
    echo "   → Click login and sign in with Google"
    echo "   → Verify organization creation works"

    echo ""
    print_success "Deployment script completed!"
}

# Run main function
main "$@"
