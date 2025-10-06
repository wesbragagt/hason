import { HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface HelpButtonProps {
  onClick: () => void
}

export function HelpButton({ onClick }: HelpButtonProps) {
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onClick}
    >
      <HelpCircle className="h-[1.2rem] w-[1.2rem]" />
      <span className="sr-only">Show help</span>
    </Button>
  )
}