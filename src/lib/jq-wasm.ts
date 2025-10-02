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

// Load the WASM module
async function loadModule(): Promise<JQModule> {
  if (jqModule) {
    return jqModule;
  }
  
  if (modulePromise) {
    return modulePromise;
  }
  
  modulePromise = new Promise((resolve, reject) => {
    const loadScript = async () => {
      try {
        // Load the jq WASM module from the public directory
        // Use versioned filename for better cache control
        const script = document.createElement('script');
        script.src = `/${await getVersionedFilename('jq.js')}`;
        script.async = true;
      
        script.onload = async () => {
          try {
            // The versioned jq JS file defines a global jqModule function
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
          reject(new Error(`Failed to load versioned jq script`));
        };
        
        document.head.appendChild(script);
      } catch (error) {
        reject(new Error(`Failed to load jq WASM module: ${String(error)}`));
      }
    };
    
    void loadScript();
  });
  
  return modulePromise;
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