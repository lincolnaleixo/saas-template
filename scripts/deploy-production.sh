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

# CLI session management (matches setup-development.sh)
CLI_SESSION_HOME=""
NODE_HOMEDIR_OVERRIDE=""

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

# Prepare CLI home directory (check for .dev-cli)
prepare_cli_home() {
    local existing_dir="$PWD/.dev-cli"
    if [ -d "$existing_dir" ]; then
        CLI_SESSION_HOME="$existing_dir"
        print_info "Using project-local CLI credentials from $CLI_SESSION_HOME"
    fi
}

# Create node homedir override script
ensure_node_override() {
    if [ -z "$CLI_SESSION_HOME" ]; then
        NODE_HOMEDIR_OVERRIDE=""
        return
    fi
    local override_path="$CLI_SESSION_HOME/.config/node-homedir-override.js"
    if [ ! -f "$override_path" ]; then
        cat <<'EOF' > "$override_path"
const os = require("os");
const forcedHome =
  process.env.CLI_OVERRIDE_HOME ||
  process.env.CONVEX_CLI_HOME ||
  process.env.HOME;

if (forcedHome && typeof forcedHome === "string") {
  Object.defineProperty(os, "homedir", {
    value: () => forcedHome,
    configurable: true,
  });
}
EOF
    fi
    NODE_HOMEDIR_OVERRIDE="$override_path"
}

# Build NODE_OPTIONS with override
node_options_with_override() {
    local existing="$1"
    if [ -z "$NODE_HOMEDIR_OVERRIDE" ]; then
        echo "$existing"
        return
    fi
    if [ -z "$existing" ]; then
        echo "--require $NODE_HOMEDIR_OVERRIDE"
        return
    fi
    case " $existing " in
        *" --require $NODE_HOMEDIR_OVERRIDE "*)
            echo "$existing"
            ;;
        *)
            echo "$existing --require $NODE_HOMEDIR_OVERRIDE"
            ;;
    esac
}

