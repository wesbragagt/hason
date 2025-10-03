#!/bin/bash
set -e

echo "🔧 Setting up jq for local development..."

# Check if Nix is available
if command -v nix &> /dev/null; then
    echo "Using Nix to build jq binary..."
    
    # Build jq with Nix
    nix build .#jq -o jq-build
    
    # Prepare jq files for app
    mkdir -p packages/app/public
    cp jq-build/bin/jq packages/app/public/jq
    chmod +x packages/app/public/jq
    
    echo "✓ jq binary built with Nix: $(packages/app/public/jq --version)"
    
elif command -v jq &> /dev/null; then
    echo "Using system jq binary..."
    
    # Use system jq
    mkdir -p packages/app/public
    cp "$(which jq)" packages/app/public/jq
    chmod +x packages/app/public/jq
    
    echo "✓ Using system jq: $(packages/app/public/jq --version)"
    
else
    echo "❌ Neither Nix nor system jq found!"
    echo "Please install either:"
    echo "  1. Nix: https://nixos.org/download.html"
    echo "  2. jq: https://stedolan.github.io/jq/download/"
    exit 1
fi

echo "🎉 jq setup complete! You can now run:"
echo "  pnpm run dev"