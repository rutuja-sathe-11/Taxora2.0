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
}

export const complianceService = new ComplianceService()