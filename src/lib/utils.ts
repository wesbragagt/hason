import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// URL state management utilities
const MAX_URL_LENGTH = 2000 // Conservative limit for URL length

export function encodeStateToUrl(jsonInput: string, jqFilter: string, activeTab?: string): string {
  const params = new URLSearchParams()
  
  // Add tab parameter first
  if (activeTab && activeTab !== 'input') {
    params.set('tab', activeTab)
  }
  
  // Embed filter and data into a single data object
  if (jsonInput.trim() || (jqFilter && jqFilter !== '.')) {
    const dataWithFilter = {
      filter: jqFilter,
      data: jsonInput.trim() ? JSON.parse(jsonInput) : null
    }
    params.set('data', encodeURIComponent(JSON.stringify(dataWithFilter)))
  }
  
  const paramString = params.toString()
  const fullUrl = paramString ? `${window.location.origin}${window.location.pathname}?${paramString}` : window.location.origin + window.location.pathname
  
  // Check URL length and warn if too long
  if (fullUrl.length > MAX_URL_LENGTH) {
    console.warn('Generated URL is very long and may not work in all browsers:', fullUrl.length, 'characters')
  }
  
  return fullUrl
}

export function decodeStateFromUrl(): { jsonInput: string; jqFilter: string; activeTab: 'input' | 'output' } {
  try {
    const params = new URLSearchParams(window.location.search)
    
    let jsonInput = ''
    let jqFilter = '.'
    let activeTab: 'input' | 'output' = 'input'
    
    // Safely decode data parameter (now contains both filter and data)
    const dataParam = params.get('data')
    if (dataParam) {
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
      } catch (err) {
        // Fallback: try to parse as old-style direct JSON data
        try {
          const directData = decodeURIComponent(dataParam)
          JSON.parse(directData) // Validate it's valid JSON
          jsonInput = directData
        } catch (fallbackErr) {
          console.warn('Invalid data in URL parameter, ignoring:', err)
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

export function updateUrlState(jsonInput: string, jqFilter: string, activeTab?: string): void {
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
      params.set('data', encodeURIComponent(JSON.stringify(dataWithFilter)))
    } catch (err) {
      console.warn('Failed to encode data with filter:', err)
    }
  }
  
  const newUrl = params.toString() 
    ? `${window.location.pathname}?${params.toString()}`
    : window.location.pathname
    
  window.history.replaceState({}, '', newUrl)
}