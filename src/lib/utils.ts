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
      console.warn('Failed to compress data:', err)
      // Provide user feedback about compression failure
      if (typeof window !== 'undefined' && window.alert) {
        window.alert('Could not compress your data for sharing. The generated URL will not include your data.');
      }
      // Don't throw the error, just skip adding the data parameter
      // This allows the URL to still be generated with just the tab parameter
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
    
    // Safely decode data parameter (compressed format)
    const dataParam = params.get('data')
    if (dataParam) {
      try {
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
        console.warn('Invalid compressed data in URL parameter, ignoring:', err)
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

// Debounce utility
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout | null = null
  return ((...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }) as T
}

async function _updateUrlState(jsonInput: string, jqFilter: string, activeTab?: string): Promise<void> {
  const params = new URLSearchParams()
  
  // Add tab parameter first
  if (activeTab && activeTab !== 'input') {
    params.set('tab', activeTab)
  }
  
  // Embed filter and data into a single data object
  if (jsonInput.trim() || (jqFilter && jqFilter !== '.')) {
    try {
      let parsedData = null

      // Only try to parse JSON if it's not empty and appears to be complete
      if (jsonInput.trim()) {
        try {
          parsedData = JSON.parse(jsonInput)
        } catch (parseErr) {
          // Don't log warnings for incomplete JSON during typing
          // Only update URL with filter if JSON is invalid
          if (jqFilter && jqFilter !== '.') {
            const dataWithFilter = {
              filter: jqFilter,
              data: null
            }
            const compressedData = await encodeState(dataWithFilter)
            params.set('data', compressedData)
          }
          return // Exit early, don't update URL with invalid JSON
        }
      }

      const dataWithFilter = {
        filter: jqFilter,
        data: parsedData
      }
      const compressedData = await encodeState(dataWithFilter)
      params.set('data', compressedData)
    } catch (err) {
      console.warn('Failed to compress data:', err)
      return // Exit early on compression errors
    }
  }
  
  const newUrl = params.toString()
    ? `${window.location.pathname}?${params.toString()}`
    : window.location.pathname

  window.history.replaceState({}, '', newUrl)
}

// Debounced version of updateUrlState with 500ms delay
export const updateUrlState = debounce(_updateUrlState, 500)