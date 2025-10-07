// jq WASM wrapper using static assets (works in development)
//
// PRODUCTION BUILD LIMITATION:
// The jq JavaScript module (jq_1-8-1.js) has internal variable conflicts
// that cause "ReferenceError: can't access lexical declaration 'i' before initialization"
// in production builds. This occurs due to variable scoping issues in the compiled
// Emscripten output that manifest during minification/optimization.
//
// Attempted solutions that did not resolve the issue:
// - Service worker execution context isolation
// - Build exclusions and disabling minification
// - Variable renaming and timing adjustments
// - Static asset loading approaches
//
// The application works perfectly in development mode.

// Use static asset URLs to avoid any bundling/minification issues
const assetBaseUrl = (() => {
  const base = typeof import.meta !== 'undefined' && import.meta.env && typeof import.meta.env.BASE_URL === 'string'
    ? import.meta.env.BASE_URL
    : '/';
  return base.endsWith('/') ? base : `${base}/`;
})();

const buildAssetUrl = (fileName: string) => `${assetBaseUrl}${fileName}`;

const jqScriptUrl = buildAssetUrl('jq_1-8-1.js');
const jqWasmUrl = buildAssetUrl('jq_1-8-1.wasm');

interface JQModule {
  json(input: any, filter: string): Promise<any>;
  raw(input: string, filter: string, args?: string[]): Promise<string>;
  runMain(args: string[]): number;
  FS: any;
  ccall: (name: string, returnType: string, argTypes: string[], args: any[]) => any;
}

// Declare global jqModule from the UMD module
declare global {
  interface Window {
    jqModule?: (config?: any) => Promise<JQModule>;
  }
}

let jqModule: JQModule | null = null;
let modulePromise: Promise<JQModule> | null = null;

// Enhanced module with json/raw methods
function enhanceModule(wasmModule: any): JQModule {
  // Add json method for easier JSON processing
  wasmModule.json = async function jsonMethod(inputData: any, jqFilter: string): Promise<any> {
    const inputString = typeof inputData === 'string' ? inputData : JSON.stringify(inputData);
    const outputString = await wasmModule.raw(inputString, jqFilter, ['-c']);

    if (!outputString || outputString.trim() === '') {
      return null;
    }

    // Handle multiple outputs (newline separated)
    if (outputString.indexOf('\n') !== -1) {
      return outputString.trim().split('\n').map(function(lineData: string) {
        return JSON.parse(lineData);
      });
    }

    return JSON.parse(outputString.trim());
  };

  // Add raw method for string processing
  wasmModule.raw = async function rawMethod(inputString: string, jqFilter: string, jqArgs: string[] = []): Promise<string> {
    // Ensure FS is initialized
    if (!wasmModule.FS) {
      throw new Error('FileSystem not available');
    }

    const fileSystem = wasmModule.FS;

    // Store original streams
    const originalStdin = fileSystem.streams[0];
    const originalStdout = fileSystem.streams[1];
    const originalStderr = fileSystem.streams[2];

    try {
      // Ensure /tmp directory exists
      try {
        fileSystem.mkdir('/tmp');
      } catch (e: any) {
        // Directory might already exist, ignore error
        if (e.code !== 'EEXIST') {
          console.warn('Failed to create /tmp:', e);
        }
      }

      // Create input file
      fileSystem.writeFile('/tmp/input.json', inputString);

      // Prepare arguments: jq [options] [filter] [input-file]
      // Options must come BEFORE the filter
      const commandArgs = jqArgs.concat([jqFilter, '/tmp/input.json']);

      // Debug logging
      console.log('jq arguments:', commandArgs);

      // Capture output
      let stdoutData = '';
      let stderrData = '';

      // Override stdout/stderr
      fileSystem.streams[1] = {
        tty: {
          output: [],
          ops: {
            put_char: function putCharStdout(ttyData: any, charValue: number) {
              if (charValue === null || charValue === 10) {
                stdoutData += String.fromCharCode.apply(String, ttyData.output) + '\n';
                ttyData.output = [];
              } else if (charValue !== 0) {
                ttyData.output.push(charValue);
              }
            },
            fsync: function fsyncStdout(ttyData: any) {
              if (ttyData.output && ttyData.output.length > 0) {
                stdoutData += String.fromCharCode.apply(String, ttyData.output);
                ttyData.output = [];
              }
            }
          }
        }
      };

      fileSystem.streams[2] = {
        tty: {
          output: [],
          ops: {
            put_char: function putCharStderr(ttyData: any, charValue: number) {
              if (charValue === null || charValue === 10) {
                stderrData += String.fromCharCode.apply(String, ttyData.output) + '\n';
                ttyData.output = [];
              } else if (charValue !== 0) {
                ttyData.output.push(charValue);
              }
            },
            fsync: function fsyncStderr(ttyData: any) {
              if (ttyData.output && ttyData.output.length > 0) {
                stderrData += String.fromCharCode.apply(String, ttyData.output);
                ttyData.output = [];
              }
            }
          }
        }
      };

      // Call main with arguments
      const processExitCode = wasmModule.runMain(commandArgs);

      // Cleanup
      try {
        fileSystem.unlink('/tmp/input.json');
      } catch(cleanupError) {
        // Ignore cleanup errors
      }

      // Restore original streams
      fileSystem.streams[0] = originalStdin;
      fileSystem.streams[1] = originalStdout;
      fileSystem.streams[2] = originalStderr;

      if (processExitCode !== 0) {
        console.error('jq failed with exit code:', processExitCode);
        console.error('stderr:', stderrData);
        console.error('stdout:', stdoutData);
        throw new Error(stderrData || `jq exited with code ${processExitCode}`);
      }

      return stdoutData;

    } catch (processingError) {
      // Restore streams on error
      fileSystem.streams[0] = originalStdin;
      fileSystem.streams[1] = originalStdout;
      fileSystem.streams[2] = originalStderr;
      throw processingError;
    }
  };

  return wasmModule as JQModule;
}

