// jq WASM wrapper using jq-web package
import jqPromise from 'jq-web';

let jqModule: any = null;

async function getJq() {
  if (!jqModule) {
    jqModule = await jqPromise;
  }
  return jqModule;
}

// Main API function - wraps jq-web
export async function promised(input: any, filter: string): Promise<any> {
  const jq = await getJq();
  return await jq.json(input, filter);
}
