#!/usr/bin/env bash

set -euo pipefail

STRIPE_LOGOUT_PERFORMED=false
CLI_SESSION_HOME=""
STRIPE_CONFIG_PATH=""
NODE_HOMEDIR_OVERRIDE=""
PROMPT_MODE="auto"
PROJECT_DIR_NAME=""
PROJECT_SLUG=""
PROJECT_DEV_NAME=""

# Color palette
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
  echo -e "\n${BLUE}========================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}" >&2
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ $1${NC}"
}

mask_key() {
  local key="$1"
  local length=${#key}
  if [ "$length" -le 8 ]; then
    echo "$key"
  else
    echo "${key:0:6}...${key:length-4:4}"
  fi
}

slugify() {
  # Convert to lowercase, replace non-alphanumeric with dashes, trim leading/trailing dashes
  echo "$1" \
    | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//' \
    | sed -E 's/-{2,}/-/g'
}

init_project_names() {
  if [ -n "$PROJECT_DIR_NAME" ]; then
    return
  fi
  PROJECT_DIR_NAME=$(basename "$PWD")
  PROJECT_SLUG=$(slugify "$PROJECT_DIR_NAME")
  if [ -z "$PROJECT_SLUG" ]; then
    PROJECT_SLUG="dev-project"
  fi
  PROJECT_DEV_NAME="${PROJECT_SLUG}-dev"
}

prepare_cli_home() {
  if [ -n "$CLI_SESSION_HOME" ]; then
    mkdir -p "$CLI_SESSION_HOME" "$CLI_SESSION_HOME/.config"
    if [ -z "$STRIPE_CONFIG_PATH" ]; then
      STRIPE_CONFIG_PATH="$CLI_SESSION_HOME/.config/stripe/config.toml"
    fi
    return
  fi

  local existing_dir="$PWD/.dev-cli"
  if [ -d "$existing_dir" ]; then
    CLI_SESSION_HOME="$existing_dir"
    STRIPE_CONFIG_PATH="$CLI_SESSION_HOME/.config/stripe/config.toml"
    mkdir -p "$CLI_SESSION_HOME" "$CLI_SESSION_HOME/.config" "$(dirname "$STRIPE_CONFIG_PATH")"
    print_success "Reusing project-local CLI credentials from $CLI_SESSION_HOME"
    return
  fi

  case "${DEV_CLI_STORAGE:-}" in
    local)
      CLI_SESSION_HOME="$existing_dir"
      STRIPE_CONFIG_PATH="$CLI_SESSION_HOME/.config/stripe/config.toml"
      mkdir -p "$CLI_SESSION_HOME" "$CLI_SESSION_HOME/.config" "$(dirname "$STRIPE_CONFIG_PATH")"
      print_success "CLI credentials will be isolated under $CLI_SESSION_HOME (DEV_CLI_STORAGE)"
      return
      ;;
    global)
      print_info "Using global CLI credential locations (DEV_CLI_STORAGE=global)."
      return
      ;;
  esac

  if prompt_confirm "Store CLI logins (Vercel, Convex, Stripe) inside this project folder?" "y"; then
    CLI_SESSION_HOME="$existing_dir"
    STRIPE_CONFIG_PATH="$CLI_SESSION_HOME/.config/stripe/config.toml"
    mkdir -p "$CLI_SESSION_HOME" "$CLI_SESSION_HOME/.config" "$(dirname "$STRIPE_CONFIG_PATH")"
    print_success "CLI credentials will be isolated under $CLI_SESSION_HOME"
  else
    print_info "Using global CLI credential locations (home directory)."
  fi
}

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

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

open_url() {
  local url="$1"
  if [ -z "$url" ]; then
    return 1
  fi

  if command_exists open; then
    if open "$url" >/dev/null 2>&1; then
      print_info "Opening $url in your browser..."
      return 0
    fi
  elif command_exists xdg-open; then
    if xdg-open "$url" >/dev/null 2>&1; then
      print_info "Opening $url in your browser..."
      return 0
    fi
  elif command_exists wslview; then
    if wslview "$url" >/dev/null 2>&1; then
      print_info "Opening $url in your browser..."
      return 0
    fi
  elif command_exists powershell.exe; then
    if powershell.exe -NoLogo -NoProfile -Command "Start-Process '$url'" >/dev/null 2>&1; then
      print_info "Opening $url in your browser..."
      return 0
    fi
  elif command_exists cmd.exe; then
    if cmd.exe /c start "" "$url" >/dev/null 2>&1; then
      print_info "Opening $url in your browser..."
      return 0
    fi
  fi

  print_warning "Couldn't automatically open $url. Please open it manually."
  return 1
}

