import { clientAPI } from './api'

export interface Client {
  id: string
  name: string
  email: string
  businessName: string
  gstNumber?: string
  phone?: string
  status: 'active' | 'inactive'
  lastActivity: string
  complianceScore: number
  totalTransactions: number
  pendingReviews: number
  monthlyRevenue: number
  joinedDate: string
  // Additional fields for reports
  address?: string
  city?: string
  state?: string
  pincode?: string
  panNumber?: string
  businessType?: string
  industry?: string
  annualTurnover?: number
  employeeCount?: number
  registrationDate?: string
  gstRegistrationDate?: string
  lastGstFiling?: string
  lastItrFiling?: string
  complianceStatus?: 'compliant' | 'non-compliant' | 'pending'
  riskLevel?: 'low' | 'medium' | 'high'
}

class ClientService {
  async getClients(filters?: any): Promise<Client[]> {
    try {
      const response = await clientAPI.list(filters)
      const data = response.data.results || response.data
      
      // Transform backend ClientRelationship data to Client format
      return data.map((rel: any) => {
        const metadata = rel.sme_profile_metadata || {}
        return {
          id: rel.sme_id || rel.id,
          name: rel.sme_name || 'Unknown',
          email: rel.sme_email || '',
          businessName: rel.sme_business || 'Unknown Business',
          gstNumber: rel.sme_gst_number || '',
          phone: rel.sme_phone || '',
          status: rel.is_active ? 'active' : 'inactive',
          lastActivity: rel.last_activity || rel.created_at,
          complianceScore: 85, // Default, can be calculated from backend
          totalTransactions: rel.total_transactions || 0,
          pendingReviews: rel.pending_reviews || 0,
          monthlyRevenue: rel.monthly_revenue || 0,
          joinedDate: rel.created_at,
          // Additional fields from profile metadata
          address: rel.sme_address || '',
          city: metadata.city || '',
          state: metadata.state || '',
          pincode: metadata.pincode || '',
          panNumber: metadata.pan_number || '',
          businessType: metadata.business_type || '',
          industry: metadata.industry || '',
          annualTurnover: metadata.annual_turnover || 0,
          employeeCount: metadata.employee_count || 0,
          registrationDate: metadata.registration_date || '',
          gstRegistrationDate: metadata.gst_registration_date || '',
          lastGstFiling: metadata.last_gst_filing || '',
          lastItrFiling: metadata.last_itr_filing || '',
          complianceStatus: metadata.compliance_status || 'pending',
          riskLevel: metadata.risk_level || 'low'
        }
      })
    } catch (error) {
      console.error('Error fetching clients:', error)
      // Return empty array on error instead of mock data
      return []
    }
  }

  async createClient(data: any): Promise<Client> {
    try {
      const response = await clientAPI.create(data)
      // Backend returns { client: ClientRelationshipSerializer data }
      const clientData = response.data.client || response.data
      
      // Transform backend ClientRelationship data to Client format
      return {
        id: clientData.sme_id || clientData.id,
        name: clientData.sme_name || data.name,
        email: clientData.sme_email || data.email,
        businessName: clientData.sme_business || data.businessName,
        gstNumber: clientData.sme_gst_number || data.gstNumber || '',
        phone: clientData.sme_phone || data.phone || '',
        status: clientData.is_active ? 'active' : 'inactive',
        lastActivity: clientData.last_activity || new Date().toISOString().split('T')[0],
        complianceScore: 85, // Default
        totalTransactions: clientData.total_transactions || 0,
        pendingReviews: clientData.pending_reviews || 0,
        monthlyRevenue: clientData.monthly_revenue || data.monthlyRevenue || 0,
        joinedDate: clientData.created_at || new Date().toISOString().split('T')[0],
        // Additional fields from input data or metadata
        address: clientData.sme_address || data.address || '',
        city: (clientData.sme_profile_metadata?.city) || data.city || '',
        state: (clientData.sme_profile_metadata?.state) || data.state || '',
        pincode: (clientData.sme_profile_metadata?.pincode) || data.pincode || '',
        panNumber: (clientData.sme_profile_metadata?.pan_number) || data.panNumber || '',
        businessType: (clientData.sme_profile_metadata?.business_type) || data.businessType || '',
        industry: (clientData.sme_profile_metadata?.industry) || data.industry || '',
        annualTurnover: (clientData.sme_profile_metadata?.annual_turnover) || data.annualTurnover || 0,
        employeeCount: (clientData.sme_profile_metadata?.employee_count) || data.employeeCount || 0,
        registrationDate: (clientData.sme_profile_metadata?.registration_date) || data.registrationDate || '',
        gstRegistrationDate: (clientData.sme_profile_metadata?.gst_registration_date) || data.gstRegistrationDate || '',
        lastGstFiling: (clientData.sme_profile_metadata?.last_gst_filing) || data.lastGstFiling || '',
        lastItrFiling: (clientData.sme_profile_metadata?.last_itr_filing) || data.lastItrFiling || '',
        complianceStatus: (clientData.sme_profile_metadata?.compliance_status) || data.complianceStatus || 'pending',
        riskLevel: (clientData.sme_profile_metadata?.risk_level) || data.riskLevel || 'low'
      }
    } catch (error: any) {
      console.error('Error creating client:', error)
      throw error
    }
  }

