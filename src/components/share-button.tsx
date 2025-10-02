import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Share2, Check } from 'lucide-react'
import { encodeStateToUrl } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface ShareButtonProps {
  jsonInput: string
  jqFilter: string
  activeTab: 'input' | 'output'
  className?: string
}

export function ShareButton({ jsonInput, jqFilter, activeTab, className }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    const shareUrl = encodeStateToUrl(jsonInput, jqFilter, activeTab)
    
    // Warn user if URL is very long
    if (shareUrl.length > 2000) {
      const proceed = confirm(
        `The URL is quite long (${shareUrl.length} characters) and may not work in all browsers or messaging apps. Do you want to continue?`
      )
      if (!proceed) return
    }
    
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy URL:', err)
      // Fallback: show the URL in a prompt
      prompt('Copy this URL to share:', shareUrl)
    }
  }

  return (
    <Button
      onClick={handleShare}
      variant="outline"
      size="sm"
      className={cn(
        "bg-primary/10 border-border hover:bg-primary/20",
        className
      )}
      title="Share current filter and data"
    >
      {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
    </Button>
  )
}