prompt_confirm() {
  local prompt="$1"
  local default_choice="${2:-y}" # y or n
  local response
  if [ "$PROMPT_MODE" = "auto" ]; then
    if [[ "$default_choice" =~ ^[yY]$ ]]; then
      print_info "Auto-confirmed: $prompt"
      return 0
    else
      print_info "Auto-declined: $prompt"
      return 1
    fi
  fi
  while true; do
    if [[ "${default_choice}" =~ ^[yY]$ ]]; then
      read -rp "$prompt [Y/n]: " response
      response=${response:-Y}
    else
      read -rp "$prompt [y/N]: " response
      response=${response:-N}
    fi
    case "${response}" in
      [yY]|[yY][eE][sS]) return 0 ;;
      [nN]|[nN][oO]) return 1 ;;
      *) echo "Please answer yes or no." ;;
    esac
  done
}

parse_env_file() {
  local env_file="$1"
  python3 - "$env_file" <<'PY'
import sys
from pathlib import Path

env_path = Path(sys.argv[1])
if not env_path.exists():
    sys.exit(0)

for raw in env_path.read_text().splitlines():
    line = raw.strip()
    if not line or line.startswith('#'):
        continue
    if '=' not in line:
        continue
    key, value = line.split('=', 1)
    key = key.strip()
    if not key:
        continue
    value = value.strip()
    if not value:
        print(f"{key}===")
        continue
    # Remove inline comments that follow a space or tab before '#'
    for token in (' #', '\t#'):
        idx = value.find(token)
        if idx != -1:
            value = value[:idx].rstrip()
            break
    if value.startswith('"') and value.endswith('"'):
        value = value[1:-1]
    print(f"{key}==={value}")
PY
}

get_env_value() {
  local env_file="$1"
  local key="$2"
  python3 - "$env_file" "$key" <<'PY'
import sys
from pathlib import Path

env_path = Path(sys.argv[1])
target_key = sys.argv[2]

if not env_path.exists():
    sys.exit(0)

for raw in env_path.read_text().splitlines():
    line = raw.strip()
    if not line or line.startswith('#'):
        continue
    if '=' not in line:
        continue
    key, value = line.split('=', 1)
    if key.strip() != target_key:
        continue
    value = value.strip()
    if value.startswith('"') and value.endswith('"'):
        value = value[1:-1]
    print(value)
    break
PY
}

set_env_value() {
  local env_file="$1"
  local key="$2"
  local value="$3"
  python3 - "$env_file" "$key" "$value" <<'PY'
import sys
from pathlib import Path

env_path = Path(sys.argv[1])
target_key = sys.argv[2]
target_value = sys.argv[3]

lines = []
if env_path.exists():
    lines = env_path.read_text().splitlines()

updated = False
for idx, raw in enumerate(lines):
    stripped = raw.strip()
    if not stripped or stripped.startswith('#') or '=' not in raw:
        continue
    key, _ = raw.split('=', 1)
    if key.strip() == target_key:
        lines[idx] = f"{target_key}={target_value}"
        updated = True
        break

if not updated:
    if lines and lines[-1] != "":
        lines.append("")
    lines.append(f"{target_key}={target_value}")

text = "\n".join(lines)
if not text.endswith("\n"):
    text += "\n"

env_path.write_text(text, encoding='utf-8')
PY
}

discover_stripe_cli_key() {
  LOCAL_STRIPE_CONFIG_PATH="$STRIPE_CONFIG_PATH" python3 - "$@" <<'PY'
import os
import sys

try:
    import tomllib  # type: ignore[attr-defined]
except ModuleNotFoundError:
    try:
        import tomli as tomllib  # type: ignore[override]
    except ModuleNotFoundError:
        sys.exit(0)

custom_path = os.environ.get('LOCAL_STRIPE_CONFIG_PATH')
home = os.path.expanduser('~')
paths = []
if custom_path:
    paths.append(custom_path)
elif home:
    paths.append(os.path.join(home, '.config', 'stripe', 'config.toml'))
    paths.append(os.path.join(home, '.stripe', 'config.toml'))
    paths.append(os.path.join(home, '.stripe', 'config'))
appdata = os.environ.get('APPDATA')
if appdata:
    paths.append(os.path.join(appdata, 'Stripe', 'config.toml'))

for path in paths:
    if not path or not os.path.exists(path):
        continue
    try:
        with open(path, 'rb') as fh:
            data = tomllib.load(fh)
    except Exception:
        continue

    default_profile = data.get('project-name') or data.get('default_profile') or 'default'
    section = data.get(default_profile)
    if isinstance(section, dict):
        key = section.get('test_mode_api_key') or section.get('test-mode-api-key')
        if key:
            profile = section.get('display_name') or default_profile
            print(f"{key}==={profile}")
            sys.exit(0)
PY
}

