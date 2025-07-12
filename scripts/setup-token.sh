#!/bin/bash

# Secure API token setup script
# This script safely updates the .env file without exposing tokens in shell history

echo "🔐 CourtListener MCP - Secure Token Setup"
echo "========================================"
echo ""
echo "This script will securely update your .env file with your API token."
echo "The token will not appear in shell history or process lists."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
fi

echo "Please enter your CourtListener API token:"
echo "(Input will be hidden for security)"
read -s API_TOKEN

if [ -z "$API_TOKEN" ]; then
    echo "❌ No token provided. Exiting."
    exit 1
fi

# Validate token format (should be 40 hex characters)
if [[ ! "$API_TOKEN" =~ ^[a-f0-9]{40}$ ]]; then
    echo "⚠️  Warning: Token doesn't match expected format (40 hex characters)"
    echo "Do you want to continue anyway? (y/N)"
    read -n 1 CONFIRM
    echo ""
    if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
        echo "❌ Setup cancelled."
        exit 1
    fi
fi

# Update .env file
if grep -q "COURTLISTENER_API_TOKEN=" .env; then
    # Replace existing token
    sed -i "s/COURTLISTENER_API_TOKEN=.*/COURTLISTENER_API_TOKEN=$API_TOKEN/" .env
    echo "✅ Updated existing API token in .env"
else
    # Add new token
    echo "COURTLISTENER_API_TOKEN=$API_TOKEN" >> .env
    echo "✅ Added API token to .env"
fi

# Clear the variable from memory
unset API_TOKEN

echo ""
echo "🎉 Setup complete! Your API token is now configured."
echo "You can now run:"
echo "  npm run demo"
echo "  npm run demo:ollama" 
echo "  npm test"
echo ""
echo "💡 Your token is stored securely in .env (gitignored)"

# Test the configuration
echo "🔍 Testing configuration..."
npm run check-env
