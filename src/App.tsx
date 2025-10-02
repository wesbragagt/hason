import { useState, useEffect } from 'react'
import PWABadge from './PWABadge.tsx'
import './App.css'

let jq: any = null

function App() {
  const [jsonInput, setJsonInput] = useState('')
  const [jqFilter, setJqFilter] = useState('.')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [jqLoaded, setJqLoaded] = useState(false)

  // Load jq-web dynamically
  useEffect(() => {
    import('jq-web').then((module) => {
      jq = module.default
      setJqLoaded(true)
    }).catch((err) => {
      console.error('Failed to load jq-web:', err)
      setJqLoaded(false)
    })
  }, [])

  const processJson = async (input: string, filter: string) => {
    if (!input.trim()) {
      setOutput('')
      setError('')
      return
    }

    try {
      const parsedInput = JSON.parse(input)

      // Handle basic jq filters without the library for now
      if (filter === '.') {
        setOutput(JSON.stringify(parsedInput, null, 2))
        setError('')
        return
      }

      // Try to use jq-web if available
      if (jqLoaded && jq && jq.promised && jq.promised.json) {
        const result = await jq.promised.json(parsedInput, filter)
        setOutput(JSON.stringify(result, null, 2))
        setError('')
      } else {
        // Fallback for basic operations
        try {
          let result = parsedInput

          // Handle some basic jq operations manually
          if (filter.startsWith('.')) {
            const path = filter.slice(1)
            if (path) {
              const keys = path.split('.')
              for (const key of keys) {
                if (key.includes('[') && key.includes(']')) {
                  const [objKey, indexStr] = key.split('[')
                  const index = parseInt(indexStr.replace(']', ''))
                  result = objKey ? result[objKey][index] : result[index]
                } else {
                  result = result[key]
                }
              }
            }
          }

          setOutput(JSON.stringify(result, null, 2))
          setError('')
        } catch (fallbackErr) {
          setError('jq-web not loaded. Only basic operations like ".", ".key", ".array[0]" are supported.')
          setOutput('')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON or jq filter')
      setOutput('')
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      processJson(jsonInput, jqFilter)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [jsonInput, jqFilter])

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text')
    setJsonInput(pastedText)
  }

  return (
    <div className="app">
      <header className="header">
        <h1 className="title">hason</h1>
        <p className="subtitle">JSON Formatter with jq Syntax</p>
      </header>

      <div className="filter-controls">
        <label htmlFor="jq-filter" className="filter-label">jq Filter:</label>
        <input
          id="jq-filter"
          type="text"
          value={jqFilter}
          onChange={(e) => setJqFilter(e.target.value)}
          className="filter-input"
          placeholder="Enter jq filter (e.g., .data, .users[0], .[] | select(.active))"
        />
      </div>

      <div className="editor-container">
        <div className="panel input-panel">
          <div className="panel-header">
            <h3>JSON Input</h3>
          </div>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            onPaste={handlePaste}
            className="json-textarea"
            placeholder="Paste your JSON here..."
            spellCheck={false}
          />
        </div>

        <div className="panel output-panel">
          <div className="panel-header">
            <h3>Output</h3>
          </div>
          <div className="output-content">
            {error ? (
              <div className="error-message">{error}</div>
            ) : (
              <pre className="json-output">{output}</pre>
            )}
          </div>
        </div>
      </div>

      <PWABadge />
    </div>
  )
}

export default App