vercel_cli() {
  if [ -n "$CLI_SESSION_HOME" ]; then
    ensure_node_override
    local node_opts
    node_opts=$(node_options_with_override "${NODE_OPTIONS:-}")
    HOME="$CLI_SESSION_HOME" \
      XDG_CONFIG_HOME="$CLI_SESSION_HOME/.config" \
      CLI_OVERRIDE_HOME="$CLI_SESSION_HOME" \
      NODE_OPTIONS="$node_opts" \
      vercel "$@"
  else
    vercel "$@"
  fi
}

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
      npm_config_yes=true \
      NPM_CONFIG_YES=true \
      npx convex "$@"
  else
    npm_config_yes=true NPM_CONFIG_YES=true npx convex "$@"
  fi
}

ensure_convex_logged_in() {
  # Ensure the Convex config directory exists before checking status
  if [ -n "$CLI_SESSION_HOME" ]; then
    mkdir -p "$CLI_SESSION_HOME/.convex"
  fi

  # Check if we have a valid Convex config file (indicates previous login)
  local config_file=""
  if [ -n "$CLI_SESSION_HOME" ]; then
    config_file="$CLI_SESSION_HOME/.convex/config.json"
  else
    config_file="$HOME/.convex/config.json"
  fi

  if [ -f "$config_file" ] && [ -s "$config_file" ]; then
    # We have an existing config file, try to verify it's valid
    print_info "Checking existing Convex authentication..."
    local status
    if status=$(convex_cli login status 2>&1); then
      if ! grep -q "Not logged in" <<< "$status"; then
        local first_team
        first_team=$(grep -E "^  - " <<< "$status" | head -n 1 | sed 's/^  - //')
        if [ -n "$first_team" ]; then
          print_success "Convex account detected: $first_team"
        else
          print_success "Convex CLI already authenticated"
        fi
        if [ -n "$CLI_SESSION_HOME" ]; then
          print_info "Convex CLI config stored under $CLI_SESSION_HOME/.convex"
        fi
        return 0
      fi
    fi
  fi

  print_info "Login to Convex to continue. A browser window will open."
  init_project_names
  local device_name="$PROJECT_DEV_NAME"

  # Run convex login - let it handle browser opening automatically
  print_info "Running 'npx convex login'..."

  set +e
  # Use 'auto' mode which detects the environment and opens browser automatically
  # This works in interactive terminals without prompting
  convex_cli login --device-name "$device_name" --accept-opt-ins
  local login_exit=$?
  set -e

  if [ "$login_exit" -ne 0 ]; then
    print_error "Convex login failed. Run 'npx convex login' manually and rerun the script."
    exit 1
  fi

  # Verify login succeeded by checking for config file
  if [ ! -f "$config_file" ] || [ ! -s "$config_file" ]; then
    print_error "Convex login did not complete. Run 'npx convex login' manually and rerun the script."
    exit 1
  fi

  local status
  status=$(convex_cli login status 2>&1 || echo "")
  local first_team
  first_team=$(grep -E "^  - " <<< "$status" | head -n 1 | sed 's/^  - //')
  if [ -n "$first_team" ]; then
    print_success "Logged into Convex as $first_team"
  else
    print_success "Convex login successful"
  fi
  if [ -n "$CLI_SESSION_HOME" ]; then
    print_info "Convex CLI config stored under $CLI_SESSION_HOME/.convex"
  fi
}

stripe_cli() {
  if [ -n "$CLI_SESSION_HOME" ]; then
    local config_path="$STRIPE_CONFIG_PATH"
    if [ -z "$config_path" ]; then
      config_path="$CLI_SESSION_HOME/.config/stripe/config.toml"
      STRIPE_CONFIG_PATH="$config_path"
      mkdir -p "$(dirname "$config_path")"
    fi
    HOME="$CLI_SESSION_HOME" \
      XDG_CONFIG_HOME="$CLI_SESSION_HOME/.config" \
      CLI_OVERRIDE_HOME="$CLI_SESSION_HOME" \
      STRIPE_CLI_CONFIG_PATH="$config_path" \
      stripe "$@"
  else
    stripe "$@"
  fi
}

