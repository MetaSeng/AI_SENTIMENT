"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import type { AppView, DashboardTab } from "@/lib/types"

interface AnalysisSummary {
  commentCount: number
  productCount: number
}

interface AppState {
  view: AppView
  activeTab: DashboardTab
  isAnalysisComplete: boolean
  demoMode: boolean
  analysisSummary: AnalysisSummary | null
  setView: (view: AppView) => void
  setActiveTab: (tab: DashboardTab) => void
  setIsAnalysisComplete: (v: boolean) => void
  setDemoMode: (v: boolean) => void
  setAnalysisSummary: (summary: AnalysisSummary | null) => void
  logout: () => void
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<AppView>("login")
  const [activeTab, setActiveTab] = useState<DashboardTab>("home")
  const [isAnalysisComplete, setIsAnalysisComplete] = useState(false)
  const [demoMode, setDemoMode] = useState(true)
  const [analysisSummary, setAnalysisSummary] = useState<AnalysisSummary | null>(null)

  const logout = useCallback(() => {
    setView("login")
    setActiveTab("home")
    setIsAnalysisComplete(false)
    setAnalysisSummary(null)
  }, [])

  return (
    <AppContext.Provider
      value={{
        view,
        activeTab,
        isAnalysisComplete,
        demoMode,
        analysisSummary,
        setView,
        setActiveTab,
        setIsAnalysisComplete,
        setDemoMode,
        setAnalysisSummary,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useApp must be used within AppProvider")
  return ctx
}
