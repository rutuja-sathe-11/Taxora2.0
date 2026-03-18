import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { User, Building, Bell, Shield, CreditCard, HelpCircle, Save } from 'lucide-react'
import { authService } from '../services/auth'
import { User as UserType } from '../types'

export const Settings: React.FC = () => {
  const [user, setUser] = useState<UserType | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    businessName: '',
    gstNumber: '',
    phone: '',
    address: ''
  })
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    smsNotifications: false,
    complianceReminders: true,
    transactionAlerts: true
  })

  useEffect(() => {
    const currentUser = authService.getCurrentUser()
    if (currentUser) {
      setUser(currentUser)
      setFormData({
        name: currentUser.name || '',
        email: currentUser.email || '',
        businessName: currentUser.businessName || '',
        gstNumber: currentUser.gstNumber || '',
        phone: '',
        address: ''
      })
    }
  }, [])

  const handleSaveProfile = async () => {
    setLoading(true)
    try {
      const updatedUser = await authService.updateProfile({
        first_name: formData.name.split(' ')[0] || '',
        last_name: formData.name.split(' ').slice(1).join(' ') || '',
        business_name: formData.businessName,
        gst_number: formData.gstNumber,
        phone: formData.phone,
        address: formData.address
      })
      
      setUser(updatedUser)
      alert('Profile updated successfully!')
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Error updating profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleNotificationChange = (key: string, value: boolean) => {
    setNotifications(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'business', label: 'Business Info', icon: Building },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'help', label: 'Help & Support', icon: HelpCircle }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter your email"
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter your phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                <Input
                  value={user?.role === 'SME' ? 'Small & Medium Enterprise' : 'Chartered Accountant'}
                  disabled
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter your address"
                rows={3}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button onClick={handleSaveProfile} disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )

      case 'business':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {user?.role === 'SME' ? 'Business Name' : 'Firm Name'}
                </label>
                <Input
                  value={formData.businessName}
                  onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                  placeholder={user?.role === 'SME' ? 'Enter business name' : 'Enter firm name'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">GST Number</label>
                <Input
                  value={formData.gstNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, gstNumber: e.target.value }))}
                  placeholder="Enter GST number"
                />
              </div>
            </div>
            
            {user?.role === 'SME' && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h3 className="font-medium text-blue-400 mb-2">Business Information</h3>
                <p className="text-sm text-gray-300">
                  Keep your business information up to date for accurate tax calculations and compliance tracking.
                </p>
              </div>
            )}
            
            <Button onClick={handleSaveProfile} disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )

      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              {Object.entries(notifications).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                  <div>
                    <h3 className="font-medium text-white">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {key === 'emailNotifications' && 'Receive notifications via email'}
                      {key === 'smsNotifications' && 'Receive notifications via SMS'}
                      {key === 'complianceReminders' && 'Get reminders for compliance deadlines'}
                      {key === 'transactionAlerts' && 'Get alerts for new transactions'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => handleNotificationChange(key, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        )

      case 'security':
        return (
          <div className="space-y-6">
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <h3 className="font-medium text-yellow-400 mb-2">Password Security</h3>
              <p className="text-sm text-gray-300 mb-4">
                Keep your account secure by using a strong password and enabling two-factor authentication.
              </p>
              <Button variant="outline">Change Password</Button>
            </div>
            
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <h3 className="font-medium text-green-400 mb-2">Two-Factor Authentication</h3>
              <p className="text-sm text-gray-300 mb-4">
                Add an extra layer of security to your account.
              </p>
              <Button variant="outline">Enable 2FA</Button>
            </div>
          </div>
        )

      case 'billing':
        return (
          <div className="space-y-6">
            <div className="bg-gray-800/50 rounded-lg p-6">
              <h3 className="font-medium text-white mb-4">Current Plan</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold text-white">Free Plan</p>
                  <p className="text-sm text-gray-400">Basic features included</p>
                </div>
                <Button>Upgrade Plan</Button>
              </div>
            </div>
            
            <div className="bg-gray-800/50 rounded-lg p-6">
              <h3 className="font-medium text-white mb-4">Payment Methods</h3>
              <p className="text-gray-400 mb-4">No payment methods added</p>
              <Button variant="outline">Add Payment Method</Button>
            </div>
          </div>
        )

      case 'help':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-800/50 rounded-lg p-6">
                <h3 className="font-medium text-white mb-2">Documentation</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Learn how to use Taxora effectively
                </p>
                <Button variant="outline">View Docs</Button>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-6">
                <h3 className="font-medium text-white mb-2">Contact Support</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Get help from our support team
                </p>
                <Button variant="outline">Contact Us</Button>
              </div>
            </div>
            
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h3 className="font-medium text-blue-400 mb-2">Need Help?</h3>
              <p className="text-sm text-gray-300">
                Email us at support@taxora.ai
              </p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-gray-400">Manage your account and application preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-0">
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{tab.label}</span>
                    </button>
                  )
                })}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-white">
                {tabs.find(tab => tab.id === activeTab)?.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderTabContent()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}