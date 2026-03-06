"use client"

import { CalendarDays, LogOut, Menu, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useApp } from "@/components/app-provider"

export function DashboardHeader({
  onToggleSidebar,
}: {
  onToggleSidebar: () => void
}) {
  const {
    logout,
    user,
    dateRangePreset,
    customDateFrom,
    customDateTo,
    setDateRangePreset,
    setCustomDateRange,
  } = useApp()
  const initials = (user?.fullName || user?.email || "SS")
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase())
    .join("")
    .slice(0, 2)

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="text-muted-foreground"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2 md:hidden">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-bold text-foreground">SocialSight</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Date range selector */}
        <Select value={dateRangePreset} onValueChange={(v) => setDateRangePreset(v as typeof dateRangePreset)}>
          <SelectTrigger className="hidden w-44 sm:flex">
            <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>
        {dateRangePreset === "custom" && (
          <div className="hidden items-center gap-2 sm:flex">
            <Input
              type="date"
              value={customDateFrom ?? ""}
              onChange={(e) => setCustomDateRange(e.target.value || null, customDateTo)}
              className="h-9 w-36"
            />
            <Input
              type="date"
              value={customDateTo ?? ""}
              onChange={(e) => setCustomDateRange(customDateFrom, e.target.value || null)}
              className="h-9 w-36"
            />
          </div>
        )}

        {/* User avatar */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                  {initials || "SS"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem className="flex flex-col items-start gap-0.5">
              <span className="text-sm font-medium">{user?.fullName || "User"}</span>
              <span className="text-xs text-muted-foreground">{user?.email || "-"}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
