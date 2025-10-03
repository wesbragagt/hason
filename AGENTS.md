# AGENTS.md

This file provides guidance to AI agents when working with code in this repository.

## Project Overview

This is "hason" - a React-based Progressive Web App (PWA) for JSON formatting. The project is built with Vite, TypeScript, and React 19, configured as a PWA with offline capabilities and update notifications.

## Development Commands

- **Start development server**: `npm run dev`
- **Build for production**: `npm run build` (runs TypeScript compilation then Vite build)
- **Lint code**: `npm run lint`
- **Preview production build**: `npm run preview`

## Architecture

### Tech Stack
- **Frontend**: React 19 with TypeScript
- **Build Tool**: Vite 6 with React plugin
- **PWA**: Vite PWA plugin with Workbox for service worker management
- **Styling**: CSS with standard React patterns
- **Linting**: ESLint 9 with TypeScript and React-specific rules

### Project Structure
```
src/
├── App.tsx              # Main application component
├── main.tsx             # React app entry point
├── PWABadge.tsx         # PWA update notification component
├── vite-env.d.ts        # Vite TypeScript definitions
└── assets/              # Static assets (React logo, etc.)
```

### Key Configuration Files
- `vite.config.ts` - Vite configuration with PWA plugin setup
- `pwa-assets.config.ts` - PWA asset generation configuration
- `eslint.config.js` - ESLint configuration for TypeScript/React
- `tsconfig.json` - TypeScript project references
- `package.json` - Project dependencies and scripts

### PWA Features
The app is configured as a PWA with:
- Service worker registration with prompt-based updates
- Offline asset caching for JS, CSS, HTML, SVG, PNG, ICO files
- Automatic cleanup of outdated caches
- Periodic update checks every hour
- Update notification badge component (`PWABadge.tsx`)

### Dependencies
- Core: React 19, React DOM 19
- Build: Vite, TypeScript 5.7, Vite React plugin
- PWA: Vite PWA plugin, Workbox
- Tooling: ESLint 9 with TypeScript and React plugins
- Utilities: jq-web for JSON processing

The project follows a minimal React + Vite setup with PWA enhancements for offline functionality.