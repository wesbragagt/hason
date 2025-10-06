import '@testing-library/jest-dom';
import { vi } from 'vitest';
// Mock WASM files for testing environment
global.document = global.document || {};
global.window = global.window || {};
// Mock the jq-hason package for integration tests
vi.mock('jq-hason', () => {
    const mockJq = {
        async json(input, filter) {
            // Implement basic jq functionality for testing
            // Handle string inputs that should be parsed as JSON
            if (typeof input === 'string') {
                try {
                    // Only try to parse strings that look like JSON
                    if (input.trim().startsWith('{') || input.trim().startsWith('[') ||
                        input.trim().startsWith('"') || /^-?\d+\.?\d*$/.test(input.trim()) ||
                        input.trim() === 'true' || input.trim() === 'false' || input.trim() === 'null') {
                        input = JSON.parse(input);
                    }
                    // For malformed JSON strings or completely invalid input, throw an error
                    else if (input.includes('{') || input.includes('[') || input.includes('json')) {
                        throw new Error('Invalid JSON format');
                    }
                }
                catch {
                    throw new Error('Invalid JSON format');
                }
            }
            let result = input;
            if (filter === '.') {
                return result;
            }
            // Handle malformed filters early
            if (filter === '..' || filter === '...' || filter.includes('..') || filter.includes('[.]')) {
                throw new Error('Malformed property access');
            }
            // Handle basic property access
            if (filter.startsWith('.') && !filter.includes('|') && !filter.includes('[') && !filter.includes('(')) {
                const path = filter.slice(1);
                if (path) {
                    const keys = path.split('.').filter(k => k); // Remove empty keys
                    for (const key of keys) {
                        if (result && typeof result === 'object' && key in result) {
                            result = result[key];
                        }
                        else {
                            throw new Error(`Property '${key}' not found`);
                        }
                    }
                }
                return result;
            }
            // Handle array indexing - including starting with array index
            if (filter.includes('[') && filter.includes(']')) {
                // Handle patterns like [0] (array index at root)
                const rootArrayMatch = filter.match(/^\[(\d+)\](.*)$/);
                if (rootArrayMatch) {
                    const [, indexStr, remaining] = rootArrayMatch;
                    const index = parseInt(indexStr);
                    if (Array.isArray(result) && index >= 0 && index < result.length) {
                        result = result[index];
                        if (remaining) {
                            const remainingFilter = remaining.startsWith('.') ? remaining : '.' + remaining;
                            return mockJq.json(result, remainingFilter);
                        }
                        return result;
                    }
                    else {
                        throw new Error(`Array index ${index} out of bounds`);
                    }
                }
                // Handle patterns like .prop[0] or .prop[0].subprop
                const match = filter.match(/^\.([^[]*)\[(\d+)\](.*)$/);
                if (match) {
                    const [, prop, indexStr, remaining] = match;
                    const index = parseInt(indexStr);
                    let target = result;
                    if (prop) {
                        const keys = prop.split('.').filter(k => k); // Remove empty keys
                        for (const key of keys) {
                            if (target && typeof target === 'object' && key in target) {
                                target = target[key];
                            }
                            else {
                                throw new Error(`Property '${key}' not found`);
                            }
                        }
                    }
                    if (Array.isArray(target) && index >= 0 && index < target.length) {
                        result = target[index];
                        // Handle remaining path after array access
                        if (remaining) {
                            const remainingFilter = remaining.startsWith('.') ? remaining : '.' + remaining;
                            return mockJq.json(result, remainingFilter);
                        }
                        return result;
                    }
                    else {
                        throw new Error(`Array index ${index} out of bounds`);
                    }
                }
            }
            // Handle array iteration with []
            if (filter.includes('[]')) {
                const beforeArray = filter.split('[]')[0];
                const afterArray = filter.split('[]')[1];
                let target = result;
                if (beforeArray && beforeArray !== '.') {
                    target = await mockJq.json(result, beforeArray);
                }
                if (Array.isArray(target)) {
                    if (afterArray) {
                        return Promise.all(target.map(item => mockJq.json(item, '.' + afterArray)));
                    }
                    else {
                        return target;
                    }
                }
                else {
                    throw new Error('Cannot iterate over non-array');
                }
            }
            throw new Error(`Unsupported filter: ${filter}`);
        },
        async raw(input, filter) {
            const result = await mockJq.json(input, filter);
            return typeof result === 'string' ? result : JSON.stringify(result);
        }
    };
    return {
        jq: mockJq,
        promised: (input, filter) => mockJq.json(input, filter),
        jqSimple: (input, filter) => mockJq.json(input, filter),
        getJQVersion: async () => '1.8.1',
        getVersion: async () => '1.8.1',
        getVersionedFilename: async (filename) => filename.replace('.', '_1-8-1.'),
        JQ_VERSION: '1.8.1'
    };
});
// Ensure DOM globals are available for jq WASM loading
if (typeof document !== 'undefined' && document.head) {
    // Setup complete - DOM environment is ready
}
