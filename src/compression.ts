// Base58 alphabet (Bitcoin/IPFS standard)
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

/**
 * Encodes a Uint8Array to Base58 string
 */
function base58Encode(bytes: Uint8Array): string {
  if (bytes.length === 0) return ''

  // Convert bytes to big integer
  let num = 0n
  for (const byte of bytes) {
    num = num * 256n + BigInt(byte)
  }

  // Convert to base58
  let result = ''
  while (num > 0n) {
    const remainder = num % 58n
    result = BASE58_ALPHABET[Number(remainder)] + result
    num = num / 58n
  }

  // Add leading '1's for leading zero bytes
  for (const byte of bytes) {
    if (byte === 0) {
      result = '1' + result
    } else {
      break
    }
  }

  return result
}

/**
 * Decodes a Base58 string to Uint8Array
 */
function base58Decode(str: string): Uint8Array {
  if (typeof str !== 'string') {
    throw new Error('Input must be a string')
  }

  if (str.length === 0) return new Uint8Array(0)

  // Validate characters
  for (const char of str) {
    if (!BASE58_ALPHABET.includes(char)) {
      throw new Error(`Invalid Base58 character: ${char}`)
    }
  }

  // Convert from base58 to big integer
  let num = 0n
  for (const char of str) {
    const index = BASE58_ALPHABET.indexOf(char)
    num = num * 58n + BigInt(index)
  }

  // Convert to bytes
  const bytes: number[] = []
  while (num > 0n) {
    bytes.unshift(Number(num % 256n))
    num = num / 256n
  }

  // Add leading zero bytes for leading '1's
  for (const char of str) {
    if (char === '1') {
      bytes.unshift(0)
    } else {
      break
    }
  }

  return new Uint8Array(bytes)
}

/**
 * Encodes an object to a compressed Base58 string
 * Process: JSON → Deflate → Base58
 */
export async function encodeState(obj: any): Promise<string> {
  try {
    // Step 1: Convert to JSON
    const json = JSON.stringify(obj)

    // Step 2: Convert text to Uint8Array
    const input = new TextEncoder().encode(json)

    // Step 3: Compress using deflate
    const compressedStream = new Blob([input])
      .stream()
      .pipeThrough(new CompressionStream('deflate'))
    
    const compressedBuffer = await new Response(compressedStream).arrayBuffer()

    // Step 4: Encode to Base58
    return base58Encode(new Uint8Array(compressedBuffer))
  } catch (error) {
    throw new Error(`Failed to encode state: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Decodes a Base58 string back to the original object
 * Process: Base58 → Inflate → JSON
 */
export async function decodeState(encoded: string): Promise<any> {
  try {
    if (typeof encoded !== 'string') {
      throw new Error('Input must be a string')
    }

    if (encoded.length === 0) {
      throw new Error('Input string cannot be empty')
    }

    // Step 1: Decode from Base58
    const bytes = base58Decode(encoded)

    // Step 2: Decompress using inflate
    const decompressedStream = new Blob([bytes])
      .stream()
      .pipeThrough(new DecompressionStream('deflate'))
    
    const decompressedBuffer = await new Response(decompressedStream).arrayBuffer()

    // Step 3: Convert back to text
    const json = new TextDecoder().decode(decompressedBuffer)

    // Step 4: Parse JSON
    return JSON.parse(json)
  } catch (error) {
    throw new Error(`Failed to decode state: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}