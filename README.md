# Hason - JSON Formatter PWA

A fast, modern JSON formatter and processor that works offline. Transform, validate, and format JSON data with jq filters in your browser.

![Hason JSON Formatter Screenshot](src/assets/hason-screenshot.png)

## 🏗️ Project Structure

```
hason/
├── src/
│   ├── lib/jq-wasm/    # WebAssembly jq processor
│   ├── components/     # React components
│   ├── App.tsx         # Main application
│   └── main.tsx        # Application entry
├── public/             # Static assets
├── tests/              # Unit, integration, and e2e tests
├── docs/               # Documentation (Nix setup, etc.)
└── .github/            # CI/CD workflows
```

## What Problem Does This Solve?

- **Complex JSON Processing**: Parse and transform large JSON datasets using powerful jq syntax
- **Offline Capability**: Works without internet connection as a Progressive Web App
- **Developer Productivity**: Quickly format, validate, and extract data from JSON responses
- **Cross-Platform**: Runs in any modern browser, installable as a native app

## Key Features

- 🔄 **jq Filtering**: Advanced JSON processing with jq syntax
- 📱 **PWA Support**: Install as an app, works offline  
- 🎨 **Multiple Themes**: Light/dark mode with theme switching
- 📋 **Copy Support**: One-click clipboard copying
- 🔗 **URL State**: Share JSON and filters via URL
- ⚡ **Fast**: Built with Vite for instant HMR

## Quick Start

```bash
# Clone and setup
git clone <your-repo-url>
cd hason

# Install dependencies
npm install

# Setup jq for development (if using Nix)
npm run setup:jq

# Start development server
npm run dev
```

Visit `http://localhost:5173` to start formatting JSON.

### 🐳 Docker Deployment

Quick start with Docker:

```bash
# Build and run locally
docker-compose up

# Or use pre-built image
docker run -p 3000:80 ghcr.io/wesbragagt/hason:latest
```

Visit `http://localhost:3000` to access the application.

See [Docker Documentation](docs/docker.md) for advanced deployment options, Kubernetes configs, and troubleshooting.

### Using the jq-wasm Library

The jq WebAssembly processor is integrated into the application:

```typescript
import { promised, JQ_VERSION } from '@/lib/jq-wasm';

// Process JSON with jq filter
const result = await promised({ name: "John", age: 30 }, '.name');
console.log(result); // "John"

// Get jq version
console.log(JQ_VERSION); // "1.8.1"
```

## Architecture

**Tech Stack**: React 19, TypeScript, Vite 6, PWA with Workbox  
**Build System**: Nix for reproducible jq WebAssembly builds  
**Package Manager**: npm  
**Testing**: Vitest (unit) + Playwright (e2e)

## Available Commands

### Development Commands
```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run test             # Run unit and integration tests
npm run test:e2e         # Run end-to-end tests
npm run lint             # Lint code
npm run preview          # Preview production build
```

### Nix Commands (for WASM builds)
```bash
nix run .#setup-jq                                    # Setup jq binary
nix run .#build-jq-wasm                               # Build and copy WASM files
nix run .#copy-wasm-to-app                            # Copy WASM to app
nix run .#update-jq-version -- "1.9.0" "jq-1.9.0" "sha256-hash"  # Update jq version
```

For detailed setup instructions, build configuration, and Nix development environment, see [docs/nix.md](docs/nix.md).

## License

MIT