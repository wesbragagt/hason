#!/bin/bash
set -e

# Docker build script for Hason
# Usage: ./scripts/docker-build.sh [tag]

TAG=${1:-"hason:latest"}
DOCKERFILE=${2:-"Dockerfile.optimized"}

echo "🐳 Building Hason Docker image..."
echo "Tag: $TAG"
echo "Dockerfile: $DOCKERFILE"
echo

# Build the image
docker build \
    --file "$DOCKERFILE" \
    --tag "$TAG" \
    --build-arg BUILDKIT_INLINE_CACHE=1 \
    .

echo
echo "✅ Build complete!"
echo "🚀 To run the container:"
echo "   docker run -p 3000:80 $TAG"
echo
echo "🔧 To run with docker-compose:"
echo "   docker-compose up"
echo
echo "📊 Image size:"
docker images "$TAG" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"