import { describe, it, expect } from 'vitest'
import { jq } from 'jq-hason'
import { fixtures, testCases } from '../fixtures/test-data'

describe('Basic jq Syntax Integration', () => {
  describe('Identity Filter', () => {
    it('should return the entire input with "." filter', async () => {
      const result = await jq.json(fixtures.simple, '.')
      expect(result).toEqual(fixtures.simple)
    })

    it('should work with complex nested objects', async () => {
      const result = await jq.json(fixtures.nested, '.')
      expect(result).toEqual(fixtures.nested)
    })

    it('should work with arrays', async () => {
      const array = [1, 2, 3, 'test', { key: 'value' }]
      const result = await jq.json(array, '.')
      expect(result).toEqual(array)
    })

    it('should work with primitive values', async () => {
      expect(await jq.json('hello', '.')).toBe('hello')
      expect(await jq.json(42, '.')).toBe(42)
      expect(await jq.json(true, '.')).toBe(true)
      expect(await jq.json(null, '.')).toBe(null)
    })
  })

  describe('Property Access', () => {
    it('should access top-level properties', async () => {
      expect(await jq.json(fixtures.simple, '.name')).toBe('John Doe')
      expect(await jq.json(fixtures.simple, '.age')).toBe(30)
      expect(await jq.json(fixtures.simple, '.active')).toBe(true)
      expect(await jq.json(fixtures.simple, '.score')).toBe(85.5)
    })

    it('should access nested properties', async () => {
      expect(await jq.json(fixtures.simple, '.profile.email')).toBe('john@example.com')
      expect(await jq.json(fixtures.simple, '.profile.phone')).toBe('555-0123')
    })

    it('should access deeply nested properties', async () => {
      const result = await jq.json(fixtures.nested, '.users[0].profile.contact.email')
      expect(result).toBe('alice@company.com')
    })

    it('should access properties in complex structures', async () => {
      expect(await jq.json(fixtures.complex, '.api.version')).toBe('2.1.0')
      expect(await jq.json(fixtures.complex, '.database.connections[0].name')).toBe('primary')
    })
  })

  describe('Property Access Edge Cases', () => {
    it('should handle missing properties gracefully', async () => {
      await expect(jq.json(fixtures.simple, '.nonexistent')).rejects.toThrow()
    })

    it('should handle nested missing properties', async () => {
      await expect(jq.json(fixtures.simple, '.profile.nonexistent')).rejects.toThrow()
    })

    it('should handle accessing properties on null/undefined', async () => {
      await expect(jq.json({ nullValue: null }, '.nullValue.property')).rejects.toThrow()
    })

    it('should handle accessing properties on primitives', async () => {
      await expect(jq.json({ stringValue: 'hello' }, '.stringValue.property')).rejects.toThrow()
    })
  })

  describe('Raw Output', () => {
    it('should return string representation with raw() method', async () => {
      const result = await jq.raw(fixtures.simple, '.name')
      expect(result).toBe('John Doe')
    })

    it('should stringify objects in raw() method', async () => {
      const result = await jq.raw(fixtures.simple, '.profile')
      expect(result).toBe(JSON.stringify({ email: 'john@example.com', phone: '555-0123' }))
    })

    it('should handle arrays in raw() method', async () => {
      const result = await jq.raw(fixtures.simple, '.tags')
      expect(result).toBe(JSON.stringify(['developer', 'javascript', 'react']))
    })
  })

  describe('Batch Test Cases', () => {
    it('should handle all basic test cases', async () => {
      for (const testCase of testCases.basic) {
        const result = await jq.json(testCase.input, testCase.filter)
        expect(result).toEqual(testCase.expected)
      }
    })
  })
})