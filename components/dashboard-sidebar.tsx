"use client"

import {
  BarChart3,
  Home,
  Lightbulb,
  History,
  Activity,
  Moon,
  Package,
  Settings,
  Sparkles,
  Sun,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useApp } from "@/components/app-provider"
import type { DashboardTab } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const navItems: { id: DashboardTab; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Dashboard", icon: Home },
  { id: "sentiment", label: "Sentiment Analysis", icon: BarChart3 },
  { id: "products", label: "Product Performance", icon: Package },
  { id: "recommendations", label: "Recommendations", icon: Lightbulb },
  { id: "modelMonitor", label: "Model Monitor", icon: Activity },
  { id: "history", label: "History", icon: History },
  { id: "settings", label: "Settings", icon: Settings },
]

export function DashboardSidebar({
  collapsed,
  onToggleTheme,
  isDark,
}: {
  collapsed: boolean
  onToggleTheme: () => void
  isDark: boolean
}) {
  const { activeTab, setActiveTab } = useApp()

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "fixed left-0 top-0 z-30 flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold tracking-tight text-sidebar-foreground">
              SocialSight
            </span>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map((item) => {
            const isActive = activeTab === item.id
            const btn = (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </button>
            )

            if (collapsed) {
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>{btn}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              )
            }
            return btn
          })}
        </nav>

        {/* Theme toggle at bottom */}
        <div className="border-t border-sidebar-border p-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={collapsed ? "icon" : "default"}
                onClick={onToggleTheme}
                className={cn(
                  "w-full text-sidebar-foreground/70 hover:text-sidebar-foreground",
                  !collapsed && "justify-start gap-3"
                )}
              >
                {isDark ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
                {!collapsed && <span>{isDark ? "Light Mode" : "Dark Mode"}</span>}
              </Button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">
                {isDark ? "Light Mode" : "Dark Mode"}
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  )
}