# Convex CLI wrapper that uses project-local credentials if available
convex_cli() {
    if [ -n "$CLI_SESSION_HOME" ]; then
        ensure_node_override
        local node_opts
        node_opts=$(node_options_with_override "${NODE_OPTIONS:-}")
        HOME="$CLI_SESSION_HOME" \
            XDG_CONFIG_HOME="$CLI_SESSION_HOME/.config" \
            CLI_OVERRIDE_HOME="$CLI_SESSION_HOME" \
            CONVEX_CLI_HOME="$CLI_SESSION_HOME" \
            NODE_OPTIONS="$node_opts" \
            npx convex "$@"
    else
        npx convex "$@"
    fi
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

    # Initialize CLI home (check for .dev-cli directory)
    prepare_cli_home

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

    # Check Convex CLI (via npx)
    if ! command_exists npx; then
        print_error "npx not found. Install Node.js and npm"
        exit 1
    fi
    if ! npx convex --version &>/dev/null; then
        print_error "Convex CLI not found. Run: npm install"
        exit 1
    fi
    print_success "Convex CLI installed"

    # Check if logged in to Convex by checking for config file
    print_info "Checking Convex authentication..."
    local convex_config=""
    if [ -n "$CLI_SESSION_HOME" ]; then
        convex_config="$CLI_SESSION_HOME/.convex/config.json"
    else
        convex_config="$HOME/.convex/config.json"
    fi

    if [ ! -f "$convex_config" ] || [ ! -s "$convex_config" ]; then
        print_error "Not authenticated with Convex"
        print_info "Convex config not found at: $convex_config"
        print_info "Please run: ./scripts/setup-development.sh"
        print_info "Or manually authenticate with: npx convex dev"
        exit 1
    fi
    print_success "Authenticated with Convex"

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

    # Capture deploy output to extract the production URL
    local deploy_output
    deploy_output=$(convex_cli deploy --yes 2>&1)
    local deploy_exit=$?

    # Show the output to user
    echo "$deploy_output"

    if [ $deploy_exit -ne 0 ]; then
        print_error "Convex deployment failed"
        exit 1
    fi
    print_success "Convex deployed successfully"

    # Get production Convex URL from the deploy output
    print_info "Detecting production Convex URL..."

    # Extract URL from deploy output (looks for "Deployed Convex functions to https://...")
    PROD_CONVEX_URL=$(echo "$deploy_output" | grep -o 'https://[^[:space:]]*\.convex\.cloud' | head -1 || echo "")

    # If not found in output, try convex.json
    if [ -z "$PROD_CONVEX_URL" ] && [ -f "convex.json" ]; then
        PROD_CONVEX_URL=$(python3 -c "import json; print(json.load(open('convex.json')).get('deployment', ''))" 2>/dev/null || echo "")
    fi

    # If still not found, check .env.local
    if [ -z "$PROD_CONVEX_URL" ]; then
        PROD_CONVEX_URL=$(load_env_var 'NEXT_PUBLIC_CONVEX_URL')
    fi

    if [ -z "$PROD_CONVEX_URL" ]; then
        print_warning "Could not auto-detect Convex URL"
        print_info "Please check your Convex dashboard for the production URL"
        read -r -p "Enter your production Convex URL (e.g., https://your-deployment.convex.cloud): " PROD_CONVEX_URL_INPUT
        PROD_CONVEX_URL=$(echo "$PROD_CONVEX_URL_INPUT" | tr -d '\r\n')
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

    # Get Convex Admin Key
    print_info "Checking for Convex Admin Key..."
    CONVEX_ADMIN_KEY=$(load_env_var 'CONVEX_ADMIN_KEY')

    if [ -z "$CONVEX_ADMIN_KEY" ]; then
        echo ""
        print_warning "CONVEX_ADMIN_KEY not found in .env.local"
        print_info "The Convex Admin Key is required for NextAuth integration"
        echo ""
        print_info "Opening Convex Dashboard in your browser..."
        print_info "→ Select your deployment → Settings → Deploy keys"
        print_info "→ Copy the 'Deploy key' value"
        echo ""

        # Open browser
        if command_exists open; then
            open "https://dashboard.convex.dev" 2>/dev/null || true
        elif command_exists xdg-open; then
            xdg-open "https://dashboard.convex.dev" 2>/dev/null || true
        elif command_exists start; then
            start "https://dashboard.convex.dev" 2>/dev/null || true
        else
            print_info "Visit: https://dashboard.convex.dev"
        fi

        echo ""
        print_info "Paste the Deploy key below and press Enter:"
        read -r CONVEX_ADMIN_KEY_INPUT
        CONVEX_ADMIN_KEY=$(echo "$CONVEX_ADMIN_KEY_INPUT" | tr -d '\r\n')

        # Save to .env.local for future use
        if [ -n "$CONVEX_ADMIN_KEY" ]; then
            echo "CONVEX_ADMIN_KEY=$CONVEX_ADMIN_KEY" >> .env.local
            print_success "Saved CONVEX_ADMIN_KEY to .env.local"
        fi
    else
        print_success "Found CONVEX_ADMIN_KEY in .env.local"
    fi

    # Core required variables
    print_info "Setting core environment variables..."
    set_vercel_env "AUTH_SECRET" "$(load_env_var 'AUTH_SECRET')" "production"
    set_vercel_env "GOOGLE_CLIENT_ID" "$(load_env_var 'GOOGLE_CLIENT_ID')" "production"
    set_vercel_env "GOOGLE_CLIENT_SECRET" "$(load_env_var 'GOOGLE_CLIENT_SECRET')" "production"
    set_vercel_env "NEXT_PUBLIC_CONVEX_URL" "$PROD_CONVEX_URL" "production"

    if [ -n "$CONVEX_ADMIN_KEY" ]; then
        set_vercel_env "CONVEX_ADMIN_KEY" "$CONVEX_ADMIN_KEY" "production"
    else
        print_warning "Skipping CONVEX_ADMIN_KEY (not provided)"
    fi

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

    # Step 4: Deploy to Vercel (moved before getting URL)
    print_header "Step 4: Deploying to Vercel"

    print_info "Building and deploying to production..."

    # Capture Vercel deploy output to extract domain
    local vercel_output
    vercel_output=$(vercel --prod --yes 2>&1)
    local vercel_exit=$?

    # Show output to user
    echo "$vercel_output"

    if [ $vercel_exit -ne 0 ]; then
        print_error "Vercel deployment failed"
        exit 1
    fi
    print_success "Successfully deployed to Vercel!"

    # Step 5: Get Production URL from deployment
    print_header "Step 5: Configuring Production URLs"

    print_info "Detecting Vercel production domain..."

    # Extract production URL from Vercel output (looks for "Production: https://...")
    FINAL_URL=$(echo "$vercel_output" | grep -i "production:" | grep -o 'https://[^[:space:]]*' | head -1 || echo "")

    # Alternative: try to extract from "Deployed to production" line
    if [ -z "$FINAL_URL" ]; then
        FINAL_URL=$(echo "$vercel_output" | grep -o 'https://[^[:space:]]*\.vercel\.app' | head -1 || echo "")
    fi

    # Try vercel inspect as fallback
    if [ -z "$FINAL_URL" ]; then
        FINAL_URL=$(vercel inspect --prod 2>/dev/null | grep "url:" | head -1 | awk '{print $2}' || echo "")
    fi

    if [ -z "$FINAL_URL" ]; then
        print_warning "Could not auto-detect Vercel domain"
        print_info "You can find it in your Vercel dashboard"
        read -r -p "Enter your Vercel production URL (e.g., https://your-app.vercel.app): " FINAL_URL_INPUT
        FINAL_URL=$(echo "$FINAL_URL_INPUT" | tr -d '\r\n')
    else
        print_success "Production URL: $FINAL_URL"
    fi

    # Always set NEXTAUTH_URL and NEXT_PUBLIC_APP_URL to production domain
    if [ -n "$FINAL_URL" ]; then
        print_info "Setting NEXTAUTH_URL to production domain..."
        set_vercel_env "NEXTAUTH_URL" "$FINAL_URL" "production"

        print_info "Setting NEXT_PUBLIC_APP_URL to production domain..."
        set_vercel_env "NEXT_PUBLIC_APP_URL" "$FINAL_URL" "production"

        print_success "Production URLs configured in Vercel"
    fi

    # Step 6: Post-deployment instructions
    print_header "Deployment Complete! 🎉"

    print_success "Your application has been deployed successfully!"
    echo ""
    print_info "Production URL: $FINAL_URL"
    print_info "Convex Dashboard: https://dashboard.convex.dev"
    print_info "Vercel Dashboard: https://vercel.com/dashboard"

    echo ""
    print_header "⚠️  Important: Manual Steps Required"

    echo ""
    echo "1. Configure Google OAuth:"
    echo "   → Go to: https://console.cloud.google.com/apis/credentials"
    echo "   → Add this redirect URI:"
    echo "     ${FINAL_URL}/api/auth/callback/google"
    echo "   → Wait 5-10 minutes for Google to propagate changes"

    echo ""
    echo "2. (Optional) Add Custom Domain:"
    echo "   → Go to: https://vercel.com/dashboard"
    echo "   → Select your project → Settings → Domains"
    echo "   → Add your custom domain (e.g., example.com)"
    echo "   → Update Google OAuth redirect URI with your custom domain"
    echo "   → Update Stripe webhooks if using custom domain"

    echo ""
    echo "3. (Optional) If using Stripe, set up production webhooks:"
    echo "   → Go to: https://dashboard.stripe.com/webhooks"
    echo "   → Add endpoint: ${FINAL_URL}/api/webhooks/stripe"
    echo "   → Select events: customer.subscription.* (created, updated, deleted)"
    echo "   → Copy webhook secret and update Vercel env: STRIPE_WEBHOOK_SECRET"

    echo ""
    echo "4. Test your deployment:"
    echo "   → Visit: $FINAL_URL"
    echo "   → Click login and sign in with Google"
    echo "   → Verify organization creation works"

    echo ""
    print_success "Deployment script completed!"
}

# Run main function
main "$@"
