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
    
    // Prepare arguments: argv[0] (program name) [options] [filter] [input-file]
    // Options must come BEFORE the filter
    // IMPORTANT: argv[0] should be the program name "jq"
    const normalizedArgs = args.some((flag) => flag === '-M' || flag === '--monochrome-output') ? args : ['-M', ...args];
    const jqArgs = ['jq', ...normalizedArgs, filter, '/tmp/input.json'];
    
    // Debug logging
    console.log('jq arguments:', jqArgs);
    
    // Capture output by patching existing TTY ops
    let stdoutBuffer = '';
    let stderrBuffer = '';
    
    const stdoutStream = FS.streams[1];
    const stderrStream = FS.streams[2];
    
    const originalStdoutOps = stdoutStream.tty.ops;
    const originalStderrOps = stderrStream.tty.ops;
    
    const originalStdoutPutChar = originalStdoutOps.put_char;
    const originalStdoutFsync = originalStdoutOps.fsync;
    const originalStderrPutChar = originalStderrOps.put_char;
    const originalStderrFsync = originalStderrOps.fsync;
    
    stdoutStream.tty.ops = {
      put_char: function(tty, val) {
        if (originalStdoutPutChar) {
          originalStdoutPutChar(tty, val);
        }
        if (val === null) {
          return;
        }
        if (val === 10) {
          stdoutBuffer += '\n';
        } else if (val !== 0) {
          stdoutBuffer += String.fromCharCode(val);
        }
      },
      fsync: function(tty) {
        if (originalStdoutFsync) {
          originalStdoutFsync(tty);
        }
      }
    };
    
    stderrStream.tty.ops = {
      put_char: function(tty, val) {
        if (originalStderrPutChar) {
          originalStderrPutChar(tty, val);
        }
        if (val === null) {
          return;
        }
        if (val === 10) {
          stderrBuffer += '\n';
        } else if (val !== 0) {
          stderrBuffer += String.fromCharCode(val);
        }
      },
      fsync: function(tty) {
        if (originalStderrFsync) {
          originalStderrFsync(tty);
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
    stdoutStream.tty.ops = originalStdoutOps;
    stderrStream.tty.ops = originalStderrOps;
    
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
    stdoutStream.tty.ops = originalStdoutOps;
    stderrStream.tty.ops = originalStderrOps;
    throw error;
  }
};

// Export the configured module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Module;
}
