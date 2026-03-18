export interface User {
  id: string
  email: string
  name: string
  role: 'SME' | 'CA'
  avatar?: string
  businessName?: string
  gstNumber?: string
}

export interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category: string
  status: 'pending' | 'approved' | 'flagged'
  documents?: string[]
  aiAnalysis?: string
}

export interface Document {
  id: string
  name: string
  type: 'invoice' | 'receipt' | 'gst_return' | 'itr' | 'tds' | 'balance_sheet' | 'other'
  uploadDate: string
  size: string
  aiSummary?: string
  extractedData?: any
  status?: 'pending' | 'processing' | 'completed' | 'failed'
}

export interface Client {
  id: string
  name: string
  email: string
  businessName: string
  gstNumber?: string
  status: 'active' | 'inactive'
  lastActivity: string
  complianceScore: number
}

export interface AIInsight {
  type: 'tax_saving' | 'gst_credit' | 'compliance_reminder' | 'anomaly'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  actionRequired?: boolean
}