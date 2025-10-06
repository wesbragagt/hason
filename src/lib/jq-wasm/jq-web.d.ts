declare module 'jq-web' {
  interface JQModule {
    json<T = any>(input: any, filter: string): Promise<T>;
    raw(input: string, filter: string, options?: string[]): string;
  }
  
  const jqPromise: Promise<JQModule>;
  export default jqPromise;
}
