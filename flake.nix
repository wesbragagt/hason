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
        
        # Custom jq WASM build (manual approach works better than buildEmscriptenPackage)
        jq-wasm = pkgs.stdenv.mkDerivation {
          pname = "jq-wasm";
          version = "1.7.1";
          
          src = pkgs.fetchFromGitHub {
            owner = "jqlang";
            repo = "jq";
            rev = "jq-1.7.1";
            sha256 = "sha256-oOlEbYxKiG/w6i2wb8trktqaB/5dXhX59kX1Qgft2zY=";
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
              --pre-js ${./src/wasm/pre.js} \
              --post-js ${./src/wasm/post.js} \
              -o jq.js \
              .libs/libjq.a src/main.o
          '';
          
          # Install phase
          installPhase = ''
            mkdir -p $out/lib
            cp jq.js $out/lib/
            cp jq.wasm $out/lib/
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
            nodejs_20
            
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
          default = jq-wasm;
        };
      });
}