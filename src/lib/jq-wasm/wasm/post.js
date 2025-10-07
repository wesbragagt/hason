// Post-JS script for jq WASM module
// This runs INSIDE the Emscripten module closure, so we have access to internal variables

// The key insight: post.js code runs in the same closure as the Emscripten runtime,
// so FS and callMain ARE available here, but only after onRuntimeInitialized is called.
// We need to capture them at the right time.

// Export FS immediately - it's available in this closure
// With MODULARIZE=1 and EXPORT_ES6=0, FS is in the closure scope
if (typeof FS !== 'undefined') {
  Module['FS'] = FS;
  console.log('[post.js onRuntimeInit] Exported FS to Module immediately');
}

// Create runMain function to invoke jq's main()
// This needs to convert JS string array to C argc/argv
// Note: We can't use 'callMain' because Emscripten already defines that
Module['runMain'] = function(args) {
  if (!args || args.length === 0) {
    args = [];
  }
  
  // Use ccall to invoke main with proper argument marshalling
  // Emscripten's ccall handles string[] to char** conversion
  try {
    // For jq: int main(int argc, char** argv)
    // We use ccall to handle the marshalling
    var argc = args.length;
    
    // Allocate memory for argv array
    var argvPtr = Module['_malloc']((argc + 1) * 4); // array of pointers
    for (var i = 0; i < argc; i++) {
      var argStr = Module['intArrayFromString'](args[i]);
      var strPtr = Module['_malloc'](argStr.length);
      Module['HEAPU8'].set(argStr, strPtr);
      Module['HEAPU32'][argvPtr/4 + i] = strPtr;
    }
    Module['HEAPU32'][argvPtr/4 + argc] = 0; // null terminator
    
    // Call _main
    var result = Module['_main'](argc, argvPtr);
    
    // Free allocated memory
    for (var i = 0; i < argc; i++) {
      Module['_free'](Module['HEAPU32'][argvPtr/4 + i]);
    }
    Module['_free'](argvPtr);
    
    return result;
  } catch (e) {
    // ExitStatus is thrown when program calls exit()
    if (e && e.name === 'ExitStatus') {
      return e.status;
    }
    throw e;
  }
};

console.log('[post.js] Defined runMain, type:', typeof Module['runMain']);

// Helper function to run jq with input and filter
Module['json'] = async function(input, filter) {
  const inputStr = typeof input === 'string' ? input : JSON.stringify(input);
  const outputStr = await Module['raw'](inputStr, filter, ['-c']);
  
  if (!outputStr || outputStr.trim() === '') {
    return null;
  }
  
  // Handle multiple outputs (newline separated)
  if (outputStr.indexOf('\n') !== -1) {
    return outputStr.trim().split('\n').map(line => JSON.parse(line));
  }
  
  return JSON.parse(outputStr.trim());
};

// Raw function that processes string input and returns string output
Module['raw'] = async function(inputStr, filter, args = []) {
  // FS should be available directly in this scope since post.js is part of the Emscripten output
  // No need to access it through Module.FS
  if (typeof FS === 'undefined') {
    throw new Error('FileSystem not available - module not initialized');
  }
  
  // Store original streams
  const originalStdin = FS.streams[0];
  const originalStdout = FS.streams[1];
  const originalStderr = FS.streams[2];
  
  try {
    // Ensure /tmp directory exists
    try {
      FS.mkdir('/tmp');
    } catch(e) {
      // Directory might already exist, ignore error (errno 20 = EEXIST)
      if (e.errno !== 20) {
        console.warn('Failed to create /tmp:', e);
      }
    }

    // Create input file
    FS.writeFile('/tmp/input.json', inputStr);
    
    // Prepare arguments: jq [options] [filter] [input-file]
    // Options must come BEFORE the filter
    const jqArgs = [...args, filter, '/tmp/input.json'];
    
    // Debug logging
    console.log('jq arguments:', jqArgs);
    
    // Capture output
    let stdoutBuffer = '';
    let stderrBuffer = '';
    
    // Override stdout/stderr with complete stream objects
    const stdoutTty = {
      output: [],
      ops: {
        put_char: function(tty, val) {
          if (val === null || val === 10) {
            stdoutBuffer += String.fromCharCode(...tty.output) + '\n';
            tty.output = [];
          } else if (val !== 0) {
            tty.output.push(val);
          }
        },
        fsync: function(tty) {
          if (tty.output && tty.output.length > 0) {
            stdoutBuffer += String.fromCharCode(...tty.output);
            tty.output = [];
          }
        }
      }
    };
    
    const stderrTty = {
      output: [],
      ops: {
        put_char: function(tty, val) {
          if (val === null || val === 10) {
            stderrBuffer += String.fromCharCode(...tty.output) + '\n';
            tty.output = [];
          } else if (val !== 0) {
            tty.output.push(val);
          }
        },
        fsync: function(tty) {
          if (tty.output && tty.output.length > 0) {
            stderrBuffer += String.fromCharCode(...tty.output);
            tty.output = [];
          }
        }
      }
    };
    
    // Create complete stream objects with all required properties
    FS.streams[1] = {
      fd: 1,
      tty: stdoutTty,
      seekable: false,
      stream_ops: {
        write: function(stream, buffer, offset, length, position) {
          for (let i = 0; i < length; i++) {
            stream.tty.ops.put_char(stream.tty, buffer[offset + i]);
          }
          return length;
        },
        fsync: function(stream) {
          stream.tty.ops.fsync(stream.tty);
        }
      }
    };
    
    FS.streams[2] = {
      fd: 2,
      tty: stderrTty,
      seekable: false,
      stream_ops: {
        write: function(stream, buffer, offset, length, position) {
          for (let i = 0; i < length; i++) {
            stream.tty.ops.put_char(stream.tty, buffer[offset + i]);
          }
          return length;
        },
        fsync: function(stream) {
          stream.tty.ops.fsync(stream.tty);
        }
      }
    };
    
    // Call main with arguments using Module.runMain
    if (!Module.runMain) {
      throw new Error('runMain not available - module not initialized');
    }
    const exitCode = Module.runMain(jqArgs);
    
    // Cleanup
    try {
      FS.unlink('/tmp/input.json');
    } catch(e) {
      // Ignore cleanup errors
    }
    
    // Restore original streams
    FS.streams[0] = originalStdin;
    FS.streams[1] = originalStdout;
    FS.streams[2] = originalStderr;
    
    if (exitCode !== 0) {
      console.error('jq failed with exit code:', exitCode);
      console.error('stderr:', stderrBuffer);
      console.error('stdout:', stdoutBuffer);
      throw new Error(stderrBuffer || `jq exited with code ${exitCode}`);
    }
    
    return stdoutBuffer;
    
  } catch (error) {
    // Restore streams on error
    FS.streams[0] = originalStdin;
    FS.streams[1] = originalStdout;
    FS.streams[2] = originalStderr;
    throw error;
  }
};

// Export the configured module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Module;
}
