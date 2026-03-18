import React, { useState, useEffect } from 'react'
import { LoginForm } from './components/LoginForm'
import { Layout } from './components/Layout'
import { SMEDashboard } from './components/SMEDashboard'
import { CADashboard } from './components/CADashboard'
import { ClientManagement } from './components/ClientManagement'
import { ReviewQueue } from './components/ReviewQueue'
import { TaxFilingAssistant } from './components/TaxFilingAssistant'
import { ReportsGenerator } from './components/ReportsGenerator'
import { InvoiceScanner } from './components/InvoiceScanner'
import { TransactionManager } from './components/TransactionManager'
import { AITaxAdvisor } from './components/AITaxAdvisor'
import { DocumentManager } from './components/DocumentManager'
import { CAConnect } from './components/CAConnect'
import { Settings } from './components/Settings'
import { ChatComponent } from './components/Chat'
import { ResetPassword } from './components/ResetPassword'
import { authService } from './services/auth'
import { User } from './types'
import { ClientProvider } from './contexts/ClientContext'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [currentView, setCurrentView] = useState('dashboard')
  const [loading, setLoading] = useState(true)

  // Listen for navigation events from child components
  useEffect(() => {
    const handleNavigate = (event: any) => {
      setCurrentView(event.detail)
    }
    
    window.addEventListener('navigate', handleNavigate)
    return () => window.removeEventListener('navigate', handleNavigate)
  }, [])

  useEffect(() => {
    console.log('App mounted, checking auth...')
    const params = new URLSearchParams(window.location.search)
    if (params.get('uid') && params.get('token')) {
      setCurrentView('reset-password')
    }

    const checkAuth = () => {
      if (authService.isAuthenticated()) {
        const currentUser = authService.getCurrentUser()
        console.log('User authenticated:', currentUser)
        setUser(currentUser)
      } else {
        console.log('No authenticated user')
      }
      setLoading(false)
    }

    checkAuth()
  }, [])

  const handleLogin = async (loginData: any) => {
    try {
      let userData: User
      
      if (loginData.isLogin) {
        userData = await authService.login(loginData.username || loginData.email, loginData.password)
      } else {
        userData = await authService.register({
          username: loginData.email,
          email: loginData.email,
          password: loginData.password,
          password_confirm: loginData.passwordConfirm,
          first_name: loginData.name?.split(' ')[0] || '',
          last_name: loginData.name?.split(' ').slice(1).join(' ') || '',
          role: loginData.role,
          business_name: loginData.businessName,
          phone: loginData.phone || ''
        })
      }
      
      setUser(userData)
      setCurrentView('dashboard')
    } catch (error) {
      console.error('Authentication error:', error)
      throw error
    }
  }

  const handleLogout = async () => {
    await authService.logout()
    setUser(null)
    setCurrentView('dashboard')
  }

  const renderCurrentView = () => {
    if (!user) {
      if (currentView === 'reset-password') {
        return <ResetPassword />
      }
      return null
    }

    switch (currentView) {
      case 'dashboard':
        return user.role === 'SME' ? <SMEDashboard /> : <CADashboard />
      
      case 'scan':
        return user.role === 'SME' ? <InvoiceScanner /> : <div className="text-white">CA View Coming Soon</div>
      
      case 'transactions':
        return <TransactionManager />
      
      case 'ai-advisor':
        return user.role === 'SME' ? <AITaxAdvisor /> : <div className="text-white">CA View Coming Soon</div>
      
      case 'documents':
        return <DocumentManager />
      
      case 'ca-connect':
        return user.role === 'SME' ? <CAConnect /> : <div className="text-white">Access Denied</div>
      
      case 'chat':
        return <ChatComponent />
      
      case 'settings':
        return <Settings />
      
      case 'clients':
        return user.role === 'CA' ? <ClientManagement /> : <div className="text-white">Access Denied</div>
      
      case 'review-queue':
        return user.role === 'CA' ? <ReviewQueue /> : <div className="text-white">Access Denied</div>
      
      case 'tax-filing':
        return user.role === 'CA' ? <TaxFilingAssistant /> : <div className="text-white">Access Denied</div>
      
      case 'reports':
        return user.role === 'CA' ? <ReportsGenerator /> : <div className="text-white">Access Denied</div>
      
      case 'compliance-calendar':
        return <div className="text-white">Compliance Calendar Coming Soon</div>
      
      default:
        return user.role === 'SME' ? <SMEDashboard /> : <CADashboard />
    }
  }

  if (loading) {
    return (
      <div style={{ background: '#0f172a', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: '20px' }}>Loading Taxora...</p>
          <p style={{ fontSize: '12px', color: '#999' }}>Check console for details</p>
        </div>
      </div>
    )
  }

  if (currentView === 'reset-password') {
    return <ResetPassword />
  }

  if (!user) {
    return <LoginForm onLogin={handleLogin} />
  }

  return (
    <ClientProvider>
      <Layout
        user={user}
        currentView={currentView}
        onViewChange={setCurrentView}
        onLogout={handleLogout}
      >
        {renderCurrentView()}
      </Layout>
    </ClientProvider>
  )
}

export default App