import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Search, Filter, Users, MessageCircle, FileText, AlertTriangle, CheckCircle, Plus, Eye, X, Trash2, Edit } from 'lucide-react'
import { formatDate, formatCurrency } from '../lib/utils'
import { clientService, Client } from '../services/clients'
import { useClients } from '../contexts/ClientContext'

export const ClientManagement: React.FC = () => {
  const { clients, loading, addClient, updateClient, deleteClient, refreshClients } = useClients()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [showClientDetails, setShowClientDetails] = useState(false)
  const [showAddClientModal, setShowAddClientModal] = useState(false)
  const [showEditClientModal, setShowEditClientModal] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    businessName: '',
    gstNumber: '',
    phone: '',
    status: 'active' as 'active' | 'inactive',
    address: '',
    city: '',
    state: '',
    pincode: '',
    panNumber: '',
    businessType: '',
    industry: '',
    annualTurnover: '',
    employeeCount: '',
    monthlyRevenue: '',
    registrationDate: '',
    gstRegistrationDate: '',
    lastGstFiling: '',
    lastItrFiling: '',
    complianceStatus: 'pending' as 'compliant' | 'non-compliant' | 'pending',
    riskLevel: 'low' as 'low' | 'medium' | 'high'
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // Clients are loaded by ClientContext
  }, [])

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || client.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const handleViewClient = (client: Client) => {
    setSelectedClient(client)
    setShowClientDetails(true)
  }

  const handleContactClient = (client: Client, method: 'message') => {
    switch (method) {
      case 'message':
        alert(`Opening chat with ${client.name}`)
        break
    }
  }

  const handleRemoveClient = async (client: Client) => {
    if (!confirm(`Are you sure you want to remove ${client.name} (${client.businessName})? This will disconnect them from your client list.`)) {
      return
    }

    try {
      await clientService.deleteClient(client.id)
      deleteClient(client.id)
      await refreshClients()
      alert('Client removed successfully!')
    } catch (error: any) {
      console.error('Error removing client:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error removing client. Please try again.'
      alert(errorMessage)
    }
  }

  const handleAddClient = async (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    
    if (!newClient.name || !newClient.email || !newClient.businessName) {
      alert('Please fill in all required fields (Name, Email, Business Name)')
      return
    }

    setSaving(true)
    try {
      const clientData = {
        ...newClient,
        annualTurnover: parseFloat(newClient.annualTurnover as any) || 0,
        employeeCount: parseInt(newClient.employeeCount as any) || 0,
        monthlyRevenue: parseFloat(newClient.monthlyRevenue as any) || 0
      }
      
      const createdClient = await clientService.createClient(clientData)
      addClient(createdClient)
      
      // Reset form
      setNewClient({
        name: '',
        email: '',
        businessName: '',
        gstNumber: '',
        phone: '',
        status: 'active',
        address: '',
        city: '',
        state: '',
        pincode: '',
        panNumber: '',
        businessType: '',
        industry: '',
        annualTurnover: '',
        employeeCount: '',
        monthlyRevenue: '',
        registrationDate: '',
        gstRegistrationDate: '',
        lastGstFiling: '',
        lastItrFiling: '',
        complianceStatus: 'pending',
        riskLevel: 'low'
      })
      
      setShowAddClientModal(false)
      alert('Client added successfully!')
    } catch (error: any) {
      console.error('Error adding client:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error adding client. Please try again.'
      alert(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleEditClient = (client: Client) => {
    setEditingClient(client)
    setNewClient({
      name: client.name,
      email: client.email,
      businessName: client.businessName,
      gstNumber: client.gstNumber || '',
      phone: client.phone || '',
      status: client.status,
      address: client.address || '',
      city: client.city || '',
      state: client.state || '',
      pincode: client.pincode || '',
      panNumber: client.panNumber || '',
      businessType: client.businessType || '',
      industry: client.industry || '',
      annualTurnover: client.annualTurnover?.toString() || '',
      employeeCount: client.employeeCount?.toString() || '',
      monthlyRevenue: client.monthlyRevenue?.toString() || '',
      registrationDate: client.registrationDate || '',
      gstRegistrationDate: client.gstRegistrationDate || '',
      lastGstFiling: client.lastGstFiling || '',
      lastItrFiling: client.lastItrFiling || '',
      complianceStatus: client.complianceStatus || 'pending',
      riskLevel: client.riskLevel || 'low'
    })
    setShowEditClientModal(true)
  }

  const handleUpdateClient = async (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    
    if (!editingClient) return
    
    if (!newClient.name || !newClient.email || !newClient.businessName) {
      alert('Please fill in all required fields (Name, Email, Business Name)')
      return
    }

    setSaving(true)
    try {
      const clientData = {
        ...newClient,
        annualTurnover: parseFloat(newClient.annualTurnover as any) || 0,
        employeeCount: parseInt(newClient.employeeCount as any) || 0,
        monthlyRevenue: parseFloat(newClient.monthlyRevenue as any) || 0
      }
      
      const updatedClient = await clientService.updateClient(editingClient.id, clientData)
      updateClient(editingClient.id, updatedClient)
      await refreshClients()
      
      setShowEditClientModal(false)
      setEditingClient(null)
      alert('Client updated successfully!')
    } catch (error: any) {
      console.error('Error updating client:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error updating client. Please try again.'
      alert(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'text-green-400 bg-green-400/10'
    if (score >= 75) return 'text-yellow-400 bg-yellow-400/10'
    return 'text-red-400 bg-red-400/10'
  }

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'text-green-400 bg-green-400/10' : 'text-gray-400 bg-gray-400/10'
  }

  if (showClientDetails && selectedClient) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="outline" onClick={() => setShowClientDetails(false)}>
              ← Back to Clients
            </Button>
            <h1 className="text-3xl font-bold text-white mt-4">{selectedClient.businessName}</h1>
            <p className="text-gray-400">{selectedClient.name} • {selectedClient.email}</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => handleEditClient(selectedClient)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Client
            </Button>
            <Button onClick={() => handleContactClient(selectedClient, 'message')}>
              <MessageCircle className="w-4 h-4 mr-2" />
              Message
            </Button>
            <Button 
              variant="outline" 
              className="text-red-400 border-red-400 hover:bg-red-400/10"
              onClick={() => {
                handleRemoveClient(selectedClient)
                setShowClientDetails(false)
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remove Client
            </Button>
          </div>
        </div>

        {/* Client Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardContent className="p-6">
              <div className="text-sm text-blue-400 mb-1">Compliance Score</div>
              <div className="text-2xl font-bold text-white">{selectedClient.complianceScore}%</div>
            </CardContent>
          </Card>
          
          <Card className="border-green-500/20 bg-green-500/5">
            <CardContent className="p-6">
              <div className="text-sm text-green-400 mb-1">Monthly Revenue</div>
              <div className="text-2xl font-bold text-white">{formatCurrency(selectedClient.monthlyRevenue)}</div>
            </CardContent>
          </Card>

          <Card className="border-yellow-500/20 bg-yellow-500/5">
            <CardContent className="p-6">
              <div className="text-sm text-yellow-400 mb-1">Pending Reviews</div>
              <div className="text-2xl font-bold text-white">{selectedClient.pendingReviews}</div>
            </CardContent>
          </Card>

          <Card className="border-purple-500/20 bg-purple-500/5">
            <CardContent className="p-6">
              <div className="text-sm text-purple-400 mb-1">Total Transactions</div>
              <div className="text-2xl font-bold text-white">{selectedClient.totalTransactions}</div>
            </CardContent>
          </Card>
        </div>

        {/* Client Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-white">Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Business Name</p>
                  <p className="text-white font-medium">{selectedClient.businessName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Contact Person</p>
                  <p className="text-white font-medium">{selectedClient.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Email</p>
                  <p className="text-white font-medium">{selectedClient.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Phone</p>
                  <p className="text-white font-medium">{selectedClient.phone || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">GST Number</p>
                  <p className="text-white font-medium">{selectedClient.gstNumber || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Client Since</p>
                  <p className="text-white font-medium">{formatDate(selectedClient.joinedDate)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-white">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { action: 'Uploaded GST documents', date: '2024-01-15', status: 'completed' },
                  { action: 'ITR filing submitted', date: '2024-01-10', status: 'pending' },
                  { action: 'Monthly transaction sync', date: '2024-01-08', status: 'completed' },
                  { action: 'Compliance check requested', date: '2024-01-05', status: 'completed' }
                ].map((activity, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-800/30 rounded-lg">
                    <div className={`w-3 h-3 rounded-full ${
                      activity.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'
                    }`}></div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{activity.action}</p>
                      <p className="text-sm text-gray-400">{formatDate(activity.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button className="h-16 flex flex-col items-center justify-center space-y-1">
                <FileText className="w-5 h-5" />
                <span className="text-sm">View Documents</span>
              </Button>
              <Button variant="outline" className="h-16 flex flex-col items-center justify-center space-y-1">
                <AlertTriangle className="w-5 h-5" />
                <span className="text-sm">Review Queue</span>
              </Button>
              <Button variant="outline" className="h-16 flex flex-col items-center justify-center space-y-1">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm">Generate Report</span>
              </Button>
              <Button variant="outline" className="h-16 flex flex-col items-center justify-center space-y-1">
                <MessageCircle className="w-5 h-5" />
                <span className="text-sm">Send Message</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Client Management</h1>
          <p className="text-gray-400">Manage your clients and track their compliance status</p>
        </div>
        <Button onClick={() => setShowAddClientModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Client
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="p-6">
            <div className="text-sm text-blue-400 mb-1">Total Clients</div>
            <div className="text-2xl font-bold text-white">{clients.length}</div>
          </CardContent>
        </Card>
        
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="p-6">
            <div className="text-sm text-green-400 mb-1">Active Clients</div>
            <div className="text-2xl font-bold text-white">{clients.filter(c => c.status === 'active').length}</div>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardContent className="p-6">
            <div className="text-sm text-yellow-400 mb-1">Pending Reviews</div>
            <div className="text-2xl font-bold text-white">{clients.reduce((sum, c) => sum + c.pendingReviews, 0)}</div>
          </CardContent>
        </Card>

        <Card className="border-purple-500/20 bg-purple-500/5">
          <CardContent className="p-6">
            <div className="text-sm text-purple-400 mb-1">Monthly Revenue</div>
            <div className="text-2xl font-bold text-white">{formatCurrency(clients.reduce((sum, c) => sum + c.monthlyRevenue, 0))}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-white">Clients ({filteredClients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-2 text-gray-400 font-medium">Client</th>
                    <th className="text-left py-3 px-2 text-gray-400 font-medium">Business</th>
                    <th className="text-center py-3 px-2 text-gray-400 font-medium">Compliance</th>
                    <th className="text-center py-3 px-2 text-gray-400 font-medium">Pending</th>
                    <th className="text-right py-3 px-2 text-gray-400 font-medium">Revenue</th>
                    <th className="text-center py-3 px-2 text-gray-400 font-medium">Status</th>
                    <th className="text-center py-3 px-2 text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="border-b border-gray-800 hover:bg-gray-800/30">
                      <td className="py-4 px-2">
                        <div>
                          <p className="text-white font-medium">{client.name}</p>
                          <p className="text-sm text-gray-400">{client.email}</p>
                        </div>
                      </td>
                      <td className="py-4 px-2">
                        <div>
                          <p className="text-white font-medium">{client.businessName}</p>
                          <p className="text-sm text-gray-400">{client.gstNumber || 'No GST'}</p>
                        </div>
                      </td>
                      <td className="py-4 px-2 text-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getComplianceColor(client.complianceScore)}`}>
                          {client.complianceScore}%
                        </span>
                      </td>
                      <td className="py-4 px-2 text-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          client.pendingReviews > 0 ? 'text-yellow-400 bg-yellow-400/10' : 'text-green-400 bg-green-400/10'
                        }`}>
                          {client.pendingReviews}
                        </span>
                      </td>
                      <td className="py-4 px-2 text-right text-white font-medium">
                        {formatCurrency(client.monthlyRevenue)}
                      </td>
                      <td className="py-4 px-2 text-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(client.status)}`}>
                          {client.status}
                        </span>
                      </td>
                      <td className="py-4 px-2 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Button variant="ghost" size="sm" onClick={() => handleViewClient(client)} title="View Details">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEditClient(client)} title="Edit Client">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleContactClient(client, 'message')} title="Message">
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                            onClick={() => handleRemoveClient(client)}
                            title="Remove Client"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Client Modal */}
      {showAddClientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Add New Client</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddClientModal(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">Basic Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Client Name *
                    </label>
                    <Input
                      value={newClient.name}
                      onChange={(e) => setNewClient(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter client name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email *
                    </label>
                    <Input
                      type="email"
                      value={newClient.email}
                      onChange={(e) => setNewClient(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter email address"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Business Name *
                    </label>
                    <Input
                      value={newClient.businessName}
                      onChange={(e) => setNewClient(prev => ({ ...prev, businessName: e.target.value }))}
                      placeholder="Enter business name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Phone
                    </label>
                    <Input
                      value={newClient.phone}
                      onChange={(e) => setNewClient(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>
              </div>

              {/* Business Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">Business Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      GST Number
                    </label>
                    <Input
                      value={newClient.gstNumber}
                      onChange={(e) => setNewClient(prev => ({ ...prev, gstNumber: e.target.value }))}
                      placeholder="Enter GST number"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      PAN Number
                    </label>
                    <Input
                      value={newClient.panNumber}
                      onChange={(e) => setNewClient(prev => ({ ...prev, panNumber: e.target.value }))}
                      placeholder="Enter PAN number"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Business Type
                    </label>
                    <select
                      value={newClient.businessType}
                      onChange={(e) => setNewClient(prev => ({ ...prev, businessType: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Business Type</option>
                      <option value="proprietorship">Proprietorship</option>
                      <option value="partnership">Partnership</option>
                      <option value="llp">LLP</option>
                      <option value="private_limited">Private Limited</option>
                      <option value="public_limited">Public Limited</option>
                      <option value="trust">Trust</option>
                      <option value="society">Society</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Industry
                    </label>
                    <select
                      value={newClient.industry}
                      onChange={(e) => setNewClient(prev => ({ ...prev, industry: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Industry</option>
                      <option value="manufacturing">Manufacturing</option>
                      <option value="services">Services</option>
                      <option value="trading">Trading</option>
                      <option value="it">IT/Software</option>
                      <option value="healthcare">Healthcare</option>
                      <option value="education">Education</option>
                      <option value="retail">Retail</option>
                      <option value="construction">Construction</option>
                      <option value="agriculture">Agriculture</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Annual Turnover (₹)
                    </label>
                    <Input
                      type="number"
                      value={newClient.annualTurnover}
                      onChange={(e) => setNewClient(prev => ({ ...prev, annualTurnover: e.target.value }))}
                      placeholder="Enter annual turnover"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Employee Count
                    </label>
                    <Input
                      type="number"
                      value={newClient.employeeCount}
                      onChange={(e) => setNewClient(prev => ({ ...prev, employeeCount: e.target.value }))}
                      placeholder="Enter employee count"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Monthly Revenue (₹)
                    </label>
                    <Input
                      type="number"
                      value={newClient.monthlyRevenue}
                      onChange={(e) => setNewClient(prev => ({ ...prev, monthlyRevenue: e.target.value }))}
                      placeholder="Enter monthly revenue"
                    />
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">Address Information</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Address
                    </label>
                    <Input
                      value={newClient.address}
                      onChange={(e) => setNewClient(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Enter complete address"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        City
                      </label>
                      <Input
                        value={newClient.city}
                        onChange={(e) => setNewClient(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="Enter city"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        State
                      </label>
                      <Input
                        value={newClient.state}
                        onChange={(e) => setNewClient(prev => ({ ...prev, state: e.target.value }))}
                        placeholder="Enter state"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Pincode
                      </label>
                      <Input
                        value={newClient.pincode}
                        onChange={(e) => setNewClient(prev => ({ ...prev, pincode: e.target.value }))}
                        placeholder="Enter pincode"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Compliance Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">Compliance Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Registration Date
                    </label>
                    <Input
                      type="date"
                      value={newClient.registrationDate}
                      onChange={(e) => setNewClient(prev => ({ ...prev, registrationDate: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      GST Registration Date
                    </label>
                    <Input
                      type="date"
                      value={newClient.gstRegistrationDate}
                      onChange={(e) => setNewClient(prev => ({ ...prev, gstRegistrationDate: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Last GST Filing
                    </label>
                    <Input
                      type="date"
                      value={newClient.lastGstFiling}
                      onChange={(e) => setNewClient(prev => ({ ...prev, lastGstFiling: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Last ITR Filing
                    </label>
                    <Input
                      type="date"
                      value={newClient.lastItrFiling}
                      onChange={(e) => setNewClient(prev => ({ ...prev, lastItrFiling: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Compliance Status
                    </label>
                    <select
                      value={newClient.complianceStatus}
                      onChange={(e) => setNewClient(prev => ({ ...prev, complianceStatus: e.target.value as 'compliant' | 'non-compliant' | 'pending' }))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="compliant">Compliant</option>
                      <option value="non-compliant">Non-Compliant</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Risk Level
                    </label>
                    <select
                      value={newClient.riskLevel}
                      onChange={(e) => setNewClient(prev => ({ ...prev, riskLevel: e.target.value as 'low' | 'medium' | 'high' }))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Status
                    </label>
                    <select
                      value={newClient.status}
                      onChange={(e) => setNewClient(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowAddClientModal(false)
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={(e) => handleAddClient(e)}
                disabled={saving}
              >
                {saving ? 'Adding...' : 'Add Client'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {showEditClientModal && editingClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Edit Client Details</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowEditClientModal(false)
                  setEditingClient(null)
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">Basic Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Client Name *
                    </label>
                    <Input
                      value={newClient.name}
                      onChange={(e) => setNewClient(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter client name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email *
                    </label>
                    <Input
                      type="email"
                      value={newClient.email}
                      onChange={(e) => setNewClient(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter email address"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Business Name *
                    </label>
                    <Input
                      value={newClient.businessName}
                      onChange={(e) => setNewClient(prev => ({ ...prev, businessName: e.target.value }))}
                      placeholder="Enter business name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Phone
                    </label>
                    <Input
                      value={newClient.phone}
                      onChange={(e) => setNewClient(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>
              </div>

              {/* Business Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">Business Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      GST Number
                    </label>
                    <Input
                      value={newClient.gstNumber}
                      onChange={(e) => setNewClient(prev => ({ ...prev, gstNumber: e.target.value }))}
                      placeholder="Enter GST number"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      PAN Number
                    </label>
                    <Input
                      value={newClient.panNumber}
                      onChange={(e) => setNewClient(prev => ({ ...prev, panNumber: e.target.value }))}
                      placeholder="Enter PAN number"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Business Type
                    </label>
                    <select
                      value={newClient.businessType}
                      onChange={(e) => setNewClient(prev => ({ ...prev, businessType: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Business Type</option>
                      <option value="proprietorship">Proprietorship</option>
                      <option value="partnership">Partnership</option>
                      <option value="llp">LLP</option>
                      <option value="private_limited">Private Limited</option>
                      <option value="public_limited">Public Limited</option>
                      <option value="trust">Trust</option>
                      <option value="society">Society</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Industry
                    </label>
                    <select
                      value={newClient.industry}
                      onChange={(e) => setNewClient(prev => ({ ...prev, industry: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Industry</option>
                      <option value="manufacturing">Manufacturing</option>
                      <option value="services">Services</option>
                      <option value="trading">Trading</option>
                      <option value="it">IT/Software</option>
                      <option value="healthcare">Healthcare</option>
                      <option value="education">Education</option>
                      <option value="retail">Retail</option>
                      <option value="construction">Construction</option>
                      <option value="agriculture">Agriculture</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Annual Turnover (₹)
                    </label>
                    <Input
                      type="number"
                      value={newClient.annualTurnover}
                      onChange={(e) => setNewClient(prev => ({ ...prev, annualTurnover: e.target.value }))}
                      placeholder="Enter annual turnover"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Employee Count
                    </label>
                    <Input
                      type="number"
                      value={newClient.employeeCount}
                      onChange={(e) => setNewClient(prev => ({ ...prev, employeeCount: e.target.value }))}
                      placeholder="Enter employee count"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Monthly Revenue (₹)
                    </label>
                    <Input
                      type="number"
                      value={newClient.monthlyRevenue}
                      onChange={(e) => setNewClient(prev => ({ ...prev, monthlyRevenue: e.target.value }))}
                      placeholder="Enter monthly revenue"
                    />
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">Address Information</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Address
                    </label>
                    <Input
                      value={newClient.address}
                      onChange={(e) => setNewClient(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Enter complete address"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        City
                      </label>
                      <Input
                        value={newClient.city}
                        onChange={(e) => setNewClient(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="Enter city"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        State
                      </label>
                      <Input
                        value={newClient.state}
                        onChange={(e) => setNewClient(prev => ({ ...prev, state: e.target.value }))}
                        placeholder="Enter state"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Pincode
                      </label>
                      <Input
                        value={newClient.pincode}
                        onChange={(e) => setNewClient(prev => ({ ...prev, pincode: e.target.value }))}
                        placeholder="Enter pincode"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Compliance Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">Compliance Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Registration Date
                    </label>
                    <Input
                      type="date"
                      value={newClient.registrationDate}
                      onChange={(e) => setNewClient(prev => ({ ...prev, registrationDate: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      GST Registration Date
                    </label>
                    <Input
                      type="date"
                      value={newClient.gstRegistrationDate}
                      onChange={(e) => setNewClient(prev => ({ ...prev, gstRegistrationDate: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Last GST Filing
                    </label>
                    <Input
                      type="date"
                      value={newClient.lastGstFiling}
                      onChange={(e) => setNewClient(prev => ({ ...prev, lastGstFiling: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Last ITR Filing
                    </label>
                    <Input
                      type="date"
                      value={newClient.lastItrFiling}
                      onChange={(e) => setNewClient(prev => ({ ...prev, lastItrFiling: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Compliance Status
                    </label>
                    <select
                      value={newClient.complianceStatus}
                      onChange={(e) => setNewClient(prev => ({ ...prev, complianceStatus: e.target.value as 'compliant' | 'non-compliant' | 'pending' }))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="compliant">Compliant</option>
                      <option value="non-compliant">Non-Compliant</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Risk Level
                    </label>
                    <select
                      value={newClient.riskLevel}
                      onChange={(e) => setNewClient(prev => ({ ...prev, riskLevel: e.target.value as 'low' | 'medium' | 'high' }))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Status
                    </label>
                    <select
                      value={newClient.status}
                      onChange={(e) => setNewClient(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowEditClientModal(false)
                  setEditingClient(null)
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={(e) => handleUpdateClient(e)}
                disabled={saving}
              >
                {saving ? 'Updating...' : 'Update Client'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}