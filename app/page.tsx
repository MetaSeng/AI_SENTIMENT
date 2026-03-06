"use client"

import { AppProvider, useApp } from "@/components/app-provider"
import { LoginPage } from "@/components/login-page"
import { DashboardLayout } from "@/components/dashboard-layout"

function AppContent() {
  const { view, isAuthLoading } = useApp()

  if (isAuthLoading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading...</div>
  }

  if (view === "login") {
    return <LoginPage />
  }

  return <DashboardLayout />
}

export default function Page() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
