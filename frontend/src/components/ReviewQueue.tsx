import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Search, Filter, CheckCircle, XCircle, AlertTriangle, Eye, MessageCircle, Clock } from 'lucide-react'
import { formatCurrency, formatDate } from '../lib/utils'
import { transactionService } from '../services/transactions'

interface ReviewTransaction {
  id: string
  clientName: string
  clientBusiness: string
  date: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category: string
  status: 'pending' | 'flagged'
  flagReason?: string
  aiAnalysis?: string
  documents: string[]
  submittedDate: string
  priority: 'high' | 'medium' | 'low'
}

// Mock review queue data
const mockReviewTransactions: ReviewTransaction[] = [
  {
    id: '1',
    clientName: 'Rajesh Kumar',
    clientBusiness: 'ABC Corp',
    date: '2024-01-15',
    description: 'Office Equipment Purchase',
    amount: 125000,
    type: 'expense',
    category: 'Office Expenses',
    status: 'flagged',
    flagReason: 'High amount transaction requires verification',
    aiAnalysis: 'Unusual expense amount for this category. Verify supporting documents.',
    documents: ['invoice-001.pdf', 'payment-receipt.pdf'],
    submittedDate: '2024-01-16',
    priority: 'high'
  },
  {
    id: '2',
    clientName: 'Priya Sharma',
    clientBusiness: 'XYZ Ltd',
    date: '2024-01-14',
    description: 'Professional Services Income',
    amount: 85000,
    type: 'income',
    category: 'Professional Services',
    status: 'pending',
    aiAnalysis: 'Standard professional service transaction. TDS verification needed.',
    documents: ['service-invoice.pdf'],
    submittedDate: '2024-01-15',
    priority: 'medium'
  },
  {
    id: '3',
    clientName: 'Amit Patel',
    clientBusiness: 'Tech Solutions',
    date: '2024-01-12',
    description: 'Travel Expenses - Client Meeting',
    amount: 45000,
    type: 'expense',
    category: 'Travel',
    status: 'flagged',
    flagReason: 'Missing GST details',
    aiAnalysis: 'Travel expense without proper GST breakdown. Input credit may be affected.',
    documents: ['travel-bills.pdf'],
    submittedDate: '2024-01-13',
    priority: 'medium'
  }
]

