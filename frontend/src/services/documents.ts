import { Document } from '../types'
import { documentAPI } from './api'

class DocumentService {
  async getDocuments(): Promise<Document[]> {
    try {
      const response = await documentAPI.list()
      return response.data.results || response.data
    } catch (error) {
      console.error('Error fetching documents:', error)
      throw error
    }
  }

  async uploadDocument(file: File, name: string, category: string): Promise<Document> {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('name', name)
      formData.append('category', category)
      
      const response = await documentAPI.upload(formData)
      return response.data
    } catch (error) {
      console.error('Error uploading document:', error)
      throw error
    }
  }

  async deleteDocument(id: string): Promise<void> {
    try {
      await documentAPI.delete(id)
    } catch (error) {
      console.error('Error deleting document:', error)
      throw error
    }
  }

  async shareDocument(id: string, data: any): Promise<any> {
    try {
      const response = await documentAPI.share(id, data)
      return response.data
    } catch (error) {
      console.error('Error sharing document:', error)
      throw error
    }
  }

  async getSharedDocuments(): Promise<any[]> {
    try {
      const response = await documentAPI.shared()
      return response.data
    } catch (error) {
      console.error('Error fetching shared documents:', error)
      return []
    }
  }

  async getDocumentAnalytics(): Promise<any> {
    try {
      const response = await documentAPI.analytics()
      return response.data
    } catch (error) {
      console.error('Error fetching document analytics:', error)
      return {}
    }
  }
}

export const documentService = new DocumentService()