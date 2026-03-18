import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Lock, AlertCircle } from 'lucide-react'
import { authService } from '../services/auth'

export const ResetPassword: React.FC = () => {
  const [uid, setUid] = useState('')
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const u = params.get('uid')
    const t = params.get('token')
    if (u) setUid(u)
    if (t) setToken(t)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    try {
      await authService.confirmPasswordReset(uid, token, password, confirm)
      setMessage('Password has been reset. You may now sign in.')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl text-white">Reset Password</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-500/15 border border-red-500/30 rounded-lg mb-4">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}
          {message && (
            <div className="p-3 bg-green-500/15 border border-green-500/30 rounded-lg mb-4">
              <p className="text-green-200 text-sm">{message}</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Confirm password"
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Please wait...' : 'Reset Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
