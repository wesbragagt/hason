import { describe, it, expect, beforeAll } from 'vitest'
import { fixtures } from '../fixtures/test-data'

// Mock compression functions - these will be implemented in src/compression.ts
let encodeState: (obj: any) => Promise<string>
let decodeState: (encoded: string) => Promise<any>

beforeAll(async () => {
  // Import the actual compression functions when they're implemented
  const compression = await import('../../src/compression')
  encodeState = compression.encodeState
  decodeState = compression.decodeState
})

describe('Compression Utility Functions', () => {
  describe('Basic Functionality', () => {
    it('should round-trip encode and decode simple objects', async () => {
      const original = { name: 'test', value: 42 }
      const encoded = await encodeState(original)
      const decoded = await decodeState(encoded)
      expect(decoded).toEqual(original)
    })

    it('should round-trip encode and decode different data types', async () => {
      const testCases = [
        'hello world',
        42,
        true,
        false,
        null,
        [],
        {},
        [1, 2, 3],
        { nested: { deeply: { value: 'test' } } }
      ]

      for (const original of testCases) {
        const encoded = await encodeState(original)
        const decoded = await decodeState(encoded)
        expect(decoded).toEqual(original)
      }
    })

    it('should handle existing test fixtures', async () => {
      const testFixtures = [fixtures.simple, fixtures.nested, fixtures.complex]
      
      for (const fixture of testFixtures) {
        const encoded = await encodeState(fixture)
        const decoded = await decodeState(encoded)
        expect(decoded).toEqual(fixture)
      }
    })

    it('should produce different encoded strings for different inputs', async () => {
      const obj1 = { a: 1 }
      const obj2 = { b: 2 }
      
      const encoded1 = await encodeState(obj1)
      const encoded2 = await encodeState(obj2)
      
      expect(encoded1).not.toBe(encoded2)
    })

    it('should produce consistent encoded strings for same input', async () => {
      const original = { consistent: 'test', number: 123 }
      
      const encoded1 = await encodeState(original)
      const encoded2 = await encodeState(original)
      
      expect(encoded1).toBe(encoded2)
    })
  })

  describe('Practical Use Cases', () => {
    it('should handle URL state data format', async () => {
      const urlStateData = {
        filter: '.users[0].name',
        data: fixtures.nested
      }
      
      const encoded = await encodeState(urlStateData)
      const decoded = await decodeState(encoded)
      
      expect(decoded).toEqual(urlStateData)
      expect(decoded.filter).toBe('.users[0].name')
      expect(decoded.data).toEqual(fixtures.nested)
    })

    it('should handle typical jq filters with data', async () => {
      const testCases = [
        { filter: '.', data: fixtures.simple },
        { filter: '.name', data: { name: 'John', age: 30 } },
        { filter: '.users[] | .profile.email', data: fixtures.nested },
        { filter: '.api.endpoints[0].methods', data: fixtures.complex }
      ]

      for (const testCase of testCases) {
        const encoded = await encodeState(testCase)
        const decoded = await decodeState(encoded)
        expect(decoded).toEqual(testCase)
      }
    })

    it('should handle Unicode characters', async () => {
      const unicodeData = {
        emoji: '🚀💻📊',
        chinese: '你好世界',
        arabic: 'مرحبا بالعالم',
        special: 'àáâãäåæçèéêë',
        mixed: 'Hello 世界 🌍 مرحبا'
      }
      
      const encoded = await encodeState(unicodeData)
      const decoded = await decodeState(encoded)
      expect(decoded).toEqual(unicodeData)
    })

    it('should handle large arrays', async () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        value: Math.random() * 100,
        active: i % 2 === 0
      }))
      
      const encoded = await encodeState(largeArray)
      const decoded = await decodeState(encoded)
      expect(decoded).toEqual(largeArray)
    })

    it('should handle deeply nested objects', async () => {
      const deeplyNested = { level1: { level2: { level3: { level4: { level5: { value: 'deep' } } } } } }
      
      const encoded = await encodeState(deeplyNested)
      const decoded = await decodeState(encoded)
      expect(decoded).toEqual(deeplyNested)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty objects and arrays', async () => {
      const emptyObj = {}
      const emptyArray: any[] = []
      
      expect(await decodeState(await encodeState(emptyObj))).toEqual(emptyObj)
      expect(await decodeState(await encodeState(emptyArray))).toEqual(emptyArray)
    })

    it('should handle null and undefined in objects', async () => {
      const objWithNull = { nullValue: null, undefinedValue: undefined }
      
      const encoded = await encodeState(objWithNull)
      const decoded = await decodeState(encoded)
      
      // JSON.stringify converts undefined to null or omits it
      expect(decoded.nullValue).toBe(null)
    })

    it('should handle very long strings', async () => {
      const longString = 'x'.repeat(10000)
      const objWithLongString = { content: longString }
      
      const encoded = await encodeState(objWithLongString)
      const decoded = await decodeState(encoded)
      expect(decoded.content).toBe(longString)
    })

    it('should handle special characters that might affect Base58', async () => {
      const specialChars = {
        quotes: '"\'`',
        slashes: '/\\',
        brackets: '[]{}()',
        symbols: '!@#$%^&*',
        whitespace: ' \t\n\r',
        numbers: '0123456789'
      }
      
      const encoded = await encodeState(specialChars)
      const decoded = await decodeState(encoded)
      expect(decoded).toEqual(specialChars)
    })

    it('should reject invalid Base58 strings', async () => {
      const invalidBase58Strings = [
        '0OIl', // Contains invalid Base58 characters
        'invalid-string-with-dashes',
        'string+with+plus',
        'string=with=equals',
        ''
      ]

      for (const invalidString of invalidBase58Strings) {
        await expect(decodeState(invalidString)).rejects.toThrow()
      }
    })

    it('should reject non-string input to decodeState', async () => {
      const invalidInputs = [null, undefined, 42, {}, [], true]
      
      for (const invalidInput of invalidInputs) {
        await expect(decodeState(invalidInput as any)).rejects.toThrow()
      }
    })

    it('should handle corrupted compressed data gracefully', async () => {
      // Create a valid encoded string and then corrupt it
      const original = { test: 'data' }
      const validEncoded = await encodeState(original)
      
      // Corrupt the encoded string
      const corruptedEncoded = validEncoded.slice(0, -5) + 'XXXXX'
      
      await expect(decodeState(corruptedEncoded)).rejects.toThrow()
    })
  })

  describe('Performance and Size Validation', () => {
    it('should compress typical JSON data', async () => {
      const testData = fixtures.complex
      const jsonString = JSON.stringify(testData)
      const encodedString = await encodeState(testData)
      const urlEncodedString = encodeURIComponent(jsonString)
      
      // Compressed string should be shorter than URL-encoded JSON for large objects
      
      // For complex data, compression should provide benefits
      if (jsonString.length > 500) {
        expect(encodedString.length).toBeLessThan(urlEncodedString.length)
      }
    })

    it('should maintain reasonable performance for large objects', async () => {
      const largeObject = {
        data: Array.from({ length: 500 }, (_, i) => ({
          id: i,
          name: `User ${i}`,
          email: `user${i}@example.com`,
          profile: {
            age: 20 + (i % 50),
            active: i % 3 === 0,
            tags: [`tag${i % 10}`, `category${i % 5}`],
            metadata: { created: `2024-01-${(i % 28) + 1}` }
          }
        }))
      }
      
      const startTime = Date.now()
      const encoded = await encodeState(largeObject)
      const decoded = await decodeState(encoded)
      const endTime = Date.now()
      
      // Should complete within reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000)
      expect(decoded).toEqual(largeObject)
    })

    it('should reduce URL length for typical app data', async () => {
      const typicalAppState = {
        filter: '.users[] | select(.active == true) | {name, email, profile}',
        data: {
          users: Array.from({ length: 50 }, (_, i) => ({
            id: i,
            name: `User ${i}`,
            email: `user${i}@example.com`,
            active: i % 3 === 0,
            profile: { department: `Dept ${i % 5}`, role: `Role ${i % 3}` }
          }))
        }
      }
      
      const jsonString = JSON.stringify(typicalAppState)
      const currentUrlEncoded = encodeURIComponent(jsonString)
      const compressedEncoded = await encodeState(typicalAppState)
      
      const currentUrlLength = `${window.location.origin}?data=${currentUrlEncoded}`.length
      const compressedUrlLength = `${window.location.origin}?data=${compressedEncoded}`.length
      
      
      // Should provide significant URL length reduction
      expect(compressedUrlLength).toBeLessThan(currentUrlLength)
    })

    it('should handle edge case where compression might not help', async () => {
      // Very small objects might not compress well
      const smallObject = { a: 1 }
      const encoded = await encodeState(smallObject)
      
      // Should still round-trip correctly even if not smaller
      const decoded = await decodeState(encoded)
      expect(decoded).toEqual(smallObject)
    })
  })

  describe('Integration with URL State Patterns', () => {
    it('should work with existing URL state data structure', async () => {
      const urlStateFormat = {
        filter: '.users[0].profile.contact.email',
        data: fixtures.nested
      }
      
      const encoded = await encodeState(urlStateFormat)
      const decoded = await decodeState(encoded)
      
      expect(decoded.filter).toBe('.users[0].profile.contact.email')
      expect(decoded.data).toEqual(fixtures.nested)
    })

    it('should handle null data in URL state format', async () => {
      const urlStateWithNullData = {
        filter: '.',
        data: null
      }
      
      const encoded = await encodeState(urlStateWithNullData)
      const decoded = await decodeState(encoded)
      
      expect(decoded).toEqual(urlStateWithNullData)
    })

    it('should handle empty filter in URL state format', async () => {
      const urlStateWithEmptyFilter = {
        filter: '',
        data: fixtures.simple
      }
      
      const encoded = await encodeState(urlStateWithEmptyFilter)
      const decoded = await decodeState(encoded)
      
      expect(decoded).toEqual(urlStateWithEmptyFilter)
    })

    it('should be compatible with different tab states', async () => {
      // Simulate the full state that might be encoded in URLs
      const fullAppState = {
        filter: '.api.endpoints[] | .path',
        data: fixtures.complex,
        tab: 'output'
      }
      
      const encoded = await encodeState(fullAppState)
      const decoded = await decodeState(encoded)
      
      expect(decoded).toEqual(fullAppState)
    })

    it('should provide URL length benefits for real-world scenarios', async () => {
      // Test with complex filter and large data that would break current 2000 char limit
      const complexScenario = {
        filter: '.monitoring.metrics[] | select(.type == "counter") | {name, values: .values[] | select(.value > 1000)}',
        data: fixtures.complex
      }
      
      const currentApproach = encodeURIComponent(JSON.stringify(complexScenario))
      const compressedApproach = await encodeState(complexScenario)
      
      // Verify round-trip works
      const decoded = await decodeState(compressedApproach)
      expect(decoded).toEqual(complexScenario)
      
      // Should help with URL length issue
      
      // If current approach would exceed URL limit, compressed should be smaller
      if (currentApproach.length > 2000) {
        expect(compressedApproach.length).toBeLessThan(currentApproach.length)
      }
    })
  })
})