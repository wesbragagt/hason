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
  const [viewMode, setViewMode] = useState<'tabs' | 'split'>('tabs')
  const [activeTab, setActiveTab] = useState<'input' | 'output'>('input')
  const [showToast, setShowToast] = useState(false)

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+O: Toggle between input/output tabs (only in tabs mode)
      if (e.ctrlKey && e.shiftKey && e.key === 'O') {
        e.preventDefault()
        if (viewMode === 'tabs') {
          setActiveTab(prev => prev === 'input' ? 'output' : 'input')
        }
      }
      
      // Ctrl+Shift+I: Toggle between tabs and split view
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault()
        setViewMode(prev => prev === 'tabs' ? 'split' : 'tabs')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [viewMode])

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text')
    setJsonInput(pastedText)
    
    // Auto-switch to output tab after paste if valid JSON
    try {
      JSON.parse(pastedText)
      if (viewMode === 'tabs') {
        setTimeout(() => {
          setActiveTab('output')
          setShowToast(true)
          setTimeout(() => setShowToast(false), 2000)
        }, 150)
      }
    } catch {
      // Stay on input tab if JSON is invalid
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1 className="title">hason</h1>
        <p className="subtitle">JSON Formatter with jq Syntax</p>
      </header>

      <div className="filter-controls">
        <div className="filter-row">
          <label htmlFor="jq-filter" className="filter-label">jq Filter:</label>
          <button
            className="view-toggle-btn"
            onClick={() => setViewMode(prev => prev === 'tabs' ? 'split' : 'tabs')}
            title="Toggle view mode (Ctrl+Shift+I)"
          >
            {viewMode === 'tabs' ? '⊞ Split View' : '⊟ Tab View'}
          </button>
        </div>
        <input
          id="jq-filter"
          type="text"
          value={jqFilter}
          onChange={(e) => setJqFilter(e.target.value)}
          className="filter-input"
          placeholder="Enter jq filter (e.g., .data, .users[0], .[] | select(.active))"
        />
      </div>

      {viewMode === 'tabs' ? (
        <div className="tabs-container">
          <div className="tabs-header">
            <button
              className={`tab ${activeTab === 'input' ? 'active' : ''}`}
              onClick={() => setActiveTab('input')}
            >
              JSON Input
            </button>
            <button
              className={`tab ${activeTab === 'output' ? 'active' : ''}`}
              onClick={() => setActiveTab('output')}
            >
              Output
            </button>
            <span className="keyboard-hint">Ctrl+Shift+O to switch tabs</span>
          </div>
          
          <div className="tab-content">
            {activeTab === 'input' ? (
              <div className="panel input-panel">
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  onPaste={handlePaste}
                  className="json-textarea"
                  placeholder="Paste your JSON here..."
                  spellCheck={false}
                />
              </div>
            ) : (
              <div className="panel output-panel">
                <div className="output-content">
                  {error ? (
                    <div className="error-message">{error}</div>
                  ) : (
                    <pre className="json-output">{output}</pre>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
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
      )}

      {showToast && (
        <div className="toast">Switched to output view</div>
      )}

      <PWABadge />
    </div>
  )
}

export default App