import { describe, it, expect } from 'vitest';
import { jq } from '@/lib/jq-wasm';
describe('WASM Module Integration (Mocked)', () => {
    it('should handle basic jq operations through mocked module', async () => {
        const result = await jq.json({ test: 'value' }, '.');
        expect(result).toEqual({ test: 'value' });
    });
    it('should handle property access through mocked module', async () => {
        const data = { name: 'John', age: 30 };
        const result = await jq.json(data, '.name');
        expect(result).toBe('John');
    });
    it('should handle array access through mocked module', async () => {
        const data = { items: ['a', 'b', 'c'] };
        const result = await jq.json(data, '.items[1]');
        expect(result).toBe('b');
    });
    it('should handle nested property access through mocked module', async () => {
        const data = { user: { profile: { email: 'test@example.com' } } };
        const result = await jq.json(data, '.user.profile.email');
        expect(result).toBe('test@example.com');
    });
    it('should handle raw output format', async () => {
        const data = { message: 'hello' };
        const result = await jq.raw(data, '.message');
        expect(result).toBe('hello');
    });
    it('should handle object raw output', async () => {
        const data = { nested: { key: 'value' } };
        const result = await jq.raw(data, '.nested');
        expect(result).toBe(JSON.stringify({ key: 'value' }));
    });
    it('should throw errors for invalid properties', async () => {
        const data = { name: 'John' };
        await expect(jq.json(data, '.nonexistent')).rejects.toThrow('Property \'nonexistent\' not found');
    });
    it('should throw errors for malformed filters', async () => {
        const data = { name: 'John' };
        await expect(jq.json(data, '..')).rejects.toThrow('Malformed property access');
    });
    it('should handle invalid JSON input', async () => {
        const invalidJson = '{"invalid": json}';
        await expect(jq.json(invalidJson, '.')).rejects.toThrow('Invalid JSON format');
    });
});
