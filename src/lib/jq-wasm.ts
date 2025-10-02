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
  
  modulePromise = new Promise(async (resolve, reject) => {
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
          reject(new Error(`Failed to initialize WASM module: ${error}`));
        }
      };
      
      script.onerror = () => {
        reject(new Error(`Failed to load versioned jq script`));
      };
      
      document.head.appendChild(script);
    } catch (error) {
      reject(new Error(`Failed to load jq WASM module: ${error}`));
    }
  });
  
  return modulePromise;
}

// jq-web compatible API
export const jq = {
  // Process JSON with a jq filter (returns parsed result)
  async json(input: any, filter: string): Promise<any> {
    const module = await loadModule();
    
    return new Promise((resolve, reject) => {
      try {
        // For now, implement basic filters manually
        // TODO: Replace with actual WASM jq processing
        let result = input;
        
        if (filter === '.') {
          resolve(result);
          return;
        }
        
        // Handle basic property access
        if (filter.startsWith('.') && !filter.includes('|') && !filter.includes('[')) {
          const path = filter.slice(1);
          if (path) {
            const keys = path.split('.');
            for (const key of keys) {
              if (result && typeof result === 'object' && key in result) {
                result = result[key];
              } else {
                reject(new Error(`Property '${key}' not found`));
                return;
              }
            }
          }
          resolve(result);
          return;
        }
        
        // Handle array indexing
        if (filter.includes('[') && filter.includes(']')) {
          const match = filter.match(/^\.([^[]*)\[(\d+)\]$/);
          if (match) {
            const [, prop, indexStr] = match;
            const index = parseInt(indexStr);
            
            let target = result;
            if (prop) {
              target = result[prop];
            }
            
            if (Array.isArray(target) && index >= 0 && index < target.length) {
              resolve(target[index]);
              return;
            } else {
              reject(new Error(`Array index ${index} out of bounds`));
              return;
            }
          }
        }
        
        // For complex filters, use the WASM module
        module.jq.process(input, filter)
          .then(resolve)
          .catch(reject);
        
      } catch (error) {
        reject(error);
      }
    });
  },
  
  // Process JSON with a jq filter (returns raw string)
  async raw(input: any, filter: string): Promise<string> {
    const result = await this.json(input, filter);
    return typeof result === 'string' ? result : JSON.stringify(result);
  }
};

// Promise-based API (jq-web compatibility)
export const promised = {
  json: jq.json,
  raw: jq.raw
};

// Default export for compatibility
export default {
  json: jq.json,
  raw: jq.raw,
  promised
};