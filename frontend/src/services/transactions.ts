import { Transaction } from '../types'
import { transactionAPI } from './api'

class TransactionService {
  async getTransactions(filters?: any): Promise<Transaction[]> {
    try {
      const response = await transactionAPI.list(filters)
      return response.data.results || response.data
    } catch (error) {
      console.error('Error fetching transactions:', error)
      throw error
    }
  }

  async createTransaction(data: any): Promise<Transaction> {
    try {
      const response = await transactionAPI.create(data)
      return response.data
    } catch (error) {
      console.error('Error creating transaction:', error)
      throw error
    }
  }

  async updateTransaction(id: string, data: any): Promise<Transaction> {
    try {
      const response = await transactionAPI.update(id, data)
      return response.data
    } catch (error) {
      console.error('Error updating transaction:', error)
      throw error
    }
  }

  async deleteTransaction(id: string): Promise<void> {
    try {
      await transactionAPI.delete(id)
    } catch (error) {
      console.error('Error deleting transaction:', error)
      throw error
    }
  }

  async getTransactionSummary(filters?: any): Promise<any> {
    try {
      const response = await transactionAPI.summary(filters)
      return response.data
    } catch (error) {
      console.error('Error fetching transaction summary:', error)
      throw error
    }
  }

  async exportTransactions(filters?: any): Promise<Blob> {
    try {
      const response = await transactionAPI.export(filters)
      // Backend returns CSV as text, convert to Blob
      if (typeof response.data === 'string') {
        return new Blob([response.data], { type: 'text/csv' })
      }
      // If it's already a Blob, return as is
      return response.data
    } catch (error) {
      console.error('Error exporting transactions:', error)
      throw error
    }
  }

  async getCategories(): Promise<any[]> {
    try {
      const response = await transactionAPI.categories()
      return response.data
    } catch (error) {
      console.error('Error fetching categories:', error)
      return []
    }
  }

  async reviewTransaction(id: string, data: { status: string; review_notes?: string }): Promise<void> {
    try {
      await transactionAPI.review(id, data)
    } catch (error) {
      console.error('Error reviewing transaction:', error)
      throw error
    }
  }

  async getCAClientTransactions(filters?: any): Promise<Transaction[]> {
    try {
      const response = await transactionAPI.caClientTransactions(filters)
      return response.data.results || response.data
    } catch (error) {
      console.error('Error fetching CA client transactions:', error)
      throw error
    }
  }

  async getCADashboardSummary(): Promise<any> {
    try {
      const response = await transactionAPI.caDashboardSummary()
      return response.data
    } catch (error) {
      console.error('Error fetching CA dashboard summary:', error)
      throw error
    }
  }

  async getMonthlyTrends(): Promise<any[]> {
    try {
      const response = await transactionAPI.monthlyTrends()
      return response.data
    } catch (error) {
      console.error('Error fetching monthly trends:', error)
      return []
    }
  }

  async getExpenseBreakdown(): Promise<any[]> {
    try {
      const response = await transactionAPI.expenseBreakdown()
      return response.data
    } catch (error) {
      console.error('Error fetching expense breakdown:', error)
      return []
    }
  }

  async getCAClientGrowthTrends(): Promise<any[]> {
    try {
      const response = await transactionAPI.caClientGrowthTrends()
      return response.data
    } catch (error) {
      console.error('Error fetching CA client growth trends:', error)
      return []
    }
  }

  async getCARevenueBreakdown(): Promise<any[]> {
    try {
      const response = await transactionAPI.caRevenueBreakdown()
      return response.data
    } catch (error) {
      console.error('Error fetching CA revenue breakdown:', error)
      return []
    }
  }

  async getCAComplianceStatus(): Promise<any[]> {
    try {
      const response = await transactionAPI.caComplianceStatus()
      return response.data
    } catch (error) {
      console.error('Error fetching CA compliance status:', error)
      return []
    }
  }
}

export const transactionService = new TransactionService()