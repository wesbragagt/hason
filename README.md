# Hason - JSON Formatter PWA

A fast, modern JSON formatter and processor that works offline. Transform, validate, and format JSON data with jq filters in your browser.

![Hason JSON Formatter Screenshot](src/assets/hason-screenshot.png)

## 🏗️ Project Structure

```
hason/
├── src/
│   ├── components/           # React components
│   │   └── ui/              # shadcn/ui components
│   ├── lib/
│   │   ├── jq-wasm/         # WebAssembly jq processor
│   │   │   └── wasm/        # WASM binaries and JS files
│   │   └── utils.ts         # Utility functions
│   ├── themes/              # Theme definitions
│   ├── assets/              # Static assets (images, etc.)
│   ├── App.tsx              # Main application
│   └── main.tsx             # Application entry point
├── @/                       # shadcn/ui components (alias for src/components/ui)
├── public/                  # Static public assets
├── tests/                   # Test suites
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   ├── e2e/                # End-to-end tests
│   └── fixtures/           # Test data and fixtures
├── docs/                   # Documentation
├── .github/                # CI/CD workflows
└── playwright-report/      # Test reports (generated)
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
git clone https://github.com/wesbragagt/hason.git
cd hason

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173` to start formatting JSON.

> **Note**: The jq WebAssembly files are pre-built and included in the repository. For advanced WASM builds, see the [Nix documentation](docs/nix.md).

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
npm run build            # Build for production (TypeScript + Vite)
npm run preview          # Preview production build

# Testing
npm run test             # Run unit tests (vitest)
npm run test:unit        # Run unit tests
npm run test:integration # Run integration tests
npm run test:all         # Run all tests (unit + integration + e2e)
npm run test:e2e         # Run end-to-end tests (playwright)
npm run test:ui          # Run tests with UI
npm run test:coverage    # Run tests with coverage report

# Code Quality
npm run lint             # Lint code (oxlint)
npm run check            # Type check and lint

# E2E Testing
npm run test:e2e:headed  # Run e2e tests in headed mode
npm run test:e2e:debug   # Debug e2e tests
npm run test:e2e:ui      # Run e2e tests with UI
npm run test:e2e:report  # Show e2e test report
npm run test:e2e:install # Install playwright browsers
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