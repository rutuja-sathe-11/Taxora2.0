import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { User, Mail, Lock, Building, UserCheck, AlertCircle } from 'lucide-react'
import { authService } from '../services/auth'

interface LoginFormProps {
  onLogin: (user: any) => void
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetMessage, setResetMessage] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    name: '',
    businessName: '',
    role: 'SME' as 'SME' | 'CA'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResetMessage('')

    try {
      await onLogin({ ...formData, isLogin })
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResetMessage('')
    try {
      const data = await authService.requestPasswordReset(resetEmail)
      setResetMessage('If that email is registered, a reset link has been sent.')
      if (data?.reset_url) {
        window.location.href = data.reset_url
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-blue-500/30 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-emerald-500/25 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-10 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-center">
          <div className="space-y-6 lg:col-span-2">
            <div className="inline-flex items-center space-x-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>AI-Powered Accounting</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-semibold leading-tight gradient-text">
              Taxora makes finance feel effortless.
            </h1>
            <p className="text-slate-300 leading-relaxed">
              Automate filings, collaborate with your CA, and get instant AI guidance with a modern workspace built for speed and clarity.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { title: 'Smart Scans', desc: 'Invoices parsed with AI accuracy.' },
                { title: 'Compliance Radar', desc: 'Real-time GST & TDS status.' },
                { title: 'Secure Vault', desc: 'Bank-grade encryption for docs.' },
                { title: 'Human + AI', desc: 'Connect with a CA in one tap.' }
              ].map((item, idx) => (
                <div key={idx} className="glass-surface rounded-xl p-3">
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-3">
            <Card className="glass-surface border-white/10">
              <CardHeader className="text-center space-y-2">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Building className="w-7 h-7 text-white" />
                </div>
                <CardTitle className="text-white text-2xl">
                  {isLogin ? 'Welcome back' : 'Create your workspace'}
                </CardTitle>
                <p className="text-slate-400 text-sm">
                  {isLogin ? 'Sign in to continue your flow' : 'Launch a stunning finance desk in seconds'}
                </p>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {error && (
                  <div className="flex items-center space-x-2 p-3 bg-red-500/15 border border-red-500/30 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <p className="text-red-200 text-sm">{error}</p>
                  </div>
                )}

                {resetMessage && (
                  <div className="p-3 bg-green-500/15 border border-green-500/30 rounded-lg">
                    <p className="text-green-200 text-sm">{resetMessage}</p>
                  </div>
                )}

                {showReset ? (
                  <form onSubmit={handleResetRequest} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-1">
                        Email address
                      </label>
                      <Input
                        type="email"
                        value={resetEmail}
                        onChange={e => setResetEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={loading || !resetEmail.trim()}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {loading ? <div className="animate-spin h-4 w-4 border-b-2 border-white" /> : 'Send Reset Link'}
                    </Button>
                    <div className="text-center mt-2">
                      <button
                        type="button"
                        onClick={() => { setShowReset(false); setError(''); setResetMessage(''); }}
                        className="text-xs text-slate-400 hover:underline"
                      >
                        Back to login
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Role Selection */}
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-2">
                      I am a:
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, role: 'SME' }))}
                        className={`group p-3 rounded-xl border text-sm font-medium transition-all ${
                          formData.role === 'SME'
                            ? 'border-blue-500/50 bg-blue-500/10 text-white shadow-lg shadow-blue-500/20'
                            : 'border-white/10 text-slate-300 hover:border-white/25 hover:bg-white/5'
                        }`}
                      >
                        <User className="w-4 h-4 mx-auto mb-1" />
                        SME / Freelancer
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, role: 'CA' }))}
                        className={`group p-3 rounded-xl border text-sm font-medium transition-all ${
                          formData.role === 'CA'
                            ? 'border-emerald-500/50 bg-emerald-500/10 text-white shadow-lg shadow-emerald-500/20'
                            : 'border-white/10 text-slate-300 hover:border-white/25 hover:bg-white/5'
                        }`}
                      >
                        <UserCheck className="w-4 h-4 mx-auto mb-1" />
                        Chartered Accountant
                      </button>
                    </div>
                  </div>

                  {!isLogin && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-slate-200 mb-1">
                            Full Name
                          </label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                              type="text"
                              name="name"
                              value={formData.name}
                              onChange={handleInputChange}
                              placeholder="Enter your name"
                              className="pl-10"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-200 mb-1">
                            {formData.role === 'SME' ? 'Business Name' : 'CA Firm Name'}
                          </label>
                          <div className="relative">
                            <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                              type="text"
                              name="businessName"
                              value={formData.businessName}
                              onChange={handleInputChange}
                              placeholder={formData.role === 'SME' ? 'Enter business name' : 'Enter firm name'}
                              className="pl-10"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-1">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="Enter your email"
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-1">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          type="password"
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          placeholder="Enter your password"
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {!isLogin && (
                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-1">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          type="password"
                          name="passwordConfirm"
                          value={formData.passwordConfirm}
                          onChange={handleInputChange}
                          placeholder="Confirm your password"
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                  )}

                  <Button type="submit" className="w-full h-11" disabled={loading}>
                    {loading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Please wait...</span>
                      </div>
                    ) : (
                      isLogin ? 'Sign In' : 'Create Account'
                    )}
                  </Button>
                </form>
                )}

                <div className="flex items-center justify-between text-sm text-slate-300">
                  <button
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-blue-300 hover:text-blue-200 font-medium"
                  >
                    {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                  </button>
                  {isLogin && (
                    <button
                      onClick={() => { setShowReset(true); setError(''); setResetMessage(''); }}
                      className="text-slate-400 hover:text-slate-200"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="text-center mt-6 text-slate-500 text-sm">
              <p>© 2024 Taxora. Crafted for modern finance teams.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}