  async updateClient(id: string, data: any): Promise<Client> {
    try {
      const response = await clientAPI.update(id, data)
      // Backend returns { client: ClientRelationshipSerializer data }
      const clientData = response.data.client || response.data
      
      // Transform backend ClientRelationship data to Client format
      return {
        id: clientData.sme_id || clientData.id,
        name: clientData.sme_name || data.name,
        email: clientData.sme_email || data.email,
        businessName: clientData.sme_business || data.businessName,
        gstNumber: clientData.sme_gst_number || data.gstNumber || '',
        phone: clientData.sme_phone || data.phone || '',
        status: clientData.is_active ? 'active' : 'inactive',
        lastActivity: clientData.last_activity || new Date().toISOString().split('T')[0],
        complianceScore: 85, // Default
        totalTransactions: clientData.total_transactions || 0,
        pendingReviews: clientData.pending_reviews || 0,
        monthlyRevenue: clientData.monthly_revenue || data.monthlyRevenue || 0,
        joinedDate: clientData.created_at || new Date().toISOString().split('T')[0],
        // Additional fields from input data or metadata
        address: clientData.sme_address || data.address || '',
        city: (clientData.sme_profile_metadata?.city) || data.city || '',
        state: (clientData.sme_profile_metadata?.state) || data.state || '',
        pincode: (clientData.sme_profile_metadata?.pincode) || data.pincode || '',
        panNumber: (clientData.sme_profile_metadata?.pan_number) || data.panNumber || '',
        businessType: (clientData.sme_profile_metadata?.business_type) || data.businessType || '',
        industry: (clientData.sme_profile_metadata?.industry) || data.industry || '',
        annualTurnover: (clientData.sme_profile_metadata?.annual_turnover) || data.annualTurnover || 0,
        employeeCount: (clientData.sme_profile_metadata?.employee_count) || data.employeeCount || 0,
        registrationDate: (clientData.sme_profile_metadata?.registration_date) || data.registrationDate || '',
        gstRegistrationDate: (clientData.sme_profile_metadata?.gst_registration_date) || data.gstRegistrationDate || '',
        lastGstFiling: (clientData.sme_profile_metadata?.last_gst_filing) || data.lastGstFiling || '',
        lastItrFiling: (clientData.sme_profile_metadata?.last_itr_filing) || data.lastItrFiling || '',
        complianceStatus: (clientData.sme_profile_metadata?.compliance_status) || data.complianceStatus || 'pending',
        riskLevel: (clientData.sme_profile_metadata?.risk_level) || data.riskLevel || 'low'
      }
    } catch (error) {
      console.error('Error updating client:', error)
      throw error
    }
  }

  async deleteClient(id: string): Promise<void> {
    try {
      await clientAPI.delete(id)
    } catch (error) {
      console.error('Error deleting client:', error)
      throw error
    }
  }

  async getClientDetails(id: string): Promise<Client> {
    try {
      const response = await clientAPI.details(id)
      return response.data
    } catch (error) {
      console.error('Error fetching client details:', error)
      throw error
    }
  }

  private getMockClients(): Client[] {
    return [
      {
        id: '1',
        name: 'Rajesh Kumar',
        email: 'rajesh@abccorp.com',
        businessName: 'ABC Corp',
        gstNumber: '27AABCU9603R1ZX',
        phone: '+91 98765 43210',
        status: 'active',
        lastActivity: '2024-01-15',
        complianceScore: 95,
        totalTransactions: 156,
        pendingReviews: 3,
        monthlyRevenue: 45000,
        joinedDate: '2023-06-15'
      },
      {
        id: '2',
        name: 'Priya Sharma',
        email: 'priya@xyzltd.com',
        businessName: 'XYZ Ltd',
        gstNumber: '29AABCU9603R1ZY',
        phone: '+91 87654 32109',
        status: 'active',
        lastActivity: '2024-01-14',
        complianceScore: 88,
        totalTransactions: 89,
        pendingReviews: 1,
        monthlyRevenue: 32000,
        joinedDate: '2023-08-20'
      },
      {
        id: '3',
        name: 'Amit Patel',
        email: 'amit@techsolutions.com',
        businessName: 'Tech Solutions',
        gstNumber: '24AABCU9603R1ZZ',
        phone: '+91 76543 21098',
        status: 'active',
        lastActivity: '2024-01-12',
        complianceScore: 76,
        totalTransactions: 234,
        pendingReviews: 8,
        monthlyRevenue: 67000,
        joinedDate: '2023-04-10'
      }
    ]
  }
}

export const clientService = new ClientService()
