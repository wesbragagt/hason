// Post-JS script for jq WASM module
// This runs after the WASM module is loaded but before it's ready

// Helper functions for jq operations
Module['jq'] = {
  // Initialize jq context
  init: function() {
    return Module.ccall('jq_init', 'number', [], []);
  },
  
  // Compile a jq filter
  compile: function(jqState, filter) {
    var filterPtr = Module.allocate(Module.intArrayFromString(filter), 'i8', Module.ALLOC_NORMAL);
    var result = Module.ccall('jq_compile', 'number', ['number', 'number'], [jqState, filterPtr]);
    Module._free(filterPtr);
    return result;
  },
  
  // Process input with compiled filter
  next: function(jqState) {
    return Module.ccall('jq_next', 'number', ['number'], [jqState]);
  },
  
  // Cleanup jq context
  teardown: function(jqState) {
    Module.ccall('jq_teardown', 'void', ['number'], [jqState]);
  },
  
  // High-level API function
  process: function(input, filter) {
    return new Promise(function(resolve, reject) {
      try {
        var jqState = Module.jq.init();
        if (!jqState) {
          reject(new Error('Failed to initialize jq'));
          return;
        }
        
        var compileResult = Module.jq.compile(jqState, filter);
        if (compileResult !== 0) {
          Module.jq.teardown(jqState);
          reject(new Error('Failed to compile jq filter: ' + filter));
          return;
        }
        
        // Set input (this would need more implementation)
        // For now, just return the input as a placeholder
        Module.jq.teardown(jqState);
        resolve(input);
      } catch (error) {
        reject(error);
      }
    });
  }
};

// Export the configured module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Module;
}