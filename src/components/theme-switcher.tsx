import React from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Palette } from "lucide-react"

const themes = [
  { name: "Catppuccin", value: "catppuccin", description: "Warm purples and pinks" },
  { name: "Starry Night", value: "starry-night", description: "Deep purple galaxy" },
  { name: "Doom 64", value: "doom-64", description: "Retro gaming vibes" },
  { name: "Clean Slate", value: "clean-slate", description: "Minimal and clean" },
  { name: "Default", value: "default", description: "Classic shadcn theme" },
]

export function ThemeSwitcher() {

  const handleThemeChange = (themeName: string) => {
    // Remove existing theme classes
    document.documentElement.classList.remove("catppuccin", "starry-night", "doom-64", "clean-slate", "default")
    
    // Add new theme class if not default
    if (themeName !== "default") {
      document.documentElement.classList.add(themeName)
    }
    
    // Store the theme preference
    localStorage.setItem("hason-color-theme", themeName)
  }

  // Initialize theme on component mount
  React.useEffect(() => {
    const savedTheme = localStorage.getItem("hason-color-theme") || "clean-slate"
    handleThemeChange(savedTheme)
  }, [])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Palette className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Select theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {themes.map((theme) => (
          <DropdownMenuItem
            key={theme.value}
            onClick={() => handleThemeChange(theme.value)}
            className="group flex flex-col items-start gap-1 py-3 focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary hover:bg-primary/10 hover:text-primary"
          >
            <div className="font-medium">{theme.name}</div>
            <div className="text-xs opacity-70 group-focus:opacity-90 group-data-[highlighted]:opacity-90 group-hover:opacity-90">{theme.description}</div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}