// Modern ESM-first jq WASM wrapper using vite-plugin-wasm

// Import WASM module and JS factory directly using ES modules
import jqWasmModule from './wasm/jq_1-8-1.wasm?init';
import jqModuleFactory from './wasm/jq_1-8-1.js';

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

// Load WASM module using modern ES module imports
async function loadModule(): Promise<JQModule> {
  if (jqModule) {
    return jqModule;
  }

  if (modulePromise) {
    return modulePromise;
  }

  modulePromise = (async () => {
    try {
      // Initialize the WASM module using vite-plugin-wasm
      const wasmInstance = await jqWasmModule();

      // Create the module with the WASM instance using direct ES import
      const wasmModule = await jqModuleFactory({
        wasmBinary: wasmInstance,
        locateFile: () => {
          // Not needed since we're providing wasmBinary directly
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