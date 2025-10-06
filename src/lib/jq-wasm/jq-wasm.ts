// jq WASM wrapper using proper module loading

// Import URLs for the WASM files (need JS runtime first)
import jqScriptUrl from './wasm/jq_1-8-1.js?url';
import jqWasmUrl from './wasm/jq_1-8-1.wasm?url';

interface JQModule {
  json(input: any, filter: string): Promise<any>;
  raw(input: string, filter: string, args?: string[]): Promise<string>;
  callMain(args: string[]): number;
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
function enhanceModule(module: any): JQModule {
  // Add json method for easier JSON processing
  module.json = async function(input: any, filter: string): Promise<any> {
    const inputStr = typeof input === 'string' ? input : JSON.stringify(input);
    const outputStr = await module.raw(inputStr, filter, ['-c']);

    if (!outputStr || outputStr.trim() === '') {
      return null;
    }

    // Handle multiple outputs (newline separated)
    if (outputStr.indexOf('\n') !== -1) {
      return outputStr.trim().split('\n').map((line: string) => JSON.parse(line));
    }

    return JSON.parse(outputStr.trim());
  };

  // Add raw method for string processing
  module.raw = async function(inputStr: string, filter: string, args: string[] = []): Promise<string> {
    // Ensure FS is initialized
    if (!module.FS) {
      throw new Error('FileSystem not available');
    }

    const FS = module.FS;

    // Store original streams
    const originalStdin = FS.streams[0];
    const originalStdout = FS.streams[1];
    const originalStderr = FS.streams[2];

    try {
      // Create input file
      FS.writeFile('/tmp/input.json', inputStr);

      // Prepare arguments: jq [filter] [input-file]
      const jqArgs = [filter, '/tmp/input.json', ...args];

      // Capture output
      let stdoutBuffer = '';
      let stderrBuffer = '';

      // Override stdout/stderr
      FS.streams[1] = {
        tty: {
          output: [],
          ops: {
            put_char: function(tty: any, val: number) {
              if (val === null || val === 10) {
                stdoutBuffer += String.fromCharCode(...tty.output) + '\n';
                tty.output = [];
              } else if (val !== 0) {
                tty.output.push(val);
              }
            },
            fsync: function(tty: any) {
              if (tty.output && tty.output.length > 0) {
                stdoutBuffer += String.fromCharCode(...tty.output);
                tty.output = [];
              }
            }
          }
        }
      };

      FS.streams[2] = {
        tty: {
          output: [],
          ops: {
            put_char: function(tty: any, val: number) {
              if (val === null || val === 10) {
                stderrBuffer += String.fromCharCode(...tty.output) + '\n';
                tty.output = [];
              } else if (val !== 0) {
                tty.output.push(val);
              }
            },
            fsync: function(tty: any) {
              if (tty.output && tty.output.length > 0) {
                stderrBuffer += String.fromCharCode(...tty.output);
                tty.output = [];
              }
            }
          }
        }
      };

      // Call main with arguments
      const exitCode = module.callMain(jqArgs);

      // Cleanup
      try {
        FS.unlink('/tmp/input.json');
      } catch(e) {
        // Ignore cleanup errors
      }

      // Restore original streams
      FS.streams[0] = originalStdin;
      FS.streams[1] = originalStdout;
      FS.streams[2] = originalStderr;

      if (exitCode !== 0) {
        throw new Error(stderrBuffer || `jq exited with code ${exitCode}`);
      }

      return stdoutBuffer;

    } catch (error) {
      // Restore streams on error
      FS.streams[0] = originalStdin;
      FS.streams[1] = originalStdout;
      FS.streams[2] = originalStderr;
      throw error;
    }
  };

  return module as JQModule;
}

// Load WASM module with proper runtime
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
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = jqScriptUrl;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load jq module'));
          document.head.appendChild(script);
        });
      }

      if (!window.jqModule) {
        throw new Error('jqModule not found after loading script');
      }

      // Load the WASM binary
      const wasmResponse = await fetch(jqWasmUrl);
      const wasmBinary = await wasmResponse.arrayBuffer();

      // Initialize the module with the WASM binary
      const module = await window.jqModule({
        wasmBinary: new Uint8Array(wasmBinary),
        locateFile: () => '',
        onRuntimeInitialized: () => {
          // Runtime is ready, enhance the module
          enhanceModule(module);
        }
      });

      // Wait for runtime to be ready
      await new Promise(resolve => setTimeout(resolve, 100));

      jqModule = module as JQModule;
      return jqModule;
    } catch (error) {
      throw new Error(`Failed to load jq WASM module: ${String(error)}`);
    }
  })();

  return modulePromise;
}

// Main API function - uses the json() function from post.js
export async function promised(input: any, filter: string): Promise<any> {
  const module = await loadModule();
  return await module.json(input, filter);
}
