#!/usr/bin/env bash

set -euo pipefail

echo "🔨 Building jq WebAssembly module..."

# Check if we're in a Nix environment
if ! command -v emcc &> /dev/null; then
    echo "❌ Emscripten not found. Please run 'direnv allow' or 'nix develop' first."
    exit 1
fi

# Build using Nix
echo "📦 Building jq-wasm package with Nix..."
nix build .#jq-wasm

# Copy output to public directory
echo "📁 Copying WASM files to public directory..."
cp -v result/lib/jq*.js public/
cp -v result/lib/jq*.wasm public/

echo "✅ jq WASM module built successfully!"
echo "📂 Files available in public/ directory:"
ls -la public/jq*