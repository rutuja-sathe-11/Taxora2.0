import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Button } from './ui/button'
import { ArrowUpRight, ArrowDownRight, TrendingUp, AlertTriangle, Target, Calendar, FileText, Calculator, CheckCircle, MessageSquare, Users } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { formatCurrency } from '../lib/utils'
import { AIInsight } from '../types'
import { aiService } from '../services/ai'
import { transactionService } from '../services/transactions'

export const SMEDashboard: React.FC = () => {
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<any>({})
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [expenseData, setExpenseData] = useState<any[]>([])

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Load AI insights
        const aiInsights = await aiService.analyzeTransactions([])
        setInsights(aiInsights)
        
        // Load transaction summary
        const transactionSummary = await transactionService.getTransactionSummary()
        console.log('Transaction Summary from API:', transactionSummary)
        setSummary(transactionSummary)
        
        // Load monthly trends data
        try {
          const monthlyTrends = await transactionService.getMonthlyTrends()
          if (monthlyTrends && monthlyTrends.length > 0) {
            setMonthlyData(monthlyTrends)
          } else {
            // Fallback to empty data if no transactions exist
            setMonthlyData([])
          }
        } catch (error) {
          console.error('Error loading monthly trends:', error)
          setMonthlyData([])
        }
        
        // Load expense breakdown data
        try {
          const expenseBreakdown = await transactionService.getExpenseBreakdown()
          if (expenseBreakdown && expenseBreakdown.length > 0) {
            setExpenseData(expenseBreakdown)
          } else {
            // Fallback to empty data if no expenses exist
            setExpenseData([])
          }
        } catch (error) {
          console.error('Error loading expense breakdown:', error)
          setExpenseData([])
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  // Convert to numbers and handle 0 values properly
  // Parse the value as float to handle both string and number formats
  const parseAmount = (value: any): number => {
    if (value == null || value === undefined) return 0
    const parsed = typeof value === 'string' ? parseFloat(value) : Number(value)
    return isNaN(parsed) ? 0 : parsed
  }
  
  const totalIncome = summary.total_income != null && summary.total_income !== undefined
    ? parseAmount(summary.total_income)
    : monthlyData.reduce((sum, item) => sum + parseAmount(item.income), 0)
  const totalExpenses = summary.total_expenses != null && summary.total_expenses !== undefined
    ? parseAmount(summary.total_expenses)
    : monthlyData.reduce((sum, item) => sum + parseAmount(item.expenses), 0)
  const netProfit = summary.net_profit != null && summary.net_profit !== undefined
    ? parseAmount(summary.net_profit)
    : (totalIncome - totalExpenses)

  const handleGoToScan = () => window.dispatchEvent(new CustomEvent('navigate', { detail: 'scan' }))
  const handleGoToDocuments = () => window.dispatchEvent(new CustomEvent('navigate', { detail: 'documents' }))
  const handleGoToCAConnect = () => window.dispatchEvent(new CustomEvent('navigate', { detail: 'ca-connect' }))
  const handleGoToChat = () => window.dispatchEvent(new CustomEvent('navigate', { detail: 'chat' }))

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-gray-400">Track your business performance and get AI-powered insights</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium text-green-400">Monthly Revenue</CardTitle>
            <ArrowUpRight className="w-4 h-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatCurrency(parseAmount(summary.monthly_revenue ?? summary.monthlyRevenue ?? 0))}</div>
            <p className="text-xs text-green-400 mt-1">Current month approved income</p>
          </CardContent>
        </Card>

        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium text-red-400">Total Expenses</CardTitle>
            <ArrowDownRight className="w-4 h-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-red-400 mt-1">+8.2% from last period</p>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium text-blue-400">Net Profit</CardTitle>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatCurrency(netProfit)}</div>
            <p className="text-xs text-blue-400 mt-1">+18.3% from last period</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-white">Income vs Expenses Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F9FAFB'
                    }}
                    formatter={(value) => [formatCurrency(Number(value)), '']}
                  />
                  <Area type="monotone" dataKey="income" stackId="1" stroke="#059669" fill="#059669" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="expenses" stackId="2" stroke="#DC2626" fill="#DC2626" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-400">
                <p>No transaction data available. Start adding transactions to see trends.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-white">Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {expenseData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expenseData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                  >
                    {expenseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
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
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-400">
                <p>No expense data available. Add expense transactions to see breakdown.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Target className="w-5 h-5" />
            <span>AI Insights & Recommendations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {insights.map((insight, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-l-4 ${
                    insight.priority === 'high'
                      ? 'border-red-500 bg-red-500/10'
                      : insight.priority === 'medium'
                      ? 'border-yellow-500 bg-yellow-500/10'
                      : 'border-green-500 bg-green-500/10'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-white">{insight.title}</h4>
                      <p className="text-sm text-gray-300 mt-1">{insight.description}</p>
                    </div>
                    {insight.actionRequired && (
                      <Button size="sm" className="ml-4">
                        Take Action
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Button 
          onClick={handleGoToScan}
          className="h-16 flex flex-col items-center justify-center space-y-1"
        >
          <FileText className="w-5 h-5" />
          <span className="text-sm">Scan Invoice</span>
        </Button>
        <Button 
          onClick={handleGoToDocuments}
          variant="outline" 
          className="h-16 flex flex-col items-center justify-center space-y-1"
        >
          <FileText className="w-5 h-5" />
          <span className="text-sm">Documents</span>
        </Button>
        <Button 
          onClick={handleGoToCAConnect}
          variant="outline" 
          className="h-16 flex flex-col items-center justify-center space-y-1"
        >
          <Users className="w-5 h-5" />
          <span className="text-sm">CA Connect</span>
        </Button>
        <Button 
          onClick={handleGoToChat}
          variant="outline" 
          className="h-16 flex flex-col items-center justify-center space-y-1"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-sm">Messages</span>
        </Button>
      </div>
    </div>
  )
}