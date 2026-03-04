"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { useApp } from "@/components/app-provider"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardHome } from "@/components/dashboard-home"
import { SentimentAnalysis } from "@/components/sentiment-analysis"
import { ProductPerformance } from "@/components/product-performance"
import { Recommendations } from "@/components/recommendations"
import { SettingsPage } from "@/components/settings-page"

export function DashboardLayout() {
  const { activeTab } = useApp()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // Check initial system preference
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    setIsDark(prefersDark)
    if (prefersDark) {
      document.documentElement.classList.add("dark")
    }
  }, [])

  const toggleTheme = () => {
    setIsDark(!isDark)
    document.documentElement.classList.toggle("dark")
  }

  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return <DashboardHome />
      case "sentiment":
        return <SentimentAnalysis />
      case "products":
        return <ProductPerformance />
      case "recommendations":
        return <Recommendations />
      case "settings":
        return <SettingsPage />
      default:
        return <DashboardHome />
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar
        collapsed={sidebarCollapsed}
        onToggleTheme={toggleTheme}
        isDark={isDark}
      />

      <div
        className={cn(
          "flex flex-1 flex-col transition-all duration-200",
          sidebarCollapsed ? "ml-16" : "ml-60"
        )}
      >
        <DashboardHeader
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <main className="flex-1 p-6">{renderContent()}</main>
      </div>
    </div>
  )
}
