import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Users, FileText, AlertTriangle, Calendar, TrendingUp, Clock, CheckCircle, XCircle, DollarSign } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend } from 'recharts'
import { formatCurrency } from '../lib/utils'
import { transactionService } from '../services/transactions'
import { complianceService } from '../services/compliance'
import { clientService } from '../services/clients'

export const CADashboard: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<any>({})
  const [clientData, setClientData] = useState<any[]>([])
  const [complianceData, setComplianceData] = useState<any[]>([])
  const [revenueData, setRevenueData] = useState<any[]>([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // Load CA dashboard summary
      const summary = await transactionService.getCADashboardSummary()
      setDashboardData(summary)

      // Load clients
      const clients = await clientService.getClients()
      
      // Load compliance dashboard data
      try {
        const compliance = await complianceService.getComplianceDashboard()
        setDashboardData({ ...summary, ...compliance })
      } catch (error) {
        console.error('Error loading compliance data:', error)
      }

      // Load client growth and revenue trends
      try {
        const growthTrends = await transactionService.getCAClientGrowthTrends()
        if (growthTrends && growthTrends.length > 0) {
          setClientData(growthTrends)
        } else {
          // Fallback: use current client count if no historical data
          setClientData([
            { month: new Date().toLocaleString('default', { month: 'short' }), clients: clients.length, revenue: summary.monthly_revenue || 0 }
          ])
        }
      } catch (error) {
        console.error('Error loading client growth trends:', error)
        setClientData([])
      }

      // Load compliance status data
      try {
        const complianceStatus = await transactionService.getCAComplianceStatus()
        if (complianceStatus && Array.isArray(complianceStatus)) {
          setComplianceData(complianceStatus)
        } else {
          // Set default structure if no data
          setComplianceData([
            {'type': 'GST Filing', 'completed': 0, 'pending': 0, 'overdue': 0},
            {'type': 'ITR Filing', 'completed': 0, 'pending': 0, 'overdue': 0},
            {'type': 'TDS Deduction', 'completed': 0, 'pending': 0, 'overdue': 0},
            {'type': 'Audit Requirement', 'completed': 0, 'pending': 0, 'overdue': 0}
          ])
        }
      } catch (error) {
        console.error('Error loading compliance status:', error)
        // Set default structure on error
        setComplianceData([
          {'type': 'GST Filing', 'completed': 0, 'pending': 0, 'overdue': 0},
          {'type': 'ITR Filing', 'completed': 0, 'pending': 0, 'overdue': 0},
          {'type': 'TDS Deduction', 'completed': 0, 'pending': 0, 'overdue': 0},
          {'type': 'Audit Requirement', 'completed': 0, 'pending': 0, 'overdue': 0}
        ])
      }

      // Load revenue breakdown
      try {
        const revenueBreakdown = await transactionService.getCARevenueBreakdown()
        if (revenueBreakdown && Array.isArray(revenueBreakdown) && revenueBreakdown.length > 0) {
          // Filter out items with zero value if there are other items, or keep if it's the only item
          const hasNonZero = revenueBreakdown.some(item => item.value > 0)
          if (hasNonZero) {
            setRevenueData(revenueBreakdown.filter(item => item.value > 0))
          } else {
            setRevenueData(revenueBreakdown)
          }
        } else {
          // Set default structure if no data
          setRevenueData([
            {'name': 'No Revenue Data', 'value': 0, 'color': '#6B7280'}
          ])
        }
      } catch (error) {
        console.error('Error loading revenue breakdown:', error)
        // Set default structure on error
        setRevenueData([
          {'name': 'No Revenue Data', 'value': 0, 'color': '#6B7280'}
        ])
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewClients = () => {
    // This will be handled by the parent App component
    window.dispatchEvent(new CustomEvent('navigate', { detail: 'clients' }))
  }

  const handleReviewQueue = () => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: 'review-queue' }))
  }

  const handleGenerateReport = async () => {
    try {
      const blob = await transactionService.exportTransactions()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'ca-client-report.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error generating report:', error)
      alert('Error generating report. Please try again.')
    }
  }

  const handleComplianceCalendar = () => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: 'compliance-calendar' }))
  }

  const totalClients = dashboardData.total_clients || 0
  const pendingReviews = dashboardData.pending_reviews || 0
  const complianceDue = dashboardData.overdue_count || 0
  const monthlyRevenue = dashboardData.monthly_revenue || 0

  const complianceTotals = complianceData.reduce(
    (acc, item) => {
      acc.completed += Number(item.completed || 0)
      acc.pending += Number(item.pending || 0)
      acc.overdue += Number(item.overdue || 0)
      return acc
    },
    { completed: 0, pending: 0, overdue: 0 }
  )
  const totalComplianceItems = complianceTotals.completed + complianceTotals.pending + complianceTotals.overdue
  const completionRate = totalComplianceItems > 0
    ? Math.round((complianceTotals.completed / totalComplianceItems) * 100)
    : 0

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">CA Dashboard</h1>
          <p className="text-gray-400">Manage clients and track compliance status</p>
        </div>
        <div className="flex space-x-4">
          <Button variant="outline" onClick={handleGenerateReport}>
            <Calendar className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button onClick={handleViewClients}>
            <Users className="w-4 h-4 mr-2" />
            Manage Clients
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium text-blue-400">Total Clients</CardTitle>
            <Users className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{totalClients}</div>
            <p className="text-xs text-blue-400 mt-1">+15 new this month</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium text-yellow-400">Pending Reviews</CardTitle>
            <Clock className="w-4 h-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{pendingReviews}</div>
            <p className="text-xs text-yellow-400 mt-1">5 urgent reviews</p>
          </CardContent>
        </Card>

        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium text-red-400">Compliance Due</CardTitle>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{complianceDue}</div>
            <p className="text-xs text-red-400 mt-1">3 overdue items</p>
          </CardContent>
        </Card>

        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium text-green-400">Monthly Revenue</CardTitle>
            <TrendingUp className="w-4 h-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatCurrency(monthlyRevenue)}</div>
            <p className="text-xs text-green-400 mt-1">+22% from last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-white">Client Growth & Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {clientData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={clientData}>
                  <defs>
                    <linearGradient id="clientsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.03} />
                    </linearGradient>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" />
                  <YAxis yAxisId="clients" orientation="left" stroke="#60A5FA" width={36} />
                  <YAxis yAxisId="revenue" orientation="right" stroke="#34D399" width={56} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F9FAFB'
                    }}
                    formatter={(value, name) => [
                      name === 'revenue' ? formatCurrency(Number(value)) : value,
                      name === 'revenue' ? 'Revenue' : 'Clients'
                    ]}
                  />
                  <Legend />
                  <Area yAxisId="clients" type="monotone" dataKey="clients" stroke="#3B82F6" fill="url(#clientsGradient)" strokeWidth={2} />
                  <Area yAxisId="revenue" type="monotone" dataKey="revenue" stroke="#10B981" fill="url(#revenueGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-400">
                <p>No client data available. Connect with clients to see growth trends.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-white">Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueData && revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={revenueData}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={92}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent, value }) => {
                      if (!value || value === 0) return name
                      return `${name} (${Math.round((percent || 0) * 100)}%)`
                    }}
                  >
                    {revenueData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || '#8884d8'} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F9FAFB'
                    }}
                    formatter={(value) => [formatCurrency(Number(value)), '']}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-400">
                <p>Loading revenue data...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Compliance Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-white">Client Compliance Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-3">
              <div className="text-xs text-green-300">Completed</div>
              <div className="text-lg font-semibold text-white">{complianceTotals.completed}</div>
            </div>
            <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-3">
              <div className="text-xs text-yellow-300">Pending</div>
              <div className="text-lg font-semibold text-white">{complianceTotals.pending}</div>
            </div>
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3">
              <div className="text-xs text-red-300">Overdue</div>
              <div className="text-lg font-semibold text-white">{complianceTotals.overdue}</div>
            </div>
            <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-3">
              <div className="text-xs text-blue-300">Completion Rate</div>
              <div className="text-lg font-semibold text-white">{completionRate}%</div>
            </div>
          </div>

          {complianceData && complianceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={complianceData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9CA3AF" />
                <YAxis dataKey="type" type="category" stroke="#9CA3AF" width={100} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F9FAFB'
                  }}
                  formatter={(value, name) => {
                    const labels: { [key: string]: string } = {
                      'completed': 'Completed',
                      'pending': 'Pending',
                      'overdue': 'Overdue'
                    }
                    return [value, labels[name] || name]
                  }}
                />
                <Legend />
                <Bar dataKey="completed" stackId="a" fill="#059669" />
                <Bar dataKey="pending" stackId="a" fill="#D97706" />
                <Bar dataKey="overdue" stackId="a" fill="#DC2626" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400">
              <p>Loading compliance data...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-white">Recent Client Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { client: 'ABC Corp', action: 'Uploaded GST documents', time: '2 hours ago', status: 'pending' },
                { client: 'XYZ Ltd', action: 'ITR filing completed', time: '5 hours ago', status: 'completed' },
                { client: 'Tech Solutions', action: 'TDS return submitted', time: '1 day ago', status: 'completed' },
                { client: 'Retail Store', action: 'Audit documents pending', time: '2 days ago', status: 'overdue' }
              ].map((activity, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-800/30 rounded-lg">
                  <div className={`w-3 h-3 rounded-full ${
                    activity.status === 'completed' ? 'bg-green-500' :
                    activity.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{activity.client}</p>
                    <p className="text-sm text-gray-400">{activity.action}</p>
                  </div>
                  <span className="text-xs text-gray-500">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-white">Priority Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { title: 'GST Return Due Tomorrow', client: 'ABC Corp', priority: 'high', type: 'deadline' },
                { title: 'Audit Documents Missing', client: 'XYZ Ltd', priority: 'high', type: 'missing' },
                { title: 'ITR Filing Due Next Week', client: 'Tech Solutions', priority: 'medium', type: 'deadline' },
                { title: 'Client Query Pending Response', client: 'Retail Store', priority: 'low', type: 'query' }
              ].map((alert, index) => (
                <div key={index} className={`p-4 rounded-lg border-l-4 ${
                  alert.priority === 'high' ? 'border-red-500 bg-red-500/10' :
                  alert.priority === 'medium' ? 'border-yellow-500 bg-yellow-500/10' :
                  'border-blue-500 bg-blue-500/10'
                }`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-white">{alert.title}</h4>
                      <p className="text-sm text-gray-400">{alert.client}</p>
                    </div>
                    <Button size="sm">
                      View
                    </Button>
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
            <Button 
              onClick={handleGenerateReport}
              className="h-20 flex flex-col items-center justify-center space-y-2"
            >
              <FileText className="w-6 h-6" />
              <span className="text-sm">Generate Report</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={handleViewClients}
            >
              <Users className="w-6 h-6" />
              <span className="text-sm">Client Directory</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={handleComplianceCalendar}
            >
              <Calendar className="w-6 h-6" />
              <span className="text-sm">Compliance Calendar</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={handleReviewQueue}
            >
              <AlertTriangle className="w-6 h-6" />
              <span className="text-sm">Review Queue</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}