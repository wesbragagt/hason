import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface HelpDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function HelpDrawer({ open, onOpenChange }: HelpDrawerProps) {
  const handleClose = () => onOpenChange(false)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg" onClose={handleClose}>
        <SheetHeader>
          <SheetTitle className="text-xl bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Help & Reference
          </SheetTitle>
        </SheetHeader>
        
        <div className="space-y-6">
          {/* Keyboard Shortcuts */}
          <Card className="bg-card/60 border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                ⌨️ Keyboard Shortcuts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Toggle Help Drawer</span>
                <Badge variant="secondary" className="font-mono">Ctrl+Shift+H</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Switch View Mode</span>
                <Badge variant="secondary" className="font-mono">Click Split/Tabs Button</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Auto-switch to Output (Tabs Mode)</span>
                <Badge variant="secondary" className="font-mono">Paste JSON</Badge>
              </div>
            </CardContent>
          </Card>

          {/* jq Syntax Examples */}
          <Card className="bg-card/60 border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                🔍 jq Filter Examples
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-sm mb-2 text-muted-foreground">Basic Filters</h4>
                <div className="space-y-2 text-sm font-mono bg-muted/50 p-3 rounded-lg">
                  <div><span className="text-primary">.</span> <span className="text-muted-foreground">// Identity - returns input as-is</span></div>
                  <div><span className="text-primary">.name</span> <span className="text-muted-foreground">// Get property 'name'</span></div>
                  <div><span className="text-primary">.user.email</span> <span className="text-muted-foreground">// Nested property access</span></div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-sm mb-2 text-muted-foreground">Array Access</h4>
                <div className="space-y-2 text-sm font-mono bg-muted/50 p-3 rounded-lg">
                  <div><span className="text-primary">.items[0]</span> <span className="text-muted-foreground">// First item in array</span></div>
                  <div><span className="text-primary">.users[2]</span> <span className="text-muted-foreground">// Third item (0-indexed)</span></div>
                  <div><span className="text-primary">.data[-1]</span> <span className="text-muted-foreground">// Last item (with full jq)</span></div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-2 text-muted-foreground">Advanced (Full jq-web)</h4>
                <div className="space-y-2 text-sm font-mono bg-muted/50 p-3 rounded-lg">
                  <div><span className="text-primary">.[] | .name</span> <span className="text-muted-foreground">// Map over array</span></div>
                  <div><span className="text-primary">keys</span> <span className="text-muted-foreground">// Get object keys</span></div>
                  <div><span className="text-primary">length</span> <span className="text-muted-foreground">// Array/object length</span></div>
                  <div><span className="text-primary">select(.age &gt; 18)</span> <span className="text-muted-foreground">// Filter conditions</span></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tips & Tricks */}
          <Card className="bg-card/60 border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                💡 Tips & Tricks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <strong>📋 Paste Behavior:</strong> When you paste JSON in tabs mode, the app automatically switches to the output tab to show results.
              </div>
              <div>
                <strong>🔄 View Modes:</strong> Toggle between tabs (mobile-friendly) and split view (desktop) using the layout button.
              </div>
              <div>
                <strong>⚡ jq Loading:</strong> Basic filters (like <code className="bg-muted px-1 rounded-md">.property</code>) work immediately. Complex filters require jq-web to load.
              </div>
              <div>
                <strong>🎨 Themes:</strong> Choose from multiple color themes using the palette button, and toggle light/dark mode with the sun/moon button.
              </div>
              <div>
                <strong>📱 PWA:</strong> Install this app on your device for offline use - look for the install prompt or use your browser's "Add to Home Screen" option.
              </div>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  )
}