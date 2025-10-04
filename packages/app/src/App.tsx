import { useState, useEffect } from 'react'
import PWABadge from './PWABadge.tsx'
import { ThemeToggle } from './components/theme-toggle'
import { ThemeSwitcher } from './components/theme-switcher'
import { HelpButton } from './components/help-button'
import { HelpDrawer } from './components/help-drawer'
import { ShareButton } from './components/share-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Split, TabletSmartphone, Copy, Check, CornerDownLeft } from 'lucide-react'
import { cn, decodeStateFromUrl, updateUrlState } from '@/lib/utils'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'

let jq: any = null

function App() {
  // Local state for immediate UI updates (no debouncing)
  const [jsonInput, setJsonInputLocal] = useState('')
  const [jqFilter, setJqFilterLocal] = useState('.')
  const [appliedJqFilter, setAppliedJqFilter] = useState('.')
  const [activeTab, setActiveTabLocal] = useState<'input' | 'output'>('input')
  const [urlStateLoaded, setUrlStateLoaded] = useState(false)
  
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [jqLoaded, setJqLoaded] = useState(false)
  const [viewMode, setViewMode] = useState<'tabs' | 'split'>('tabs')
  const [showToast, setShowToast] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  // Load initial state from URL (non-blocking)
  useEffect(() => {
    // Set URL state as loaded immediately so app doesn't wait
    setUrlStateLoaded(true)
    
    // Try to load URL state in background without blocking
    decodeStateFromUrl().then((initialUrlState) => {
      // Only apply URL state if there's actually data to load
      if (initialUrlState.jsonInput || initialUrlState.jqFilter !== '.') {
        setJsonInputLocal(initialUrlState.jsonInput)
        setJqFilterLocal(initialUrlState.jqFilter)
        setAppliedJqFilter(initialUrlState.jqFilter)
        setActiveTabLocal(initialUrlState.activeTab)
      }
    }).catch((err) => {
      console.warn('Failed to decode URL state:', err)
    })
  }, [])

  // Load jq-hason dynamically
  useEffect(() => {
    import('jq-hason').then((module) => {
      jq = module
      setJqLoaded(true)
    }).catch((err) => {
      console.error('Failed to load jq-hason:', err)
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

      // Try to use jq-hason if available
      if (jqLoaded && jq && jq.jq) {
        const result = await jq.jq.json(parsedInput, filter)
        setOutput(JSON.stringify(result, null, 2))
        setError('')
      } else {
        // Basic fallback for some common filters
        if (filter.startsWith('.') && !filter.includes('|') && !filter.includes('[')) {
          const keys = filter.substring(1).split('.')
          let result = parsedInput
          
          for (const key of keys) {
            if (key && result && typeof result === 'object') {
              if (Array.isArray(result)) {
                const index = parseInt(key)
                if (!isNaN(index)) {
                  result = result[index]
                } else {
                  result = result.map(item => item[key])
                }
              } else {
                result = result[key]
              }
            }
          }

          setOutput(JSON.stringify(result, null, 2))
          setError('')
        } else {
          setError('jq-hason not loaded. Only basic operations like ".", ".key", ".array[0]" are supported.')
          setOutput('')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON or jq filter')
      setOutput('')
    }
  }

  // Process JSON immediately when input changes or jq filter is applied
  useEffect(() => {
    void processJson(jsonInput, appliedJqFilter)
  }, [jsonInput, appliedJqFilter, jqLoaded])

  // Update URL when input changes or jq filter is applied (after URL state is loaded)
  useEffect(() => {
    if (urlStateLoaded) {
      void updateUrlState(jsonInput, appliedJqFilter, activeTab)
    }
  }, [jsonInput, appliedJqFilter, activeTab, urlStateLoaded])

  // Handlers for immediate local state updates
  const setJsonInput = (value: string) => {
    setJsonInputLocal(value)
  }

  const setJqFilter = (value: string) => {
    setJqFilterLocal(value)
  }

  const setActiveTab = (tab: 'input' | 'output') => {
    setActiveTabLocal(tab)
    // Update URL immediately for tab changes (if URL state is loaded)
    if (urlStateLoaded) {
      void updateUrlState(jsonInput, jqFilter, tab)
    }
  }

  // Keyboard shortcut for help
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'H') {
        e.preventDefault()
        setHelpOpen(prev => !prev)
      }
    }

    document.addEventListener('keydown', handleKeydown)
    return () => document.removeEventListener('keydown', handleKeydown)
  }, [])

  const handlePaste = () => {
    setTimeout(() => {
      if (viewMode === 'tabs' && activeTab === 'input') {
        setActiveTab('output')
        setShowToast(true)
        setTimeout(() => setShowToast(false), 2000)
      }
    }, 100)
  }

  // Handle Enter key for jq filter submission
  const handleJqFilterKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      // Apply the filter - this will trigger processing via useEffect
      setAppliedJqFilter(jqFilter)
    }
  }

  const handleCopyOutput = async () => {
    if (!output) return
    
    try {
      await navigator.clipboard.writeText(output)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Dynamic background overlay that adapts to theme */}
      <div className="absolute inset-0 opacity-30 pointer-events-none bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5" />
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `
          radial-gradient(circle at 20% 80%, hsl(var(--primary) / 0.05) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, hsl(var(--accent) / 0.05) 0%, transparent 50%)
        `
      }} />
      
      {/* Header */}
      <div className="relative z-10 text-center p-4 pb-3 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="flex justify-between items-center">
          <div className="flex-1" />
          <div className="flex-1">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent drop-shadow-lg tracking-tight">
              hason
            </h1>
            <p className="text-muted-foreground text-sm font-light mt-1">
              Your friendly neighbor json formatter
            </p>
          </div>
          <div className="flex-1 flex justify-end gap-2">
            <HelpButton onClick={() => setHelpOpen(true)} />
            <ThemeSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Filter controls */}
      <div className="relative z-10 px-4 py-2">
        <Card className="bg-card/80 backdrop-blur-lg border-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                jq filter:
              </label>
              <Input
                value={jqFilter}
                onChange={(e) => setJqFilter(e.target.value)}
                onKeyDown={handleJqFilterKeyDown}
                className="flex-1 bg-background border-border/60 focus:border-primary focus:bg-background text-foreground placeholder:text-muted-foreground font-mono"
                placeholder="Enter jq filter..."
                data-testid="jq-filter-input"
              />
              <Button
                onClick={() => setAppliedJqFilter(jqFilter)}
                variant="outline"
                size="sm"
                className="bg-primary/10 border-border hover:bg-primary/20"
                title="Apply jq filter"
                data-testid="apply-filter-button"
              >
                <CornerDownLeft className="h-4 w-4" />
              </Button>
              <ShareButton
                jsonInput={jsonInput}
                jqFilter={appliedJqFilter}
                activeTab={activeTab}
              />
              <Button
                onClick={() => setViewMode(viewMode === 'tabs' ? 'split' : 'tabs')}
                variant="outline"
                size="sm"
                className="bg-primary/10 border-border hover:bg-primary/20"
                data-testid="view-mode-toggle"
              >
                {viewMode === 'tabs' ? <Split className="h-4 w-4" /> : <TabletSmartphone className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main editor */}
      <div className="relative z-10 flex-1 px-4 pb-4 overflow-hidden">
        {viewMode === 'tabs' ? (
          <Card className="h-full bg-card/80 backdrop-blur-lg border-purple-500/30">
            <CardHeader className="pb-2 px-4 pt-3">
              <div className="flex gap-2">
                <Button
                  onClick={() => setActiveTab('input')}
                  variant={activeTab === 'input' ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    'transition-all',
                    activeTab === 'input' 
                      ? 'bg-primary hover:bg-primary/90 text-primary-foreground' 
                      : 'hover:bg-primary/20'
                  )}
                  data-testid="json-input-tab"
                >
                  JSON Input
                </Button>
                <Button
                  onClick={() => setActiveTab('output')}
                  variant={activeTab === 'output' ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    'transition-all',
                    activeTab === 'output' 
                      ? 'bg-primary hover:bg-primary/90 text-primary-foreground' 
                      : 'hover:bg-primary/20'
                  )}
                  data-testid="output-tab"
                >
                  Output
                </Button>
                {activeTab === 'output' && output && (
                  <Button
                    onClick={handleCopyOutput}
                    variant="ghost"
                    size="sm"
                    className="ml-auto hover:bg-primary/20"
                    title="Copy output to clipboard"
                    data-testid="copy-output-button"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0 h-full">
              <div className="h-full flex flex-col">
                {activeTab === 'input' && (
                  <Textarea
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    onPaste={handlePaste}
                    className="flex-1 border-0 bg-transparent resize-none font-mono text-sm p-4 focus-visible:ring-0 focus-visible:ring-offset-0"
                    placeholder="Paste your JSON here..."
                    spellCheck={false}
                    data-testid="json-input-textarea"
                  />
                )}
                {activeTab === 'output' && (
                  <div className="flex-1 p-4 overflow-auto">
                    {error ? (
                      <div className="text-destructive font-mono text-sm bg-destructive/10 p-3 rounded-lg border border-destructive/20" data-testid="error-message">
                        {error}
                      </div>
                    ) : (
                      <SyntaxHighlighter
                        language="json"
                        style={tomorrow}
                        customStyle={{
                          background: 'transparent',
                          fontSize: '0.875rem',
                          fontFamily: 'inherit',
                          margin: 0,
                          padding: 0
                        }}
                        data-testid="json-output"
                      >
                        {output}
                      </SyntaxHighlighter>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="h-full grid grid-cols-2 gap-4 max-h-[calc(100vh-160px)]">
            <Card className="bg-card/80 backdrop-blur-lg border-border flex flex-col">
              <CardHeader className="pb-2 px-4 pt-3 flex-shrink-0">
                <CardTitle className="text-lg">JSON Input</CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden">
                <Textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  onPaste={handlePaste}
                  className="w-full border-0 bg-transparent resize-none font-mono text-sm p-4 focus-visible:ring-0 focus-visible:ring-offset-0 overflow-auto whitespace-pre-wrap break-words"
                  style={{ 
                    height: 'calc(85vh - 160px)'
                  }}
                  placeholder="Paste your JSON here..."
                  spellCheck={false}
                  data-testid="json-input-textarea-split"
                />
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-lg border-border flex flex-col">
              <CardHeader className="pb-2 px-4 pt-3 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Output</CardTitle>
                  {output && (
                    <Button
                      onClick={handleCopyOutput}
                      variant="ghost"
                      size="sm"
                      className="hover:bg-primary/20"
                      title="Copy output to clipboard"
                      data-testid="copy-output-button-split"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 flex-1 overflow-auto">
                <div 
                  style={{ 
                    height: 'calc(85vh - 160px)'
                  }}
                  className="overflow-auto"
                >
                  {error ? (
                    <div className="text-destructive font-mono text-sm bg-destructive/10 p-3 rounded-lg border border-destructive/20" data-testid="error-message-split">
                      {error}
                    </div>
                  ) : (
                    <SyntaxHighlighter
                      language="json"
                      style={tomorrow}
                      customStyle={{
                        background: 'transparent',
                        fontSize: '0.875rem',
                        fontFamily: 'inherit',
                        margin: 0,
                        padding: 0
                      }}
                      data-testid="json-output-split"
                    >
                      {output}
                    </SyntaxHighlighter>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Toast notification */}
      {showToast && (
        <div className="fixed bottom-4 right-4 z-50 bg-card border border-border text-card-foreground px-4 py-2 rounded-xl shadow-lg backdrop-blur-sm animate-in slide-in-from-bottom-2">
          Switched to output view
        </div>
      )}

      <HelpDrawer open={helpOpen} onOpenChange={setHelpOpen} />
      <PWABadge />
    </div>
  )
}

export default App