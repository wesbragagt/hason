// Pre-JS script for jq WASM module
// This runs before the WASM module is initialized

var Module = typeof Module !== 'undefined' ? Module : {};

// Set up module configuration
Module['noInitialRun'] = true;
Module['noExitRuntime'] = true;

// Memory management
Module['TOTAL_MEMORY'] = 16777216; // 16MB
Module['ALLOW_MEMORY_GROWTH'] = true;

// Configure filesystem if needed
Module['preRun'] = Module['preRun'] || [];
Module['preRun'].push(function() {
  // Any pre-initialization setup can go here
});

// Export configuration for easier access
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Module;
}