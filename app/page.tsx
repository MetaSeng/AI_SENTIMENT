"use client"

import { AppProvider, useApp } from "@/components/app-provider"
import { LoginPage } from "@/components/login-page"
import { DashboardLayout } from "@/components/dashboard-layout"

function AppContent() {
  const { view } = useApp()

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
