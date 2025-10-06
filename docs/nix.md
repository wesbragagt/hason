# Nix Setup for jq WebAssembly Compilation

This document explains the Nix-based build system for compiling jq to WebAssembly (WASM) for use in the hason React PWA application.

## Overview

We use Nix to create a reproducible build environment for compiling jq to WebAssembly using Emscripten. This approach ensures consistent builds across different development environments and CI/CD systems.

## Why Nix?

### Reproducibility
- **Deterministic builds**: Every developer gets the exact same Emscripten toolchain, autotools versions, and dependencies
- **No "works on my machine" issues**: The build environment is completely specified and isolated
- **Version pinning**: All tools and dependencies are locked to specific versions

### Dependency Management
- **Complex toolchain**: Emscripten requires specific versions of LLVM, Python, and Node.js
- **Native build tools**: autoconf, automake, libtool, pkg-config are all managed by Nix
- **Cross-compilation**: Handles the complexity of compiling C code to WebAssembly

### Development Experience
- **Zero setup**: `direnv allow` or `nix develop` provides the complete build environment
- **Caching**: Nix binary cache means builds are often instantaneous
- **Cleanup**: No system pollution - everything is contained in the Nix store

## Architecture

### Project Structure
```
├── flake.nix                        # Main Nix configuration with apps
├── flake.lock                       # Dependency lock file
├── .envrc                           # direnv configuration
├── src/
│   └── lib/jq-wasm/                 # jq WASM library
│       └── wasm/                    # WASM source files
│           ├── pre.js               # Emscripten pre-run JavaScript
│           └── post.js              # Emscripten post-run JavaScript
└── public/                          # WASM files deployed here
```

### Build Process
1. **Source**: Fetch jq source from GitHub with pinned version and submodules
2. **Configure**: Use `emconfigure` to set up autotools for WebAssembly target
3. **Build**: Compile with `emmake` to generate object files and library
4. **Link**: Use `emcc` to create final jq.js and jq.wasm files

## Technical Decisions

### Manual stdenv.mkDerivation vs buildEmscriptenPackage

**Current approach: `stdenv.mkDerivation`**
- ✅ Works reliably with complex configure/build steps
- ✅ Full control over Emscripten flags and exports
- ✅ Can handle jq's specific build requirements
- ✅ Easier to debug and customize

**Alternative: `buildEmscriptenPackage`**
- ❌ Had C compiler detection issues with jq
- ❌ Less control over the build process
- ✅ More idiomatic for simple Emscripten builds
- ✅ Better for standard autotools projects

### Without Oniguruma

We compile jq without the oniguruma regex library:
- **Simplicity**: Avoids complex submodule compilation issues
- **Size**: Reduces WASM binary size (447KB vs potentially larger)
- **Functionality**: Most JSON processing doesn't require advanced regex
- **Future**: Can be re-enabled if regex features are needed

### Version Management Strategy

The project uses a centralized version configuration system for easy updates:

**Configuration File: `public/jq-version.json`**
```json
{
  "version": "1.8.1",
  "revision": "jq-1.8.1", 
  "sha256": "sha256-R+tW0biyJrZqF8965ZbplJNDKr7vdrm7ndaccH7c4Ds="
}
```

**Nix Integration:**
```nix
# Read jq version configuration from public folder
jqVersionConfig = builtins.fromJSON (builtins.readFile ./public/jq-version.json);

src = pkgs.fetchFromGitHub {
  owner = "jqlang";
  repo = "jq";
  rev = jqVersionConfig.revision;      # Dynamic version from config
  sha256 = jqVersionConfig.sha256;     # Dynamic hash from config
  fetchSubmodules = true;              # Include git submodules
};
```

**Updating jq Version:**
Use the Nix app to update all components at once:
```bash
nix run .#update-jq-version -- "1.9.0" "jq-1.9.0" "sha256-newhash"
```

This approach ensures:
- ✅ Single source of truth for version information
- ✅ Automatic updates across Nix build and TypeScript code
- ✅ Version information accessible to the web application
- ✅ Easy maintenance and upgrades

## Build Configuration

### Emscripten Flags
```bash
emcc -O3 \
  -s WASM=1 \                                    # Generate WebAssembly
  -s EXPORTED_FUNCTIONS='["_main", "_malloc", "_free"]' \  # Export C functions
  -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap"]' \       # Export helpers
  -s MODULARIZE=1 \                              # Create ES6 module
  -s EXPORT_NAME="jqModule" \                    # Module export name
  -s ALLOW_MEMORY_GROWTH=1 \                     # Dynamic memory
  -s TOTAL_MEMORY=16777216 \                     # 16MB initial memory
  -s NO_EXIT_RUNTIME=1 \                         # Keep runtime alive
  -s INVOKE_RUN=0 \                              # Don't auto-run main()
  --pre-js ${./src/lib/jq-wasm/wasm/pre.js} \    # Custom initialization
  --post-js ${./src/lib/jq-wasm/wasm/post.js} \  # Custom cleanup
  -o jq.js \                                     # Output files
  .libs/libjq.a src/main.o                       # Input files
```

