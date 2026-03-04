"use client"

import { Facebook, Bell, BellOff, User, Key } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

export function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Manage your account preferences and integrations.
        </p>
      </div>

      {/* Profile Settings */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-primary" />
            Profile Settings
          </CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="settings-name">Full Name</Label>
              <Input id="settings-name" defaultValue="Demo User" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="settings-email">Email</Label>
              <Input id="settings-email" type="email" defaultValue="demo@socialsight.io" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="settings-business">Business Name</Label>
            <Input id="settings-business" defaultValue="My Online Store" />
          </div>
          <Button className="self-end">Save Changes</Button>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-primary" />
            Notification Preferences
          </CardTitle>
          <CardDescription>Choose how you want to be notified</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">Email Notifications</span>
              <span className="text-xs text-muted-foreground">Receive analysis reports via email</span>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">Sentiment Alerts</span>
              <span className="text-xs text-muted-foreground">
                Get notified when negative sentiment spikes
              </span>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">Weekly Digest</span>
              <span className="text-xs text-muted-foreground">Summary of weekly sentiment trends</span>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* Connected Accounts */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Facebook className="h-4 w-4 text-primary" />
            Connected Accounts
          </CardTitle>
          <CardDescription>Manage your social media connections</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1877F2]/10">
                <Facebook className="h-5 w-5 text-[#1877F2]" />
              </div>
              <div>
                <span className="text-sm font-medium text-foreground">Facebook</span>
                <p className="text-xs text-muted-foreground">My Online Store Page</p>
              </div>
            </div>
            <Badge className="bg-success/10 text-success border-success/20" variant="outline">
              Connected
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* API Configuration */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="h-4 w-4 text-primary" />
            API Configuration
          </CardTitle>
          <CardDescription>Configure backend API settings (for developers)</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="api-url">API Base URL</Label>
            <Input
              id="api-url"
              placeholder="https://api.socialsight.io/v1"
              defaultValue=""
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to use the built-in demo data.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="api-key">API Key</Label>
            <Input id="api-key" type="password" placeholder="sk-..." />
          </div>
          <Button variant="outline" className="self-end">
            Test Connection
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
