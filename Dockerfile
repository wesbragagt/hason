# Multi-stage build using Nix for WASM + Node.js for SPA
FROM nixos/nix:latest AS builder

# Install basic tools needed for the build
RUN nix-env -iA nixpkgs.git nixpkgs.curl nixpkgs.which

# Enable experimental features for flakes
RUN echo "experimental-features = nix-command flakes" >> /etc/nix/nix.conf

# Copy source code
WORKDIR /app
COPY . .

# Build jq WASM files using Nix
RUN nix run .#copy-wasm-to-app

# Install Node.js and pnpm through Nix for consistent environment
RUN nix-env -iA nixpkgs.nodejs_20 nixpkgs.nodePackages.pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the application
RUN pnpm run build

# Verify WASM files are in the build output
RUN ls -la packages/app/dist/ && \
    find packages/app/dist/ -name "jq*" -type f | head -5

# Production stage - lightweight nginx container
FROM nginx:alpine AS production

# Copy nginx configuration
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
    listen 80;
    listen [::]:80;
    server_name localhost;
    
    root /usr/share/nginx/html;
    index index.html;
    
    # Enable gzip compression for better performance
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/json
        application/xml+rss
        application/atom+xml
        image/svg+xml
        application/wasm;
    
    # SPA routing - serve index.html for all routes
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|wasm)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Special handling for WASM files with correct MIME type
    location ~* \.wasm$ {
        add_header Content-Type application/wasm;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
EOF

# Copy built application from builder stage
COPY --from=builder /app/packages/app/dist /usr/share/nginx/html

# Create a health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Expose port 80
EXPOSE 80

# Labels for better container management
LABEL org.opencontainers.image.title="Hason - JSON Formatter"
LABEL org.opencontainers.image.description="A WebAssembly-powered JSON formatter with jq support"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.source="https://github.com/wesbragagt/hason"

# Start nginx
CMD ["nginx", "-g", "daemon off;"]