export const ReviewQueue: React.FC = () => {
  const [transactions, setTransactions] = useState<ReviewTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'flagged'>('all')
  const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [selectedTransaction, setSelectedTransaction] = useState<ReviewTransaction | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [reviewNotes, setReviewNotes] = useState('')

  useEffect(() => {
    loadTransactions()
  }, [])

  const loadTransactions = async () => {
    setLoading(true)
    try {
      const data = await transactionService.getCAClientTransactions({
        status: 'pending_review'
      })
      
      // Transform backend data to ReviewTransaction format
      const transformedTransactions: ReviewTransaction[] = data.map((tx: any) => ({
        id: tx.id,
        clientName: tx.client_name || 'Unknown Client',
        clientBusiness: tx.client_business || 'Unknown Business',
        date: tx.date,
        description: tx.description,
        amount: parseFloat(tx.amount),
        type: tx.type,
        category: tx.category_name || tx.category,
        status: tx.status === 'flagged' ? 'flagged' : 'pending',
        flagReason: tx.anomaly_flags?.length > 0 ? tx.anomaly_flags.join(', ') : undefined,
        aiAnalysis: tx.ai_analysis,
        documents: tx.documents?.map((doc: any) => doc.name || doc.filename) || [],
        submittedDate: tx.created_at || tx.date,
        priority: tx.anomaly_flags?.length > 0 ? 'high' : tx.confidence_score < 0.7 ? 'medium' : 'low'
      }))
      
      setTransactions(transformedTransactions)
    } catch (error) {
      console.error('Error loading transactions:', error)
      // Fallback to empty array on error
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.clientBusiness.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || transaction.status === filterStatus
    const matchesPriority = filterPriority === 'all' || transaction.priority === filterPriority
    return matchesSearch && matchesStatus && matchesPriority
  })

  const handleReviewTransaction = async (transactionId: string, action: 'approved' | 'rejected', notes: string) => {
    try {
      await transactionService.reviewTransaction(transactionId, { 
        status: action, 
        review_notes: notes || reviewNotes 
      })
      
      // Remove the transaction from the list
      setTransactions(prev => prev.filter(t => t.id !== transactionId))
      setShowDetails(false)
      setSelectedTransaction(null)
      setReviewNotes('')
      
      alert(`Transaction ${action} successfully!`)
    } catch (error: any) {
      console.error('Error reviewing transaction:', error)
      alert(error.message || 'Error reviewing transaction. Please try again.')
    }
  }

  const handleViewDetails = (transaction: ReviewTransaction) => {
    setSelectedTransaction(transaction)
    setShowDetails(true)
  }

  const handleContactClient = (clientName: string) => {
    alert(`Opening chat with ${clientName}`)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'flagged': return 'text-red-400 bg-red-400/10'
      case 'pending': return 'text-yellow-400 bg-yellow-400/10'
      default: return 'text-gray-400 bg-gray-400/10'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-400/10'
      case 'medium': return 'text-yellow-400 bg-yellow-400/10'
      case 'low': return 'text-green-400 bg-green-400/10'
      default: return 'text-gray-400 bg-gray-400/10'
    }
  }

  if (showDetails && selectedTransaction) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="outline" onClick={() => setShowDetails(false)}>
              ← Back to Review Queue
            </Button>
            <h1 className="text-3xl font-bold text-white mt-4">Transaction Review</h1>
            <p className="text-gray-400">{selectedTransaction.clientBusiness} • {selectedTransaction.clientName}</p>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              className="text-green-400 border-green-400 hover:bg-green-400/10"
              onClick={() => handleReviewTransaction(selectedTransaction.id, 'approved', reviewNotes)}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve
            </Button>
            <Button 
              variant="outline" 
              className="text-red-400 border-red-400 hover:bg-red-400/10"
              onClick={() => handleReviewTransaction(selectedTransaction.id, 'rejected', reviewNotes)}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
            <Button onClick={() => handleContactClient(selectedTransaction.clientName)}>
              <MessageCircle className="w-4 h-4 mr-2" />
              Contact Client
            </Button>
          </div>
        </div>

        {/* Transaction Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-white">Transaction Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Date</p>
                  <p className="text-white font-medium">{formatDate(selectedTransaction.date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Amount</p>
                  <p className={`font-medium ${
                    selectedTransaction.type === 'income' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {selectedTransaction.type === 'income' ? '+' : '-'}{formatCurrency(selectedTransaction.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Type</p>
                  <p className="text-white font-medium capitalize">{selectedTransaction.type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Category</p>
                  <p className="text-white font-medium">{selectedTransaction.category}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Status</p>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedTransaction.status)}`}>
                    {selectedTransaction.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Priority</p>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(selectedTransaction.priority)}`}>
                    {selectedTransaction.priority}
                  </span>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-gray-400">Description</p>
                <p className="text-white font-medium">{selectedTransaction.description}</p>
              </div>

              {selectedTransaction.flagReason && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <p className="text-sm text-red-400 font-medium">Flag Reason</p>
                  <p className="text-red-300 mt-1">{selectedTransaction.flagReason}</p>
                </div>
              )}

              {selectedTransaction.aiAnalysis && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <p className="text-sm text-blue-400 font-medium">AI Analysis</p>
                  <p className="text-blue-300 mt-1">{selectedTransaction.aiAnalysis}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-white">Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Client Name</p>
                  <p className="text-white font-medium">{selectedTransaction.clientName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Business</p>
                  <p className="text-white font-medium">{selectedTransaction.clientBusiness}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Submitted Date</p>
                  <p className="text-white font-medium">{formatDate(selectedTransaction.submittedDate)}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-400 mb-2">Supporting Documents</p>
                <div className="space-y-2">
                  {selectedTransaction.documents.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                      <span className="text-white text-sm">{doc}</span>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Review Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-white">Review Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Add your review notes here..."
              rows={4}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Review Queue</h1>
        <p className="text-gray-400">Review and approve client transactions that require attention</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardContent className="p-6">
            <div className="text-sm text-yellow-400 mb-1">Total Pending</div>
            <div className="text-2xl font-bold text-white">{transactions.length}</div>
          </CardContent>
        </Card>
        
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="p-6">
            <div className="text-sm text-red-400 mb-1">High Priority</div>
            <div className="text-2xl font-bold text-white">{transactions.filter(t => t.priority === 'high').length}</div>
          </CardContent>
        </Card>

        <Card className="border-orange-500/20 bg-orange-500/5">
          <CardContent className="p-6">
            <div className="text-sm text-orange-400 mb-1">Flagged Items</div>
            <div className="text-2xl font-bold text-white">{transactions.filter(t => t.status === 'flagged').length}</div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="p-6">
            <div className="text-sm text-blue-400 mb-1">Total Value</div>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(transactions.reduce((sum, t) => sum + t.amount, 0))}
            </div>
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
                placeholder="Search transactions..."
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
              <option value="pending">Pending</option>
              <option value="flagged">Flagged</option>
            </select>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as any)}
              className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Review Queue Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-white">Transactions Awaiting Review ({filteredTransactions.length})</CardTitle>
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
                    <th className="text-left py-3 px-2 text-gray-400 font-medium">Transaction</th>
                    <th className="text-right py-3 px-2 text-gray-400 font-medium">Amount</th>
                    <th className="text-center py-3 px-2 text-gray-400 font-medium">Status</th>
                    <th className="text-center py-3 px-2 text-gray-400 font-medium">Priority</th>
                    <th className="text-center py-3 px-2 text-gray-400 font-medium">Submitted</th>
                    <th className="text-center py-3 px-2 text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b border-gray-800 hover:bg-gray-800/30">
                      <td className="py-4 px-2">
                        <div>
                          <p className="text-white font-medium">{transaction.clientName}</p>
                          <p className="text-sm text-gray-400">{transaction.clientBusiness}</p>
                        </div>
                      </td>
                      <td className="py-4 px-2">
                        <div>
                          <p className="text-white font-medium">{transaction.description}</p>
                          <p className="text-sm text-gray-400">{transaction.category} • {formatDate(transaction.date)}</p>
                          {transaction.aiAnalysis && (
                            <p className="text-xs text-blue-400 mt-1">AI: {transaction.aiAnalysis.substring(0, 50)}...</p>
                          )}
                        </div>
                      </td>
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
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(transaction.priority)}`}>
                          {transaction.priority}
                        </span>
                      </td>
                      <td className="py-4 px-2 text-center text-gray-300">
                        {formatDate(transaction.submittedDate)}
                      </td>
                      <td className="py-4 px-2 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Button variant="ghost" size="sm" onClick={() => handleViewDetails(transaction)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-green-400 hover:text-green-300"
                            onClick={() => handleReviewTransaction(transaction.id, 'approved', '')}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-400 hover:text-red-300"
                            onClick={() => handleReviewTransaction(transaction.id, 'rejected', '')}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleContactClient(transaction.clientName)}
                          >
                            <MessageCircle className="w-4 h-4" />
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
    </div>
  )
}