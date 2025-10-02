# Hason - JSON Formatter PWA

A modern, fast JSON formatter built with React 19, TypeScript, and Vite. Features offline support, jq filtering, and reproducible builds with Nix.

## 🚀 Getting Started

### Prerequisites

1. **Install Nix** (required for reproducible jq builds):
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf -L https://install.determinate.systems/nix | sh -s -- install
   ```
   
2. **Install Node.js 24** (if not using Nix dev shell):
   ```bash
   # Using nvm (recommended)
   nvm use
   
   # Or install Node.js 24 using your preferred installer
   ```

### Development Setup

Run these commands in sequence:

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd hason

# 2. Enter Nix development shell (recommended)
nix develop

# 3. Install dependencies and setup jq binary
npm ci  # This automatically runs setup:jq via postinstall

# 4. Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Alternative Setup (without Nix dev shell)

If you prefer to use your system Node.js:

```bash
# Ensure you're using Node.js 24
nvm use  # if using nvm

# Install dependencies (this will auto-run setup:jq)
npm ci

# Start development server
npm run dev
```

## 🛠️ Available Scripts

### Development
- `npm run dev` - Start development server
- `npm run setup:jq` - Build jq binary for local development
- `npm run preview` - Preview production build

### Building
- `npm run build` - Build for production
- `npm run lint` - Run oxlint on source code

### Testing
- `npm test` - Run unit and integration tests
- `npm run test:coverage` - Run tests with coverage
- `npm run test:e2e` - Run end-to-end tests
- `npm run test:e2e:headed` - Run E2E tests with browser visible
- `npm run test:e2e:ui` - Run E2E tests with Playwright UI

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 19 with TypeScript
- **Build Tool**: Vite 6 with React plugin
- **PWA**: Vite PWA plugin with Workbox
- **Testing**: Vitest (unit/integration) + Playwright (e2e)
- **Linting**: oxlint
- **Build System**: Nix for reproducible jq builds

### Key Features
- 🔄 **jq Filtering**: Advanced JSON processing with jq syntax
- 📱 **PWA Support**: Install as an app, works offline
- 🎨 **Multiple Themes**: Light/dark mode with theme switching
- 📋 **Copy Support**: One-click clipboard copying
- 🔗 **URL State**: Share JSON and filters via URL
- ⚡ **Fast**: Built with Vite for instant HMR

### Project Structure
```
src/
├── App.tsx              # Main application component
├── components/          # Reusable UI components
├── lib/                 # Utilities and jq-wasm integration
└── assets/              # Static assets

tests/
├── integration/         # Integration tests
└── e2e/                 # End-to-end tests

public/
└── jq*                  # jq binaries (built by CI, gitignored)
```

## 🔧 Development Notes

### jq Binary Management
- jq binaries are **not committed** to git (public/jq* is gitignored)
- Built automatically by CI and local development using Nix
- `npm ci` automatically runs `setup:jq` via postinstall hook
- Setup script (`scripts/setup-dev-jq.sh`):
  1. Tries to build with Nix (preferred)
  2. Falls back to system jq if available
  3. Shows setup instructions if neither available

### Node.js Version
- **Node.js 24** specified in `.nvmrc`
- Use `nvm use` to match the project version
- CI automatically uses the `.nvmrc` version

### Nix Development
- Use `nix develop` for consistent development environment
- Includes Node.js 24, npm, jq, oxlint, and all development tools
- Ensures same versions across all developers
- Development shell matches CI environment exactly

### CI/CD
- **GitHub Actions** with Magic Nix Cache for fast builds
- **Pull request validation** with comprehensive testing
- **Reproducible jq builds** using Nix on every run
- **Node.js caching** for fast npm install

## 🧪 Testing

### Unit & Integration Tests
```bash
npm test                 # Run once
npm run test:coverage    # With coverage
```

### End-to-End Tests
```bash
npm run test:e2e         # Headless
npm run test:e2e:headed  # With browser visible
npm run test:e2e:ui      # Interactive UI
```

### Nix Build Validation
```bash
nix flake check          # Validate flake
nix build .#jq          # Build jq binary
```

## 📦 Deployment

### GitHub Pages (Automatic)
- Pushes to `main` automatically deploy
- jq binary built fresh on each deployment
- Available at your GitHub Pages URL

### Manual Deployment
```bash
npm run build           # Build with CI-built jq
# Deploy dist/ directory to your hosting provider
```

## 🤝 Contributing

1. Ensure you have Nix installed
2. Run the development setup commands
3. Make your changes
4. Run tests: `npm test && npm run test:e2e`
5. Submit a pull request

Pull requests automatically run:
- Linting with oxlint
- TypeScript checking
- Unit/integration tests
- E2E tests
- Nix build validation

## 📄 License

[Your License Here]