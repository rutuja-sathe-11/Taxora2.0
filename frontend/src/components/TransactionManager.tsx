// import React, { useState } from 'react'
import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Search, Filter, Download, Plus, Eye, CreditCard as Edit, Trash2, ArrowUpDown, X } from 'lucide-react'
import { formatCurrency, formatDate } from '../lib/utils'
import { Transaction } from '../types'
import { transactionService } from '../services/transactions'

interface AddTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (transaction: any) => void
}

const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    type: 'expense' as 'income' | 'expense',
    category: '',
    invoice_number: '',
    vendor_name: '',
    gst_number: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...formData,
      amount: parseFloat(formData.amount)
    })
    setFormData({
      date: new Date().toISOString().split('T')[0],
      description: '',
      amount: '',
      type: 'expense',
      category: '',
      invoice_number: '',
      vendor_name: '',
      gst_number: ''
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Add Transaction</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'income' | 'expense' }))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter description"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Amount</label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
              <Input
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                placeholder="Enter category"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Vendor Name</label>
            <Input
              value={formData.vendor_name}
              onChange={(e) => setFormData(prev => ({ ...prev, vendor_name: e.target.value }))}
              placeholder="Enter vendor name"
            />
          </div>
          
          <div className="flex space-x-4">
            <Button type="submit" className="flex-1">Save Transaction</Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export const TransactionManager: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<any>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'flagged'>('all')
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    loadTransactions()
    loadSummary()
  }, [])

  const loadTransactions = async () => {
    try {
      const data = await transactionService.getTransactions()
      setTransactions(data)
    } catch (error) {
      console.error('Error loading transactions:', error)
      // Fallback to mock data
      setTransactions([
        {
          id: '1',
          date: '2024-01-15',
          description: 'Office Supplies Purchase',
          amount: 25000,
          type: 'expense',
          category: 'Office Expenses',
          status: 'approved'
        },
        {
          id: '2',
          date: '2024-01-14',
          description: 'Client Payment - Project A',
          amount: 150000,
          type: 'income',
          category: 'Professional Services',
          status: 'approved'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const loadSummary = async () => {
    try {
      const data = await transactionService.getTransactionSummary()
      setSummary(data)
    } catch (error) {
      console.error('Error loading summary:', error)
    }
  }

  const handleAddTransaction = async (transactionData: any) => {
    try {
      const newTransaction = await transactionService.createTransaction(transactionData)
      setTransactions(prev => [newTransaction, ...prev])
      setShowAddModal(false)
      await loadSummary()
      alert('Transaction added successfully!')
    } catch (error) {
      console.error('Error adding transaction:', error)
      alert('Error adding transaction. Please try again.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return

    try {
      await transactionService.deleteTransaction(id)
      setTransactions(prev => prev.filter(t => t.id !== id))
      await loadSummary()
      alert('Transaction deleted successfully!')
    } catch (error) {
      console.error('Error deleting transaction:', error)
      alert('Error deleting transaction. Please try again.')
    }
  }

  const filteredTransactions = transactions
    .filter(t => {
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           t.category.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = filterType === 'all' || t.type === filterType
      const matchesStatus = filterStatus === 'all' || t.status === filterStatus
      return matchesSearch && matchesType && matchesStatus
    })
    .sort((a, b) => {
      const aVal = sortBy === 'date' ? new Date(a.date).getTime() : a.amount
      const bVal = sortBy === 'date' ? new Date(b.date).getTime() : b.amount
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
    })

  const exportData = () => {
    transactionService.exportTransactions().then(blob => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'transactions.csv'
      a.click()
      URL.revokeObjectURL(url)
    }).catch(error => {
      console.error('Error exporting transactions:', error)
      alert('Error exporting transactions. Please try again.')
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-400 bg-green-400/10'
      case 'pending': return 'text-yellow-400 bg-yellow-400/10'
      case 'flagged': return 'text-red-400 bg-red-400/10'
      default: return 'text-gray-400 bg-gray-400/10'
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Transaction Manager</h1>
        <p className="text-gray-400">View, manage and analyze all your business transactions</p>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-1 space-x-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="flagged">Flagged</option>
              </select>
            </div>

            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  const newOrder = sortOrder === 'asc' ? 'desc' : 'asc'
                  setSortOrder(newOrder)
                }}
              >
                <ArrowUpDown className="w-4 h-4 mr-2" />
                Sort by {sortBy} ({sortOrder})
              </Button>
              <Button variant="outline" onClick={exportData}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Transaction
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="p-6">
            <div className="text-sm text-green-400 mb-1">Total Income</div>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(summary.total_income != null 
                ? Number(summary.total_income) 
                : filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (Number(t.amount) || 0), 0))}
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="p-6">
            <div className="text-sm text-red-400 mb-1">Total Expenses</div>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(summary.total_expenses != null 
                ? Number(summary.total_expenses) 
                : filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (Number(t.amount) || 0), 0))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardContent className="p-6">
            <div className="text-sm text-yellow-400 mb-1">Pending Review</div>
            <div className="text-2xl font-bold text-white">
              {summary.pending_reviews || filteredTransactions.filter(t => t.status === 'pending' || t.status === 'flagged').length}
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="p-6">
            <div className="text-sm text-blue-400 mb-1">This Month</div>
            <div className="text-2xl font-bold text-white">
              {filteredTransactions.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-white">Transactions ({filteredTransactions.length})</CardTitle>
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
                  <th className="text-left py-3 px-2 text-gray-400 font-medium">Date</th>
                  <th className="text-left py-3 px-2 text-gray-400 font-medium">Description</th>
                  <th className="text-left py-3 px-2 text-gray-400 font-medium">Category</th>
                  <th className="text-right py-3 px-2 text-gray-400 font-medium">Amount</th>
                  <th className="text-center py-3 px-2 text-gray-400 font-medium">Status</th>
                  <th className="text-center py-3 px-2 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-gray-800 hover:bg-gray-800/30">
                    <td className="py-4 px-2 text-gray-300">{formatDate(transaction.date)}</td>
                    <td className="py-4 px-2">
                      <div>
                        <p className="text-white font-medium">{transaction.description}</p>
                        {transaction.aiAnalysis && (
                          <p className="text-xs text-yellow-400 mt-1">AI: {transaction.aiAnalysis}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-2 text-gray-300">{transaction.category}</td>
                    <td className={`py-4 px-2 text-right font-medium ${
                      transaction.type === 'income' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </td>
                    <td className="py-4 px-2 text-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(transaction.status)}`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td className="py-4 px-2 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={() => handleDelete(transaction.id)}>
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

      <AddTransactionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddTransaction}
      />
    </div>
  )
}