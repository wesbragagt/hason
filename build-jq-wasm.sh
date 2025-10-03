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

# Copy output to app public directory and jq-hason package
echo "📁 Copying WASM files to directories..."
cp -v result/lib/jq*.js packages/app/public/
cp -v result/lib/jq*.wasm packages/app/public/
cp -v result/lib/jq*.js packages/jq-hason/src/wasm/
cp -v result/lib/jq*.wasm packages/jq-hason/src/wasm/

echo "✅ jq WASM module built successfully!"
echo "📂 Files available in packages/app/public/ and packages/jq-hason/src/wasm/ directories:"
ls -la packages/app/public/jq*
ls -la packages/jq-hason/src/wasm/jq*