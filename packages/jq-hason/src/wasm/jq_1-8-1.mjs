// ES module wrapper for jq_1-8-1.js
// The jq_1-8-1.js file creates a global variable named jqModule via IIFE
import './jq_1-8-1.js';

// Debug: Check what's available globally
console.log('Available globals:', Object.keys(globalThis).filter(key => key.includes('jq')));
console.log('globalThis.jqModule:', globalThis.jqModule);
console.log('window.jqModule:', typeof window !== 'undefined' ? window.jqModule : 'no window');

// Access jqModule after the IIFE has executed
// The IIFE returns an async function which becomes the jqModule
export const jqModule = globalThis.jqModule || (typeof window !== 'undefined' ? window.jqModule : undefined);
export default jqModule;