sync_env_to_vercel() {
  local env_file="$1"
  local environment="$2"

  if [ ! -f "$env_file" ]; then
    print_warning "Environment file '$env_file' not found. Skipping Vercel sync."
    return 0
  fi

  print_header "Pushing variables from $env_file to Vercel ($environment)"

  local had_any=false
  while IFS=$'\n' read -r entry; do
    [ -z "$entry" ] && continue
    local key="${entry%%===*}"
    local value="${entry#*===}"
    if [ -z "$key" ]; then
      continue
    fi
    had_any=true
    print_info "Updating $key"
    if vercel_cli env remove "$key" "$environment" --yes >/dev/null 2>&1; then
      print_info "Removed existing value for $key"
    fi
    if ! vercel_cli env add "$key" "$environment" <<< "$value" >/dev/null; then
      print_error "Failed to add $key to Vercel ($environment)."
      exit 1
    fi
    print_success "$key set for Vercel $environment"
  done < <(parse_env_file "$env_file")

  if [ "$had_any" = false ]; then
    print_warning "No variables detected in $env_file."
  fi
}

ensure_vercel_logged_in() {
  if vercel_cli whoami >/dev/null 2>&1; then
    local user
    user=$(vercel_cli whoami 2>/dev/null || echo "unknown")
    print_success "Vercel account detected: $user"
    if [ -n "$CLI_SESSION_HOME" ]; then
      print_info "Vercel CLI config stored under $CLI_SESSION_HOME/.config"
    fi
    return 0
  fi
  print_info "Login to Vercel to continue. A browser window may open."
  if [ "$PROMPT_MODE" = "auto" ]; then
    if ! printf '\n\n' | vercel_cli login; then
      print_error "Vercel login failed."
      exit 1
    fi
  else
    vercel_cli login
  fi
  if vercel_cli whoami >/dev/null 2>&1; then
    print_success "Logged into Vercel as $(vercel_cli whoami)"
    if [ -n "$CLI_SESSION_HOME" ]; then
      print_info "Vercel CLI config stored under $CLI_SESSION_HOME/.config"
    fi
  else
    print_error "Vercel login failed."
    exit 1
  fi
}

ensure_node_dependencies() {
  # Check if node_modules exists and has convex package with proper files
  local needs_install=false
  if [ ! -d "node_modules" ]; then
    needs_install=true
  elif [ ! -d "node_modules/convex" ]; then
    needs_install=true
  elif [ ! -f "node_modules/convex/package.json" ]; then
    # convex exists but is corrupted/empty
    needs_install=true
  fi

  if [ "$needs_install" = false ]; then
    print_success "npm dependencies already installed"
    return 0
  fi

  print_header "Installing npm dependencies"
  print_info "Running npm install so Convex can bundle the project."
  if npm install; then
    print_success "npm install complete"
  else
    print_error "npm install failed. Fix the errors above and rerun the script."
    exit 1
  fi
}

ensure_stripe_cli() {
  if command_exists stripe; then
    print_success "Stripe CLI detected"
    return 0
  fi
  print_warning "Stripe CLI not found. Install it from https://stripe.com/docs/stripe-cli to enable local webhook forwarding."
  return 1
}

