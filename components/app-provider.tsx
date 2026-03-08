"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import type { AppView, DashboardTab, DateRangePreset } from "@/lib/types"
import { clearAnalysisResults } from "@/lib/api"

interface AnalysisSummary {
  commentCount: number
  productCount: number
}

interface AppState {
  isAuthLoading: boolean
  user: {
    id: string
    email: string
    fullName: string | null
    businessName: string | null
  } | null
  view: AppView
  activeTab: DashboardTab
  isAnalysisComplete: boolean
  demoMode: boolean
  dateRangePreset: DateRangePreset
  customDateFrom: string | null
  customDateTo: string | null
  analysisSummary: AnalysisSummary | null
  setView: (view: AppView) => void
  setActiveTab: (tab: DashboardTab) => void
  setIsAnalysisComplete: (v: boolean) => void
  setDemoMode: (v: boolean) => void
  setDateRangePreset: (v: DateRangePreset) => void
  setCustomDateRange: (from: string | null, to: string | null) => void
  setAnalysisSummary: (summary: AnalysisSummary | null) => void
  setUser: (user: AppState["user"]) => void
  logout: () => void
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [user, setUser] = useState<AppState["user"]>(null)
  const [view, setView] = useState<AppView>("login")
  const [activeTab, setActiveTab] = useState<DashboardTab>("home")
  const [isAnalysisComplete, setIsAnalysisComplete] = useState(false)
  const [demoMode, setDemoMode] = useState(true)
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>("30d")
  const [customDateFrom, setCustomDateFrom] = useState<string | null>(null)
  const [customDateTo, setCustomDateTo] = useState<string | null>(null)
  const [analysisSummary, setAnalysisSummary] = useState<AnalysisSummary | null>(null)

  useEffect(() => {
    async function bootstrapAuth() {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)
      try {
        const res = await fetch("/api/auth/me", {
          cache: "no-store",
          signal: controller.signal,
        })
        if (!res.ok) {
          setUser(null)
          setView("login")
          return
        }
        const data = await res.json()
        setUser(data.user ?? null)
        setView("dashboard")
      } catch {
        setUser(null)
        setView("login")
      } finally {
        clearTimeout(timeoutId)
        setIsAuthLoading(false)
      }
    }
    bootstrapAuth()
  }, [])

  const setCustomDateRange = useCallback((from: string | null, to: string | null) => {
    setCustomDateFrom(from)
    setCustomDateTo(to)
  }, [])

  const logout = useCallback(() => {
    fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined)
    clearAnalysisResults()
    setUser(null)
    setView("login")
    setActiveTab("home")
    setIsAnalysisComplete(false)
    setAnalysisSummary(null)
  }, [])

  return (
    <AppContext.Provider
      value={{
        isAuthLoading,
        user,
        view,
        activeTab,
        isAnalysisComplete,
        demoMode,
        dateRangePreset,
        customDateFrom,
        customDateTo,
        analysisSummary,
        setView,
        setActiveTab,
        setIsAnalysisComplete,
        setDemoMode,
        setDateRangePreset,
        setCustomDateRange,
        setAnalysisSummary,
        setUser,
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
