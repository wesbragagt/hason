# Docker Deployment Guide

This guide covers how to build and deploy Hason using Docker containers.

## Overview

Hason uses a multi-stage Docker build process:
1. **Nix Stage**: Builds jq WebAssembly files using the Nix environment
2. **Node.js Stage**: Builds the React SPA and packages everything
3. **Production Stage**: Serves static files via nginx

## Quick Start

### Build and Run Locally

```bash
# Build the Docker image
./scripts/docker-build.sh

# Run with docker-compose
docker-compose up

# Or run directly
docker run -p 3000:80 hason:latest
```

Access the application at http://localhost:3000

### Using Pre-built Images

```bash
# Pull from GitHub Container Registry
docker pull ghcr.io/wesbragagt/hason:latest

# Run the container
docker run -p 3000:80 ghcr.io/wesbragagt/hason:latest
```

## Build Options

### Standard Build (Dockerfile)
- Uses nixos/nix base image throughout
- Simpler but larger final image
- Good for development

```bash
docker build -f Dockerfile -t hason:standard .
```

### Optimized Build (Dockerfile.optimized)
- Multi-stage build with specialized images
- Smaller final image (~50MB vs ~200MB)
- Better for production

```bash
docker build -f Dockerfile.optimized -t hason:optimized .
```

## Production Deployment

### Docker Compose

```yaml
version: '3.8'
services:
  hason:
    image: ghcr.io/wesbragagt/hason:latest
    ports:
      - "80:80"
    restart: unless-stopped
    environment:
      - NODE_ENV=production
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hason
spec:
  replicas: 3
  selector:
    matchLabels:
      app: hason
  template:
    metadata:
      labels:
        app: hason
    spec:
      containers:
      - name: hason
        image: ghcr.io/wesbragagt/hason:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
---
apiVersion: v1
kind: Service
metadata:
  name: hason-service
spec:
  selector:
    app: hason
  ports:
  - port: 80
    targetPort: 80
  type: LoadBalancer
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Node.js environment |
| `PORT` | `80` | Port for nginx to listen on |

### Nginx Configuration

The container includes optimized nginx configuration:
- Gzip compression for all text assets
- Proper MIME type for WebAssembly files
- SPA routing support
- Security headers
- Static asset caching (1 year)

### Health Checks

The container includes built-in health checks:
- HTTP check on `/` endpoint
- 30-second intervals
- 3 retries before marking unhealthy

## Troubleshooting

### Build Issues

**Problem**: Nix build fails
```
Solution: Ensure Docker has enough memory (>4GB recommended)
```

**Problem**: WASM files not found in final image
```bash
# Debug the build process
docker build --target node-builder -t debug .
docker run --rm -it debug sh
ls -la packages/app/public/jq*
```

### Runtime Issues

**Problem**: 404 on refresh
```
Solution: This is expected for SPAs. The nginx config handles this correctly.
```

**Problem**: WASM not loading
```bash
# Check MIME types
curl -I http://localhost:3000/jq.wasm
# Should include: Content-Type: application/wasm
```

### Performance Tuning

For high-traffic deployments:

```nginx
# Add to nginx config
worker_processes auto;
worker_connections 1024;

# Enable HTTP/2
listen 443 ssl http2;
```

## CI/CD Integration

The Docker workflow automatically:
- Builds multi-architecture images (amd64, arm64)
- Pushes to GitHub Container Registry
- Generates Software Bill of Materials (SBOM)
- Tests the built image

### Manual Trigger

```bash
# Trigger Docker build workflow
gh workflow run docker.yml
```

## Security

The production image:
- Runs as non-root user
- Contains no build tools or source code
- Includes security headers
- Uses minimal alpine base image
- Regular security scanning via GitHub

## Image Sizes

| Build Type | Size | Use Case |
|------------|------|----------|
| Standard | ~200MB | Development |
| Optimized | ~50MB | Production |
| Compressed | ~20MB | With gzip |

## Advanced Usage

### Custom Build Args

```bash
docker build \
  --build-arg NODE_VERSION=20 \
  --build-arg PNPM_VERSION=latest \
  -t hason:custom .
```

### Volume Mounts for Development

```bash
docker run -p 3000:80 \
  -v $(pwd)/packages/app/public:/usr/share/nginx/html \
  hason:latest
```

This allows hot-reloading of static assets during development.