handle_stripe_setup() {
  local env_file=".env.local"
  if [ ! -f "$env_file" ]; then
    print_warning "Cannot configure Stripe because $env_file is missing."
    return
  fi

  local existing_key
  existing_key=$(get_env_value "$env_file" "STRIPE_SECRET_KEY")

  local stripe_cli_status=1
  if ensure_stripe_cli; then
    stripe_cli_status=0
  fi

  local cli_entry=""
  if [ "$stripe_cli_status" -eq 0 ]; then
    cli_entry=$(discover_stripe_cli_key)
    cli_entry=${cli_entry//$'\n'/}

    if [ -z "$cli_entry" ]; then
      local default_choice="n"
      if [ "$STRIPE_LOGOUT_PERFORMED" = true ] || [ "$PROMPT_MODE" = "auto" ]; then
        default_choice="y"
      fi
      print_warning "Stripe CLI does not appear to be logged in."
      if prompt_confirm "Run 'stripe login' now to connect a Stripe account?" "$default_choice"; then
        if [ "$PROMPT_MODE" = "auto" ]; then
          if stripe_cli login <<< $'y\n\n'; then
            cli_entry=$(discover_stripe_cli_key)
            cli_entry=${cli_entry//$'\n'/}
            print_success "Stripe CLI login complete"
            if [ -n "$CLI_SESSION_HOME" ]; then
              print_info "Stripe CLI config stored at ${STRIPE_CONFIG_PATH:-$CLI_SESSION_HOME/.config/stripe/config.toml}"
            fi
          else
            print_warning "Stripe login did not finish successfully."
          fi
        else
          if stripe_cli login; then
            cli_entry=$(discover_stripe_cli_key)
            cli_entry=${cli_entry//$'\n'/}
            print_success "Stripe CLI login complete"
            if [ -n "$CLI_SESSION_HOME" ]; then
              print_info "Stripe CLI config stored at ${STRIPE_CONFIG_PATH:-$CLI_SESSION_HOME/.config/stripe/config.toml}"
            fi
          else
            print_warning "Stripe login did not finish successfully."
          fi
        fi
      fi
    fi

    if [ -z "$existing_key" ] && [ -n "$cli_entry" ]; then
      local cli_key="${cli_entry%%===*}"
      local cli_profile="${cli_entry#*===}"
      if [ -n "$cli_key" ]; then
        local masked
        masked=$(mask_key "$cli_key")
        if prompt_confirm "Use Stripe CLI test key for profile '${cli_profile:-default}' (${masked})?" "y"; then
          set_env_value "$env_file" "STRIPE_SECRET_KEY" "$cli_key"
          existing_key="$cli_key"
          print_success "Saved STRIPE_SECRET_KEY from Stripe CLI profile '${cli_profile:-default}'"
        fi
      fi
    fi
  fi

  if [ -z "$existing_key" ]; then
    if [ "$PROMPT_MODE" != "ask" ]; then
      print_warning "Skipping manual Stripe key entry (run with --ask or add STRIPE_SECRET_KEY manually)."
      return
    fi
    if prompt_confirm "Provide a Stripe test secret key now (enables billing flows)?" "n"; then
      local input_key
      while true; do
        read -rsp "Paste your Stripe test secret key (sk_test_...): " input_key
        echo
        if [ -z "$input_key" ]; then
          print_warning "No key entered. Try again or press Ctrl+C to abort."
          continue
        fi
        if [[ "$input_key" != sk_test_* ]]; then
          if prompt_confirm "Key does not start with sk_test_. Use it anyway?" "n"; then
            break
          else
            continue
          fi
        fi
        break
      done

      set_env_value "$env_file" "STRIPE_SECRET_KEY" "$input_key"
      existing_key="$input_key"
      print_success "Saved STRIPE_SECRET_KEY to $env_file"
    else
      print_warning "Skipping Stripe automation. Add STRIPE_SECRET_KEY to $env_file when ready."
      return
    fi
  else
    print_success "Found STRIPE_SECRET_KEY in $env_file"
  fi

  if [ ! -f "scripts/setup-stripe.mjs" ]; then
    print_warning "Stripe setup script not found. Skipping Stripe automation."
    return
  fi

  if [ "$stripe_cli_status" -ne 0 ]; then
    print_warning "Install the Stripe CLI to enable automatic Stripe setup and webhook forwarding."
    return
  fi

  if prompt_confirm "Run Stripe product bootstrap script now?" "y"; then
    if node scripts/setup-stripe.mjs; then
      print_success "Stripe plans verified"
    else
      print_warning "Stripe setup script reported an error. Review the output above and rerun 'node scripts/setup-stripe.mjs' when resolved."
    fi
  else
    print_info "You can run 'node scripts/setup-stripe.mjs' later to sync Stripe plans."
  fi
}

ensure_auth_secret() {
  local env_file=".env.local"
  if [ ! -f "$env_file" ]; then
    return
  fi
  local current
  current=$(get_env_value "$env_file" "AUTH_SECRET")
  if [ -n "$current" ]; then
    print_success "Found AUTH_SECRET in $env_file"
    return
  fi
  local generated
  generated=$(python3 - <<'PY'
import os, base64
random_bytes = os.urandom(32)
print(base64.b64encode(random_bytes).decode('ascii'))
PY
  )
  if [ -z "$generated" ]; then
    print_warning "Failed to generate AUTH_SECRET automatically."
    return
  fi
  set_env_value "$env_file" "AUTH_SECRET" "$generated"
  print_success "Generated AUTH_SECRET and saved to $env_file"
}

ensure_google_credentials() {
  local env_file=".env.local"
  if [ ! -f "$env_file" ]; then
    touch "$env_file"
    print_info "Created $env_file to store environment variables."
  fi

  local google_console_url="https://console.cloud.google.com/apis/credentials"
  local opened_google_console=false

  local client_id
  client_id=$(get_env_value "$env_file" "GOOGLE_CLIENT_ID")
  if [ -z "$client_id" ]; then
    if [ "$opened_google_console" = false ]; then
      if open_url "$google_console_url"; then
        opened_google_console=true
      else
        print_info "Configure Google OAuth credentials at $google_console_url."
      fi
    fi
    print_info "Configure Google OAuth credentials (create at $google_console_url)."
    while true; do
      read -rp "Enter Google OAuth Client ID: " client_id
      if [ -n "$client_id" ]; then
        break
      fi
      print_warning "Client ID cannot be empty."
    done
    set_env_value "$env_file" "GOOGLE_CLIENT_ID" "$client_id"
    print_success "Saved GOOGLE_CLIENT_ID to $env_file"
  else
    print_success "Found GOOGLE_CLIENT_ID in $env_file"
  fi

  local client_secret
  client_secret=$(get_env_value "$env_file" "GOOGLE_CLIENT_SECRET")
  if [ -z "$client_secret" ]; then
    if [ "$opened_google_console" = false ]; then
      if open_url "$google_console_url"; then
        opened_google_console=true
      else
        print_info "Configure Google OAuth credentials at $google_console_url."
      fi
    fi
    while true; do
      read -rsp "Enter Google OAuth Client Secret: " client_secret
      echo
      if [ -n "$client_secret" ]; then
        break
      fi
      print_warning "Client secret cannot be empty."
    done
    set_env_value "$env_file" "GOOGLE_CLIENT_SECRET" "$client_secret"
    print_success "Saved GOOGLE_CLIENT_SECRET to $env_file"
  else
    print_success "Found GOOGLE_CLIENT_SECRET in $env_file"
  fi
}

ensure_resend_credentials() {
  local env_file=".env.local"
  if [ ! -f "$env_file" ]; then
    touch "$env_file"
    print_info "Created $env_file to store environment variables."
  fi

  local resend_api_key
  resend_api_key=$(get_env_value "$env_file" "RESEND_API_KEY")

  if [ -n "$resend_api_key" ]; then
    print_success "Found RESEND_API_KEY in $env_file"

    # Also check EMAIL_FROM
    local email_from
    email_from=$(get_env_value "$env_file" "EMAIL_FROM")
    if [ -z "$email_from" ]; then
      print_warning "EMAIL_FROM not set. Using default 'noreply@yourdomain.com'"
      set_env_value "$env_file" "EMAIL_FROM" "noreply@yourdomain.com"
    else
      print_success "Found EMAIL_FROM in $env_file"
    fi
    return 0
  fi

  # Resend not configured yet
  print_info "Resend is used to send email invitations to team members."

  if ! prompt_confirm "Configure Resend API key now (enables email invitations)?" "y"; then
    print_warning "Skipping Resend setup. Email invitations will not work until configured."
    print_info "You can add RESEND_API_KEY to $env_file later."
    return 0
  fi

  local resend_dashboard_url="https://resend.com/api-keys"
  print_info "Opening Resend dashboard to create an API key..."
  if open_url "$resend_dashboard_url"; then
    print_info "Opened $resend_dashboard_url in your browser."
  else
    print_info "Please visit $resend_dashboard_url to create an API key."
  fi

  print_info "Create a new API key in Resend:"
  print_info "  1. Sign up or log in to Resend"
  print_info "  2. Go to API Keys section"
  print_info "  3. Click 'Create API Key'"
  print_info "  4. Give it a name (e.g., 'Development')"
  print_info "  5. Copy the API key (starts with 're_')"

  while true; do
    read -rsp "Paste your Resend API key: " resend_api_key
    echo
    if [ -n "$resend_api_key" ]; then
      if [[ "$resend_api_key" == re_* ]]; then
        break
      else
        print_warning "Resend API keys typically start with 're_'. Use it anyway?"
        if prompt_confirm "Continue with this key?" "n"; then
          break
        fi
      fi
    else
      print_warning "API key cannot be empty. Press Ctrl+C to skip."
    fi
  done

  set_env_value "$env_file" "RESEND_API_KEY" "$resend_api_key"
  print_success "Saved RESEND_API_KEY to $env_file"

  # Configure EMAIL_FROM
  local email_from
  read -rp "Enter the 'From' email address (e.g., noreply@yourdomain.com): " email_from
  if [ -z "$email_from" ]; then
    email_from="noreply@yourdomain.com"
    print_info "Using default: $email_from"
  fi
  set_env_value "$env_file" "EMAIL_FROM" "$email_from"
  print_success "Saved EMAIL_FROM to $env_file"

  print_info "Note: You need to verify your domain in Resend before sending emails."
  print_info "Visit https://resend.com/domains to add and verify your domain."
}

run_convex_setup() {
  print_header "Configuring Convex development deployment"
  print_info "A Convex browser window may open. Choose 'Create new project' when prompted."
  print_info "This will update your .env.local with fresh Convex keys."
  ensure_convex_logged_in
  init_project_names

  print_info "Initializing Convex project..."
  local convex_exit=0
  if [ "$PROMPT_MODE" = "auto" ]; then
    # In auto mode, provide answers via stdin
    if ! printf 'new\n%s\n' "$PROJECT_SLUG" | convex_cli dev --once --configure new --project "$PROJECT_SLUG" --tail-logs disable --typecheck disable 2>&1; then
      convex_exit=$?
    fi
  else
    # In ask mode, let the user interact
    if ! convex_cli dev --once --configure new --project "$PROJECT_SLUG" --tail-logs disable --typecheck disable 2>&1; then
      convex_exit=$?
    fi
  fi

  if [ $convex_exit -ne 0 ]; then
    print_error "Convex deployment initialization failed."
    print_error "This may be due to missing dependencies. Try running 'npm install' and rerun the script."
    exit 1
  fi

  print_success "Convex dev deployment ready and .env.local updated."
  if [ -n "$CLI_SESSION_HOME" ]; then
    print_info "Convex credentials stored at $CLI_SESSION_HOME/.convex/config.json"
  fi

  # Prompt for Convex Admin Key (needed for production)
  echo ""
  print_header "Convex Admin Key (for production deployment)"
  print_info "The Convex Admin Key is required for NextAuth in production"
  print_info "You can get it from: https://dashboard.convex.dev"
  print_info "→ Select your deployment → Settings → Deploy keys"
  print_info "→ Copy the 'Deploy key' value"
  echo ""

  if prompt_confirm "Do you want to add the Convex Admin Key now?" "n"; then
    read -p "Enter your Convex Admin Key: " convex_admin_key
    if [ -n "$convex_admin_key" ]; then
      if grep -q "^CONVEX_ADMIN_KEY=" .env.local 2>/dev/null; then
        # Update existing
        if [[ "$OSTYPE" == "darwin"* ]]; then
          sed -i '' "s|^CONVEX_ADMIN_KEY=.*|CONVEX_ADMIN_KEY=$convex_admin_key|" .env.local
        else
          sed -i "s|^CONVEX_ADMIN_KEY=.*|CONVEX_ADMIN_KEY=$convex_admin_key|" .env.local
        fi
      else
        # Add new
        echo "CONVEX_ADMIN_KEY=$convex_admin_key" >> .env.local
      fi
      print_success "Convex Admin Key saved to .env.local"
    fi
  else
    print_info "Skipping Convex Admin Key. You can add it later to .env.local"
    print_info "It will be required when deploying to production"
  fi
}

main() {
  local positional=()
  for arg in "$@"; do
    case "$arg" in
      --ask|ask)
        PROMPT_MODE="ask"
        ;;
      --auto|auto)
        PROMPT_MODE="auto"
        ;;
      --help|-h)
        cat <<'USAGE'
Usage: ./scripts/setup-development.sh [--ask|ask|--auto|auto]

  --ask   Prompt for confirmations
  --auto  Auto-accept defaults without prompting (default)

Omit arguments to auto-accept defaults.
USAGE
        return 0
        ;;
      *)
        positional+=("$arg")
        ;;
    esac
  done

  if [ ${#positional[@]} -gt 0 ]; then
    print_error "Unknown argument: ${positional[0]}"
    exit 1
  fi

  print_header "SaaS Template - Development Bootstrap"

  if [ ! -f "package.json" ]; then
    print_error "Run this script from the project root (where package.json lives)."
    exit 1
  fi

  init_project_names
  prepare_cli_home

  print_header "Checking prerequisites"
  if ! command_exists vercel; then
    print_error "Vercel CLI not found. Install with: npm install -g vercel"
    exit 1
  fi
  print_success "Vercel CLI detected"

  if ! command_exists npx; then
    print_error "npx is required (install Node.js)."
    exit 1
  fi
  print_success "npx available"

  if ! command_exists npm; then
    print_error "npm is required (install Node.js)."
    exit 1
  fi
  print_success "npm available"

  if ! command_exists python3; then
    print_error "python3 is required for parsing environment variables."
    exit 1
  fi
  print_success "python3 available"

  if ! command_exists grep; then
    print_error "grep command missing."
    exit 1
  fi

  ensure_node_dependencies

  local logout_default="y"
  if [ "$PROMPT_MODE" = "auto" ]; then
    logout_default="n"
  fi

  if prompt_confirm "Force logout from Vercel and Convex for fresh credentials?" "$logout_default"; then
    print_info "Signing out of Vercel (respond to any prompts in the terminal)"
    if vercel_cli logout; then
      print_success "Signed out of Vercel"
    else
      print_warning "Vercel logout failed (you may already be logged out)."
    fi

    print_info "Signing out of Convex"
    if convex_cli logout; then
      print_success "Signed out of Convex"
    else
      print_warning "Convex logout failed (you may already be logged out)."
    fi

    if command_exists stripe; then
      print_info "Signing out of Stripe CLI"
      if stripe_cli logout --all; then
        STRIPE_LOGOUT_PERFORMED=true
        print_success "Signed out of Stripe CLI"
      else
        print_warning "Stripe logout failed (you may already be logged out)."
      fi
    else
      print_warning "Stripe CLI not detected; skipping Stripe logout."
    fi
  fi

  ensure_vercel_logged_in

  if [ ! -f ".env.local" ]; then
    print_warning ".env.local not found. Creating an empty one so Convex can populate it."
    touch .env.local
  fi

  run_convex_setup

  ensure_auth_secret

  ensure_google_credentials

  ensure_resend_credentials

  handle_stripe_setup

  print_header "Creating Vercel project"
  init_project_names
  local project_name="$PROJECT_DEV_NAME"
  if [ "$PROMPT_MODE" = "ask" ]; then
    read -rp "Enter a name for the new Vercel project [${project_name}]: " project_input
    project_name="${project_input:-$project_name}"
  else
    print_info "Using Vercel project name: $project_name"
  fi

  print_info "Creating project '$project_name'"
  vercel_cli project add "$project_name"
  print_success "Vercel project '$project_name' created"

  print_info "Linking current directory to '$project_name'"
  vercel_cli link --project "$project_name" --yes
  print_success "Linked to Vercel project '$project_name'"

  if prompt_confirm "Push values from .env.local to the Vercel development environment?" "y"; then
    sync_env_to_vercel ".env.local" "development"
  else
    print_warning "Skipped syncing environment variables to Vercel."
  fi

  print_header "Setup Complete!"

  print_success "Your development environment is ready!"
  echo

  print_header "IMPORTANT: Complete these final steps"

  echo -e "${YELLOW}1. Configure Google OAuth Redirect URI${NC}"
  echo -e "   ${BLUE}→${NC} Open: ${BLUE}https://console.cloud.google.com/apis/credentials${NC}"
  echo -e "   ${BLUE}→${NC} Find your OAuth client and add this redirect URI:"
  echo -e "   ${GREEN}http://localhost:3000/api/auth/callback/google${NC}"
  echo

  # Check if Resend was configured
  local resend_key
  resend_key=$(get_env_value ".env.local" "RESEND_API_KEY")
  if [ -n "$resend_key" ]; then
    echo -e "${YELLOW}2. Configure Resend Email Domain (for invitations)${NC}"
    echo -e "   ${BLUE}→${NC} Open: ${BLUE}https://resend.com/domains${NC}"
    echo -e "   ${BLUE}→${NC} Add and verify your domain to send emails"
    echo -e "   ${BLUE}→${NC} OR use the test email (onboarding@resend.dev) which only sends to your account email"
    echo -e "   ${BLUE}→${NC} Update EMAIL_FROM in .env.local with your verified domain email"
    echo
  fi

  print_header "Start Developing"
  echo "Run the development server:"
  echo -e "  ${GREEN}npm run dev${NC}"
  echo
  echo -e "Then open: ${BLUE}http://localhost:3000${NC}"
  echo

  print_info "Additional notes:"
  echo "  - Your CLI credentials are stored in: ${PWD}/.dev-cli/"
  echo "  - Environment variables are in: ${PWD}/.env.local"
  if [ -n "$resend_key" ]; then
    echo "  - Test email invitations will only work after domain verification"
  fi
  echo "  - For production deployment, run: npm run deploy:prod"
}

main "$@"
