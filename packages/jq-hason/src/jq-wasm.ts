// ESM-first jq WASM wrapper using vite-plugin-wasm

// Import WASM module directly using ES modules
import jqWasmModule from './wasm/jq_1-8-1.wasm?init';
import jqFactoryScript from './wasm/jq_1-8-1.js?url';

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

// Load the jq JavaScript module factory
async function loadJSModuleFactory(): Promise<any> {
  try {
    // Fetch the JavaScript factory function
    const scriptResponse = await fetch(jqFactoryScript);
    const scriptText = await scriptResponse.text();

    // Execute the script to get the factory function
    const script = new Function(`
      ${scriptText}
      return jqModule;
    `);

    const jqModuleFactory = script();

    if (typeof jqModuleFactory !== 'function') {
      throw new Error(`Expected jqModule to be a function, got ${typeof jqModuleFactory}`);
    }
    return jqModuleFactory;
  } catch (error) {
    console.error('Error loading jq module:', error);
    throw error;
  }
}

// Load WASM module using vite-plugin-wasm
async function loadModule(): Promise<JQModule> {
  if (jqModule) {
    return jqModule;
  }

  if (modulePromise) {
    return modulePromise;
  }

  modulePromise = (async () => {
    try {
      // Initialize the WASM module
      const wasmInstance = await jqWasmModule();

      // Load the JavaScript factory
      const jqModuleFactory = await loadJSModuleFactory();

      // Create the module with the WASM instance
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