import React, { useState } from 'react'
import { User, Menu, Bell, Search, LogOut, Settings, FileText, Users, BarChart3, MessageSquare } from 'lucide-react'
import { Button } from './ui/button'
import { authService } from '../services/auth'

interface LayoutProps {
  children: React.ReactNode
  user: any
  currentView: string
  onViewChange: (view: string) => void
  onLogout: () => void
}

export const Layout: React.FC<LayoutProps> = ({ children, user, currentView, onViewChange, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const menuItems = user?.role === 'SME'
    ? [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
        { id: 'scan', label: 'Scan Invoice', icon: FileText },
        { id: 'transactions', label: 'Transactions', icon: FileText },
        { id: 'documents', label: 'Documents', icon: FileText },
        { id: 'ai-advisor', label: 'AI Tax Advisor', icon: User },
        { id: 'ca-connect', label: 'CA Connect', icon: Users },
        { id: 'chat', label: 'Messages', icon: MessageSquare },
        { id: 'settings', label: 'Settings', icon: Settings }
      ]
    : [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
        { id: 'clients', label: 'Clients', icon: Users },
        { id: 'review-queue', label: 'Review Queue', icon: FileText },
        { id: 'documents', label: 'Documents', icon: FileText },
        { id: 'chat', label: 'Messages', icon: MessageSquare },
        { id: 'tax-filing', label: 'Tax Filing', icon: FileText },
        { id: 'reports', label: 'Reports', icon: BarChart3 },
        { id: 'compliance-calendar', label: 'Compliance & Notices', icon: FileText },
        { id: 'settings', label: 'Settings', icon: Settings }
      ]

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute right-0 top-1/4 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
      </div>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900/80 backdrop-blur-2xl border-r border-white/10 transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 transition-transform duration-300 ease-in-out shadow-2xl shadow-blue-500/10`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-emerald-400 shadow-lg shadow-blue-500/30" />
            <div>
              <p className="text-sm text-slate-300 uppercase tracking-[0.22em]">Taxora</p>
              <p className="text-lg font-semibold text-white leading-tight">Finance OS</p>
            </div>
          </div>
        </div>

        <nav className="mt-6 px-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = currentView === item.id
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`group relative w-full overflow-hidden rounded-xl px-4 py-3 text-left transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500/30 via-indigo-500/20 to-emerald-500/20 text-white shadow-lg shadow-blue-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <span
                  className={`absolute inset-y-0 left-0 w-1 rounded-r-full transition-all ${
                    isActive ? 'bg-gradient-to-b from-blue-400 to-emerald-400' : 'bg-transparent'
                  }`}
                />
                <div className="relative flex items-center space-x-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                  <span className="font-medium">{item.label}</span>
                </div>
              </button>
            )
          })}
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <div className="glass-surface rounded-2xl p-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user?.name || authService.getCurrentUser()?.name}</p>
                <p className="text-xs text-slate-400 uppercase tracking-wide">{user?.role}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={onLogout} className="text-slate-300 hover:text-red-300">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="relative lg:pl-72">
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-slate-900/60 backdrop-blur-xl border-b border-white/5 px-4 py-3 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden text-white"
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search anything..."
                  className="pl-10 pr-4 py-2.5 w-64 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="sm" className="relative text-white">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full shadow-sm shadow-rose-500/70" />
              </Button>
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-white">{user?.businessName || 'Workspace'}</p>
                <p className="text-xs text-slate-400">{user?.role} Portal</p>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="relative p-4 lg:p-10">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none rounded-3xl" />
          <div className="relative z-10">{children}</div>
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}