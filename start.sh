#!/bin/bash
set -e

echo ""
echo "Commercial ASE Coverage — Setup"
echo "================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "ERROR: Node.js is not installed."
  echo "Install it from https://nodejs.org/ (version 20 or above), then re-run this script."
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "ERROR: Node.js version 20+ is required. You have $(node -v)."
  echo "Upgrade from https://nodejs.org/ then re-run."
  exit 1
fi

echo "✓ Node.js $(node -v)"

# Check Snowflake connection config
TOML="$HOME/.snowflake/connections.toml"
if [ ! -f "$TOML" ]; then
  echo ""
  echo "ERROR: Snowflake connection config not found at ~/.snowflake/connections.toml"
  echo ""
  echo "Create that file with the following content (replace YOUR_USERNAME):"
  echo ""
  echo "  [default]"
  echo "  account   = \"sfcogsops-snowhouse_aws_us_west_2\""
  echo "  user      = \"YOUR_USERNAME\""
  echo "  authenticator = \"externalbrowser\""
  echo "  role      = \"SALES_ENGINEER\""
  echo "  warehouse = \"SNOWADHOC\""
  echo ""
  exit 1
fi

echo "✓ Snowflake config found"

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install --silent

echo "✓ Dependencies installed"
echo ""
echo "Starting app on http://localhost:3000"
echo "First load takes 30-60s while data is fetched from Snowflake."
echo "Press Ctrl+C to stop."
echo ""

npm run dev
