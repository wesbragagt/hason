import '@testing-library/jest-dom'

// Setup testing environment
global.document = global.document || {}
global.window = global.window || {}

// Integration tests now use real jq-web package
// No mocking needed - jq-web works in Node.js test environment
