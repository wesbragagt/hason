// Custom jq WASM wrapper module
// Provides jq-web compatible API using our custom compiled WASM

import { getVersionedFilename } from './jq-version';

interface JQModule {
  jq: {
    init(): number;
    compile(jqState: number, filter: string): number;
    next(jqState: number): number;
    teardown(jqState: number): void;
    process(input: any, filter: string): Promise<any>;
  };
  ccall: (name: string, returnType: string, argTypes: string[], args: any[]) => any;
  allocate: (data: number[], type: string, allocType: number) => number;
  intArrayFromString: (str: string) => number[];
  _free: (ptr: number) => void;
  ALLOC_NORMAL: number;
}

let jqModule: JQModule | null = null;
let modulePromise: Promise<JQModule> | null = null;

// Detect environment
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;

// Load the WASM module
async function loadModule(): Promise<JQModule> {
  if (jqModule) {
    return jqModule;
  }
  
  if (modulePromise) {
    return modulePromise;
  }
  
  modulePromise = new Promise((resolve, reject) => {
    (async () => {
      try {
        if (isBrowser) {
          // Browser environment - load from bundled assets
          await loadBrowserModule(resolve, reject);
        } else if (isNode) {
          // Node.js environment - load from package
          await loadNodeModule(resolve, reject);
        } else {
          reject(new Error('Unsupported environment: neither browser nor Node.js detected'));
        }
      } catch (error) {
        reject(new Error(`Failed to load jq WASM module: ${String(error)}`));
      }
    })();
  });
  
  return modulePromise;
}

// Browser loading logic
async function loadBrowserModule(resolve: (module: JQModule) => void, reject: (error: Error) => void): Promise<void> {
  try {
    // In browser, try to load from the same origin or from package assets
    const script = document.createElement('script');
    
    // Try to load versioned filename, fallback to static
    let scriptSrc: string;
    try {
      scriptSrc = `/${await getVersionedFilename('jq.js')}`;
    } catch {
      // Fallback if version loading fails
      scriptSrc = '/jq.js';
    }
    
    script.src = scriptSrc;
    script.async = true;
  
    script.onload = async () => {
      try {
        // The jq JS file defines a global jqModule function
        if (typeof (window as any).jqModule === 'function') {
          const wasmModule = await (window as any).jqModule();
          jqModule = wasmModule as JQModule;
          resolve(jqModule);
        } else {
          reject(new Error('jqModule function not found on window'));
        }
      } catch (error) {
        reject(new Error(`Failed to initialize WASM module: ${String(error)}`));
      }
    };
    
    script.onerror = () => {
      reject(new Error(`Failed to load jq script from ${scriptSrc}`));
    };
    
    document.head.appendChild(script);
  } catch (error) {
    reject(new Error(`Browser loading failed: ${String(error)}`));
  }
}

// Node.js loading logic  
async function loadNodeModule(resolve: (module: JQModule) => void, reject: (error: Error) => void): Promise<void> {
  try {
    // Dynamic imports for Node.js
    const fs = await import('fs/promises');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    // Get the directory of this module
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // Read the jq.js file
    const jqJsPath = path.join(__dirname, '..', 'wasm', 'jq.js');
    const jqWasmPath = path.join(__dirname, '..', 'wasm', 'jq.wasm');
    
    // Check if files exist
    try {
      await fs.access(jqJsPath);
      await fs.access(jqWasmPath);
    } catch {
      reject(new Error('jq WASM files not found. Make sure to build the project with: nix run .#build-jq-wasm'));
      return;
    }
    
    // Read and evaluate the jq.js file
    const jqJsContent = await fs.readFile(jqJsPath, 'utf-8');
    
    // Create a module loader context
    const Module: any = {
      locateFile: (filename: string) => {
        if (filename.endsWith('.wasm')) {
          return jqWasmPath;
        }
        return filename;
      }
    };
    
    // Evaluate the jq.js content in a function scope
    // This is a workaround for Node.js module loading
    const moduleFactory = new Function('Module', 'exports', jqJsContent + '\nreturn jqModule;');
    const jqModuleFactory = moduleFactory(Module, {});
    
    // Initialize the module
    if (typeof jqModuleFactory === 'function') {
      const wasmModule = await jqModuleFactory(Module);
      jqModule = wasmModule as JQModule;
      resolve(jqModule);
    } else {
      reject(new Error('Failed to load jqModule factory function'));
    }
  } catch (error) {
    reject(new Error(`Node.js loading failed: ${String(error)}`));
  }
}

// Main API function - mimics jq-web API
export async function promised(input: any, filter: string): Promise<any> {
  const module = await loadModule();
  
  try {
    const result = await module.jq.process(input, filter);
    return result;
  } catch (error) {
    throw error;
  }
}