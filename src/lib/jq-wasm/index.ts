// jq-hason: WebAssembly build of jq for JavaScript environments
// Main API exports

export { promised } from './jq-wasm';

// API compatible with test expectations
import { promised } from './jq-wasm';

export const jq = {
  // Return parsed JSON result
  json: async (input: any, filter: string): Promise<any> => {
    return await promised(input, filter);
  },

  // Return string representation
  raw: async (input: any, filter: string): Promise<string> => {
    const result = await promised(input, filter);
    return typeof result === 'string' ? result : JSON.stringify(result);
  }
};

// Also export the simple function for direct use
export { promised as jqSimple } from './jq-wasm';

// Types
export interface JQResult {
  result?: any;
  error?: string;
}

export interface JQModule {
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

// Simplified version constant
export const JQ_VERSION = '1.8.1';
export const getJQVersion = () => JQ_VERSION;