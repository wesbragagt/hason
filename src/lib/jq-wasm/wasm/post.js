// Post-JS script for jq WASM module
// This runs after the WASM module is loaded but before it's ready

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
  // Ensure FS is initialized
  if (!Module.FS) {
    throw new Error('FileSystem not available');
  }
  
  const FS = Module.FS;
  
  // Store original streams
  const originalStdin = FS.streams[0];
  const originalStdout = FS.streams[1];
  const originalStderr = FS.streams[2];
  
  try {
    // Create input file
    FS.writeFile('/tmp/input.json', inputStr);
    
    // Prepare arguments: jq [filter] [input-file]
    const jqArgs = [filter, '/tmp/input.json', ...args];
    
    // Capture output
    let stdoutBuffer = '';
    let stderrBuffer = '';
    
    // Override stdout/stderr
    FS.streams[1] = {
      tty: {
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
      }
    };
    
    FS.streams[2] = {
      tty: {
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
      }
    };
    
    // Call main with arguments
    const exitCode = Module.callMain(jqArgs);
    
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