### Configure Flags
```bash
emconfigure ./configure \
  --disable-maintainer-mode \    # Skip maintainer-only checks
  --disable-shared \             # Static linking only
  --enable-static \              # Build static library
  --without-oniguruma           # Skip regex library
```

## Usage

### Development Setup
```bash
# Using direnv (recommended)
direnv allow

# Or manual Nix shell
nix develop

# Setup jq binary for development
nix run .#setup-jq
```

### Building WASM
```bash
# Build jq WASM and copy to both app and package
nix run .#build-jq-wasm

# Or build package only
nix build .#jq-wasm

# Copy WASM files to app (for CI)
nix run .#copy-wasm-to-app
```

### Available Nix Apps
- `nix run .#setup-jq` - Setup jq binary for development
- `nix run .#build-jq-wasm` - Build and copy WASM files to public and lib directories
- `nix run .#copy-wasm-to-app` - Copy WASM files to public directory  
- `nix run .#update-jq-version -- <version> <revision> <sha256>` - Update jq version across all files

### Output Files
The build process generates files in multiple locations:

**Public Directory (`public/`):**
- `jq_1-8-1.js` (77KB) - Versioned JavaScript loader and glue code
- `jq_1-8-1.wasm` (453KB) - Versioned WebAssembly binary
- `jq.js` (77KB) - Unversioned JavaScript loader (backwards compatibility)
- `jq.wasm` (453KB) - Unversioned WebAssembly binary (backwards compatibility)
- `jq-version.json` (119B) - Version configuration accessible to web app

**jq-wasm Library (`src/lib/jq-wasm/wasm/`):**
- `jq_1-8-1.js` - Source files for library bundling
- `jq_1-8-1.wasm` - WASM binary for distribution
- `jq.js` - Unversioned files for compatibility
- `jq.wasm` - Unversioned WASM binary

The versioned filenames automatically update when the jq version changes, providing better cache control and version tracking.

## Integration with React Application

### React App Integration
The built WASM files integrate with the React application:

#### Version-Aware Loading
The application automatically loads the correct versioned files:
```typescript
import { promised, JQ_VERSION } from '@/lib/jq-wasm';

// Process JSON with jq filter
const result = await promised({ name: "John" }, '.name');

// Get current jq version
console.log(JQ_VERSION); // "1.8.1"
```

#### Loading Process
1. **Module Import**: Import jq-wasm library from `@/lib/jq-wasm`
2. **WASM Initialization**: WebAssembly binary is loaded asynchronously
3. **API Exposure**: JSON processing through promised() function
4. **Memory Management**: Handled by Emscripten runtime

## Troubleshooting

### Common Issues

**Git submodule errors**
- Solution: Ensure `fetchSubmodules = true` in flake.nix
- The build fetches submodules automatically

**C compiler detection failed**
- This affects `buildEmscriptenPackage` approach
- Our manual approach works around this issue

**Missing generated files (builtin.inc)**
- Solution: Build dependencies first with `emmake make src/builtin.inc`
- Our build script handles this automatically

### Debugging
```bash
# View detailed build logs
nix log /nix/store/...-jq-wasm-1.8.1.drv

# Check output structure
nix build .#jq-wasm && ls -la result/

# Test individual Nix apps
nix run .#setup-jq
nix run .#copy-wasm-to-app
```

## Version Update Process

### Updating jq Version

**Step 1: Use the Nix App**
```bash
nix run .#update-jq-version -- "1.9.0" "jq-1.9.0" "sha256-newhash"
```

**Step 2: Get Correct SHA256 Hash**
If you don't have the hash, use a placeholder first:
```bash
nix run .#update-jq-version -- "1.9.0" "jq-1.9.0" "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
nix build .#jq-wasm  # This will fail and show the correct hash
```

**Step 3: Update with Correct Hash**
Copy the correct hash from the error message and run the update command again.

**Step 4: Rebuild**
```bash
nix run .#build-jq-wasm
```

### What Gets Updated
The `update-jq-version` Nix app automatically updates:
1. `public/jq-version.json` - Version configuration
2. `src/lib/jq-wasm/index.ts` - JQ_VERSION constant
3. `src/lib/jq-wasm/jq-version.ts` - TypeScript fallback version (if exists)

## Future Improvements

### Potential Enhancements
1. **Add oniguruma support** for full regex functionality
2. **Optimize binary size** with additional Emscripten flags
3. **Add debug builds** with source maps for development
4. **Multi-platform support** for different architectures
5. **Automated version checking** against GitHub releases
6. **CI/CD integration** for automatic updates

### Alternative Approaches
1. **WASI compilation** for server-side or CLI usage
2. **Separate regex library** compiled independently
3. **jq-web integration** using existing WebAssembly builds

## References

- [jq source code](https://github.com/jqlang/jq)
- [Emscripten documentation](https://emscripten.org/docs/)
- [Nix manual](https://nixos.org/manual/nix/stable/)
- [buildEmscriptenPackage docs](https://nixos.org/manual/nixpkgs/stable/#emscripten)