// Load WASM module synchronously during app initialization
async function loadModule(): Promise<JQModule> {
  if (jqModule) {
    return jqModule;
  }

  if (modulePromise) {
    return modulePromise;
  }

  modulePromise = (async () => {
    try {
      // Load the JavaScript runtime first
      if (!window.jqModule) {
        await new Promise<void>(function(resolveScript, rejectScript) {
          const scriptElement = document.createElement('script');
          scriptElement.src = jqScriptUrl;
          scriptElement.onload = function() { resolveScript(); };
          scriptElement.onerror = function() { rejectScript(new Error('Failed to load jq module')); };
          document.head.appendChild(scriptElement);
        });
      }

      if (!window.jqModule) {
        throw new Error('jqModule not found after loading script');
      }

      // Load the WASM binary
      const wasmHttpResponse = await fetch(jqWasmUrl);
      const wasmBinaryData = await wasmHttpResponse.arrayBuffer();

      // Initialize the module
      // With MODULARIZE, we pass in a Module object that will be populated
      const moduleConfig: any = {
        wasmBinary: new Uint8Array(wasmBinaryData),
        locateFile: function() { return ''; },
        // NOTE: Don't set onRuntimeInitialized here - post.js already sets it up
        // If we set it, we'll overwrite post.js's callback that exports FS/callMain
        // Instead, we'll wait and check for initialization after the module loads
      };

      const initializedModule = await window.jqModule(moduleConfig);
      
      // The module factory returns a promise that resolves when initialized
      // So at this point, onRuntimeInitialized from post.js should have already run
      // and FS/callMain/json/raw should be available on the module

      // Use the initialized module (post.js should assign FS and callMain to this)
      const actualModule = initializedModule as any;

      // Comprehensive debugging
      console.log('=== WASM Module Debug ===');
      console.log('All module properties:', Object.keys(actualModule));
      console.log('FS property:', actualModule.FS);
      console.log('runMain property:', actualModule.runMain);
      console.log('_main property:', actualModule._main);
      console.log('ccall property:', actualModule.ccall);
      
      // Check if FS-related functions exist
      const fsRelated = Object.keys(actualModule).filter((k: string) => k.includes('FS') || k.includes('fs'));
      console.log('FS-related properties:', fsRelated);
      
      // Check the jq object
      if (actualModule.jq) {
        console.log('jq object found!', actualModule.jq);
        console.log('jq object properties:', Object.keys(actualModule.jq));
        console.log('jq.process:', actualModule.jq.process);
      }
      console.log('========================');

      // Check if FS is available
      if (!actualModule.FS) {
        console.error('FS is not available on module!');
        throw new Error('FileSystem not available in WASM module');
      }
      
      // Expose module for debugging/testing
      if (typeof window !== 'undefined') {
        (window as any).__jqModuleForDebug = actualModule;
      }

      // Check if the json/raw API from post.js is available
      if (actualModule.json && actualModule.raw) {
        console.log('✅ Using json/raw API from post.js');
        // Use the json/raw functions that post.js provides
        // These handle FS operations internally
        jqModule = {
          json: actualModule.json,
          raw: actualModule.raw
        } as JQModule;
        return jqModule;
      }

      // Fallback: enhance the module with our own json/raw implementation
      console.log('⚠️ Falling back to manual FS enhancement');
      enhanceModule(initializedModule);

      jqModule = initializedModule as JQModule;
      return jqModule;
    } catch (loadError) {
      throw new Error(`Failed to load jq WASM module: ${String(loadError)}`);
    }
  })();

  return modulePromise;
}

// Main API function - works in development, has issues in production
export async function promised(input: any, filter: string): Promise<any> {
  const module = await loadModule();
  return await module.json(input, filter);
}
