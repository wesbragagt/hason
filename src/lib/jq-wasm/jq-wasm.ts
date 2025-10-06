// jq WASM wrapper using dynamic script loading

// Import URLs for the WASM files
import jqScriptUrl from './wasm/jq_1-8-1.js?url';
import jqWasmUrl from './wasm/jq_1-8-1.wasm?url';

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

// Declare global jqModule from the UMD module
declare global {
  interface Window {
    jqModule?: (config?: any) => Promise<JQModule>;
  }
}

let jqModule: JQModule | null = null;
let modulePromise: Promise<JQModule> | null = null;

// Load WASM module dynamically
async function loadModule(): Promise<JQModule> {
  if (jqModule) {
    return jqModule;
  }

  if (modulePromise) {
    return modulePromise;
  }

  modulePromise = (async () => {
    try {
      // Dynamically load the jq JS file
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
      const wasmModule = await window.jqModule({
        wasmBinary: new Uint8Array(wasmBinary),
        locateFile: () => {
          // This function is required by the API but will never be called
          // because we provide the WASM binary directly via the wasmBinary option.
          // Returning an empty string is safe and intentional.
          return '';
        }
      });

      jqModule = wasmModule as JQModule;
      return jqModule;
    } catch (error) {
      throw new Error(`Failed to load jq WASM module: ${String(error)}`);
    }
  })();

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