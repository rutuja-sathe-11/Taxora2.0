import axios from 'axios'

// Normalize API base URL so axios always receives a valid absolute URL
const normalizeBaseUrl = (): string => {
  const envBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()

  if (envBaseUrl) {
    // Prepend https:// if the user forgot the protocol to keep URL() happy
    const withProtocol = /^https?:\/\//i.test(envBaseUrl)
      ? envBaseUrl
      : `https://${envBaseUrl}`
    try {
      const validated = new URL(withProtocol).toString().replace(/\/$/, '')
      return validated
    } catch (error) {
      console.error('Invalid VITE_API_BASE_URL, falling back to window.origin', {
        envBaseUrl,
        error,
      })
    }
  }

  // Default to same-origin `/api` for local dev
  return `${window.location.origin}/api`
}

const API_BASE_URL = normalizeBaseUrl()

export { API_BASE_URL }

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken')
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
            refresh: refreshToken,
          })
          const { access } = response.data
          localStorage.setItem('accessToken', access)
          error.config.headers.Authorization = `Bearer ${access}`
          return axios.request(error.config)
        } catch (refreshError) {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          localStorage.removeItem('user')
          window.location.href = '/'
        }
      }
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  login: (credentials: { username: string; password: string }) =>
    api.post('/auth/login/', credentials),

  register: (userData: any) =>
    api.post('/auth/register/', userData),

  getProfile: () =>
    api.get('/auth/profile/'),

  updateProfile: (data: any) =>
    api.put('/auth/profile/', data),

  connectCA: (caId: string) =>
    api.post('/auth/connect-ca/', { ca_id: caId }),

  passwordReset: (data: { email: string }) =>
    api.post('/auth/password-reset/', data),

  passwordResetConfirm: (data: any) =>
    api.post('/auth/password-reset/confirm/', data),

  listCAs: () =>
    api.get('/auth/cas/'),
}

export const transactionAPI = {
  list: (params?: any) =>
    api.get('/transactions/', { params }),

  create: (data: any) =>
    api.post('/transactions/', data),

  update: (id: string, data: any) =>
    api.put(`/transactions/${id}/`, data),

  delete: (id: string) =>
    api.delete(`/transactions/${id}/`),

  summary: (params?: any) =>
    api.get('/transactions/summary/', { params }),

  export: (params?: any) =>
    api.get('/transactions/export/', { 
      params, 
      responseType: 'blob',
      headers: {
        'Accept': 'text/csv'
      }
    }),

  categories: () =>
    api.get('/transactions/categories/'),

  review: (id: string, data: { status: string; review_notes?: string }) =>
    api.post(`/transactions/${id}/review/`, data),

  caClientTransactions: (params?: any) =>
    api.get('/transactions/ca/client-transactions/', { params }),

  caDashboardSummary: () =>
    api.get('/transactions/ca/dashboard-summary/'),

  monthlyTrends: () =>
    api.get('/transactions/monthly-trends/'),

  expenseBreakdown: () =>
    api.get('/transactions/expense-breakdown/'),

  caClientGrowthTrends: () =>
    api.get('/transactions/ca/client-growth-trends/'),

  caRevenueBreakdown: () =>
    api.get('/transactions/ca/revenue-breakdown/'),

  caComplianceStatus: () =>
    api.get('/transactions/ca/compliance-status/'),
}

export const documentAPI = {
  list: () =>
    api.get('/documents/'),

  upload: (data: FormData) =>
    api.post('/documents/', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  delete: (id: string) =>
    api.delete(`/documents/${id}/`),

  share: (id: string, data: any) =>
    api.post(`/documents/${id}/share/`, data),

  shared: () =>
    api.get('/documents/shared/'),

  analytics: () =>
    api.get('/documents/analytics/'),
}

export const aiAPI = {
  chat: (data: any) =>
    api.post('/ai/chat/', data),

  chatSessions: () =>
    api.get('/ai/chat/sessions/'),

  insights: (params?: any) =>
    api.get('/ai/insights/', { params }),

  markInsightRead: (id: string) =>
    api.post(`/ai/insights/${id}/read/`, {}),

  dismissInsight: (id: string) =>
    api.post(`/ai/insights/${id}/dismiss/`, {}),

  analytics: () =>
    api.get('/ai/analytics/'),

  analyzeDocuments: (documentIds: string[]) =>
    api.post('/ai/analyze-documents/', { document_ids: documentIds }),
}

export const complianceAPI = {
  calendar: (params?: any) =>
    api.get('/compliance/calendar/', { params }),

  markCompleted: (id: number) =>
    api.post(`/compliance/calendar/${id}/complete/`, {}),

  dashboard: () =>
    api.get('/compliance/dashboard/'),

  calculateTax: (data: any) =>
    api.post('/compliance/calculate-tax/', data),

  calculateGST: (data: any) =>
    api.post('/compliance/calculate-gst/', data),

  gstReturns: () =>
    api.get('/compliance/gst-returns/'),

  itrFilings: () =>
    api.get('/compliance/itr-filings/'),
  
  fileITR: (data: any) =>
    api.post('/compliance/itr-filings/', data),

  complianceScore: () =>
    api.get('/compliance/score/'),

  generateGSTR3B: (period: string, clientId?: string) =>
    api.post('/compliance/generate-gstr3b/', { period, client_id: clientId }),
}

export const clientAPI = {
  list: (params?: any) =>
    api.get('/auth/clients/', { params }),

  create: (data: any) =>
    api.post('/auth/clients/create/', data),

  update: (id: string, data: any) =>
    api.put(`/auth/clients/${id}/`, data),

  delete: (id: string) =>
    api.delete(`/auth/clients/${id}/remove/`),

  details: (id: string) =>
    api.get(`/auth/clients/${id}/`),

  connect: (ca_id: string) =>
    api.post('/auth/connect-ca/', { ca_id }),

  search: (params?: any) =>
    api.get('/auth/clients/search/', { params }),

  listCAs: () =>
    api.get('/auth/cas/'),
}

export default api
