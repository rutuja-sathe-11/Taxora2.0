import { complianceAPI } from './api'

class ComplianceService {
  async getComplianceCalendar(filters?: any): Promise<any[]> {
    try {
      const response = await complianceAPI.calendar(filters)
      return response.data.results || response.data
    } catch (error) {
      console.error('Error fetching compliance calendar:', error)
      return []
    }
  }

  async markCompleted(id: number): Promise<void> {
    try {
      await complianceAPI.markCompleted(id)
    } catch (error) {
      console.error('Error marking compliance item as completed:', error)
      throw error
    }
  }

  async getComplianceDashboard(): Promise<any> {
    try {
      const response = await complianceAPI.dashboard()
      return response.data
    } catch (error) {
      console.error('Error fetching compliance dashboard:', error)
      return {}
    }
  }

  async calculateTax(data: any, clientId?: string): Promise<any> {
    try {
      const requestData = clientId ? { ...data, client_id: clientId } : data
      const response = await complianceAPI.calculateTax(requestData)
      return response.data
    } catch (error) {
      console.error('Error calculating tax:', error)
      throw error
    }
  }

  async calculateGST(data: any, clientId?: string): Promise<any> {
    try {
      const requestData = clientId ? { ...data, client_id: clientId } : data
      const response = await complianceAPI.calculateGST(requestData)
      return response.data
    } catch (error) {
      console.error('Error calculating GST:', error)
      throw error
    }
  }

  async getGSTReturns(): Promise<any[]> {
    try {
      const response = await complianceAPI.gstReturns()
      return response.data.results || response.data
    } catch (error) {
      console.error('Error fetching GST returns:', error)
      return []
    }
  }

  async getITRFilings(): Promise<any[]> {
    try {
      const response = await complianceAPI.itrFilings()
      return response.data.results || response.data
    } catch (error) {
      console.error('Error fetching ITR filings:', error)
      return []
    }
  }

  async fileITR(data: any): Promise<any> {
    try {
      const response = await complianceAPI.fileITR(data)
      return response.data
    } catch (error) {
      console.error('Error filing ITR:', error)
      throw error
    }
  }

  async getComplianceScore(): Promise<any> {
    try {
      const response = await complianceAPI.complianceScore()
      return response.data
    } catch (error) {
      console.error('Error fetching compliance score:', error)
      return { overall_score: 0 }
    }
  }

  async generateGSTR3B(period: string, clientId?: string): Promise<any> {
    try {
      const response = await complianceAPI.generateGSTR3B(period, clientId)
      return response.data
    } catch (error) {
      console.error('Error generating GSTR-3B:', error)
      throw error
    }
  }

  async addGSTTransaction(data: any): Promise<any> {
    try {
      const response = await complianceAPI.addGSTTransaction(data)
      return response.data
    } catch (error) {
      console.error('Error adding GST transaction:', error)
      throw error
    }
  }

  async getClientGSTTransactions(clientId: string): Promise<any[]> {
    try {
      const response = await complianceAPI.gstClientTransactions(clientId)
      return response.data.results || response.data
    } catch (error) {
      console.error('Error fetching client GST transactions:', error)
      return []
    }
  }

  async calculateClientGST(clientId: string): Promise<any> {
    try {
      const response = await complianceAPI.gstCalculateByClient(clientId)
      return response.data
    } catch (error) {
      console.error('Error calculating client GST:', error)
      throw error
    }
  }

  async generateClientGSTR3B(clientId: string, period?: string): Promise<any> {
    try {
      const response = await complianceAPI.gstGstr3bByClient(clientId, period)
      return response.data
    } catch (error) {
      console.error('Error generating client GSTR-3B:', error)
      throw error
    }
  }

  async calculateITR(data: any): Promise<any> {
    try {
      const response = await complianceAPI.itrCalculate(data)
      return response.data
    } catch (error) {
      console.error('Error calculating ITR:', error)
      throw error
    }
  }

  async getITRRecordsByClient(clientId: string): Promise<any[]> {
    try {
      const response = await complianceAPI.itrRecordsByClient(clientId)
      return response.data.results || response.data
    } catch (error) {
      console.error('Error fetching ITR records:', error)
      return []
    }
  }

  async getITRSummary(recordId: string | number): Promise<any> {
    try {
      const response = await complianceAPI.itrSummary(recordId)
      return response.data
    } catch (error) {
      console.error('Error fetching ITR summary:', error)
      throw error
    }
  }

  async calculateTDS(data: any): Promise<any> {
    try {
      const response = await complianceAPI.tdsCalculate(data)
      return response.data
    } catch (error) {
      console.error('Error calculating TDS:', error)
      throw error
    }
  }

  async getTDSByClient(clientId: string): Promise<any> {
    try {
      const response = await complianceAPI.tdsByClient(clientId)
      return response.data
    } catch (error) {
      console.error('Error fetching TDS by client:', error)
      return { results: [], count: 0, total_tds_deducted: 0 }
    }
  }

  async generatePnLReport(clientId: string): Promise<any> {
    try {
      const response = await complianceAPI.pnlReport(clientId)
      return response.data
    } catch (error) {
      console.error('Error generating P&L report:', error)
      throw error
    }
  }

  async getReportsByClient(clientId: string): Promise<any[]> {
    try {
      const response = await complianceAPI.reportsByClient(clientId)
      return response.data.results || response.data
    } catch (error) {
      console.error('Error fetching reports by client:', error)
      return []
    }
  }

  async sendMessage(data: any): Promise<any> {
    try {
      const response = await complianceAPI.sendMessage(data)
      return response.data
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    }
  }

  async getMessagesByClient(clientId: string): Promise<any[]> {
    try {
      const response = await complianceAPI.messagesByClient(clientId)
      return response.data.results || response.data
    } catch (error) {
      console.error('Error fetching messages:', error)
      return []
    }
  }

  async getNotices(clientId?: string): Promise<any[]> {
    try {
      const response = await complianceAPI.notices(clientId ? { client_id: clientId } : undefined)
      return response.data.results || response.data
    } catch (error) {
      console.error('Error fetching notices:', error)
      return []
    }
  }

  async createNotice(data: FormData | any): Promise<any> {
    try {
      const response = await complianceAPI.createNotice(data)
      return response.data
    } catch (error) {
      console.error('Error creating notice:', error)
      throw error
    }
  }

  async updateNotice(id: number | string, data: any): Promise<any> {
    try {
      const response = await complianceAPI.updateNotice(id, data)
      return response.data
    } catch (error) {
      console.error('Error updating notice:', error)
      throw error
    }
  }
}

export const complianceService = new ComplianceService()