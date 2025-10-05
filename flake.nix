{
  description = "Development environment for compiling jq to WebAssembly";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        
        # Read jq version configuration
        jqVersionConfig = builtins.fromJSON (builtins.readFile ./packages/app/public/jq-version.json);
        
        # Web application with WASM files
        app-with-wasm = pkgs.stdenv.mkDerivation {
          pname = "hason-app";
          version = "1.0.0";

          src = ./.;

          nativeBuildInputs = with pkgs; [
            nodejs_22
            nodePackages.pnpm
            coreutils
            cacert
          ];

          buildInputs = [ jq-wasm ];

          configurePhase = ''
            export HOME=$TMPDIR
            export npm_config_cache=$TMPDIR/.npm
            export PNPM_HOME=$TMPDIR/.pnpm

            # Copy WASM files from jq-wasm build to public directory
            mkdir -p packages/app/public
            cp -v ${jq-wasm}/lib/jq*.js packages/app/public/
            cp -v ${jq-wasm}/lib/jq*.wasm packages/app/public/
          '';

          buildPhase = ''
            # Install dependencies
            pnpm install --frozen-lockfile

            # Build the application
            pnpm run build
          '';

          installPhase = ''
            mkdir -p $out
            cp -r packages/app/dist/* $out/
          '';
        };

        # Custom jq WASM build (manual approach works better than buildEmscriptenPackage)
        jq-wasm = pkgs.stdenv.mkDerivation {
          pname = "jq-wasm";
          version = jqVersionConfig.version;
          
          src = pkgs.fetchFromGitHub {
            owner = "jqlang";
            repo = "jq";
            rev = jqVersionConfig.revision;
            sha256 = jqVersionConfig.sha256;
            fetchSubmodules = true;
          };
          
          nativeBuildInputs = with pkgs; [
            emscripten
            autoconf
            automake
            libtool
            pkg-config
            git
          ];
          
          buildInputs = with pkgs; [
            oniguruma
          ];
          
          # Configure phase
          configurePhase = ''
            autoreconf -fiv
            
            # Use emconfigure to configure for WASM target without oniguruma for now
            emconfigure ./configure \
              --disable-maintainer-mode \
              --disable-shared \
              --enable-static \
              --without-oniguruma
          '';
          
          # Build phase
          buildPhase = ''
            # Generate required files first
            emmake make src/builtin.inc src/version.h
            
            # Build the library
            emmake make LDFLAGS=-all-static libjq.la
            
            # Build main.o separately
            emmake make src/main.o
            
            # Compile to WASM with specific exports using the library
            emcc -O3 \
              -s WASM=1 \
              -s EXPORTED_FUNCTIONS='["_main", "_jq_init", "_jq_compile", "_jq_next", "_jq_teardown", "_malloc", "_free"]' \
              -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap", "allocate", "intArrayFromString", "ALLOC_NORMAL"]' \
              -s MODULARIZE=1 \
              -s EXPORT_NAME="jqModule" \
              -s ALLOW_MEMORY_GROWTH=1 \
              -s TOTAL_MEMORY=16777216 \
              -s NO_EXIT_RUNTIME=1 \
              -s INVOKE_RUN=0 \
              --pre-js ${./packages/jq-hason/src/wasm/pre.js} \
              --post-js ${./packages/jq-hason/src/wasm/post.js} \
              -o jq.js \
              .libs/libjq.a src/main.o
          '';
          
          # Install phase
          installPhase = ''
            mkdir -p $out/lib
            # Create versioned filenames (replace dots with dashes)
            VERSION_SUFFIX=$(echo "${jqVersionConfig.version}" | sed 's/\./-/g')
            cp jq.js $out/lib/jq_$VERSION_SUFFIX.js
            cp jq.wasm $out/lib/jq_$VERSION_SUFFIX.wasm
            
            # Also create unversioned copies for backwards compatibility
            cp jq.js $out/lib/jq.js
            cp jq.wasm $out/lib/jq.wasm
          '';
        };


      in {
        # Development shell
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            # Emscripten toolchain
            emscripten
            
            # Build tools
            autoconf
            automake
            libtool
            pkg-config
            git
            
            # JavaScript/Node.js for testing
            nodejs_22
            
            # jq for reference/testing
            jq
            
            # WebAssembly tools
            wabt  # wasm2wat, wat2wasm
            binaryen  # wasm-opt
          ];
          
          shellHook = ''
            echo "🚀 jq WebAssembly development environment loaded!"
            echo "Available commands:"
            echo "  - emcc: Emscripten compiler"
            echo "  - node: Node.js runtime"
            echo "  - jq: Reference jq binary"
            echo "  - wasm2wat, wat2wasm: WASM text tools"
            echo "  - wasm-opt: WASM optimizer"
            echo ""
            echo "To build jq WASM: nix build .#jq-wasm"
            
            # Set up Emscripten cache in project directory to avoid permission issues
            export EM_CACHE="$(pwd)/.emscripten_cache"
            mkdir -p "$EM_CACHE"
          '';
        };

        # Package outputs
        packages = {
          jq-wasm = jq-wasm;
          app-with-wasm = app-with-wasm;
          jq = pkgs.jq;  # Add jq package
          default = jq-wasm;
        };

        # App commands
        apps = {
          # Build and copy WASM files to app public directory  
          setup-jq = {
            type = "app";
            program = "${pkgs.writeShellScript "setup-jq" ''
              set -e
              echo "🔧 Setting up jq for local development..."
              
              # Create directory
              mkdir -p packages/app/public
              
              # Copy system jq if available, otherwise use nix jq
              if command -v jq &> /dev/null; then
                echo "Using system jq binary..."
                cp "$(which jq)" packages/app/public/jq
                chmod +x packages/app/public/jq
                echo "✓ Using system jq: $(packages/app/public/jq --version)"
              else
                echo "Using Nix jq binary..."
                cp ${pkgs.jq}/bin/jq packages/app/public/jq
                chmod +x packages/app/public/jq
                echo "✓ Using Nix jq: $(packages/app/public/jq --version)"
              fi
              
              echo "🎉 jq setup complete! You can now run:"
              echo "  pnpm run dev"
            ''}";
          };

          # Build jq WASM and copy to both app and jq-hason package
          build-jq-wasm = {
            type = "app";
            program = "${pkgs.writeShellScript "build-jq-wasm" ''
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
              mkdir -p packages/app/public packages/jq-hason/src/wasm
              cp -v result/lib/jq*.js packages/app/public/
              cp -v result/lib/jq*.wasm packages/app/public/
              cp -v result/lib/jq*.js packages/jq-hason/src/wasm/
              cp -v result/lib/jq*.wasm packages/jq-hason/src/wasm/
              
              echo "✅ jq WASM module built successfully!"
              echo "📂 Files available in packages/app/public/ and packages/jq-hason/src/wasm/ directories:"
              ls -la packages/app/public/jq*
              ls -la packages/jq-hason/src/wasm/jq*
            ''}";
          };

          # Copy WASM files to app public directory (for CI)
          copy-wasm-to-app = {
            type = "app";
            program = "${pkgs.writeShellScript "copy-wasm-to-app" ''
              echo "📁 Copying jq WASM files to app public directory..."
              
              # Build WASM if not already built
              if [ ! -d "result" ]; then
                echo "Building jq WASM first..."
                nix build .#jq-wasm
              fi
              
              # Copy files
              mkdir -p packages/app/public
              cp -v result/lib/jq*.js packages/app/public/
              cp -v result/lib/jq*.wasm packages/app/public/
              
              echo "✅ WASM files copied to packages/app/public/"
              ls -la packages/app/public/jq*
            ''}";
          };

          # Update jq version across all files
          update-jq-version = {
            type = "app";
            program = "${pkgs.writeShellScript "update-jq-version" ''
              if [ $# -ne 3 ]; then
                echo "Usage: nix run .#update-jq-version -- <version> <revision> <sha256>"
                echo "Example: nix run .#update-jq-version -- \"1.9.0\" \"jq-1.9.0\" \"sha256-newhash\""
                exit 1
              fi

              VERSION="$1"
              REVISION="$2"
              SHA256="$3"

              echo "🔄 Updating jq version to $VERSION..."

              # Update jq-version.json
              echo "📝 Updating packages/app/public/jq-version.json..."
              cat > packages/app/public/jq-version.json << EOF
              {
                "version": "$VERSION",
                "revision": "$REVISION",
                "sha256": "$SHA256"
              }
              EOF

              # Update jq-hason package.json version
              echo "📝 Updating packages/jq-hason/package.json version..."
              ${pkgs.jq}/bin/jq ".version = \"$VERSION\"" packages/jq-hason/package.json > packages/jq-hason/package.json.tmp
              mv packages/jq-hason/package.json.tmp packages/jq-hason/package.json

              # Update fallback version in jq-version.ts
              echo "📝 Updating fallback version in packages/jq-hason/src/jq-version.ts..."
              sed -i "s/version: \"[^\"]*\"/version: \"$VERSION\"/g" packages/jq-hason/src/jq-version.ts
              sed -i "s/revision: \"[^\"]*\"/revision: \"$REVISION\"/g" packages/jq-hason/src/jq-version.ts
              sed -i "s/sha256: \"[^\"]*\"/sha256: \"$SHA256\"/g" packages/jq-hason/src/jq-version.ts

              # Update JQ_VERSION constant in index.ts
              echo "📝 Updating JQ_VERSION in packages/jq-hason/src/index.ts..."
              sed -i "s/export const JQ_VERSION = '[^']*'/export const JQ_VERSION = '$VERSION'/g" packages/jq-hason/src/index.ts

              echo "✅ jq version updated to $VERSION successfully!"
              echo "📋 Updated files:"
              echo "  - packages/app/public/jq-version.json"
              echo "  - packages/jq-hason/package.json"
              echo "  - packages/jq-hason/src/jq-version.ts"
              echo "  - packages/jq-hason/src/index.ts"
              echo ""
              echo "🔄 Next steps:"
              echo "  1. Run: nix run .#build-jq-wasm"
              echo "  2. Test the application"
              echo "  3. Commit the changes"
            ''}";
          };


          # Show help information for all available commands
          help = {
            type = "app";
            program = "${pkgs.writeShellScript "help" ''
              echo "🚀 jq WebAssembly Development Environment"
              echo "Development environment for compiling jq to WebAssembly"
              echo ""
              echo "📋 Available Commands:"
              echo ""
              echo "  🏗️  Development Environment:"
              echo "    nix develop                    - Enter development shell with all tools"
              echo "    direnv allow                   - Auto-load development environment"
              echo ""
              echo "  📦 Package Management:"
              echo "    nix build .#jq-wasm           - Build jq WebAssembly module"
              echo "    nix build .#jq                - Build regular jq binary"
              echo ""
              echo "  🔧 Setup & Build:"
              echo "    nix run .#setup-jq            - Set up jq binary for local development"
              echo "    nix run .#build-jq-wasm       - Build jq WASM and copy to packages"
              echo "    nix run .#copy-wasm-to-app    - Copy pre-built WASM files to app"
              echo ""
              echo "  📝 Version Management:"
              echo "    nix run .#update-jq-version -- <version> <revision> <sha256>"
              echo "                                   - Update jq version across all files"
              echo ""
              echo "  ❓ Help:"
              echo "    nix run .#help                - Show this help message"
              echo ""
              echo "💡 Quick Start:"
              echo "  1. nix develop                 # Enter development environment"
              echo "  2. nix run .#setup-jq          # Set up jq binary"
              echo "  3. nix run .#build-jq-wasm     # Build WebAssembly module"
              echo "  4. pnpm run dev                # Start development server"
              echo ""
              echo "🔗 More Info:"
              echo "  - Development shell includes: emcc, node, jq, wasm tools"
              echo "  - WASM files are copied to packages/app/public/ and packages/jq-hason/src/wasm/"
              echo "  - jq version configuration is stored in packages/app/public/jq-version.json"
            ''}";
          };
        };
      });
}