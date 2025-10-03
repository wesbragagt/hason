#!/usr/bin/env bash

set -euo pipefail

# Script to update jq version across the project
# Usage: ./update-jq-version.sh <version> <revision> <sha256>
# Example: ./update-jq-version.sh "1.7.2" "jq-1.7.2" "sha256-newhashere"

if [ $# -ne 3 ]; then
    echo "Usage: $0 <version> <revision> <sha256>"
    echo "Example: $0 \"1.7.2\" \"jq-1.7.2\" \"sha256-newhashere\""
    exit 1
fi

VERSION="$1"
REVISION="$2"
SHA256="$3"

echo "🔄 Updating jq version to $VERSION..."

# Update public/jq-version.json
echo "📝 Updating public/jq-version.json..."
cat > public/jq-version.json << EOF
{
  "version": "$VERSION",
  "revision": "$REVISION", 
  "sha256": "$SHA256"
}
EOF

# Update TypeScript version config fallback
echo "📝 Updating src/lib/jq-version.ts fallback..."
sed -i "s/version: \"[^\"]*\"/version: \"$VERSION\"/g" src/lib/jq-version.ts
sed -i "s/revision: \"[^\"]*\"/revision: \"$REVISION\"/g" src/lib/jq-version.ts
sed -i "s/sha256: \"[^\"]*\"/sha256: \"$SHA256\"/g" src/lib/jq-version.ts

# Update flake lock if needed
echo "🔄 Updating flake.lock..."
nix flake update

echo "✅ jq version updated to $VERSION"
echo "🔨 Run './build-jq-wasm.sh' to rebuild with the new version"