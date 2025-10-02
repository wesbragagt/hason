import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { encodeState, decodeState } from "../compression"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// URL state management utilities
const MAX_URL_LENGTH = 2000 // Conservative limit for URL length

export async function encodeStateToUrl(jsonInput: string, jqFilter: string, activeTab?: string): Promise<string> {
  const params = new URLSearchParams()
  
  // Add tab parameter first
  if (activeTab && activeTab !== 'input') {
    params.set('tab', activeTab)
  }
  
  // Embed filter and data into a single data object
  if (jsonInput.trim() || (jqFilter && jqFilter !== '.')) {
    try {
      const dataWithFilter = {
        filter: jqFilter,
        data: jsonInput.trim() ? JSON.parse(jsonInput) : null
      }
      const compressedData = await encodeState(dataWithFilter)
      params.set('data', compressedData)
    } catch (err) {
      console.warn('Failed to compress data, falling back to uncompressed:', err)
      // Fallback to old method if compression fails
      const dataWithFilter = {
        filter: jqFilter,
        data: jsonInput.trim() ? JSON.parse(jsonInput) : null
      }
      params.set('data', encodeURIComponent(JSON.stringify(dataWithFilter)))
    }
  }
  
  const paramString = params.toString()
  const fullUrl = paramString ? `${window.location.origin}${window.location.pathname}?${paramString}` : window.location.origin + window.location.pathname
  
  // Check URL length and warn if too long
  if (fullUrl.length > MAX_URL_LENGTH) {
    console.warn('Generated URL is very long and may not work in all browsers:', fullUrl.length, 'characters')
  }
  
  return fullUrl
}

export async function decodeStateFromUrl(): Promise<{ jsonInput: string; jqFilter: string; activeTab: 'input' | 'output' }> {
  try {
    const params = new URLSearchParams(window.location.search)
    
    let jsonInput = ''
    let jqFilter = '.'
    let activeTab: 'input' | 'output' = 'input'
    
    // Safely decode data parameter (now contains both filter and data)
    const dataParam = params.get('data')
    if (dataParam) {
      try {
        // First try to decode as compressed data
        const dataWithFilter = await decodeState(dataParam)
        
        // Extract filter and data from the combined object
        if (dataWithFilter && typeof dataWithFilter === 'object') {
          if (dataWithFilter.filter) {
            jqFilter = dataWithFilter.filter
          }
          if (dataWithFilter.data) {
            jsonInput = JSON.stringify(dataWithFilter.data, null, 2)
          }
        }
      } catch (err) {
        // Fallback: try to parse as old-style URL-encoded JSON data
        try {
          const decodedParam = decodeURIComponent(dataParam)
          const dataWithFilter = JSON.parse(decodedParam)
          
          // Extract filter and data from the combined object
          if (dataWithFilter && typeof dataWithFilter === 'object') {
            if (dataWithFilter.filter) {
              jqFilter = dataWithFilter.filter
            }
            if (dataWithFilter.data) {
              jsonInput = JSON.stringify(dataWithFilter.data, null, 2)
            }
          }
        } catch {
          // Final fallback: try to parse as direct JSON data
          try {
            const directData = decodeURIComponent(dataParam)
            JSON.parse(directData) // Validate it's valid JSON
            jsonInput = directData
          } catch {
            console.warn('Invalid data in URL parameter, ignoring:', err)
          }
        }
      }
    }
    
    // Safely decode tab parameter
    const tabParam = params.get('tab')
    if (tabParam === 'output') {
      activeTab = 'output'
    }
    
    return { jsonInput, jqFilter, activeTab }
  } catch (err) {
    console.warn('Error parsing URL parameters:', err)
    return { jsonInput: '', jqFilter: '.', activeTab: 'input' }
  }
}

export async function updateUrlState(jsonInput: string, jqFilter: string, activeTab?: string): Promise<void> {
  const params = new URLSearchParams()
  
  // Add tab parameter first
  if (activeTab && activeTab !== 'input') {
    params.set('tab', activeTab)
  }
  
  // Embed filter and data into a single data object
  if (jsonInput.trim() || (jqFilter && jqFilter !== '.')) {
    try {
      const dataWithFilter = {
        filter: jqFilter,
        data: jsonInput.trim() ? JSON.parse(jsonInput) : null
      }
      const compressedData = await encodeState(dataWithFilter)
      params.set('data', compressedData)
    } catch (err) {
      console.warn('Failed to compress data, falling back to uncompressed:', err)
      // Fallback to old method if compression fails
      try {
        const dataWithFilter = {
          filter: jqFilter,
          data: jsonInput.trim() ? JSON.parse(jsonInput) : null
        }
        params.set('data', encodeURIComponent(JSON.stringify(dataWithFilter)))
      } catch (fallbackErr) {
        console.warn('Failed to encode data with filter:', fallbackErr)
      }
    }
  }
  
  const newUrl = params.toString() 
    ? `${window.location.pathname}?${params.toString()}`
    : window.location.pathname
    
  window.history.replaceState({}, '', newUrl)
}