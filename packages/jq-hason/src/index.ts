// jq-hason: WebAssembly build of jq for JavaScript environments
// Main API exports

export { promised as jq } from './jq-wasm';
export { getVersionedFilename, getJQVersion } from './jq-version';

// Re-export for compatibility
export { promised } from './jq-wasm';

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

// Version information - re-export from jq-version to maintain single source of truth
export { getJQVersion as getVersion } from './jq-version';

// For backwards compatibility, provide synchronous version constant
// This matches the fallback version in jq-version.ts
export const JQ_VERSION = '1.8.1';